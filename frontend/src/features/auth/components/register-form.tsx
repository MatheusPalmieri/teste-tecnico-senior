import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Eye, EyeOff, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { applyApiErrorToForm, parseApiError } from "@/shared/lib/api-error";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

import { useRegister } from "../hooks/use-register";
import {
  passwordRules,
  type RegisterFormData,
  registerSchema,
} from "../schemas/register-schema";

interface RegisterFormProps {
  onSuccess?: () => void;
}

export function RegisterForm({ onSuccess }: RegisterFormProps = {}) {
  const [showPassword, setShowPassword] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: { name: "", email: "", password: "", confirm_password: "" },
  });

  const password = watch("password");

  const onSubmit = handleSubmit(({ name, email, password: value }) => {
    setGeneralError(null);
    registerMutation.mutate(
      { name: name.trim(), email: email.trim().toLowerCase(), password: value },
      {
        onSuccess: () => onSuccess?.(),
        onError: (error) => {
          const message = applyApiErrorToForm(error, setError);
          const { code, fields } = parseApiError(error);
          setGeneralError(
            code === "too_many_attempts"
              ? "Muitas tentativas de cadastro. Tente novamente em alguns minutos."
              : fields
                ? null
                : message,
          );
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {generalError && (
        <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {generalError}
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" autoComplete="name" {...register("name")} />
        {errors.name && <p className="text-sm text-red-700">{errors.name.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-email">E-mail</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          {...register("email")}
        />
        {errors.email && <p className="text-sm text-red-700">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="register-password">Senha</Label>
        <div className="relative">
          <Input
            id="register-password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
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

        <ul aria-label="Requisitos da senha" className="mt-1 flex flex-col gap-0.5">
          {passwordRules.map((rule) => {
            const met = rule.test(password ?? "");
            return (
              <li
                key={rule.id}
                className={`flex items-center gap-1.5 text-xs ${
                  met ? "text-green-700" : "text-neutral-500"
                }`}
              >
                {met ? (
                  <Check size={14} aria-hidden />
                ) : (
                  <X size={14} aria-hidden className="text-neutral-500" />
                )}
                <span>{rule.label}</span>
                <span className="sr-only">{met ? " — atendido" : " — pendente"}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Confirmar senha</Label>
        <Input
          id="confirm-password"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          {...register("confirm_password")}
        />
        {errors.confirm_password && (
          <p className="text-sm text-red-700">{errors.confirm_password.message}</p>
        )}
      </div>

      <Button type="submit" disabled={registerMutation.isPending} className="mt-2">
        {registerMutation.isPending ? "Criando conta..." : "Criar conta"}
      </Button>
    </form>
  );
}
