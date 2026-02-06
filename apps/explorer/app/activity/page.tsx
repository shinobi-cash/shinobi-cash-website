import { ActivityExplorer } from "@/components/activity";

export const metadata = {
  title: "Pool Activity | Shinobi Cash",
  description: "View deposits, withdrawals, and other activity on Shinobi Cash privacy pools",
};

export default function ActivityPage() {
  return <ActivityExplorer />;
}
