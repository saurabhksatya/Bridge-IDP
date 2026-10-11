#include <WiFi.h>
#include <WebSocketsClient.h>
#include <HX711.h>
#include <Wire.h>
#include <arduinoFFT.h>

#define HX_DT 4
#define HX_SCK 18

#define MPU_ADDR 0x68

#define SMPLRT_DIV     0x19
#define CONFIG         0x1A
#define GYRO_CONFIG    0x1B
#define ACCEL_CONFIG   0x1C
#define ACCEL_XOUT_H   0x3B
#define PWR_MGMT_1     0x6B
#define WHO_AM_I       0x75

HX711 scale;
WebSocketsClient webSocket;

//================ WIFI =================

const char* WIFI_SSID = "Saura";
const char* WIFI_PASSWORD = "123456789";

//=============== SERVER ================

const char* WS_HOST = "192.168.137.1";
const uint16_t WS_PORT = 8080;

const char* BRIDGE_ID = "cmud0i3so0000kxtgbb6okkkw";
const char* SECRET = "fd0df5a3-2740-44cc-99ac-35cfad1b90ca";

//=======================================

float calibration_factor = 1000.0;
float threshold = 150.0;
float margin = 20.0;

int barrierState = 0;

unsigned long lastSend = 0;

//================ FFT ==================

const uint16_t samples = 256;
const double samplingFrequency = 200.0;

double vReal[samples];
double vImag[samples];

ArduinoFFT<double> FFT(vReal, vImag, samples, samplingFrequency);

uint16_t sampleIndex = 0;

float peakAcceleration = 0.0;
float rmsAcceleration = 0.0;
float dominantFrequency = 0.0;
float currentPeakAcceleration = 0;
float currentRMSAcceleration = 0;
float currentDominantFrequency = 0;

unsigned long lastWeightRead = 0;
unsigned long lastWebsocketSend = 0;

float currentWeight = 0;

unsigned long previousSampleMicros = 0;
const unsigned long samplePeriod = 1000000 / samplingFrequency;

//=======================================

void writeRegister(uint8_t reg, uint8_t value)
{
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(reg);
    Wire.write(value);
    Wire.endTransmission();
}

uint8_t readRegister(uint8_t reg)
{
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(reg);
    Wire.endTransmission(false);

    Wire.requestFrom(MPU_ADDR, 1);

    if (Wire.available())
        return Wire.read();

    return 0;
}

int16_t read16(uint8_t reg)
{
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(reg);
    Wire.endTransmission(false);

    Wire.requestFrom(MPU_ADDR, 2);

    int16_t value = (Wire.read() << 8) | Wire.read();

    return value;
}

void initMPU6500()
{
    Wire.begin(21,22);

    delay(100);

    uint8_t who = readRegister(WHO_AM_I);

    Serial.print("WHO_AM_I = 0x");
    Serial.println(who, HEX);

    if(who != 0x70)
    {
        Serial.println("MPU6500 not detected");

        while(true)
            delay(100);
    }

    writeRegister(PWR_MGMT_1,0x00);

    delay(100);

    writeRegister(SMPLRT_DIV,4);

    writeRegister(CONFIG,3);

    writeRegister(GYRO_CONFIG,0x00);

    writeRegister(ACCEL_CONFIG,0x00);

    Serial.println("MPU6500 Ready");
}

void webSocketEvent(WStype_t type, uint8_t * payload, size_t length)
{
    switch(type)
    {
        case WStype_CONNECTED:
            Serial.println("Connected");
            break;

        case WStype_DISCONNECTED:
            Serial.println("Disconnected");
            break;

        case WStype_TEXT:
            Serial.print("Server: ");
            Serial.println((char*)payload);
            break;

        case WStype_ERROR:
            Serial.println("WebSocket Error");
            break;

        default:
            break;
    }
}

void connectWiFi()
{
    WiFi.begin(WIFI_SSID,WIFI_PASSWORD);

    Serial.print("Connecting");

    while(WiFi.status()!=WL_CONNECTED)
    {
        delay(500);
        Serial.print(".");
    }

    Serial.println();
    Serial.println("Connected");

    Serial.println(WiFi.localIP());
}

void setup()
{
    Serial.begin(115200);

    scale.begin(HX_DT,HX_SCK);
    scale.set_scale(calibration_factor);
    scale.tare();

    initMPU6500();

    connectWiFi();
    Serial.println("Calibrating MPU...");
    delay(3000);
    Serial.println("Calibration complete");

    String path="/device/";
    path+=BRIDGE_ID;
    path+="/";
    path+=SECRET;

    webSocket.begin(WS_HOST,WS_PORT,path);

    webSocket.onEvent(webSocketEvent);

    webSocket.setReconnectInterval(5000);
}

// ===================== MPU6500 DATA =====================

