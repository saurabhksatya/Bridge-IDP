"use client";

import { useEffect, useMemo, useState } from "react";
import { useWebSocket } from "@/contexts/websocket-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, AlertTriangle, Activity, Network, Waves } from "lucide-react";
import type { Records } from "generated/prisma";

interface LiveRecord {
  bridgeId: string;
  weight: number;
  peakAccel?: number;
  rmsAccel?: number;
  frequency?: number;
  status?: string;
  createdAt: string;
  id: string;
}

interface BridgeWithRecords {
  id: string;
  name: string;
  Records: Records[];
}

interface Props {
  bridges: BridgeWithRecords[];
}

const computeStatus = (
  liveRecords: LiveRecord[] | undefined,
  dbRecords: Records[],
) => {
  // Collect most recent records (up to 10) starting from live records, then falling back to DB records
  const combinedRecent: Array<{ weight: number; createdAt: string | Date }> = [];

  if (liveRecords && liveRecords.length > 0) {
    // liveRecords are in chronological order (oldest to newest), so reverse to get newest first
    const reversedLive = [...liveRecords].reverse();
    combinedRecent.push(...reversedLive);
  }

  if (dbRecords && dbRecords.length > 0) {
    for (const d of dbRecords) {
      if (combinedRecent.length >= 10) break;
      const exists = combinedRecent.some(
        (r) =>
          new Date(r.createdAt).getTime() === new Date(d.createdAt).getTime(),
      );
      if (!exists) {
        combinedRecent.push(d);
      }
    }
  }

  // 1. If the last 10 records are all above 1000 kg -> "Maintenance Required!"
  if (combinedRecent.length >= 10) {
    const last10 = combinedRecent.slice(0, 10);
    const allAbove1000 = last10.every((record) => record.weight >= 1000);
    if (allAbove1000) {
      return "Maintenance Required!";
    }
  }

  // 2. If the current/latest reading is above 1000 kg -> "Overloaded!"
  const latestRecord = combinedRecent[0];
  if (latestRecord && latestRecord.weight >= 1000) {
    return "Overloaded!";
  }

  // 3. Otherwise -> "Normal!"
  return "Normal!";
};

const statusColor = (status: string) => {
  if (status === "Maintenance Required!") return "text-red-500";
  if (status === "Overloaded!") return "text-amber-500";
  return "text-emerald-500";
};

const statusIcon = (status: string) => {
  if (status === "Maintenance Required!") {
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  }
  if (status === "Overloaded!") {
    return <AlertTriangle className="h-5 w-5 text-amber-500" />;
  }
  return <CheckCircle className="h-5 w-5 text-emerald-500" />;
};

const lastRecordFrom = (records: Records[]) => {
  if (!records || records.length === 0) return null;
  return records[0];
};

