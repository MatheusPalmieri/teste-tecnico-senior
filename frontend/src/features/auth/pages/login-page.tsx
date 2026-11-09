import { Link, Navigate, useLocation } from "react-router";

import { LoginForm } from "../components/login-form";
import { useAuth } from "../hooks/use-auth";

export function LoginPage() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const next = params.get("next") ?? "/";

  if (isAuthenticated) {
    return <Navigate to={next} replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-xl font-semibold text-neutral-900">Entrar no Hotel</h1>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-neutral-600">
          Ainda não tem conta?{" "}
          <Link to="/register" className="font-medium text-neutral-900 underline">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
