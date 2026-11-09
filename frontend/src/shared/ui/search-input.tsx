import { Search, X } from "lucide-react";
import { forwardRef, useEffect, useRef, useState, type InputHTMLAttributes } from "react";

import { cn } from "@/shared/lib/cn";

interface SearchInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "value"
> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, debounceMs = 300, className, ...props }, ref) => {
    const [draft, setDraft] = useState(value);
    const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

    useEffect(() => setDraft(value), [value]);

    function scheduleChange(next: string) {
      setDraft(next);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => onChange(next), debounceMs);
    }

    function clear() {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setDraft("");
      onChange("");
    }

    return (
      <div className={cn("relative flex items-center", className)}>
        <Search
          className="pointer-events-none absolute left-2.5 h-4 w-4 text-neutral-500"
          aria-hidden="true"
        />
        <input
          ref={ref}
          type="search"
          value={draft}
          onChange={(event) => scheduleChange(event.target.value)}
          className="h-8 w-full rounded-md border border-input bg-white py-1.5 pl-8 pr-8 text-small text-neutral-800 placeholder:text-neutral-500 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-cancel-button]:hidden [&::-ms-clear]:hidden"
          {...props}
        />
        {draft && (
          <button
            type="button"
            onClick={clear}
            aria-label="Limpar busca"
            className="absolute right-2.5 cursor-pointer text-neutral-500 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  },
);
SearchInput.displayName = "SearchInput";
