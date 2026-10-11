import WebSocket from "ws"
import { type Hub } from "./Hub"
import { db } from "./db"

export class Device {
  public ws: WebSocket
  public id: string
  private hub: Hub
  private clientId: string

  constructor(ws: WebSocket, id: string, hub: Hub, clientId: string) {
    this.ws = ws
    this.id = id
    this.clientId = clientId

    this.hub = hub

    this.ws.on("message", (data) => {
      void this.handleMessage(data)
    })

    this.ws.on("close", () => {
      this.hub.removeDevice(this.id)
      console.log(`Device ${this.id} disconnected`)
    })

    this.ws.on("error", (error) => {
      console.error(`Device ${this.id} error:`, error)
    })
  }

  private async handleMessage(data: WebSocket.RawData) {
    const message = data.toString().trim()
    console.log(`Device ${this.id} message: ${message}`)

    let parsed: {
      weight: number
      peakAccel: number
      rmsAccel: number
      frequency: number
    }

    try {
      parsed = JSON.parse(message)
    } catch {
      console.warn(`Device ${this.id} sent invalid JSON.`)
      this.ws.send(JSON.stringify({ error: "Invalid JSON" }))
      return
    }
    // {"weight":0.89,"peakAccel":0.000,"rmsAccel":0.000,"frequency":0.00}
    const { weight, peakAccel, rmsAccel, frequency } = parsed

    if (
      !Number.isFinite(weight) ||
      !Number.isFinite(peakAccel) ||
      !Number.isFinite(rmsAccel) ||
      !Number.isFinite(frequency)
    ) {
      this.ws.send(
        JSON.stringify({
          error: "Invalid sensor values",
        })
      )
      return
    }

    const status = weight > 150 || rmsAccel > 0.15 ? "DANGER" : weight > 130 || rmsAccel > 0.08 ? "WARNING" : "SAFE"

    const record = await db.records.create({
      data: {
        bridgeId: this.id,
        weight,
        peakAccel: peakAccel,
        rmsAccel: rmsAccel,
        frequency,
        status,
      },
    })

    const payload = JSON.stringify({
      id: record.id,
      bridgeId: this.id,
      createdAt: record.createdAt.toISOString(),

      weight: record.weight,
      peakAccel: record.peakAccel,
      rmsAccel: record.rmsAccel,
      frequency: record.frequency,
      status: record.status,
    })

    const client = this.hub.getClient(this.clientId)

    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.send(payload)
    }

    console.log(
      `Bridge ${this.id}
      Weight: ${weight}
      Peak: ${peakAccel}
      RMS: ${rmsAccel}
      Frequency: ${frequency} Hz
      Status: ${status}`
    )
  }

  send(data: string) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(data)
    }
  }
}