const readableAge = (past: Date) => {
  const seconds = Math.floor((Date.now() - past.getTime()) / 1000);
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

export function BridgeLiveDashboard({ bridges }: Props) {
  const { lastMessage } = useWebSocket();
  const [liveRecords, setLiveRecords] = useState<Record<string, LiveRecord[]>>(
    {},
  );
  const [, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!lastMessage?.data) return;

    try {
      const parsed = JSON.parse(lastMessage.data as string) as LiveRecord;
      if (!parsed.bridgeId || parsed.weight == null || !parsed.createdAt)
        return;

      setLiveRecords((prev) => {
        const existing = prev[parsed.bridgeId] ?? [];
        // Add new record and keep only the last 10
        const updated = [...existing, parsed].slice(-10);
        return {
          ...prev,
          [parsed.bridgeId]: updated,
        };
      });
    } catch (error) {
      console.warn("Invalid websocket payload", error);
    }
  }, [lastMessage]);

  const bridgesWithLive = useMemo(() => {
    return bridges.map((bridge) => {
      const dbRecord = lastRecordFrom(bridge.Records);
      const liveRecordsArray = liveRecords[bridge.id];
      const liveRecord =
        liveRecordsArray && liveRecordsArray.length > 0
          ? liveRecordsArray[liveRecordsArray.length - 1]
          : null;

      const dbCreated = dbRecord ? new Date(dbRecord.createdAt) : null;
      const liveCreated = liveRecord ? new Date(liveRecord.createdAt) : null;

      const latest =
        dbCreated && liveCreated
          ? dbCreated > liveCreated
            ? { source: "db", record: dbRecord }
            : { source: "live", record: liveRecord }
          : liveCreated
            ? { source: "live", record: liveRecord }
            : dbCreated
              ? { source: "db", record: dbRecord }
              : null;

      const status = computeStatus(liveRecordsArray, bridge.Records);

      return {
        ...bridge,
        status,
        statusClass: statusColor(status),
        statusIcon: statusIcon(status),
        dbLast: dbRecord,
        liveLast: liveRecord,
        latestRecord: latest,
      };
    });
  }, [bridges, liveRecords]);

  return (
    <div className="min-h-screen w-full p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-500 shadow-lg">
            <Network className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">
            Dashboard
          </h1>
        </div>

        {bridgesWithLive.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white/70 p-10 shadow-lg backdrop-blur">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <Network className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-800">
              No bridges yet
            </h2>
            <p className="mt-2 text-gray-500">
              Add your first bridge to start monitoring
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {bridgesWithLive.map((bridge) => {
              const lastRecord = bridge.latestRecord?.record as
                | Records
                | LiveRecord
                | null;
              const lastTimestamp = lastRecord
                ? new Date(lastRecord.createdAt)
                : null;
              return (
                <Card
                  key={bridge.id}
                  className="group rounded-2xl border border-gray-200 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 transition group-hover:bg-indigo-200">
                          <Network className="h-5 w-5 text-indigo-600" />
                        </div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {bridge.name}
                        </CardTitle>
                      </div>
                      {bridge.statusIcon}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">Status</span>
                        <span
                          className={`flex items-center gap-1 text-sm font-semibold ${bridge.statusClass}`}
                        >
                          {bridge.statusIcon}
                          {bridge.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <Activity className="h-4 w-4" />
                          Last Load reading
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {lastRecord
                            ? `${lastRecord.weight.toFixed(1)} g`
                            : "No readings yet"}
                        </span>
                      </div>

                      {lastRecord && "frequency" in lastRecord && lastRecord.frequency != null && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Waves className="h-4 w-4 text-indigo-500" />
                            Vibration Freq
                          </span>
                          <span className="text-sm font-semibold text-indigo-700">
                            {Number(lastRecord.frequency).toFixed(2)} Hz
                          </span>
                        </div>
                      )}

                      {lastRecord && "rmsAccel" in lastRecord && lastRecord.rmsAccel != null && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-sm text-gray-500">
                            <Activity className="h-4 w-4 text-emerald-500" />
                            RMS / Peak Accel
                          </span>
                          <span className="text-sm font-mono text-xs font-semibold text-gray-800">
                            {Number(lastRecord.rmsAccel).toFixed(3)}g / {Number(("peakAccel" in lastRecord && lastRecord.peakAccel) || 0).toFixed(3)}g
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Data source
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {bridge.latestRecord?.source === "live"
                            ? "Live"
                            : "DB"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                          Last updated
                        </span>
                        <span className="text-sm font-semibold text-gray-900">
                          {lastTimestamp ? readableAge(lastTimestamp) : "N/A"}
                        </span>
                      </div>

                      {bridge.liveLast && (
                        <div className="rounded-lg border bg-green-50 px-3 py-2 text-sm text-gray-700">
                          Live reading: {bridge.liveLast.weight.toFixed(1)} g
                          (updated{" "}
                          {readableAge(new Date(bridge.liveLast.createdAt))})
                        </div>
                      )}

                      {bridge.dbLast && (
                        <div className="rounded-lg border bg-blue-50 px-3 py-2 text-sm text-gray-700">
                          DB reading: {bridge.dbLast.weight.toFixed(1)} g
                          (recorded{" "}
                          {readableAge(new Date(bridge.dbLast.createdAt))})
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
