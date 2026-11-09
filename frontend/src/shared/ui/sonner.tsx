import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="top-right"
      duration={3000}
      closeButton
      toastOptions={{
        closeButtonAriaLabel: "Fechar notificação",
        classNames: {
          closeButton:
            "border-neutral-200 bg-white text-neutral-500 hover:text-neutral-800",
          toast:
            "rounded-lg border border-neutral-200 bg-white text-neutral-800 shadow-md",
          title: "text-body-strong",
          description: "text-small text-neutral-500",
          actionButton: "bg-primary-500 text-white",
          cancelButton: "bg-neutral-100 text-neutral-700",
        },
      }}
    />
  );
}

// eslint-disable-next-line react-refresh/only-export-components -- reexporta o helper do sonner junto do Toaster
export { toast } from "sonner";
