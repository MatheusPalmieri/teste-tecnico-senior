import { useEntityForm } from "@/shared/hooks/use-entity-form";
import { formatPhone } from "@/shared/lib/phone";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";

import { useCreateGuest, useUpdateGuest } from "../hooks/use-guest-mutations";
import { guestSchema } from "../schemas/guest-schema";

import type { Guest } from "../api/types";

interface GuestFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guest?: Guest | null;
  onSuccess?: () => void;
}

export function GuestFormDialog({
  open,
  onOpenChange,
  guest,
  onSuccess,
}: GuestFormDialogProps) {
  const { form, isEditing, isPending, submit } = useEntityForm({
    open,
    entity: guest,
    schema: guestSchema,
    toValues: (entity) => ({
      name: entity?.name ?? "",
      document: entity?.document ?? "",
      phone: entity ? formatPhone(entity.phone) : "",
      email: entity?.email ?? "",
      notes: entity?.notes ?? "",
    }),
    create: useCreateGuest(),
    update: useUpdateGuest(guest?.id ?? ""),
    onClose: () => onOpenChange(false),
    onSaved: onSuccess,
    messages: { created: "Hóspede cadastrado.", updated: "Hóspede atualizado." },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar hóspede" : "Novo hóspede"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Atualize os dados do hóspede." : "Cadastre um novo hóspede."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
            <DialogBody>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome completo" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="document"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Documento (CPF ou RG)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Somente números" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input
                          value={field.value}
                          onChange={(event) =>
                            field.onChange(formatPhone(event.target.value))
                          }
                          placeholder="(11) 98888-7777"
                        />
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
                      <FormLabel>E-mail (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="hóspede@exemplo.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Observações (opcional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {isEditing ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
