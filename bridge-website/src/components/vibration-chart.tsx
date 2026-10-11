"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { Activity, AlertTriangle, CheckCircle2, Waves, Zap } from "lucide-react";

export interface VibrationRecord {
  id?: string;
  createdAt: string;
  weight?: number;
  peakAccel: number;
  rmsAccel: number;
  frequency: number;
  status?: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
    payload: VibrationRecord;
  }>;
}

interface VibrationChartProps {
  chartData: VibrationRecord[];
  timeRange?: string;
  rmsWarningThreshold?: number; // default 0.08 g
  rmsDangerThreshold?: number;  // default 0.15 g
}

export default function VibrationChart({
  chartData,
  timeRange = "1h",
  rmsWarningThreshold = 0.08,
  rmsDangerThreshold = 0.15,
}: VibrationChartProps) {
  const [visibleLines, setVisibleLines] = React.useState({
    peakAccel: true,
    rmsAccel: true,
    frequency: true,
  });

  const toggleLine = (key: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Format X-axis tick labels based on time range
  const formatXAxisTick = (value: string) => {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return "";

      if (timeRange === "7d" || timeRange === "30d") {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }

      if (timeRange === "24h" || timeRange === "6h") {
        return date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
      }

      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
    } catch {
      return value;
    }
  };

  // Dynamically calculate domains with headroom so spikes never clip
  const maxAccel = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return 0.25;
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.peakAccel ?? 0, d.rmsAccel ?? 0)),
      rmsDangerThreshold,
    );
    return Math.max(0.2, Number((maxVal * 1.25).toFixed(3)));
  }, [chartData, rmsDangerThreshold]);

  const maxFreq = React.useMemo(() => {
    if (!chartData || chartData.length === 0) return 50;
    const maxVal = Math.max(...chartData.map((d) => d.frequency ?? 0));
    return Math.max(30, Math.ceil(maxVal * 1.2));
  }, [chartData]);

  // Custom rich tooltip
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload && payload.length > 0 && payload[0]) {
      const record = payload[0].payload;
      const date = new Date(record.createdAt);
      const isDanger = (record.rmsAccel ?? 0) >= rmsDangerThreshold || record.status === "DANGER";
      const isWarning =
        !isDanger &&
        ((record.rmsAccel ?? 0) >= rmsWarningThreshold || record.status === "WARNING");

      return (
        <div className="rounded-2xl border border-gray-100 bg-white/95 p-4 shadow-2xl backdrop-blur-md min-w-[260px] text-xs">
          {/* Header */}
          <div className="flex items-center justify-between gap-4 pb-2.5 mb-2.5 border-b border-gray-100">
            <span className="font-semibold text-gray-700">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="font-mono font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md text-[11px]">
              {date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </span>
          </div>

          {/* 3 Metrics */}
          <div className="space-y-2.5">
            {/* Peak Acceleration */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
                <span className="text-gray-600 font-medium">Peak Acceleration:</span>
              </div>
              <span className="font-mono font-bold text-gray-900">
                {(record.peakAccel ?? 0).toFixed(3)}{" "}
                <span className="text-[10px] text-gray-400 font-normal">g</span>
              </span>
            </div>

            {/* RMS Acceleration */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-gray-600 font-medium">RMS Acceleration:</span>
              </div>
              <span className="font-mono font-bold text-gray-900">
                {(record.rmsAccel ?? 0).toFixed(3)}{" "}
                <span className="text-[10px] text-gray-400 font-normal">g</span>
              </span>
            </div>

            {/* Dominant Frequency */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 inline-block" />
                <span className="text-gray-600 font-medium">Dominant Freq:</span>
              </div>
              <span className="font-mono font-bold text-indigo-700">
                {(record.frequency ?? 0).toFixed(2)}{" "}
                <span className="text-[10px] text-gray-400 font-normal">Hz</span>
              </span>
            </div>
          </div>

          {/* Status Badge */}
          <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
            <span className="text-[11px] text-gray-500">Vibration State:</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                isDanger
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : isWarning
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-emerald-50 text-emerald-700 border border-emerald-200"
              }`}
            >
              {isDanger ? (
                <>
                  <AlertTriangle className="h-3 w-3 text-red-600" /> Critical
                </>
              ) : isWarning ? (
                <>
                  <AlertTriangle className="h-3 w-3 text-amber-600" /> Elevated
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Safe
                </>
              )}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full space-y-4">
      {/* Interactive Legend Bar with Pill Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Peak Accel Pill */}
          <button
            type="button"
            onClick={() => toggleLine("peakAccel")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium transition cursor-pointer border ${
              visibleLines.peakAccel
                ? "bg-amber-50 text-amber-800 border-amber-200 shadow-xs"
                : "bg-gray-100 text-gray-400 border-gray-200 opacity-60"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                visibleLines.peakAccel ? "bg-amber-500" : "bg-gray-400"
              }`}
            />
            <span>Peak Acceleration</span>
            <span className="text-[10px] font-mono text-amber-700 bg-amber-100/70 px-1.5 py-0.2 rounded">
              Left Axis (g)
            </span>
          </button>

          {/* RMS Accel Pill */}
          <button
            type="button"
            onClick={() => toggleLine("rmsAccel")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium transition cursor-pointer border ${
              visibleLines.rmsAccel
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-xs"
                : "bg-gray-100 text-gray-400 border-gray-200 opacity-60"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                visibleLines.rmsAccel ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
            <span>RMS Acceleration</span>
            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
              Left Axis (g)
            </span>
          </button>

          {/* Frequency Pill */}
          <button
            type="button"
            onClick={() => toggleLine("frequency")}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-medium transition cursor-pointer border ${
              visibleLines.frequency
                ? "bg-indigo-50 text-indigo-800 border-indigo-200 shadow-xs"
                : "bg-gray-100 text-gray-400 border-gray-200 opacity-60"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                visibleLines.frequency ? "bg-indigo-600" : "bg-gray-400"
              }`}
            />
            <span>Dominant Frequency</span>
            <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100/70 px-1.5 py-0.2 rounded">
              Right Axis (Hz)
            </span>
          </button>
        </div>

        {/* Legend Hint */}
        <span className="text-[11px] text-gray-400 italic">
          Click pills to toggle series visibility
        </span>
      </div>

      {/* Main Single Multi-Series Graph */}
      <div className="w-full h-[380px] relative select-none">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 20, right: 25, left: -5, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E2E8F0"
              vertical={false}
            />

            {/* Time X-Axis */}
            <XAxis
              dataKey="createdAt"
              tickLine={false}
              axisLine={{ stroke: "#CBD5E1" }}
              tickMargin={10}
              minTickGap={45}
              tickFormatter={formatXAxisTick}
              tick={{ fill: "#64748B", fontSize: 11 }}
            />

            {/* Left Y-Axis for Acceleration (g) */}
            <YAxis
              yAxisId="accelAxis"
              orientation="left"
              domain={[0, maxAccel]}
              tickLine={false}
              axisLine={{ stroke: "#F59E0B", strokeWidth: 1.5 }}
              tickMargin={6}
              tickFormatter={(v: number) => `${v.toFixed(2)} g`}
              tick={{ fill: "#D97706", fontSize: 11, fontWeight: 500 }}
              label={{
                value: "Acceleration (g)",
                angle: -90,
                position: "insideLeft",
                offset: 12,
                fill: "#D97706",
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Right Y-Axis for Dominant Frequency (Hz) */}
            <YAxis
              yAxisId="freqAxis"
              orientation="right"
              domain={[0, maxFreq]}
              tickLine={false}
              axisLine={{ stroke: "#6366F1", strokeWidth: 1.5 }}
              tickMargin={6}
              tickFormatter={(v: number) => `${Math.round(v)} Hz`}
              tick={{ fill: "#4F46E5", fontSize: 11, fontWeight: 500 }}
              label={{
                value: "Frequency (Hz)",
                angle: 90,
                position: "insideRight",
                offset: 12,
                fill: "#4F46E5",
                fontSize: 10,
                fontWeight: 600,
              }}
            />

            {/* Tooltip */}
            <Tooltip content={<CustomTooltip />} />

            {/* Reference Lines for Safe Vibration Limits */}
            <ReferenceLine
              yAxisId="accelAxis"
              y={rmsDangerThreshold}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Critical RMS (${rmsDangerThreshold} g)`,
                fill: "#DC2626",
                fontSize: 10,
                position: "insideTopLeft",
                offset: 8,
              }}
            />

            <ReferenceLine
              yAxisId="accelAxis"
              y={rmsWarningThreshold}
              stroke="#F59E0B"
              strokeDasharray="3 3"
              strokeWidth={1}
              label={{
                value: `RMS Warning (${rmsWarningThreshold} g)`,
                fill: "#D97706",
                fontSize: 9,
                position: "insideBottomLeft",
                offset: 4,
              }}
            />

            {/* Series 1: Peak Acceleration */}
            {visibleLines.peakAccel && (
              <Line
                yAxisId="accelAxis"
                type="monotone"
                dataKey="peakAccel"
                name="Peak Acceleration"
                stroke="#F59E0B"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: "#D97706",
                  stroke: "#FEF3C7",
                  strokeWidth: 3,
                }}
              />
            )}

            {/* Series 2: RMS Acceleration */}
            {visibleLines.rmsAccel && (
              <Line
                yAxisId="accelAxis"
                type="monotone"
                dataKey="rmsAccel"
                name="RMS Acceleration"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: "#059669",
                  stroke: "#D1FAE5",
                  strokeWidth: 3,
                }}
              />
            )}

            {/* Series 3: Dominant Frequency */}
            {visibleLines.frequency && (
              <Line
                yAxisId="freqAxis"
                type="monotone"
                dataKey="frequency"
                name="Dominant Frequency"
                stroke="#6366F1"
                strokeWidth={2.5}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: "#4F46E5",
                  stroke: "#E0E7FF",
                  strokeWidth: 3,
                }}
              />
            )}

            {/* Standard Chart Legend */}
            <Legend
              wrapperStyle={{ paddingTop: "12px", fontSize: "12px" }}
              formatter={(value) => (
                <span className="text-gray-700 font-medium">{value}</span>
              )}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
