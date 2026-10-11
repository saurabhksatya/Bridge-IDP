import { getUserBridges } from "@/app/data/bridges";
import { BridgeLiveDashboard } from "@/components/bridge-live-dashboard";

export default async function DashboardPage() {
  const bridges = await getUserBridges();
  // @ts-expect-error Mismatch
  return <BridgeLiveDashboard bridges={bridges} />;
}
