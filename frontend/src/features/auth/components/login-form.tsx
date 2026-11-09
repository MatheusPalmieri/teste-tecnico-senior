import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import type { ApiError } from "../api/types";
import { useLogin } from "../hooks/use-login";
import { type LoginFormData, loginSchema } from "../schemas/login-schema";

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps = {}) {
  const [showPassword, setShowPassword] = useState(false);
  const login = useLogin();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const genericError = isAxiosError<ApiError>(login.error)
    ? login.error.response?.data.code === "invalid_credentials"
      ? "E-mail ou senha inválidos."
      : login.error.response?.data.code === "csrf_failed"
        ? "Falha na verificacao de seguranca. Recarregue a página."
        : "Não foi possível entrar. Tente novamente."
    : null;

  const onSubmit = handleSubmit(({ email, password }) => {
    login.mutate({ email, password }, { onSuccess: () => onSuccess?.() });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {genericError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {genericError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-sm text-red-700">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Senha</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            className="pr-10"
            {...register("password")}
          />
          <button
            type="button"
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer text-neutral-500"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && (
          <p className="text-sm text-red-700">{errors.password.message}</p>
        )}
      </div>

      <Button type="submit" disabled={login.isPending} className="mt-2">
        {login.isPending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
