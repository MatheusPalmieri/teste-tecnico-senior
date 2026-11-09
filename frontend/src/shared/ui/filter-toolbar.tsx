import type { ReactNode } from "react";

import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { SearchInput } from "@/shared/ui/search-input";

interface FilterToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  activeFilterCount: number;
  onClearFilters: () => void;
  className?: string;
  leading?: ReactNode;
  children: ReactNode;
}

export function FilterToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Buscar...",
  activeFilterCount,
  onClearFilters,
  className,
  leading,
  children,
}: FilterToolbarProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {leading}
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          className="w-full sm:ml-auto sm:w-72"
        />
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {children}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Limpar tudo
          </Button>
        )}
      </div>
    </div>
  );
}
