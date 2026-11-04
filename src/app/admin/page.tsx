import type { Metadata } from "next";
import Panel from "@/components/admin/Panel";

export const metadata: Metadata = {
  title: "Panel · Beauty to You",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="relative min-h-dvh bg-gradient-to-b from-crema to-arena/60">
      <Panel />
    </div>
  );
}
