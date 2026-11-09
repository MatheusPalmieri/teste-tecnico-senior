import { CompassIcon } from "lucide-react";
import { Link } from "react-router";

import { EmptyState } from "@/shared/ui/empty-state";
import { Button } from "@/shared/ui/button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <EmptyState
        icon={CompassIcon}
        title="Página não encontrada"
        description="O endereço acessado não existe ou foi movido."
        action={
          <Button asChild>
            <Link to="/">Voltar ao dashboard</Link>
          </Button>
        }
      />
    </div>
  );
}
