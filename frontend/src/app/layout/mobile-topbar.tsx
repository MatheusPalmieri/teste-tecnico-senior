import { Menu } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router";

import { SidebarNav } from "./sidebar/sidebar-nav";
import { SidebarUserMenu } from "./sidebar/sidebar-user-menu";

import { Button } from "@/shared/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/shared/ui/sheet";

const ROUTE_NAMES: Record<string, string> = {
  "/": "Dashboard",
  "/hospedes": "Hóspedes",
  "/reservas": "Reservas",
  "/check-in": "Check-in",
  "/check-out": "Check-out",
  "/configuracoes": "Configurações",
};

function routeNameFor(pathname: string): string {
  const exact = ROUTE_NAMES[pathname];
  if (exact) return exact;
  const prefix = Object.keys(ROUTE_NAMES).find(
    (key) => key !== "/" && pathname.startsWith(key),
  );
  return (prefix && ROUTE_NAMES[prefix]) || "Hotel";
}

export function MobileTopbar() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="flex h-14 items-center gap-3 border-b border-neutral-200 bg-neutral-0 px-4 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <SheetContent>
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          <div className="flex h-16 items-center px-4 text-h3 text-neutral-900">
            Hotel
          </div>
          <div className="mt-2 flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
            <SidebarNav collapsed={false} />
          </div>
          <SidebarUserMenu collapsed={false} />
        </SheetContent>
      </Sheet>
      <span className="text-body-strong text-neutral-900">
        {routeNameFor(location.pathname)}
      </span>
    </header>
  );
}
