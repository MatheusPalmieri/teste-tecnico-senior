/* eslint-disable react-refresh/only-export-components -- config de rotas: array de objetos junto dos componentes de layout que ele referencia, não precisa de fast refresh isolado */
import { lazy, Suspense, type ComponentProps } from "react";
import { Outlet, type RouteObject } from "react-router";

import { AuthProvider, LoginPage, RegisterPage, RequireAuth } from "@/features/auth";

import { AppLayout } from "./layout/app-layout";
import { PageSkeleton } from "./pages/page-skeleton";
import { RouteErrorBoundary } from "./route-error-boundary";

const DashboardPage = lazy(() => import("./pages/dashboard-page"));
const GuestsPage = lazy(() => import("./pages/guests-page"));
const ReservationsPage = lazy(() => import("./pages/reservations-page"));
const CheckInPage = lazy(() => import("./pages/check-in-page"));
const CheckOutPage = lazy(() => import("./pages/check-out-page"));
const SettingsPage = lazy(() => import("./pages/settings-page"));
const NotFoundPage = lazy(() => import("./pages/not-found-page"));

function routeElement(
  Page: React.LazyExoticComponent<() => JSX.Element>,
  fallback?: ComponentProps<typeof PageSkeleton>,
) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageSkeleton {...fallback} />}>
        <Page />
      </Suspense>
    </RouteErrorBoundary>
  );
}

function RootLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      {
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          { index: true, element: routeElement(DashboardPage, { variant: "dashboard" }) },
          {
            path: "hospedes",
            element: routeElement(GuestsPage, {
              title: "Hóspedes",
              variant: "table",
            }),
          },
          {
            path: "reservas",
            element: routeElement(ReservationsPage, {
              title: "Reservas",
              variant: "table",
            }),
          },
          {
            path: "check-in",
            element: routeElement(CheckInPage, {
              title: "Check-in",
              variant: "list",
            }),
          },
          {
            path: "check-out",
            element: routeElement(CheckOutPage, {
              title: "Check-out",
              variant: "list",
            }),
          },
          {
            path: "configuracoes",
            element: routeElement(SettingsPage, {
              title: "Configurações",
              variant: "panels",
            }),
          },
        ],
      },
      { path: "*", element: routeElement(NotFoundPage) },
    ],
  },
];
