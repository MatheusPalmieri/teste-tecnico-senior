import { SearchInput } from "@/shared/ui/search-input";
import { SegmentedControl } from "@/shared/ui/segmented-control";

interface ScopeOption<TScope extends string> {
  value: TScope;
  label: string;
}

interface ScopeSearchFilterBarProps<TScope extends string> {
  scope: TScope;
  onScopeChange: (scope: TScope) => void;
  scopeOptions: ScopeOption<TScope>[];
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
}

export function ScopeSearchFilterBar<TScope extends string>({
  scope,
  onScopeChange,
  scopeOptions,
  search,
  onSearchChange,
  searchPlaceholder,
}: ScopeSearchFilterBarProps<TScope>) {
  return (
    <div className="flex items-center justify-between gap-2">
      <SegmentedControl
        label="Filtrar fila por escopo"
        value={scope}
        onValueChange={(value) => onScopeChange(value as TScope)}
        options={scopeOptions}
      />
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder={searchPlaceholder}
        className="max-w-xs"
      />
    </div>
  );
}
