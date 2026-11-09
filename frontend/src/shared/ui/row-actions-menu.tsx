import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface RowActionsMenuProps {
  label: string;
  children: ReactNode;
}

export function RowActionsMenu({ label, children }: RowActionsMenuProps) {
  return (
    <div className="flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md"
            aria-label={label}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-40">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
