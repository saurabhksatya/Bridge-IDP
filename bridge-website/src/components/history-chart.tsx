"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ReferenceLine,
  Line,
  LineChart,
  Bar,
  BarChart,
} from "recharts";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export interface HistoryRecord {
  createdAt: string;
  weight: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: HistoryRecord;
    value?: number;
  }>;
}

interface HistoryChartProps {
  chartData: HistoryRecord[];
  chartType?: "area" | "line" | "bar";
  threshold?: number;
  timeRange?: string;
}

export default function HistoryChart({
  chartData,
  chartType = "area",
  threshold = 1000,
  timeRange = "1h",
}: HistoryChartProps) {
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

  // Custom tooltip component
  const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
    if (active && payload?.[0]) {
      const dataPoint = payload[0].payload;
      const weight = dataPoint.weight;
      const isOverload = weight >= threshold;
      const date = new Date(dataPoint.createdAt);

      return (
        <div className="rounded-2xl border border-gray-100 bg-white/95 p-3.5 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between gap-4 mb-2 pb-2 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-500">
              {date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-xs font-mono font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded-md">
              {date.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
              })}
            </span>
          </div>

          <div className="flex items-center justify-between gap-6">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">Recorded Weight</span>
              <span className="text-xl font-bold tracking-tight text-gray-900">
                {weight.toFixed(2)}{" "}
                <span className="text-xs font-normal text-gray-500">g</span>
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isOverload
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                }`}
            >
              {isOverload ? (
                <>
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  <span>Overload</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Normal</span>
                </>
              )}
            </div>
          </div>

          <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
            <span>Safety Threshold:</span>
            <span className="font-medium text-gray-700">{threshold} g</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const maxWeight = Math.max(
    ...chartData.map((d) => d.weight),
    threshold + 20,
    100,
  );
  const yDomainMax = Math.ceil(maxWeight * 1.15);

  return (
    <div className="w-full h-[360px] relative select-none">
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "line" ? (
          <LineChart
            data={chartData}
            margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E2E8F0"
              vertical={false}
            />
            <XAxis
              dataKey="createdAt"
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
              tickMargin={10}
              minTickGap={40}
              tickFormatter={formatXAxisTick}
              tick={{ fill: "#64748B", fontSize: 11 }}
            />
            <YAxis
              domain={[0, yDomainMax]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: number) => `${v} g`}
              tick={{ fill: "#64748B", fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={threshold}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Limit (${threshold} g)`,
                fill: "#DC2626",
                fontSize: 11,
                position: "insideTopRight",
                offset: 10,
              }}
            />
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#3B82F6"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 6, fill: "#2563EB", stroke: "#EFF6FF", strokeWidth: 3 }}
            />
          </LineChart>
        ) : chartType === "bar" ? (
          <BarChart
            data={chartData}
            margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E2E8F0"
              vertical={false}
            />
            <XAxis
              dataKey="createdAt"
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
              tickMargin={10}
              minTickGap={40}
              tickFormatter={formatXAxisTick}
              tick={{ fill: "#64748B", fontSize: 11 }}
            />
            <YAxis
              domain={[0, yDomainMax]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: number) => `${v} g`}
              tick={{ fill: "#64748B", fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={threshold}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Limit (${threshold} g)`,
                fill: "#DC2626",
                fontSize: 11,
                position: "insideTopRight",
              }}
            />
            <Bar
              dataKey="weight"
              fill="#3B82F6"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        ) : (
          <AreaChart
            data={chartData}
            margin={{ top: 15, right: 20, left: -10, bottom: 5 }}
          >
            <defs>
              <linearGradient id="bridgeLoadGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4} />
                <stop offset="50%" stopColor="#6366F1" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#E2E8F0"
              vertical={false}
            />
            <XAxis
              dataKey="createdAt"
              tickLine={false}
              axisLine={{ stroke: "#E2E8F0" }}
              tickMargin={10}
              minTickGap={40}
              tickFormatter={formatXAxisTick}
              tick={{ fill: "#64748B", fontSize: 11 }}
            />
            <YAxis
              domain={[0, yDomainMax]}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(v: number) => `${v} g`}
              tick={{ fill: "#64748B", fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={threshold}
              stroke="#EF4444"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              label={{
                value: `Safe Limit (${threshold} g)`,
                fill: "#DC2626",
                fontSize: 11,
                position: "insideTopRight",
                offset: 8,
              }}
            />
            <Area
              type="monotone"
              dataKey="weight"
              stroke="#2563EB"
              strokeWidth={2.5}
              fill="url(#bridgeLoadGradient)"
              activeDot={{
                r: 6,
                fill: "#1D4ED8",
                stroke: "#DBEAFE",
                strokeWidth: 3,
              }}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
