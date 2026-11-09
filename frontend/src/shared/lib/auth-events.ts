type Listener = () => void;

let listener: Listener | null = null;

export function onSessionExpired(callback: Listener): () => void {
  listener = callback;
  return () => {
    if (listener === callback) {
      listener = null;
    }
  };
}

export function emitSessionExpired(): void {
  listener?.();
}
