"use client";

import React, { type ReactElement } from "react";
import {
  Server,
  ShieldCheck,
  Zap,
  Globe,
  Activity,
  Cpu,
  Lock,
  Layers,
  Database,
  BarChart3,
  AlertTriangle,
  Wifi,
  HelpCircle,
  Waves,
  Truck,
  TrainTrack,
  ShieldAlert,
  ArrowRight,
  LogOut,
  LayoutDashboard,
  History,
  Plus,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/server/better-auth/client";
import { useRouter } from "next/navigation";
import Link from "next/link";

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: ReactElement;
  title: string;
  text: string;
}) {
  return (
    <div className="group rounded-3xl border border-blue-100 bg-white p-8 shadow-lg shadow-blue-500/5 transition-all duration-300 hover:-translate-y-1 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/10">
      <div className="mb-4 inline-flex rounded-2xl bg-blue-50 p-3 text-blue-600 transition group-hover:bg-blue-600 group-hover:text-white">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-semibold text-gray-900">{title}</h3>
      <p className="text-gray-600 leading-relaxed">{text}</p>
    </div>
  );
}

function TechItem({ icon, title }: { icon: ReactElement; title: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-blue-100 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        {icon}
      </div>
      <span className="font-semibold text-gray-800">{title}</span>
    </div>
  );
}

