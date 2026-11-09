import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface DashboardCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

export function DashboardCard({ title, action, children }: DashboardCardProps) {
  return (
    <Card>
      <CardHeader
        className={
          action ? "flex-row items-center justify-between gap-2 space-y-0" : undefined
        }
      >
        <CardTitle>{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
