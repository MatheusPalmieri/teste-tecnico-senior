import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Mail, Pencil, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { useAuth } from "@/features/auth";
import { applyApiErrorToForm } from "@/shared/lib/api-error";
import { initialsFromName } from "@/shared/lib/name";
import { formatDate } from "@/shared/lib/date";
import { Avatar, AvatarFallback } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { SkeletonText } from "@/shared/ui/skeleton";

import { useUpdateProfile } from "../hooks/use-update-profile";
import { profileSchema, type ProfileFormValues } from "../schemas/profile-schema";

export function ProfileCard() {
  const { user } = useAuth();
  const updateProfile = useUpdateProfile();
  const [editing, setEditing] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name ?? "",
      email: user?.email ?? "",
      current_password: "",
    },
  });
  const emailChanged = form.watch("email").trim() !== (user?.email ?? "");

  useEffect(() => {
    if (user) {
      form.reset({ name: user.name, email: user.email, current_password: "" });
    }
  }, [user, form]);

  function onSubmit(values: ProfileFormValues): void {
    const { current_password, ...profile } = values;
    if (emailChanged && !current_password) {
      form.setError("current_password", {
        message: "Informe a senha atual para trocar o e-mail.",
      });
      return;
    }
    const input = emailChanged ? { ...profile, current_password } : profile;
    updateProfile.mutate(input, {
      onSuccess: () => {
        toast.success("Perfil atualizado.");
        form.reset({ ...profile, current_password: "" });
        setEditing(false);
      },
      onError: (error) => {
        applyApiErrorToForm(error, form.setError);
      },
    });
  }

  function cancelEditing(): void {
    form.reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
      current_password: "",
    });
    setEditing(false);
  }

  return (
    <Card className="max-w-2xl overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-neutral-200 bg-neutral-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="text-h3">
              {initialsFromName(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col gap-1">
            {user ? (
              <>
                <span className="text-h2 text-neutral-900">{user.name}</span>
                <span className="text-small text-neutral-500">{user.email}</span>
              </>
            ) : (
              <>
                <SkeletonText variant="h2" width={176} />
                <SkeletonText variant="small" width={208} />
              </>
            )}
          </div>
        </div>
        {!editing && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setEditing(true)}
            className="w-fit"
          >
            <Pencil aria-hidden="true" />
            Editar perfil
          </Button>
        )}
      </div>

      {editing ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 p-6"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <p className="text-caption text-neutral-500">
                    O e-mail também é a credencial de login: alterar aqui muda o e-mail
                    usado para entrar.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />
            {emailChanged && (
              <FormField
                control={form.control}
                name="current_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha atual</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" autoComplete="current-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex items-center gap-2 pt-2">
              <Button
                type="submit"
                disabled={!form.formState.isDirty || updateProfile.isPending}
              >
                Salvar
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={cancelEditing}
                disabled={updateProfile.isPending}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </Form>
      ) : (
        <dl className="divide-y divide-neutral-200">
          <ProfileRow
            icon={<User aria-hidden="true" className="h-4 w-4" />}
            label="Nome"
            value={user?.name}
          />
          <ProfileRow
            icon={<Mail aria-hidden="true" className="h-4 w-4" />}
            label="E-mail"
            value={user?.email}
          />
          <ProfileRow
            icon={<CalendarDays aria-hidden="true" className="h-4 w-4" />}
            label="Na equipe desde"
            value={user ? formatDate(user.date_joined) : undefined}
          />
        </dl>
      )}
    </Card>
  );
}

interface ProfileRowProps {
  icon: ReactNode;
  label: string;
  value: string | undefined;
}

function ProfileRow({ icon, label, value }: ProfileRowProps) {
  return (
    <div className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:gap-6">
      <dt className="flex items-center gap-2 text-small text-neutral-500 sm:w-44 sm:shrink-0">
        <span className="text-neutral-500">{icon}</span>
        {label}
      </dt>
      <dd className="text-body-strong text-neutral-900">
        {value ?? <SkeletonText variant="body-strong" width={176} />}
      </dd>
    </div>
  );
}
