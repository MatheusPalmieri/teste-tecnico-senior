import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";
import { z } from "zod";

type FilterShape = Record<string, unknown>;

interface ActiveChip {
  key: string;
  value: unknown;
}

interface UseUrlFiltersResult<TFilters extends FilterShape> {
  filters: TFilters;
  setFilter: <K extends keyof TFilters>(key: K, value: TFilters[K]) => void;
  setFilters: (patch: Partial<TFilters>) => void;
  clearFilter: (key: keyof TFilters) => void;
  clearAll: () => void;
  activeChips: ActiveChip[];
}

function serializeValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (Array.isArray(value)) return value.length > 0 ? value.join(",") : null;
  return String(value);
}

function getArrayKeys(schema: z.ZodType): Set<string> {
  const keys = new Set<string>();
  if (!(schema instanceof z.ZodObject)) return keys;

  for (const [key, fieldSchema] of Object.entries(schema.shape)) {
    let inner = fieldSchema as z.ZodType;
    while (
      inner instanceof z.ZodDefault ||
      inner instanceof z.ZodOptional ||
      inner instanceof z.ZodNullable
    ) {
      inner = inner.unwrap() as z.ZodType;
    }
    if (inner instanceof z.ZodArray) keys.add(key);
  }
  return keys;
}

function paramsToRecord(
  params: URLSearchParams,
  arrayKeys: Set<string>,
): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    record[key] = arrayKeys.has(key) ? values : (values[0] ?? "");
  }
  return record;
}

export function useUrlFilters<TSchema extends z.ZodType<FilterShape>>(
  schema: TSchema,
): UseUrlFiltersResult<z.infer<TSchema>> {
  type TFilters = z.infer<TSchema>;

  const [searchParams, setSearchParams] = useSearchParams();

  const defaults = useMemo<TFilters>(() => schema.parse({}) as TFilters, [schema]);
  const arrayKeys = useMemo(() => getArrayKeys(schema), [schema]);

  const filters = useMemo<TFilters>(() => {
    const raw = paramsToRecord(searchParams, arrayKeys);
    const result = schema.safeParse(raw);
    return result.success ? result.data : defaults;
  }, [searchParams, schema, defaults, arrayKeys]);

  const writeFilters = useCallback(
    (patch: Partial<TFilters>) => {
      setSearchParams(
        (previous) => {
          const nextParams = new URLSearchParams(previous);
          for (const key of Object.keys(patch)) {
            const value = patch[key];
            const isDefault = JSON.stringify(value) === JSON.stringify(defaults[key]);
            nextParams.delete(key);
            if (isDefault) continue;

            if (Array.isArray(value)) {
              for (const item of value) {
                if (item !== undefined && item !== null && item !== "") {
                  nextParams.append(key, String(item));
                }
              }
            } else {
              const serialized = serializeValue(value);
              if (serialized !== null) nextParams.set(key, serialized);
            }
          }
          return nextParams;
        },
        { replace: true },
      );
    },
    [defaults, setSearchParams],
  );

  const setFilter = useCallback(
    <K extends keyof TFilters>(key: K, value: TFilters[K]) => {
      const shouldResetPage = key !== "page" && "page" in defaults;
      const patch = { [key]: value } as unknown as Partial<TFilters>;
      if (shouldResetPage) (patch as Record<string, unknown>).page = 1;
      writeFilters(patch);
    },
    [defaults, writeFilters],
  );

  const setFilters = useCallback(
    (patch: Partial<TFilters>) => {
      const shouldResetPage = !("page" in patch) && "page" in defaults;
      const nextPatch = { ...patch } as Record<string, unknown>;
      if (shouldResetPage) nextPatch.page = 1;
      writeFilters(nextPatch as Partial<TFilters>);
    },
    [defaults, writeFilters],
  );

  const clearFilter = useCallback(
    (key: keyof TFilters) => {
      const shouldResetPage = key !== "page" && "page" in defaults;
      const patch = { [key]: defaults[key] } as Partial<TFilters>;
      if (shouldResetPage) (patch as Record<string, unknown>).page = 1;
      writeFilters(patch);
    },
    [defaults, writeFilters],
  );

  const clearAll = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const activeChips = useMemo<ActiveChip[]>(() => {
    return Object.keys(filters)
      .filter((key) => key !== "page" && key !== "page_size")
      .filter((key) => JSON.stringify(filters[key]) !== JSON.stringify(defaults[key]))
      .map((key) => ({ key, value: filters[key] }));
  }, [filters, defaults]);

  return { filters, setFilter, setFilters, clearFilter, clearAll, activeChips };
}
