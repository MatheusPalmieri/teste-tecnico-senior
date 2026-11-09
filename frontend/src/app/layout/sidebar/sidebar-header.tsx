import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";

interface SidebarHeaderProps {
  collapsed: boolean;
  onToggle: () => void;
}

export function SidebarHeader({ collapsed, onToggle }: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        "relative flex h-14 items-center gap-2",
        collapsed ? "justify-center px-2" : "justify-between px-3",
      )}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-500 text-body-strong text-white">
          H
        </div>
        {!collapsed && <span className="truncate text-h3 text-neutral-900">Hotel</span>}
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        className={cn(
          "h-7 w-7",
          collapsed &&
            "absolute -right-3.5 top-3.5 z-10 border border-neutral-200 bg-neutral-0 shadow-sm hover:bg-neutral-0",
        )}
      >
        {collapsed ? (
          <PanelLeftOpen className="h-4 w-4" />
        ) : (
          <PanelLeftClose className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}
