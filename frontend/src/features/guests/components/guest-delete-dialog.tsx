import { useState } from "react";
import { toast } from "sonner";

import { parseApiError } from "@/shared/lib/api-error";
import { Callout } from "@/shared/ui/callout";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";

import { useDeleteGuest } from "../hooks/use-guest-mutations";

import type { Guest } from "../api/types";

interface GuestDeleteDialogProps {
  guest: Guest | null;
  onOpenChange: (open: boolean) => void;
}

export function GuestDeleteDialog({ guest, onOpenChange }: GuestDeleteDialogProps) {
  const deleteGuest = useDeleteGuest();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBlocked =
    guest?.current_status === "RESERVED" || guest?.current_status === "CHECKED_IN";
  const blockReason = isBlocked
    ? guest?.current_status === "CHECKED_IN"
      ? "Este hóspede está hospedado agora. Finalize o check-out antes de excluir."
      : "Este hóspede tem uma reserva aguardando check-in. Cancele a reserva antes de excluir."
    : null;

  function handleConfirm(): void {
    if (!guest || isBlocked) return;
    setErrorMessage(null);
    deleteGuest.mutate(guest.id, {
      onSuccess: () => {
        toast.success("Hóspede excluído.");
        onOpenChange(false);
      },
      onError: (error) => {
        setErrorMessage(parseApiError(error).detail);
      },
    });
  }

  return (
    <ConfirmDialog
      open={guest !== null}
      onOpenChange={(open) => {
        if (!open) setErrorMessage(null);
        onOpenChange(open);
      }}
      title="Excluir hóspede"
      description={`Tem certeza que deseja excluir ${guest?.name ?? "este hóspede"}? Esta ação não pode ser desfeita.`}
      confirmLabel="Excluir"
      onConfirm={handleConfirm}
      isLoading={deleteGuest.isPending}
      confirmDisabled={isBlocked}
    >
      {(blockReason ?? errorMessage) && (
        <Callout tone="danger">{blockReason ?? errorMessage}</Callout>
      )}
    </ConfirmDialog>
  );
}
