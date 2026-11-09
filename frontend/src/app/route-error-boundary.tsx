import { AlertTriangle } from "lucide-react";
import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/shared/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class RouteErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error("Erro não tratado em uma rota:", error, info.componentStack);
  }

  private reset = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-bg">
            <AlertTriangle className="h-8 w-8 text-danger-text" aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-1">
            <p className="text-body-strong text-neutral-800">
              Algo deu errado nesta página
            </p>
            <p className="text-small text-neutral-500">
              Tente novamente ou volte ao dashboard.
            </p>
          </div>
          <Button variant="secondary" onClick={this.reset}>
            Tentar novamente
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
