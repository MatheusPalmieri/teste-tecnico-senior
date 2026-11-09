import { CalendarRange, DoorOpen, LayoutDashboard, LogOut, Users } from "lucide-react";

import { SidebarNavItem } from "./sidebar-nav-item";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/hospedes", label: "Hóspedes", icon: Users },
  { to: "/reservas", label: "Reservas", icon: CalendarRange },
  { to: "/check-in", label: "Check-in", icon: DoorOpen },
  { to: "/check-out", label: "Check-out", icon: LogOut },
] as const;

interface SidebarNavProps {
  collapsed: boolean;
}

export function SidebarNav({ collapsed }: SidebarNavProps) {
  return (
    <nav aria-label="Navegacao principal" className="flex flex-col gap-1 px-3 py-2">
      {NAV_ITEMS.map((item) => (
        <SidebarNavItem key={item.to} {...item} collapsed={collapsed} />
      ))}
    </nav>
  );
}
