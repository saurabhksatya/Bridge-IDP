// BridgeMonitor.ino
// Generated starter integrating HX711 + MPU6050 + ArduinoFFT
// NOTE: Review/calibrate before deployment.

#include <WiFi.h>
#include <WebSocketsClient.h>
#include <HX711.h>
#include <Wire.h>
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
#include <arduinoFFT.h>

#define HX_DT 4
#define HX_SCK 18

HX711 scale;
Adafruit_MPU6050 mpu;
WebSocketsClient webSocket;

// WIFI
const char* WIFI_SSID = "Saura";
const char* WIFI_PASSWORD = "123456789";

// SERVER
const char* WS_HOST = "192.168.137.1";
const uint16_t WS_PORT = 8080;
const char* BRIDGE_ID = "cmud0i3so0000kxtgbb6okkkw";
const char* SECRET = "fd0df5a3-2740-44cc-99ac-35cfad1b90ca";

float calibration_factor = 1000.0;
float threshold = 150.0;
float margin = 20.0;

const uint16_t SAMPLES = 256;
const double SAMPLING_FREQUENCY = 200.0;

double vReal[SAMPLES];
double vImag[SAMPLES];
ArduinoFFT<double> FFT(vReal, vImag, SAMPLES, SAMPLING_FREQUENCY);

float peakAccel = 0, rmsAccel = 0, domFreq = 0;
uint16_t sampleIndex = 0;
unsigned long lastSampleMicros = 0, lastSend = 0;
const unsigned long samplePeriod = 1000000UL / 200;

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) Serial.println("Connected");
  else if (type == WStype_DISCONNECTED) Serial.println("Disconnected");
}

void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(WiFi.localIP());
}

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  scale.begin(HX_DT, HX_SCK);
  scale.set_scale(calibration_factor);
  scale.tare();
  if (!mpu.begin()) {
    Serial.println("MPU6050 not found");
    while (1);
  }
  mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  mpu.setGyroRange(MPU6050_RANGE_500_DEG);
  mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);

  connectWiFi();
  String path = "/device/";
  path += BRIDGE_ID;
  path += "/";
  path += SECRET;
  webSocket.begin(WS_HOST, WS_PORT, path);
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
}

void processFFT() {
  FFT.dcRemoval();
  FFT.windowing(FFTWindow::Hamming, FFTDirection::Forward);
  FFT.compute(FFTDirection::Forward);
  FFT.complexToMagnitude();
  domFreq = FFT.majorPeak();
}

void loop() {
  webSocket.loop();

  if (micros() - lastSampleMicros >= samplePeriod) {
    lastSampleMicros += samplePeriod;
    sensors_event_t a, g, t;
    mpu.getEvent(&a, &g, &t);
    float ax = a.acceleration.x;
    float ay = a.acceleration.y;
    float az = a.acceleration.z - 9.81;
    float mag = sqrt(ax * ax + ay * ay + az * az) / 9.81;
    if (mag > peakAccel) peakAccel = mag;
    vReal[sampleIndex] = mag;
    vImag[sampleIndex] = 0;
    sampleIndex++;
    if (sampleIndex >= SAMPLES) {
      double sum = 0;
      for (int i = 0; i < SAMPLES; i++) sum += vReal[i] * vReal[i];
      rmsAccel = sqrt(sum / SAMPLES);
      processFFT();
      sampleIndex = 0;
      peakAccel = 0;
    }
  }

  float weight = abs(scale.get_units(5));
  if (weight > 300) weight -= 370;
  weight = abs(weight);

  if (webSocket.isConnected() && millis() - lastSend > 1500) {
    String msg = "{";
    msg += "\"weight\":" + String(weight, 2) + ",";
    msg += "\"peak\":" + String(peakAccel, 3) + ",";
    msg += "\"rms\":" + String(rmsAccel, 3) + ",";
    msg += "\"frequency\":" + String(domFreq, 2);
    msg += "}";
    Serial.println(msg);
    webSocket.sendTXT(msg);
    lastSend = millis();
  }
}
