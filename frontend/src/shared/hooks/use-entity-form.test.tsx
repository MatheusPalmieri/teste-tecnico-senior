import { QueryClient, QueryClientProvider, useMutation } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { useEntityForm } from "./use-entity-form";

const schema = z.object({
  name: z.string().min(1, "Informe o nome"),
});

type Values = z.infer<typeof schema>;

interface Entity {
  id: string;
  name: string;
}

function apiError(fields?: Record<string, string[]>): AxiosError {
  const headers = new AxiosHeaders();
  return new AxiosError("Request failed", "ERR_BAD_REQUEST", { headers }, null, {
    data: { detail: "Dados inválidos.", code: "validation_error", fields },
    status: 400,
    statusText: "Bad Request",
    headers,
    config: { headers },
  });
}

interface HarnessProps {
  entity?: Entity | null;
  onClose?: () => void;
  onSaved?: (result: Entity) => void;
  createFn?: (values: Values) => Promise<Entity>;
  updateFn?: (values: Values) => Promise<Entity>;
}

function Harness({
  entity = null,
  onClose = () => {},
  onSaved,
  createFn = async (values) => ({ id: "new", ...values }),
  updateFn = async (values) => ({ id: "existing", ...values }),
}: HarnessProps) {
  const create = useMutation({ mutationFn: createFn });
  const update = useMutation({ mutationFn: updateFn });

  const { form, isEditing, isPending, submit } = useEntityForm<
    Values,
    Entity,
    Entity,
    Values
  >({
    open: true,
    entity,
    schema,
    toValues: (current) => ({ name: current?.name ?? "" }),
    create,
    update,
    onClose,
    onSaved,
    messages: { created: "Criado.", updated: "Atualizado." },
  });

  return (
    <form onSubmit={submit}>
      <label htmlFor="name">Nome</label>
      <input id="name" {...form.register("name")} />
      <span data-testid="mode">{isEditing ? "edição" : "criação"}</span>
      <span data-testid="error">{form.formState.errors.name?.message}</span>
      <button type="submit" disabled={isPending}>
        Salvar
      </button>
    </form>
  );
}

function renderHarness(props: HarnessProps = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return render(<Harness {...props} />, { wrapper: Wrapper });
}

function submitForm(): void {
  fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
}

describe("useEntityForm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sem entidade, o formulário abre vazio em modo de criação", () => {
    renderHarness();

    expect(screen.getByTestId("mode")).toHaveTextContent("criação");
    expect(screen.getByLabelText("Nome")).toHaveValue("");
  });

  it("com entidade, carrega os valores dela em modo de edição", async () => {
    renderHarness({ entity: { id: "g1", name: "Jose Antonio Silva" } });

    expect(screen.getByTestId("mode")).toHaveTextContent("edição");
    await waitFor(() =>
      expect(screen.getByLabelText("Nome")).toHaveValue("Jose Antonio Silva"),
    );
  });

  it("valida pelo schema antes de chamar a API", async () => {
    const createFn = vi.fn();
    renderHarness({ createFn });

    submitForm();

    expect(await screen.findByTestId("error")).toHaveTextContent("Informe o nome");
    expect(createFn).not.toHaveBeenCalled();
  });

  it("na criação, usa a mutação de criar e fecha no sucesso", async () => {
    const success = vi.spyOn(toast, "success");
    const createFn = vi.fn(async (values: Values) => ({ id: "new", ...values }));
    const updateFn = vi.fn();
    const onClose = vi.fn();
    const onSaved = vi.fn();
    renderHarness({ createFn, updateFn, onClose, onSaved });

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Marina" } });
    submitForm();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(createFn).toHaveBeenCalledWith({ name: "Marina" }, expect.anything());
    expect(updateFn).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalledWith({ id: "new", name: "Marina" });
    expect(success).toHaveBeenCalledWith("Criado.");
  });

  it("na edição, usa a mutação de atualizar", async () => {
    const success = vi.spyOn(toast, "success");
    const createFn = vi.fn();
    const updateFn = vi.fn(async (values: Values) => ({ id: "g1", ...values }));
    const onClose = vi.fn();
    renderHarness({ entity: { id: "g1", name: "Jose" }, createFn, updateFn, onClose });

    await waitFor(() => expect(screen.getByLabelText("Nome")).toHaveValue("Jose"));
    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Jose A." } });
    submitForm();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(updateFn).toHaveBeenCalledWith({ name: "Jose A." }, expect.anything());
    expect(createFn).not.toHaveBeenCalled();
    expect(success).toHaveBeenCalledWith("Atualizado.");
  });

  it("erro de campo do backend volta para o campo, sem fechar o dialog", async () => {
    const error = vi.spyOn(toast, "error");
    const onClose = vi.fn();
    renderHarness({
      onClose,
      createFn: async () => {
        throw apiError({ name: ["Já existe um hóspede com este nome."] });
      },
    });

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Marina" } });
    submitForm();

    await waitFor(() =>
      expect(screen.getByTestId("error")).toHaveTextContent(
        "Já existe um hóspede com este nome.",
      ),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
  });

  it("erro sem `fields` vira toast, sem fechar o dialog nem marcar campo", async () => {
    const error = vi.spyOn(toast, "error");
    const onClose = vi.fn();
    renderHarness({
      onClose,
      createFn: async () => {
        throw apiError();
      },
    });

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Marina" } });
    submitForm();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled(),
    );
    expect(screen.getByTestId("error")).toBeEmptyDOMElement();
    expect(onClose).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith("Dados inválidos.");
  });

  it("sem `onSaved`, o sucesso apenas fecha", async () => {
    const onClose = vi.fn();
    renderHarness({ onClose });

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Marina" } });
    submitForm();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});
