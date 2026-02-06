import { ActivityExplorer } from "@/components/activity/ActivityExplorer";

export const metadata = {
  title: "Pool Activity | Shinobi Cash",
  description: "View deposits, withdrawals, and other activity on Shinobi Cash privacy pools",
};

export default function ActivityPage() {
  return <ActivityExplorer />;
}
