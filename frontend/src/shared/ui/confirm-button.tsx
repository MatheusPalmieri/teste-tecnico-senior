import { useEffect, useRef, useState } from "react";

import { cn } from "@/shared/lib/cn";
import { Button, type ButtonProps } from "@/shared/ui/button";

const ARM_TIMEOUT_MS = 4000;
const IGNORE_WINDOW_MS = 300;

interface ConfirmButtonProps extends Omit<ButtonProps, "onClick"> {
  label: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export function ConfirmButton({
  label,
  confirmLabel,
  onConfirm,
  className,
  ...props
}: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false);
  const armedAtRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timeoutRef.current), []);

  function handleClick() {
    if (!armed) {
      setArmed(true);
      armedAtRef.current = Date.now();
      timeoutRef.current = setTimeout(() => setArmed(false), ARM_TIMEOUT_MS);
      return;
    }

    if (Date.now() - armedAtRef.current < IGNORE_WINDOW_MS) {
      return;
    }

    clearTimeout(timeoutRef.current);
    setArmed(false);
    onConfirm();
  }

  return (
    <Button
      type="button"
      onClick={handleClick}
      className={cn(
        armed &&
          "border-warning-text bg-warning-text text-white hover:bg-warning-text hover:brightness-110",
        className,
      )}
      {...props}
    >
      <span aria-live="polite">{armed ? confirmLabel : label}</span>
    </Button>
  );
}
