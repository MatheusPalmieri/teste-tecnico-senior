import { SidebarHeader } from "./sidebar-header";
import { SidebarNav } from "./sidebar-nav";
import { SidebarUserMenu } from "./sidebar-user-menu";
import { useSidebar } from "./use-sidebar";

export function Sidebar() {
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className="hidden h-full shrink-0 flex-col border-r border-neutral-200 bg-neutral-0 transition-[width] duration-200 md:flex"
      style={{ width: collapsed ? 64 : 240 }}
    >
      <SidebarHeader collapsed={collapsed} onToggle={toggle} />
      <div className="mt-2 flex-1 overflow-y-auto">
        <SidebarNav collapsed={collapsed} />
      </div>
      <SidebarUserMenu collapsed={collapsed} />
    </aside>
  );
}
