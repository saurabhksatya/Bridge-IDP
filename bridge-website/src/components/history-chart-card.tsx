"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Bridge } from "generated/prisma";
import { api } from "@/trpc/react";
import { keepPreviousData } from "@tanstack/react-query";
import HistoryChart from "./history-chart";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Download,
  History,
  Layers,
  LineChart as LineChartIcon,
  BarChart3,
  AreaChart as AreaChartIcon,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
} from "lucide-react";

interface Props {
  bridges: Bridge[];
}

const CRITICAL_THRESHOLD = 1000; // kg

export default function HistoryChartCard({ bridges }: Props) {
  const [selectedBridgeId, setSelectedBridgeId] = useState<string>(
    bridges[0]?.id ?? "",
  );
  const [timeRange, setTimeRange] = useState<string>("1h");
  const [chartType, setChartType] = useState<"area" | "line" | "bar">("area");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "overload">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [copiedId, setCopiedId] = useState(false);

  const selectedBridge = useMemo(
    () => bridges.find((b) => b.id === selectedBridgeId) ?? bridges[0],
    [bridges, selectedBridgeId],
  );

  const getStartDateForRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case "15m":
        return new Date(now.getTime() - 15 * 60 * 1000);
      case "1h":
        return new Date(now.getTime() - 60 * 60 * 1000);
      case "6h":
        return new Date(now.getTime() - 6 * 60 * 60 * 1000);
      case "24h":
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case "7d":
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case "30d":
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 60 * 60 * 1000);
    }
  };

  const [startDate, setStartDate] = useState<Date>(() =>
    getStartDateForRange(timeRange),
  );

  // Update timestamp when range changes
  useEffect(() => {
    setStartDate(getStartDateForRange(timeRange));
    setCurrentPage(1);
  }, [timeRange]);

  // Query tRPC with keepPreviousData so background updates happen smoothly without skeletons
  const { data, isLoading, refetch, isFetching } =
    api.bridge.bridgeData.useQuery(
      {
        bridgeId: selectedBridgeId,
        timestamp: startDate,
      },
      {
        enabled: Boolean(selectedBridgeId),
        refetchOnWindowFocus: false,
        placeholderData: keepPreviousData,
      },
    );

  // Only consider it an initial loading state when there is absolutely no data cached/displayed yet
  const isInitialLoading = isLoading && !data;

  // Auto-refresh interval (every 10 seconds) quietly updates data
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setStartDate(getStartDateForRange(timeRange));
      void refetch();
    }, 10000);
    return () => clearInterval(interval);
  }, [autoRefresh, timeRange, refetch]);

  const handleManualRefresh = async () => {
    setIsManualRefreshing(true);
    setStartDate(getStartDateForRange(timeRange));
    await refetch();
    setTimeout(() => setIsManualRefreshing(false), 500);
  };

  const handleCopyId = () => {
    if (selectedBridge?.id) {
      void navigator.clipboard.writeText(selectedBridge.id);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    const headers = ["Index", "Timestamp_ISO", "Local_DateTime", "Weight_kg", "Status", "Threshold_kg"];
    const rows = data.map((item, index) => {
      const d = new Date(item.createdAt);
      const isOverload = item.weight >= CRITICAL_THRESHOLD;
      return [
        index + 1,
        item.createdAt,
        `"${d.toLocaleString()}"`,
        item.weight.toFixed(2),
        isOverload ? "OVERLOAD" : "NORMAL",
        CRITICAL_THRESHOLD,
      ].join(",");
    });

    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const bridgeCleanName = selectedBridge?.name?.replace(/\s+/g, "_") ?? "bridge";
    link.setAttribute(
      "download",
      `${bridgeCleanName}_telemetry_${timeRange}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculated KPI Stats
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        latest: null,
        latestDate: null,
        max: null,
        min: null,
        avg: null,
        total: 0,
        overloadCount: 0,
        complianceRate: 100,
        trend: 0,
      };
    }

    const weights = data.map((d) => d.weight);
    const latest = data[data.length - 1]?.weight ?? 0;
    const latestDate = data[data.length - 1]?.createdAt ?? null;
    const max = Math.max(...weights);
    const min = Math.min(...weights);
    const sum = weights.reduce((acc, curr) => acc + curr, 0);
    const avg = sum / weights.length;

    const overloadCount = weights.filter((w) => w >= CRITICAL_THRESHOLD).length;
    const complianceRate = Math.round(
      ((weights.length - overloadCount) / weights.length) * 100,
    );

    const first = data[0]?.weight ?? 0;
    const trend = latest - first;

    return {
      latest,
      latestDate,
      max,
      min,
      avg,
      total: data.length,
      overloadCount,
      complianceRate,
      trend,
    };
  }, [data]);

  // Filtered & Paginated records for table
  const filteredRecords = useMemo(() => {
    if (!data) return [];
    let list = [...data].reverse(); // latest first

    if (statusFilter === "normal") {
      list = list.filter((r) => r.weight < CRITICAL_THRESHOLD);
    } else if (statusFilter === "overload") {
      list = list.filter((r) => r.weight >= CRITICAL_THRESHOLD);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const d = new Date(r.createdAt).toLocaleString().toLowerCase();
        const w = r.weight.toString();
        return d.includes(q) || w.includes(q);
      });
    }

    return list;
  }, [data, statusFilter, searchQuery]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-blue-50/30 via-white to-gray-50/50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-2 border-b border-gray-200/80">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
              <History className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Historical Load Analytics
                </h1>
                <span className="hidden sm:inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                  Real-Time Telemetry
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Inspect sensor stress trends, analyze peak loads, and evaluate structural health metrics.
              </p>
            </div>
          </div>

          {/* Quick Actions & Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Bridge Picker */}
            <div className="w-full sm:w-auto min-w-[200px]">
              <Select
                value={selectedBridgeId}
                onValueChange={(val) => setSelectedBridgeId(val)}
              >
                <SelectTrigger className="w-full rounded-xl bg-white border-gray-200 shadow-sm hover:border-blue-300">
                  <SelectValue placeholder="Select a bridge" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-200">
                  <SelectGroup>
                    <SelectLabel>Connected Bridges</SelectLabel>
                    {bridges.map((bridge) => (
                      <SelectItem key={bridge.id} value={bridge.id}>
                        {bridge.name ?? "Unnamed Bridge"}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Manual Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={isFetching || isManualRefreshing}
              className="rounded-xl border-gray-200 bg-white hover:bg-blue-50 hover:text-blue-600 shadow-sm"
              title="Refresh sensor data"
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${isFetching || isManualRefreshing ? "animate-spin text-blue-600" : ""
                  }`}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {/* Export CSV Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              disabled={!data || data.length === 0}
              className="rounded-xl border-gray-200 bg-white hover:bg-blue-50 hover:text-blue-600 shadow-sm"
            >
              <Download className="h-4 w-4 mr-1.5" />
              <span>Export CSV</span>
            </Button>
          </div>
        </div>

        {/* Bridge Info Bar */}
        {selectedBridge && (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 leading-tight">
                  {selectedBridge.name ?? "Bridge Monitor"}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-gray-500 font-mono">
                    ID: {selectedBridge.id.slice(0, 14)}...
                  </span>
                  <button
                    onClick={handleCopyId}
                    className="text-gray-400 hover:text-blue-600 transition cursor-pointer"
                    title="Copy full bridge ID"
                  >
                    {copiedId ? (
                      <Check className="h-3 w-3 text-emerald-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2 bg-white/80 rounded-xl px-3 py-1.5 border border-blue-100 text-xs text-gray-600">
                <span
                  className={`h-2 w-2 rounded-full ${autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
                    }`}
                />
                <span>Auto-refresh:</span>
                <button
                  onClick={() => setAutoRefresh(!autoRefresh)}
                  className="font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  {autoRefresh ? "Enabled (10s)" : "Paused"}
                </button>
              </div>

              <div className="hidden md:flex items-center gap-1.5 bg-white/80 rounded-xl px-3 py-1.5 border border-blue-100 text-xs text-gray-600">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
                <span>Critical Threshold:</span>
                <span className="font-bold text-red-600">{CRITICAL_THRESHOLD} g</span>
              </div>
            </div>
          </div>
        )}

        {/* 5 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Latest Load */}
          <Card className="rounded-2xl border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Latest Reading</span>
                <Activity className="h-4 w-4 text-blue-500" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isInitialLoading ? (
                <Skeleton className="h-8 w-24 my-1" />
              ) : stats.latest !== null ? (
                <div>
                  <div className="text-2xl font-black text-gray-900 tracking-tight">
                    {stats.latest.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-gray-500">g</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                    {stats.latest >= CRITICAL_THRESHOLD ? (
                      <span className="inline-flex items-center text-red-600 font-semibold gap-0.5">
                        <AlertTriangle className="h-3 w-3" /> Overload
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-emerald-600 font-semibold gap-0.5">
                        <CheckCircle2 className="h-3 w-3" /> Safe Condition
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400 py-1">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Peak / Max Load */}
          <Card className="rounded-2xl border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Peak Load (Max)</span>
                <ArrowUpRight className="h-4 w-4 text-orange-500" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isInitialLoading ? (
                <Skeleton className="h-8 w-24 my-1" />
              ) : stats.max !== null ? (
                <div>
                  <div className="text-2xl font-black text-gray-900 tracking-tight">
                    {stats.max.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-gray-500">g</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
                    <span>
                      {stats.max >= CRITICAL_THRESHOLD
                        ? `Exceeded limit by ${(stats.max - CRITICAL_THRESHOLD).toFixed(1)} g`
                        : `${(CRITICAL_THRESHOLD - stats.max).toFixed(1)} g below threshold`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400 py-1">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Average Load */}
          <Card className="rounded-2xl border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Average Load</span>
                <TrendingUp className="h-4 w-4 text-indigo-500" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isInitialLoading ? (
                <Skeleton className="h-8 w-24 my-1" />
              ) : stats.avg !== null ? (
                <div>
                  <div className="text-2xl font-black text-gray-900 tracking-tight">
                    {stats.avg.toFixed(2)}{" "}
                    <span className="text-xs font-normal text-gray-500">g</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
                    <span>Min: {stats.min?.toFixed(1)} g</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400 py-1">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Safety Compliance */}
          <Card className="rounded-2xl border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Safety Compliance</span>
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isInitialLoading ? (
                <Skeleton className="h-8 w-24 my-1" />
              ) : stats.total > 0 ? (
                <div>
                  <div
                    className={`text-2xl font-black tracking-tight ${stats.complianceRate >= 95
                      ? "text-emerald-600"
                      : stats.complianceRate >= 80
                        ? "text-amber-600"
                        : "text-red-600"
                      }`}
                  >
                    {stats.complianceRate}%
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
                    <span>
                      {stats.overloadCount === 0
                        ? "Zero alerts recorded"
                        : `${stats.overloadCount} overload spikes`}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-400 py-1">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Card 5: Sample Count */}
          <Card className="rounded-2xl border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="p-4 pb-1">
              <CardDescription className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                <span>Telemetry Points</span>
                <Layers className="h-4 w-4 text-purple-500" />
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              {isInitialLoading ? (
                <Skeleton className="h-8 w-24 my-1" />
              ) : (
                <div>
                  <div className="text-2xl font-black text-gray-900 tracking-tight">
                    {stats.total.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
                    <span>Window: {timeRange.toUpperCase()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Chart Section */}
        <Card className="rounded-3xl border-gray-200/80 bg-white shadow-xl shadow-blue-500/5 overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Strain & Load History Trend
                </CardTitle>
                <CardDescription className="text-gray-500 text-sm mt-0.5">
                  Visualizing load cell sensor readings plotted against the safety threshold
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {/* Chart Type Selector */}
                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    onClick={() => setChartType("area")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${chartType === "area"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    <AreaChartIcon className="h-3.5 w-3.5" />
                    <span>Area</span>
                  </button>
                  <button
                    onClick={() => setChartType("line")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${chartType === "line"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    <LineChartIcon className="h-3.5 w-3.5" />
                    <span>Line</span>
                  </button>
                  <button
                    onClick={() => setChartType("bar")}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${chartType === "bar"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-600 hover:text-gray-900"
                      }`}
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    <span>Bar</span>
                  </button>
                </div>

                {/* Time Range Selector Tabs */}
                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  {[
                    { label: "15m", value: "15m" },
                    { label: "1h", value: "1h" },
                    { label: "6h", value: "6h" },
                    { label: "24h", value: "24h" },
                    { label: "7d", value: "7d" },
                    { label: "30d", value: "30d" },
                  ].map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setTimeRange(tab.value)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${timeRange === tab.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                        }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {isInitialLoading ? (
              <div className="h-[360px] w-full flex flex-col items-center justify-center gap-4">
                <Skeleton className="h-[280px] w-full rounded-2xl" />
                <div className="flex gap-2 w-full justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ) : data && data.length > 0 ? (
              <HistoryChart
                chartData={data}
                chartType={chartType}
                threshold={CRITICAL_THRESHOLD}
                timeRange={timeRange}
              />
            ) : (
              <div className="h-[360px] w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center bg-gray-50/50">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-500 mb-4">
                  <Activity className="h-7 w-7" />
                </div>
                <h4 className="text-lg font-bold text-gray-800">
                  No Telemetry In Selected Range
                </h4>
                <p className="text-sm text-gray-500 max-w-md mt-1 mb-6">
                  No load data was found for &ldquo;{selectedBridge?.name}&rdquo; in the last {timeRange}.
                  Try selecting a wider time range or ensure the hardware node is actively transmitting.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimeRange("24h")}
                    className="rounded-xl border-gray-200"
                  >
                    View Last 24 Hours
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimeRange("7d")}
                    className="rounded-xl border-gray-200"
                  >
                    View Last 7 Days
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detailed Records Log Table */}
        <Card className="rounded-3xl border-gray-200/80 bg-white shadow-xl shadow-blue-500/5 overflow-hidden">
          <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>Detailed Telemetry Log</span>
                  <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                    {filteredRecords.length} records
                  </span>
                </CardTitle>
                <CardDescription className="text-gray-500 text-xs mt-0.5">
                  Granular reading history recorded by the IoT controller
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative min-w-[180px] sm:min-w-[240px]">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search time or weight..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-9 h-9 rounded-xl border-gray-200 text-xs bg-white"
                  />
                </div>

                {/* Status Filter */}
                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    onClick={() => {
                      setStatusFilter("all");
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${statusFilter === "all"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-800"
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("normal");
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${statusFilter === "normal"
                      ? "bg-white text-emerald-700 shadow-sm"
                      : "text-gray-500 hover:text-emerald-700"
                      }`}
                  >
                    Normal
                  </button>
                  <button
                    onClick={() => {
                      setStatusFilter("overload");
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${statusFilter === "overload"
                      ? "bg-white text-red-700 shadow-sm"
                      : "text-gray-500 hover:text-red-700"
                      }`}
                  >
                    Overload
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isInitialLoading ? (
              <div className="p-6 space-y-3">
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ) : paginatedRecords.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="py-3 px-6">#</th>
                      <th className="py-3 px-6">Timestamp</th>
                      <th className="py-3 px-6">Recorded Weight</th>
                      <th className="py-3 px-6">Threshold Status</th>
                      <th className="py-3 px-6">Variance from Limit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {paginatedRecords.map((record, index) => {
                      const rowNum = (currentPage - 1) * pageSize + index + 1;
                      const dateObj = new Date(record.createdAt);
                      const isOverload = record.weight >= CRITICAL_THRESHOLD;
                      const variance = record.weight - CRITICAL_THRESHOLD;

                      return (
                        <tr
                          key={record.createdAt + index}
                          className="hover:bg-blue-50/40 transition-colors"
                        >
                          <td className="py-3.5 px-6 font-mono text-xs text-gray-400">
                            {rowNum}
                          </td>
                          <td className="py-3.5 px-6">
                            <div className="flex flex-col">
                              <span className="font-medium text-gray-900 text-xs sm:text-sm">
                                {dateObj.toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="font-mono text-[11px] text-gray-500">
                                {dateObj.toLocaleTimeString("en-US", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  hour12: false,
                                })}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-6">
                            <span className="font-bold text-gray-900 text-sm">
                              {record.weight.toFixed(2)}{" "}
                              <span className="text-xs font-normal text-gray-500">g</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${isOverload
                                ? "bg-red-50 text-red-700 border border-red-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                }`}
                            >
                              {isOverload ? (
                                <>
                                  <AlertTriangle className="h-3 w-3 text-red-600" />
                                  Overload
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  Normal
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-3.5 px-6">
                            <span
                              className={`font-medium text-xs ${isOverload ? "text-red-600 font-semibold" : "text-gray-500"
                                }`}
                            >
                              {variance > 0
                                ? `+${variance.toFixed(2)} g over limit`
                                : `${Math.abs(variance).toFixed(2)} g safe margin`}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500 text-sm">
                No matching records found.
              </div>
            )}

            {/* Pagination Controls */}
            {filteredRecords.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-100 p-4 px-6 text-xs text-gray-600 bg-gray-50/40">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>records per page</span>
                </div>

                <div className="flex items-center gap-3">
                  <span>
                    Page <strong className="text-gray-900">{currentPage}</strong> of{" "}
                    <strong className="text-gray-900">{totalPages}</strong>
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className="h-8 w-8 rounded-lg border-gray-200 bg-white"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      className="h-8 w-8 rounded-lg border-gray-200 bg-white"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
