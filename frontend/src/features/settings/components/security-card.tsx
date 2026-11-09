import { KeyRound, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";

import { ChangePasswordDialog } from "./change-password-dialog";

export function SecurityCard() {
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  return (
    <Card className="max-w-2xl overflow-hidden">
      <div className="flex items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-6 py-4">
        <span className="text-neutral-500">
          <ShieldCheck aria-hidden="true" className="h-5 w-5" />
        </span>
        <div className="flex flex-col">
          <span className="text-h3 text-neutral-900">Seguranca</span>
          <span className="text-small text-neutral-500">
            Credencial de acesso da sua conta.
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-neutral-500">
            <KeyRound aria-hidden="true" className="h-4 w-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-body-strong text-neutral-900">Senha</span>
            <span className="text-small tracking-widest text-neutral-500">••••••••</span>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="w-fit"
          onClick={() => setPasswordDialogOpen(true)}
        >
          Alterar senha
        </Button>
      </div>

      <p className="border-t border-neutral-200 bg-neutral-50 px-6 py-3 text-caption text-neutral-500">
        Ao trocar a senha, as outras sessoes conectadas sao encerradas; esta continua
        ativa.
      </p>

      <ChangePasswordDialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
      />
    </Card>
  );
}
