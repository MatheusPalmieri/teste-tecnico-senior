import { Link, Navigate } from "react-router";

import { RegisterForm } from "../components/register-form";
import { useAuth } from "../hooks/use-auth";

export function RegisterPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border border-neutral-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-neutral-900">Criar conta</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Cadastre-se para acessar a gestão do hotel.
        </p>
        <RegisterForm />
        <p className="mt-6 text-center text-sm text-neutral-600">
          Já tem conta?{" "}
          <Link to="/login" className="font-medium text-neutral-900 underline">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
