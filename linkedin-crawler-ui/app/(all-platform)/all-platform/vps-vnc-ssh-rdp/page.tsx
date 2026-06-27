import { VpsVncManager } from "@/components/facebook-crawler/modules/facebook-crawl/components/vps-vnc-ssh-rdp";

export const metadata = {
  title: "Multi VPS VNC Manager",
};

export default function VpsVncPage() {
  return (
    <div className="flex h-full w-full flex-col">
      <VpsVncManager />
    </div>
  );
}
