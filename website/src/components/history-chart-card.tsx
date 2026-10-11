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
import VibrationChart, { type VibrationRecord } from "./vibration-chart";
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
  Gauge,
  Scale,
  Waves,
  Zap,
} from "lucide-react";

interface Props {
  bridges: Bridge[];
}

// Sensor thresholds matching ESP32 firmware and backend controller
const LOAD_CRITICAL_THRESHOLD = 150; // g
const RMS_WARNING_THRESHOLD = 0.08; // g
const RMS_DANGER_THRESHOLD = 0.15; // g

export default function HistoryChartCard({ bridges }: Props) {
  const [selectedBridgeId, setSelectedBridgeId] = useState<string>(
    bridges[0]?.id ?? "",
  );
  const [activeTab, setActiveTab] = useState<"overview" | "load" | "vibration">(
    "overview",
  );
  const [timeRange, setTimeRange] = useState<string>("1h");
  const [chartType, setChartType] = useState<"area" | "line" | "bar">("area");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "overload">("all");
  const [vibrationFilter, setVibrationFilter] = useState<"all" | "safe" | "warning" | "danger">("all");
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

  const isInitialLoading = isLoading && !data;

  // Auto-refresh interval (every 10 seconds)
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

  // CSV Export (dynamic based on active tab)
  const handleExportCSV = () => {
    if (!data || data.length === 0) return;

    let headers: string[] = [];
    let rows: string[][] = [];

    if (activeTab === "vibration") {
      headers = [
        "Index",
        "Timestamp_ISO",
        "Local_DateTime",
        "Peak_Acceleration_g",
        "RMS_Acceleration_g",
        "Dominant_Frequency_Hz",
        "Vibration_Status",
      ];
      rows = data.map((item, index) => {
        const d = new Date(item.createdAt);
        const peak = (item.peakAccel ?? 0).toFixed(3);
        const rms = (item.rmsAccel ?? 0).toFixed(3);
        const freq = (item.frequency ?? 0).toFixed(2);
        const isDanger = (item.rmsAccel ?? 0) >= RMS_DANGER_THRESHOLD;
        const isWarn = !isDanger && (item.rmsAccel ?? 0) >= RMS_WARNING_THRESHOLD;
        const vibStatus = isDanger ? "DANGER" : isWarn ? "WARNING" : "SAFE";
        return [
          (index + 1).toString(),
          item.createdAt,
          `"${d.toLocaleString()}"`,
          peak,
          rms,
          freq,
          vibStatus,
        ];
      });
    } else {
      headers = [
        "Index",
        "Timestamp_ISO",
        "Local_DateTime",
        "Weight_g",
        "Status",
        "Threshold_g",
      ];
      rows = data.map((item, index) => {
        const d = new Date(item.createdAt);
        const isOverload = item.weight >= LOAD_CRITICAL_THRESHOLD;
        return [
          (index + 1).toString(),
          item.createdAt,
          `"${d.toLocaleString()}"`,
          item.weight.toFixed(2),
          isOverload ? "OVERLOAD" : "NORMAL",
          LOAD_CRITICAL_THRESHOLD.toString(),
        ];
      });
    }

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const bridgeCleanName = selectedBridge?.name?.replace(/\s+/g, "_") ?? "bridge";
    link.setAttribute(
      "download",
      `${bridgeCleanName}_${activeTab}_telemetry_${timeRange}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculated Stats (Load & Vibration)
  const stats = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        // Load stats
        latestLoad: null,
        latestDate: null,
        maxLoad: null,
        minLoad: null,
        avgLoad: null,
        loadOverloadCount: 0,
        loadComplianceRate: 100,
        loadTrend: 0,
        // Vibration stats
        latestPeak: null,
        maxPeak: null,
        avgPeak: null,
        latestRms: null,
        maxRms: null,
        avgRms: null,
        latestFrequency: null,
        maxFrequency: null,
        avgFrequency: null,
        rmsDangerCount: 0,
        rmsWarningCount: 0,
        vibrationComplianceRate: 100,
        total: 0,
      };
    }

    const latestRecord = data[data.length - 1];
    const latestDate = latestRecord?.createdAt ?? null;

    // Load calculations
    const weights = data.map((d) => d.weight);
    const latestLoad = latestRecord?.weight ?? 0;
    const maxLoad = Math.max(...weights);
    const minLoad = Math.min(...weights);
    const sumLoad = weights.reduce((acc, curr) => acc + curr, 0);
    const avgLoad = sumLoad / weights.length;
    const loadOverloadCount = weights.filter((w) => w >= LOAD_CRITICAL_THRESHOLD).length;
    const loadComplianceRate = Math.round(
      ((weights.length - loadOverloadCount) / weights.length) * 100,
    );
    const loadTrend = latestLoad - (data[0]?.weight ?? 0);

    // Vibration calculations
    const peaks = data.map((d) => d.peakAccel ?? 0);
    const rmss = data.map((d) => d.rmsAccel ?? 0);
    const freqs = data.map((d) => d.frequency ?? 0);

    const latestPeak = latestRecord?.peakAccel ?? 0;
    const maxPeak = Math.max(...peaks);
    const avgPeak = peaks.reduce((a, b) => a + b, 0) / peaks.length;

    const latestRms = latestRecord?.rmsAccel ?? 0;
    const maxRms = Math.max(...rmss);
    const avgRms = rmss.reduce((a, b) => a + b, 0) / rmss.length;

    const latestFrequency = latestRecord?.frequency ?? 0;
    const maxFrequency = Math.max(...freqs);
    const avgFrequency = freqs.reduce((a, b) => a + b, 0) / freqs.length;

    const rmsDangerCount = rmss.filter((r) => r >= RMS_DANGER_THRESHOLD).length;
    const rmsWarningCount = rmss.filter(
      (r) => r >= RMS_WARNING_THRESHOLD && r < RMS_DANGER_THRESHOLD,
    ).length;
    const vibrationComplianceRate = Math.round(
      ((rmss.length - rmsDangerCount) / rmss.length) * 100,
    );

    return {
      latestLoad,
      latestDate,
      maxLoad,
      minLoad,
      avgLoad,
      loadOverloadCount,
      loadComplianceRate,
      loadTrend,
      latestPeak,
      maxPeak,
      avgPeak,
      latestRms,
      maxRms,
      avgRms,
      latestFrequency,
      maxFrequency,
      avgFrequency,
      rmsDangerCount,
      rmsWarningCount,
      vibrationComplianceRate,
      total: data.length,
    };
  }, [data]);

  // Filtered & Paginated records for Load table
  const filteredLoadRecords = useMemo(() => {
    if (!data) return [];
    let list = [...data].reverse();

    if (statusFilter === "normal") {
      list = list.filter((r) => r.weight < LOAD_CRITICAL_THRESHOLD);
    } else if (statusFilter === "overload") {
      list = list.filter((r) => r.weight >= LOAD_CRITICAL_THRESHOLD);
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

  // Filtered & Paginated records for Vibration table
  const filteredVibrationRecords = useMemo(() => {
    if (!data) return [];
    let list = [...data].reverse();

    if (vibrationFilter === "safe") {
      list = list.filter((r) => (r.rmsAccel ?? 0) < RMS_WARNING_THRESHOLD);
    } else if (vibrationFilter === "warning") {
      list = list.filter(
        (r) =>
          (r.rmsAccel ?? 0) >= RMS_WARNING_THRESHOLD &&
          (r.rmsAccel ?? 0) < RMS_DANGER_THRESHOLD,
      );
    } else if (vibrationFilter === "danger") {
      list = list.filter((r) => (r.rmsAccel ?? 0) >= RMS_DANGER_THRESHOLD);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((r) => {
        const d = new Date(r.createdAt).toLocaleString().toLowerCase();
        const freq = (r.frequency ?? 0).toString();
        const peak = (r.peakAccel ?? 0).toString();
        const rms = (r.rmsAccel ?? 0).toString();
        return (
          d.includes(q) ||
          freq.includes(q) ||
          peak.includes(q) ||
          rms.includes(q)
        );
      });
    }

    return list;
  }, [data, vibrationFilter, searchQuery]);

  const activeRecords = activeTab === "vibration" ? filteredVibrationRecords : filteredLoadRecords;
  const totalPages = Math.ceil(activeRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return activeRecords.slice(start, start + pageSize);
  }, [activeRecords, currentPage, pageSize]);

  // Determine overview status states
  const isLoadOverloaded = stats.latestLoad !== null && stats.latestLoad >= LOAD_CRITICAL_THRESHOLD;
  const isFreqAlert = stats.latestFrequency !== null && (stats.latestFrequency > 20 || (stats.latestRms ?? 0) >= RMS_DANGER_THRESHOLD);
  const isFreqWarning = stats.latestFrequency !== null && !isFreqAlert && (stats.latestFrequency > 10 || (stats.latestRms ?? 0) >= RMS_WARNING_THRESHOLD);

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
                  Bridge Telemetry Analytics
                </h1>
                <span className="hidden sm:inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                  Real-Time Sensors
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Monitor live load strain, evaluate vibration frequencies, and track structural integrity metrics.
              </p>
            </div>
          </div>

          {/* Quick Actions & Selectors */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Bridge Picker */}
            <div className="w-full sm:w-auto min-w-[200px]">
              <Select
                value={selectedBridgeId}
                onValueChange={(val) => {
                  setSelectedBridgeId(val);
                  setCurrentPage(1);
                }}
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
                className={`h-4 w-4 mr-1.5 ${
                  isFetching || isManualRefreshing ? "animate-spin text-blue-600" : ""
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
              <span>
                Export {activeTab === "vibration" ? "Vibration" : "Load"} CSV
              </span>
            </Button>
          </div>
        </div>

        {/* Bridge Details Bar */}
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
                  className={`h-2 w-2 rounded-full ${
                    autoRefresh ? "bg-emerald-500 animate-pulse" : "bg-gray-400"
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
                <span>Load Limit:</span>
                <span className="font-bold text-red-600">{LOAD_CRITICAL_THRESHOLD} g</span>
              </div>
            </div>
          </div>
        )}

        {/* 3 Navigation Buttons: Overview | Load | Vibration */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200/80 pb-4">
          <div className="inline-flex p-1.5 bg-gray-100/90 rounded-2xl border border-gray-200/70 shadow-inner gap-1.5">
            {/* 1. Overview Button */}
            <button
              id="tab-overview"
              onClick={() => {
                setActiveTab("overview");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "overview"
                  ? "bg-white text-blue-600 shadow-md shadow-blue-500/10 font-bold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              <Gauge className="h-4 w-4" />
              <span>Overview</span>
            </button>

            {/* 2. Load Button */}
            <button
              id="tab-load"
              onClick={() => {
                setActiveTab("load");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "load"
                  ? "bg-white text-blue-600 shadow-md shadow-blue-500/10 font-bold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              <Scale className="h-4 w-4" />
              <span>Load</span>
            </button>

            {/* 3. Vibration Button */}
            <button
              id="tab-vibration"
              onClick={() => {
                setActiveTab("vibration");
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer ${
                activeTab === "vibration"
                  ? "bg-white text-blue-600 shadow-md shadow-blue-500/10 font-bold"
                  : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
              }`}
            >
              <Waves className="h-4 w-4" />
              <span>Vibration</span>
            </button>
          </div>

          {/* Active View Helper & Time Range Selector for Charts */}
          {activeTab !== "overview" && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium hidden sm:inline">
                Window:
              </span>
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
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      timeRange === tab.value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* SECTION 1: OVERVIEW SECTION                                                */}
        {/* Just load data & status per threshold, and current vibrational frequency & status */}
        {/* ========================================================================= */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between px-1">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Current Status Overview
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                  Real-time snapshot of the primary load cell and vibrational frequency sensor
                </p>
              </div>

              {stats.latestDate && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 bg-white border border-gray-200/80 rounded-xl px-3 py-1.5 shadow-xs">
                  <Clock className="h-3.5 w-3.5 text-blue-500" />
                  <span>
                    Last reading:{" "}
                    <strong className="text-gray-800">
                      {new Date(stats.latestDate).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: false,
                      })}
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* PANEL 1: Load Data & Status per Threshold */}
              <Card className="rounded-3xl border-gray-200/80 bg-white shadow-lg shadow-blue-500/5 overflow-hidden transition-all hover:shadow-xl">
                <CardHeader className="bg-gradient-to-r from-blue-50/60 to-white border-b border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-700 shadow-inner">
                        <Scale className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900">
                          Bridge Load Data
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500">
                          Strain gauge sensor telemetry
                        </CardDescription>
                      </div>
                    </div>

                    {/* Status Badge per Threshold */}
                    {isInitialLoading ? (
                      <Skeleton className="h-8 w-24 rounded-full" />
                    ) : stats.latestLoad !== null ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                          isLoadOverloaded
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {isLoadOverloaded ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            Overload Warning
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Normal / Safe
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No reading</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {isInitialLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-40" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-16 w-full rounded-2xl" />
                    </div>
                  ) : stats.latestLoad !== null ? (
                    <>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                          Current Recorded Load
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight font-mono">
                            {stats.latestLoad.toFixed(2)}
                          </span>
                          <span className="text-lg font-medium text-gray-500">
                            grams (g)
                          </span>
                        </div>
                      </div>

                      {/* Visual Load Capacity Gauge Bar */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">
                            Threshold Capacity Utilization
                          </span>
                          <span className="font-bold text-gray-800">
                            {(
                              (stats.latestLoad / LOAD_CRITICAL_THRESHOLD) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isLoadOverloaded
                                ? "bg-red-500"
                                : stats.latestLoad >= LOAD_CRITICAL_THRESHOLD * 0.85
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(
                                  5,
                                  (stats.latestLoad / LOAD_CRITICAL_THRESHOLD) *
                                    100,
                                ),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Details Box */}
                      <div className="rounded-2xl bg-gray-50/80 border border-gray-100 p-4 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Critical Safety Threshold:</span>
                          <span className="font-mono font-bold text-gray-900">
                            {LOAD_CRITICAL_THRESHOLD.toFixed(2)} g
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Margin to Threshold:</span>
                          <span
                            className={`font-mono font-bold ${
                              isLoadOverloaded
                                ? "text-red-600"
                                : "text-emerald-600"
                            }`}
                          >
                            {isLoadOverloaded
                              ? `+${(stats.latestLoad - LOAD_CRITICAL_THRESHOLD).toFixed(2)} g OVER LIMIT`
                              : `${(LOAD_CRITICAL_THRESHOLD - stats.latestLoad).toFixed(2)} g safe margin`}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-10 text-center text-gray-400">
                      No load data recorded yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* PANEL 2: Vibrational Frequency & Status */}
              <Card className="rounded-3xl border-gray-200/80 bg-white shadow-lg shadow-indigo-500/5 overflow-hidden transition-all hover:shadow-xl">
                <CardHeader className="bg-gradient-to-r from-indigo-50/60 to-white border-b border-gray-100 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 shadow-inner">
                        <Waves className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold text-gray-900">
                          Vibrational Frequency
                        </CardTitle>
                        <CardDescription className="text-xs text-gray-500">
                          MPU6500 FFT dominant frequency
                        </CardDescription>
                      </div>
                    </div>

                    {/* Status Badge for Vibrational Frequency */}
                    {isInitialLoading ? (
                      <Skeleton className="h-8 w-24 rounded-full" />
                    ) : stats.latestFrequency !== null ? (
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${
                          isFreqAlert
                            ? "bg-red-50 text-red-700 border-red-200"
                            : isFreqWarning
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        {isFreqAlert ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                            Resonance Alert
                          </>
                        ) : isFreqWarning ? (
                          <>
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            Elevated Oscillation
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            Stable Frequency
                          </>
                        )}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">No reading</span>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {isInitialLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-12 w-40" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-16 w-full rounded-2xl" />
                    </div>
                  ) : stats.latestFrequency !== null ? (
                    <>
                      <div>
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                          Current Dominant Frequency
                        </span>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl sm:text-5xl font-black text-indigo-700 tracking-tight font-mono">
                            {stats.latestFrequency.toFixed(2)}
                          </span>
                          <span className="text-lg font-medium text-gray-500">
                            Hertz (Hz)
                          </span>
                        </div>
                      </div>

                      {/* Frequency Spectrum Condition */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 font-medium">
                            Structural Oscillation Mode
                          </span>
                          <span className="font-semibold text-gray-700">
                            {stats.latestFrequency < 5
                              ? "Ambient / Quiescent (< 5 Hz)"
                              : stats.latestFrequency <= 15
                                ? "Normal Structural Resonance"
                                : "High Frequency Excitation (> 15 Hz)"}
                          </span>
                        </div>
                        <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFreqAlert
                                ? "bg-red-500"
                                : isFreqWarning
                                  ? "bg-amber-500"
                                  : "bg-indigo-600"
                            }`}
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(5, (stats.latestFrequency / 30) * 100),
                              )}%`,
                            }}
                          />
                        </div>
                      </div>

                      {/* Associated Vibration Metrics */}
                      <div className="rounded-2xl bg-gray-50/80 border border-gray-100 p-4 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">RMS Acceleration:</span>
                          <span className="font-mono font-bold text-gray-900">
                            {(stats.latestRms ?? 0).toFixed(3)} g
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Peak Acceleration:</span>
                          <span className="font-mono font-bold text-gray-900">
                            {(stats.latestPeak ?? 0).toFixed(3)} g
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="py-10 text-center text-gray-400">
                      No vibration frequency recorded yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Quick Navigation Footer */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl border border-gray-200/80 bg-white shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">
                    Need granular historical charts?
                  </h4>
                  <p className="text-xs text-gray-500">
                    Switch to the Load or Vibration tabs above to inspect full sensor time series and logs.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("load")}
                  className="rounded-xl border-gray-200 text-xs"
                >
                  View Load Charts
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("vibration")}
                  className="rounded-xl border-gray-200 text-xs text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100/50"
                >
                  View Vibration Graph
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* SECTION 2: LOAD SECTION                                                   */}
        {/* All current data, graph and other info                                    */}
        {/* ========================================================================= */}
        {activeTab === "load" && (
          <div className="space-y-8">
            {/* 5 KPI Summary Cards for Load */}
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
                  ) : stats.latestLoad !== null ? (
                    <div>
                      <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                        {stats.latestLoad.toFixed(2)}{" "}
                        <span className="text-xs font-normal text-gray-500">g</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px]">
                        {stats.latestLoad >= LOAD_CRITICAL_THRESHOLD ? (
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
                  ) : stats.maxLoad !== null ? (
                    <div>
                      <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                        {stats.maxLoad.toFixed(2)}{" "}
                        <span className="text-xs font-normal text-gray-500">g</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
                        <span>
                          {stats.maxLoad >= LOAD_CRITICAL_THRESHOLD
                            ? `Exceeded limit by ${(stats.maxLoad - LOAD_CRITICAL_THRESHOLD).toFixed(1)} g`
                            : `${(LOAD_CRITICAL_THRESHOLD - stats.maxLoad).toFixed(1)} g below limit`}
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
                  ) : stats.avgLoad !== null ? (
                    <div>
                      <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                        {stats.avgLoad.toFixed(2)}{" "}
                        <span className="text-xs font-normal text-gray-500">g</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
                        <span>Min: {stats.minLoad?.toFixed(1)} g</span>
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
                        className={`text-2xl font-black tracking-tight font-mono ${
                          stats.loadComplianceRate >= 95
                            ? "text-emerald-600"
                            : stats.loadComplianceRate >= 80
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {stats.loadComplianceRate}%
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-gray-500">
                        <span>
                          {stats.loadOverloadCount === 0
                            ? "Zero overload alerts"
                            : `${stats.loadOverloadCount} overload spikes`}
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
                      <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
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

            {/* Main Load Chart Section */}
            <Card className="rounded-3xl border-gray-200/80 bg-white shadow-xl shadow-blue-500/5 overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white p-6">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900">
                      Strain & Load History Trend
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-sm mt-0.5">
                      Visualizing load cell sensor readings plotted against the safety threshold ({LOAD_CRITICAL_THRESHOLD} g)
                    </CardDescription>
                  </div>

                  {/* Chart Type Selector */}
                  <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                    <button
                      onClick={() => setChartType("area")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        chartType === "area"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <AreaChartIcon className="h-3.5 w-3.5" />
                      <span>Area</span>
                    </button>
                    <button
                      onClick={() => setChartType("line")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        chartType === "line"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <LineChartIcon className="h-3.5 w-3.5" />
                      <span>Line</span>
                    </button>
                    <button
                      onClick={() => setChartType("bar")}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        chartType === "bar"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <BarChart3 className="h-3.5 w-3.5" />
                      <span>Bar</span>
                    </button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {isInitialLoading ? (
                  <div className="h-[360px] w-full flex flex-col items-center justify-center gap-4">
                    <Skeleton className="h-[280px] w-full rounded-2xl" />
                  </div>
                ) : data && data.length > 0 ? (
                  <HistoryChart
                    chartData={data}
                    chartType={chartType}
                    threshold={LOAD_CRITICAL_THRESHOLD}
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
                      No load data found for &ldquo;{selectedBridge?.name}&rdquo; in the last {timeRange}.
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

            {/* Detailed Records Log Table for Load */}
            <Card className="rounded-3xl border-gray-200/80 bg-white shadow-xl shadow-blue-500/5 overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>Detailed Load Telemetry Log</span>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                        {filteredLoadRecords.length} records
                      </span>
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-xs mt-0.5">
                      Granular reading history recorded by the HX711 sensor node
                    </CardDescription>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3">
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

                    <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                      <button
                        onClick={() => {
                          setStatusFilter("all");
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          statusFilter === "all"
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          statusFilter === "normal"
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          statusFilter === "overload"
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
                    <table className="w-full text-left text-sm min-w-[600px]">
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
                          const isOverload = record.weight >= LOAD_CRITICAL_THRESHOLD;
                          const variance = record.weight - LOAD_CRITICAL_THRESHOLD;

                          return (
                            <tr
                              key={record.id ?? record.createdAt + index}
                              className="hover:bg-blue-50/40 transition-colors"
                            >
                              <td className="py-3.5 px-6 font-mono text-xs text-gray-400">
                                {rowNum}
                              </td>
                              <td className="py-3.5 px-6 whitespace-nowrap">
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
                              <td className="py-3.5 px-6 whitespace-nowrap">
                                <span className="font-bold text-gray-900 text-sm font-mono">
                                  {record.weight.toFixed(2)}{" "}
                                  <span className="text-xs font-normal text-gray-500">g</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-6 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    isOverload
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
                              <td className="py-3.5 px-6 whitespace-nowrap">
                                <span
                                  className={`font-medium text-xs font-mono ${
                                    isOverload ? "text-red-600 font-semibold" : "text-gray-500"
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

                {/* Pagination */}
                {filteredLoadRecords.length > 0 && (
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
        )}

        {/* ========================================================================= */}
        {/* SECTION 3: VIBRATION SECTION                                              */}
        {/* Clearly show all 3 data, single graph with all 3 (lines and legends),     */}
        {/* proper spacing & formatting, handle overflow conditions properly.         */}
        {/* ========================================================================= */}
        {activeTab === "vibration" && (
          <div className="space-y-8">
            {/* Overflow / Critical Alert Banner (if RMS or Peak exceeded safe margins) */}
            {(stats.rmsDangerCount > 0 || (stats.latestRms !== null && stats.latestRms >= RMS_DANGER_THRESHOLD)) && (
              <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 sm:p-5 shadow-sm text-red-900 flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-inner">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm sm:text-base text-red-900">
                    High Structural Vibration Exceedance Detected
                  </h4>
                  <p className="text-xs sm:text-sm text-red-800 leading-relaxed">
                    Sensor telemetry recorded RMS acceleration reaching{" "}
                    <strong>{(stats.maxRms ?? 0).toFixed(3)} g</strong>, exceeding the critical{" "}
                    <strong>{RMS_DANGER_THRESHOLD.toFixed(3)} g</strong> threshold ({stats.rmsDangerCount} critical spike
                    {stats.rmsDangerCount === 1 ? "" : "s"} in this window). Structural dampeners and load distribution should be evaluated.
                  </p>
                </div>
              </div>
            )}

            {/* Clearly show all the 3 data: 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Metric 1: Peak Acceleration */}
              <Card className="rounded-2xl border-amber-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-1">
                  <CardDescription className="text-xs font-semibold text-amber-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Peak Acceleration</span>
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  {isInitialLoading ? (
                    <Skeleton className="h-8 w-24 my-1" />
                  ) : stats.latestPeak !== null ? (
                    <div>
                      <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                        {stats.latestPeak.toFixed(3)}{" "}
                        <span className="text-xs font-normal text-gray-500">g</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                        <span>Max in window:</span>
                        <span className="font-mono font-semibold text-amber-800">
                          {stats.maxPeak?.toFixed(3)} g
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 py-1">No data</div>
                  )}
                </CardContent>
              </Card>

              {/* Metric 2: RMS Acceleration */}
              <Card className="rounded-2xl border-emerald-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-1">
                  <CardDescription className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
                    <span>RMS Acceleration</span>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  {isInitialLoading ? (
                    <Skeleton className="h-8 w-24 my-1" />
                  ) : stats.latestRms !== null ? (
                    <div>
                      <div className="text-2xl font-black text-gray-900 tracking-tight font-mono">
                        {stats.latestRms.toFixed(3)}{" "}
                        <span className="text-xs font-normal text-gray-500">g</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] mt-1">
                        <span className="text-gray-500">Limit: {RMS_DANGER_THRESHOLD} g</span>
                        <span
                          className={`font-semibold font-mono ${
                            stats.latestRms >= RMS_DANGER_THRESHOLD
                              ? "text-red-600"
                              : stats.latestRms >= RMS_WARNING_THRESHOLD
                                ? "text-amber-600"
                                : "text-emerald-600"
                          }`}
                        >
                          {stats.latestRms >= RMS_DANGER_THRESHOLD
                            ? "Critical"
                            : stats.latestRms >= RMS_WARNING_THRESHOLD
                              ? "Warning"
                              : "Safe"}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 py-1">No data</div>
                  )}
                </CardContent>
              </Card>

              {/* Metric 3: Dominant Frequency */}
              <Card className="rounded-2xl border-indigo-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-1">
                  <CardDescription className="text-xs font-semibold text-indigo-700 uppercase tracking-wider flex items-center justify-between">
                    <span>Dominant Frequency</span>
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  {isInitialLoading ? (
                    <Skeleton className="h-8 w-24 my-1" />
                  ) : stats.latestFrequency !== null ? (
                    <div>
                      <div className="text-2xl font-black text-indigo-700 tracking-tight font-mono">
                        {stats.latestFrequency.toFixed(2)}{" "}
                        <span className="text-xs font-normal text-gray-500">Hz</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                        <span>Max frequency:</span>
                        <span className="font-mono font-semibold text-indigo-900">
                          {stats.maxFrequency?.toFixed(2)} Hz
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 py-1">No data</div>
                  )}
                </CardContent>
              </Card>

              {/* Card 4: Vibration Compliance */}
              <Card className="rounded-2xl border-gray-200/80 bg-white shadow-sm hover:shadow-md transition-shadow">
                <CardHeader className="p-4 pb-1">
                  <CardDescription className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Vibration Safety Rate</span>
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-1">
                  {isInitialLoading ? (
                    <Skeleton className="h-8 w-24 my-1" />
                  ) : stats.total > 0 ? (
                    <div>
                      <div
                        className={`text-2xl font-black tracking-tight font-mono ${
                          stats.vibrationComplianceRate >= 95
                            ? "text-emerald-600"
                            : stats.vibrationComplianceRate >= 80
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {stats.vibrationComplianceRate}%
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
                        <span>{stats.total.toLocaleString()} samples</span>
                        <span>
                          {stats.rmsDangerCount === 0 ? "Zero alerts" : `${stats.rmsDangerCount} alerts`}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400 py-1">No data</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* SINGLE GRAPH WITH ALL THE 3 DATA (LINES AND LEGENDS) */}
            <Card className="rounded-3xl border-gray-200/80 bg-white shadow-xl shadow-blue-500/5 overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 via-indigo-50/20 to-white p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <span>Multi-Axis Vibration Telemetry Graph</span>
                      <span className="text-xs font-semibold bg-indigo-100 text-indigo-700 px-2.5 py-0.5 rounded-full">
                        Peak • RMS • Frequency
                      </span>
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-sm mt-0.5">
                      Single synchronized graph tracking Peak Accel (g), RMS Accel (g) on the left axis, and Dominant Frequency (Hz) on the right axis
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {isInitialLoading ? (
                  <div className="h-[380px] w-full flex flex-col items-center justify-center gap-4">
                    <Skeleton className="h-[300px] w-full rounded-2xl" />
                  </div>
                ) : data && data.length > 0 ? (
                  <VibrationChart
                    chartData={data as VibrationRecord[]}
                    timeRange={timeRange}
                    rmsWarningThreshold={RMS_WARNING_THRESHOLD}
                    rmsDangerThreshold={RMS_DANGER_THRESHOLD}
                  />
                ) : (
                  <div className="h-[380px] w-full flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 p-8 text-center bg-gray-50/50">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 mb-4">
                      <Waves className="h-7 w-7" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-800">
                      No Vibration Telemetry In Range
                    </h4>
                    <p className="text-sm text-gray-500 max-w-md mt-1 mb-6">
                      No vibration records found for &ldquo;{selectedBridge?.name}&rdquo; in the last {timeRange}.
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

            {/* Detailed Records Log Table for Vibration */}
            <Card className="rounded-3xl border-gray-200/80 bg-white shadow-xl shadow-blue-500/5 overflow-hidden">
              <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50/50 to-white p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <span>Detailed Vibration Telemetry Log</span>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2.5 py-0.5 rounded-full">
                        {filteredVibrationRecords.length} records
                      </span>
                    </CardTitle>
                    <CardDescription className="text-gray-500 text-xs mt-0.5">
                      Granular 3-axis vibration and frequency telemetry recorded by the IoT controller
                    </CardDescription>
                  </div>

                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative min-w-[180px] sm:min-w-[240px]">
                      <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search time, freq, or accel..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-9 h-9 rounded-xl border-gray-200 text-xs bg-white"
                      />
                    </div>

                    <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                      <button
                        onClick={() => {
                          setVibrationFilter("all");
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          vibrationFilter === "all"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-800"
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => {
                          setVibrationFilter("safe");
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          vibrationFilter === "safe"
                            ? "bg-white text-emerald-700 shadow-sm"
                            : "text-gray-500 hover:text-emerald-700"
                        }`}
                      >
                        Safe
                      </button>
                      <button
                        onClick={() => {
                          setVibrationFilter("warning");
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          vibrationFilter === "warning"
                            ? "bg-white text-amber-700 shadow-sm"
                            : "text-gray-500 hover:text-amber-700"
                        }`}
                      >
                        Warning
                      </button>
                      <button
                        onClick={() => {
                          setVibrationFilter("danger");
                          setCurrentPage(1);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          vibrationFilter === "danger"
                            ? "bg-white text-red-700 shadow-sm"
                            : "text-gray-500 hover:text-red-700"
                        }`}
                      >
                        Critical
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
                    <table className="w-full text-left text-sm min-w-[700px]">
                      <thead className="border-b border-gray-100 bg-gray-50/75 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        <tr>
                          <th className="py-3 px-6">#</th>
                          <th className="py-3 px-6">Timestamp</th>
                          <th className="py-3 px-6 text-amber-800">Peak Accel (g)</th>
                          <th className="py-3 px-6 text-emerald-800">RMS Accel (g)</th>
                          <th className="py-3 px-6 text-indigo-800">Frequency (Hz)</th>
                          <th className="py-3 px-6">Vibration Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700">
                        {paginatedRecords.map((record, index) => {
                          const rowNum = (currentPage - 1) * pageSize + index + 1;
                          const dateObj = new Date(record.createdAt);
                          const peak = record.peakAccel ?? 0;
                          const rms = record.rmsAccel ?? 0;
                          const freq = record.frequency ?? 0;
                          const isDanger = rms >= RMS_DANGER_THRESHOLD;
                          const isWarning = !isDanger && rms >= RMS_WARNING_THRESHOLD;

                          return (
                            <tr
                              key={record.id ?? record.createdAt + index}
                              className={`transition-colors ${
                                isDanger
                                  ? "bg-red-50/30 hover:bg-red-50/60"
                                  : isWarning
                                    ? "bg-amber-50/30 hover:bg-amber-50/60"
                                    : "hover:bg-blue-50/40"
                              }`}
                            >
                              <td className="py-3.5 px-6 font-mono text-xs text-gray-400">
                                {rowNum}
                              </td>
                              <td className="py-3.5 px-6 whitespace-nowrap">
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
                              <td className="py-3.5 px-6 whitespace-nowrap">
                                <span className="font-mono font-bold text-gray-900 text-sm">
                                  {peak.toFixed(3)}{" "}
                                  <span className="text-xs font-normal text-gray-400">g</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-6 whitespace-nowrap">
                                <span className="font-mono font-bold text-gray-900 text-sm">
                                  {rms.toFixed(3)}{" "}
                                  <span className="text-xs font-normal text-gray-400">g</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-6 whitespace-nowrap">
                                <span className="font-mono font-bold text-indigo-700 text-sm">
                                  {freq.toFixed(2)}{" "}
                                  <span className="text-xs font-normal text-indigo-400">Hz</span>
                                </span>
                              </td>
                              <td className="py-3.5 px-6 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                                    isDanger
                                      ? "bg-red-50 text-red-700 border border-red-200"
                                      : isWarning
                                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                                        : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  }`}
                                >
                                  {isDanger ? (
                                    <>
                                      <AlertTriangle className="h-3 w-3 text-red-600" />
                                      Critical Limit
                                    </>
                                  ) : isWarning ? (
                                    <>
                                      <AlertTriangle className="h-3 w-3 text-amber-600" />
                                      Warning Threshold
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                      Safe Resonance
                                    </>
                                  )}
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
                    No matching vibration records found.
                  </div>
                )}

                {/* Pagination */}
                {filteredVibrationRecords.length > 0 && (
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
        )}
      </div>
    </div>
  );
}
