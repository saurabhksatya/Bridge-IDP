import { auth } from "@/server/better-auth";
import { db } from "@/server/db";
import { headers } from "next/headers";
import HistoryChartCard from "./history-chart-card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus, Network, Lock } from "lucide-react";

export default async function HistoryChartOutline() {
  const userSession = await auth.api.getSession({
    headers: await headers(),
  });

  if (!userSession) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-md p-10 shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-inner">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Authentication Required</h2>
          <p className="text-gray-600 mb-8 text-sm">
            Please log in to your Bridge Watch account to access historical telemetry logs and analytics.
          </p>
          <Link href="/auth/login">
            <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 shadow-md shadow-blue-500/20">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const bridges = await db.bridge.findMany({
    where: {
      userId: userSession.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (bridges.length === 0) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-md p-10 shadow-xl">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-inner">
            <Network className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Bridges Registered</h2>
          <p className="text-gray-600 mb-8 text-sm leading-relaxed">
            You haven&apos;t connected any bridge sensors yet. Register your first bridge device to view real-time stress data and historical charts.
          </p>
          <Link href="/add">
            <Button className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 shadow-md shadow-blue-500/20">
              <Plus className="h-4 w-4 mr-2" />
              Register New Bridge
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return <HistoryChartCard bridges={bridges} />;
}
