import { Printer } from "lucide-react";

import { ChargesBreakdown, type Reservation } from "@/features/reservations";
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

interface CheckOutReceiptDialogProps {
  reservation: Reservation | null;
  onOpenChange: (open: boolean) => void;
}

export function CheckOutReceiptDialog({
  reservation,
  onOpenChange,
}: CheckOutReceiptDialogProps) {
  return (
    <Dialog
      open={reservation !== null}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent className="max-w-xl print:shadow-none">
        <DialogHeader>
          <DialogTitle>Recibo — {reservation?.code}</DialogTitle>
          <DialogDescription>
            {reservation?.guest.name} · Quarto {reservation?.room}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          {reservation?.charges_snapshot && (
            <ChargesBreakdown breakdown={reservation.charges_snapshot} />
          )}
        </DialogBody>
        <DialogFooter className="print:hidden">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
