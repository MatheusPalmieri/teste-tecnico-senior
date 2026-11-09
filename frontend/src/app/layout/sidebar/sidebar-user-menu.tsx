import { LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router";

import { useAuth, useLogout } from "@/features/auth";
import { initialsFromName } from "@/shared/lib/name";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";

interface SidebarUserMenuProps {
  collapsed: boolean;
}

export function SidebarUserMenu({ collapsed }: SidebarUserMenuProps) {
  const { user } = useAuth();
  const logout = useLogout();
  const navigate = useNavigate();

  return (
    <div className="border-t border-neutral-200 p-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex w-full cursor-pointer items-center gap-2 rounded-md p-1 text-left transition-colors hover:bg-neutral-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
          >
            <Avatar>
              <AvatarFallback>{initialsFromName(user?.name)}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <span className="truncate text-body-strong text-neutral-800">
                {user?.name}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" side="top">
          <DropdownMenuItem onSelect={() => navigate("/configuracoes")}>
            <Settings className="h-4 w-4" />
            Configurações
          </DropdownMenuItem>
          <DropdownMenuItem destructive onSelect={() => logout.mutate()}>
            <LogOut className="h-4 w-4" />
            Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
