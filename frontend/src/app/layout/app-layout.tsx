import { Outlet } from "react-router";

import { MobileTopbar } from "./mobile-topbar";
import { Sidebar } from "./sidebar/sidebar";

export function AppLayout() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopbar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden px-8 py-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