float accelX = 0;
float accelY = 0;
float accelZ = 0;

float vibrationMagnitude = 0;

float vibrationSample = 0;

float gravityX = 0;
float gravityY = 0;
float gravityZ = 1;

void readAcceleration()
{
    int16_t rawX = read16(ACCEL_XOUT_H);
    int16_t rawY = read16(ACCEL_XOUT_H + 2);
    int16_t rawZ = read16(ACCEL_XOUT_H + 4);

    accelX = rawX / 16384.0f;
    accelY = rawY / 16384.0f;
    accelZ = rawZ / 16384.0f;

    // Estimate gravity using low-pass filter
    gravityX = 0.995f * gravityX + 0.005f * accelX;
    gravityY = 0.995f * gravityY + 0.005f * accelY;
    gravityZ = 0.995f * gravityZ + 0.005f * accelZ;

    // Remove gravity
    float linearX = accelX - gravityX;
    float linearY = accelY - gravityY;
    float linearZ = accelZ - gravityZ;

    // Use horizontal vibration
    vibrationSample = sqrt(
        linearX * linearX +
        linearY * linearY
    );

    // Ignore sensor noise
    if (vibrationSample < 0.01f)
        vibrationSample = 0;
}

// ===================== FFT =====================

void processFFT()
{
    FFT.dcRemoval();

    FFT.windowing(
        FFTWindow::Hamming,
        FFTDirection::Forward
    );

    FFT.compute(FFTDirection::Forward);

    FFT.complexToMagnitude();

    double peak = 0;
    int index = 0;

    for (int i = 2; i < samples / 2; i++)
    {
        if (vReal[i] > peak)
        {
            peak = vReal[i];
            index = i;
        }
    }

    if (peak < 0.03)
    {
        dominantFrequency = 0;
        return;
    }

    dominantFrequency =
        index * samplingFrequency / samples;
}

void updateVibration()
{
    readAcceleration();

    if (vibrationSample > peakAcceleration)
        peakAcceleration = vibrationSample;

    vReal[sampleIndex] = vibrationSample;
    vImag[sampleIndex] = 0;

    sampleIndex++;

    if (sampleIndex < samples)
        return;

    double sum = 0;

    for (int i = 0; i < samples; i++)
        sum += vReal[i] * vReal[i];

    rmsAcceleration = sqrt(sum / samples);

    processFFT();

    if (rmsAcceleration < 0.015f)
        dominantFrequency = 0;

    currentPeakAcceleration = peakAcceleration;
    currentRMSAcceleration = rmsAcceleration;
    currentDominantFrequency = dominantFrequency;

    peakAcceleration = 0;
    sampleIndex = 0;
}

// ===================== JSON =====================

String createJSON(float weight)
{
    String json = "{";

    json += "\"weight\":";
    json += String(weight, 2);

    json += ",";          

    json += "\"peakAccel\":";
    json += String(currentPeakAcceleration, 3);

    json += ",";

    json += "\"rmsAccel\":";
    json += String(currentRMSAcceleration, 3);

    json += ",";

    json += "\"frequency\":";
    json += String(currentDominantFrequency, 2);

    json += "}";

    return json;
}

void loop()
{
    webSocket.loop();

    unsigned long nowMillis = millis();
    unsigned long nowMicros = micros();

    // -----------------------------
    // MPU6500 @ 200 Hz (every 5 ms)
    // -----------------------------
    if (nowMicros - previousSampleMicros >= samplePeriod)
    {
        previousSampleMicros = nowMicros;
        updateVibration();
    }

    // -----------------------------
    // HX711 every 200 ms
    // -----------------------------
    if (nowMillis - lastWeightRead >= 200)
    {
        lastWeightRead = nowMillis;

        currentWeight = scale.get_units(1);

        currentWeight = abs(currentWeight);

        if (currentWeight > 300)
            currentWeight -= 370;

        currentWeight = abs(currentWeight);

        if (currentWeight > threshold)
        {
            barrierState = 1;
        }
        else if (currentWeight < threshold - margin)
        {
            barrierState = 0;
        }
    }

    // -----------------------------
    // Send every 1.5 seconds
    // -----------------------------
    if (webSocket.isConnected() &&
        nowMillis - lastWebsocketSend >= 1500)
    {
        lastWebsocketSend = nowMillis;

        String json = createJSON(currentWeight);

        Serial.println("--------------------------------");
        Serial.println(json);

        Serial.print("Weight : ");
        Serial.println(currentWeight);

        Serial.print("Peak : ");
        Serial.println(currentPeakAcceleration);

        Serial.print("RMS : ");
        Serial.println(currentRMSAcceleration);

        Serial.print("Freq : ");
        Serial.println(currentDominantFrequency);

        webSocket.sendTXT(json);
    }
}