export default function NextGenBridgeLanding() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.refresh();
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50/40 to-white text-gray-900 selection:bg-blue-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-blue-100/80 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative h-10 w-10 transition-transform group-hover:scale-105">
              <div className="absolute inset-0 rotate-6 rounded-2xl bg-blue-600 shadow-md shadow-blue-500/30" />
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-blue-200 bg-white">
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-gray-900">
                Bridge Watch
              </span>
              <span className="text-[11px] font-medium text-blue-600 uppercase tracking-wider">
                Safety & Load Intelligence
              </span>
            </div>
          </Link>

          {/* Dynamic Auth Header section */}
          <div className="flex items-center gap-3">
            {isPending ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-9 w-20 rounded-xl" />
                <Skeleton className="h-9 w-28 rounded-xl" />
              </div>
            ) : session?.user ? (
              <div className="flex items-center gap-3">


                {/* Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2.5 rounded-full border border-blue-200 bg-white/90 py-1.5 pr-3 pl-1.5 shadow-sm transition hover:bg-blue-50/80 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/40 cursor-pointer">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-sm">
                        {session.user.name
                          ? session.user.name.charAt(0).toUpperCase()
                          : "U"}
                      </div>
                      <div className="hidden text-left md:block">
                        <p className="text-xs font-semibold text-gray-900 leading-none">
                          {session.user.name}
                        </p>
                        <p className="text-[10px] text-gray-500 leading-none mt-1 max-w-[120px] truncate">
                          {session.user.email}
                        </p>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 rounded-2xl p-2 shadow-xl border-blue-100"
                  >
                    <DropdownMenuLabel className="font-normal p-2">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-semibold text-gray-900 leading-none">
                          {session.user.name}
                        </p>
                        <p className="text-xs text-gray-500 leading-none truncate">
                          {session.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        onClick={() => router.push("/dashboard")}
                        className="cursor-pointer rounded-xl py-2"
                      >
                        <LayoutDashboard className="mr-2 h-4 w-4 text-blue-600" />
                        <span>Live Dashboard</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/history")}
                        className="cursor-pointer rounded-xl py-2"
                      >
                        <History className="mr-2 h-4 w-4 text-blue-600" />
                        <span>History & Analytics</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => router.push("/add")}
                        className="cursor-pointer rounded-xl py-2"
                      >
                        <Plus className="mr-2 h-4 w-4 text-blue-600" />
                        <span>Add Bridge</span>
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="cursor-pointer rounded-xl py-2 text-red-600 focus:bg-red-50 focus:text-red-700"
                    >
                      <LogOut className="mr-2 h-4 w-4 text-red-600" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    className="cursor-pointer rounded-xl px-4 py-2 font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="cursor-pointer rounded-xl bg-blue-600 px-5 py-2 font-semibold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-24 pb-20 text-center">
        <h1 className="mb-6 text-5xl leading-tight font-extrabold tracking-tight md:text-6xl text-gray-900">
          Real-Time Bridge Safety <br className="hidden md:inline" />
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            & Load Monitoring
          </span>
        </h1>
        <p className="mx-auto mb-10 max-w-3xl text-lg text-gray-600 leading-relaxed">
          An intelligent infrastructure platform that monitors bridge load conditions, detects
          structural strain, and automatically restricts traffic using embedded IoT sensors, live
          telemetry, and automated analytics.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {session?.user ? (
            <>
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="cursor-pointer rounded-2xl bg-blue-600 px-8 py-6 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 text-base"
                >
                  Go to Live Dashboard
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </>
          ) : (
            <>
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="cursor-pointer rounded-2xl bg-blue-600 px-8 py-6 font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 text-base"
                >
                  Get Started
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Core System */}
      <section className="border-y border-blue-100 bg-blue-50/50">
        <div className="mx-auto max-w-7xl px-6 py-24">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
              Core System Architecture
            </h2>
            <p className="mt-3 text-gray-600 text-base">
              Engineered with end-to-end telemetry from hardware load cells to real-time cloud analytics.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<Cpu className="h-8 w-8" />}
              title="Embedded Controller"
              text="Microcontroller units process raw strain sensor telemetry and trigger low-latency edge safety routines."
            />
            <FeatureCard
              icon={<Activity className="h-8 w-8" />}
              title="Load Sensing Unit"
              text="High-precision load cells with precision HX711 amplification quantify active bridge weight distributions."
            />
            <FeatureCard
              icon={<Waves className="h-8 w-8" />}
              title="Vibrational Sensor"
              text="Multi-axis vibration sensors record harmonic frequencies, resonance shifts, and micro-displacements."
            />
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="Automated Control"
              text="Servo-actuated barricades and active LED signage instantly activate during hazardous load thresholds."
            />
          </div>
        </div>
      </section>

      {/* Applications */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            Real-World Applications
          </h2>
          <p className="mt-3 text-gray-600 text-base">
            Protecting civil infrastructure across diverse transport networks and transit corridors.
          </p>
        </div>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<Globe className="h-8 w-8" />}
            title="Urban Bridges"
            text="Continuous weight monitoring prevents structural fatigue in dense metropolitan corridors."
          />
          <FeatureCard
            icon={<AlertTriangle className="h-8 w-8" />}
            title="Accident Prevention"
            text="Automated barrier intervention stops overloaded vehicles before structural degradation occurs."
          />
          <FeatureCard
            icon={<Server className="h-8 w-8" />}
            title="Remote Telemetry"
            text="Centralized dashboard accessible anywhere with live WebSocket streaming and historical analytics."
          />
          <FeatureCard
            icon={<Truck className="h-8 w-8" />}
            title="Freight & Highway Corridors"
            text="Monitors heavy commercial transport routes and ensures strict axle-load compliance."
          />
          <FeatureCard
            icon={<TrainTrack className="h-8 w-8" />}
            title="Railway Infrastructure"
            text="Captures high-frequency dynamic vibrations and impact stresses from railway transit."
          />
          <FeatureCard
            icon={<ShieldAlert className="h-8 w-8" />}
            title="Disaster & Seismic Defense"
            text="Evaluates structural integrity in real-time during seismic events and severe storm surges."
          />
        </div>
      </section>

      {/* Performance */}
      <section className="border-y border-blue-100 bg-blue-50/50">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <h2 className="mb-16 text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            System Capabilities
          </h2>
          <div className="grid gap-8 grid-cols-2 md:grid-cols-4">
            <TechItem
              icon={<BarChart3 className="h-7 w-7" />}
              title="Real-Time Data"
            />
            <TechItem
              icon={<Wifi className="h-7 w-7" />}
              title="IoT Connectivity"
            />
            <TechItem
              icon={<Database className="h-7 w-7" />}
              title="Data Logging"
            />
            <TechItem
              icon={<Cpu className="h-7 w-7" />}
              title="Edge Processing"
            />
          </div>
        </div>
      </section>

      {/* Reliability */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            Engineered For Reliability
          </h2>
          <p className="mt-3 text-gray-600 text-base">
            Fail-safe protocols and multi-layer logic for safety-critical environments.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <FeatureCard
            icon={<ShieldCheck className="h-8 w-8" />}
            title="Deadband Stability"
            text="Prevents jitter and false alarms near threshold boundaries for stable decision-making."
          />
          <FeatureCard
            icon={<Layers className="h-8 w-8" />}
            title="Layered Logic"
            text="Multi-condition evaluation combining continuous weight, rate of change, and sensor health."
          />
          <FeatureCard
            icon={<Lock className="h-8 w-8" />}
            title="Fail-Safe Response"
            text="Immediate autonomous traffic restriction during unsafe strain conditions or sensor failure."
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="border-y border-blue-100 bg-blue-50/50">
        <div className="mx-auto max-w-4xl px-6 py-24">
          <h2 className="mb-16 text-center text-3xl sm:text-4xl font-bold tracking-tight text-gray-900">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <h4 className="font-semibold text-gray-900">Is this system real-time?</h4>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed pl-8">
                Yes. The system streams load metrics and vibration anomalies over low-latency WebSockets with sub-second feedback for immediate automated gate control.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
              <div className="mb-2 flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <h4 className="font-semibold text-gray-900">
                  Can it scale to monitor multiple bridges?
                </h4>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed pl-8">
                Yes. Each bridge has dedicated credentials and telemetry streams, allowing centralized monitoring of bridge fleets from a unified management dashboard.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center px-6">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-tr from-blue-600 to-indigo-700 p-12 text-white shadow-2xl shadow-blue-500/20">
          <h2 className="mb-4 text-3xl sm:text-4xl font-extrabold tracking-tight">
            Enhance Bridge Safety with Smart Monitoring
          </h2>
          <p className="mb-8 text-blue-100 max-w-xl mx-auto text-base">
            Start monitoring bridge loads, detecting structural hazards, and preventing failures today.
          </p>
          {session?.user ? (
            <Link href="/dashboard">
              <Button
                size="lg"
                className="cursor-pointer rounded-2xl bg-white px-10 py-4 font-bold text-blue-700 shadow-xl hover:bg-blue-50 text-base"
              >
                Open Dashboard
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button
                  size="lg"
                  className="cursor-pointer rounded-2xl bg-white px-8 py-4 font-bold text-blue-700 shadow-xl hover:bg-blue-50 text-base"
                >
                  Create Free Account
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  size="lg"
                  className="cursor-pointer rounded-2xl border-white/30 bg-white/10 px-8 py-4 font-semibold text-white hover:bg-white/20 text-base"
                >
                  Sign In
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      <footer className="pb-10 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} Bridge Watch. All rights reserved.
      </footer>
    </div>
  );
}
