import { zodResolver } from "@hookform/resolvers/zod";
import type { UseMutationResult } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormReturn,
} from "react-hook-form";
import type { BaseSyntheticEvent } from "react";
import { toast } from "sonner";
import type { z } from "zod";

import { applyApiErrorToForm, parseApiError } from "@/shared/lib/api-error";

interface UseEntityFormOptions<TValues extends FieldValues, TEntity, TResult, TInput> {
  open: boolean;
  entity: TEntity | null | undefined;
  schema: z.ZodType<TValues, TValues>;
  toValues: (entity: TEntity | null | undefined) => TValues;
  create: UseMutationResult<TResult, Error, TInput>;
  update: UseMutationResult<TResult, Error, TInput>;
  onClose: () => void;
  onSaved?: (result: TResult) => void;
  messages: { created: string; updated: string };
}

interface UseEntityFormResult<TValues extends FieldValues> {
  form: UseFormReturn<TValues>;
  isEditing: boolean;
  isPending: boolean;
  submit: (event?: BaseSyntheticEvent) => void;
}

export function useEntityForm<
  TValues extends FieldValues & TInput,
  TEntity,
  TResult,
  TInput,
>({
  open,
  entity,
  schema,
  toValues,
  create,
  update,
  onClose,
  onSaved,
  messages,
}: UseEntityFormOptions<
  TValues,
  TEntity,
  TResult,
  TInput
>): UseEntityFormResult<TValues> {
  const isEditing = Boolean(entity);
  const mutation = isEditing ? update : create;

  // Em ref: `toValues` muda a cada render e reiniciaria o formulário a cada tecla.
  const toValuesRef = useRef(toValues);
  toValuesRef.current = toValues;

  const form = useForm<TValues>({
    resolver: zodResolver(schema),
    defaultValues: toValues(null) as DefaultValues<TValues>,
  });

  useEffect(() => {
    if (open) {
      form.reset(toValuesRef.current(entity));
    }
  }, [open, entity, form]);

  const submit = form.handleSubmit((values) => {
    mutation.mutate(values, {
      onSuccess: (result) => {
        onClose();
        toast.success(isEditing ? messages.updated : messages.created);
        onSaved?.(result);
      },
      onError: (error) => {
        const detail = applyApiErrorToForm(error, form.setError);
        if (!parseApiError(error).fields) toast.error(detail);
      },
    });
  });

  return { form, isEditing, isPending: mutation.isPending, submit };
}
