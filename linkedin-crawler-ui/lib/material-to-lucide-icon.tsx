import {
  LayoutDashboard,
  Users,
  CircleUserRound,
  UserCog,
  Folder,
  Tag,
  FileText,
  Radar,
  Send,
  Headset,
  Inbox,
  Globe,
  MessageCircle,
  UsersRound,
  Database,
  Activity,
  Settings,
  ShieldCheck,
<<<<<<< HEAD
  BadgeCheck,
=======
  ClipboardList,
  Cable,
>>>>>>> 961099854cab42df4ea4717cb6d6f4d86f4742a1
  type LucideIcon,
} from "lucide-react";
import type { MaterialSymbolName } from "@/components/ui";

// Chuyen doi ten icon Material Symbols (dung trong buildEntries() cua
// AllPlatformSidebar.tsx) sang icon lucide-react tuong ung, de tai su dung
// dung 1 nguon cau hinh menu (buildEntries) cho ca 2 kieu hien thi sidebar
// (ban Material cu + ban shadcn moi lay mau tu app.markeeai.com).
const MAP: Partial<Record<MaterialSymbolName, LucideIcon>> = {
  dashboard: LayoutDashboard,
  groups: Users,
  account_circle: CircleUserRound,
  manage_accounts: UserCog,
  folder: Folder,
  category: Tag,
  article: FileText,
  radar: Radar,
  send: Send,
  support_agent: Headset,
  inbox: Inbox,
  travel_explore: Globe,
  chat: MessageCircle,
  group: UsersRound,
  database: Database,
  monitoring: Activity,
  settings: Settings,
  verified_user: ShieldCheck,
<<<<<<< HEAD
  badge: BadgeCheck,
  chat_bubble: MessageCircle,
=======
  assignment: ClipboardList,
  settings_input_component: Cable,
>>>>>>> 961099854cab42df4ea4717cb6d6f4d86f4742a1
};

export function materialToLucideIcon(name: MaterialSymbolName): LucideIcon {
  return MAP[name] ?? FileText;
}
