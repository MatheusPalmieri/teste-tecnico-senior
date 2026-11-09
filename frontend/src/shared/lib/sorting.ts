import { z } from "zod";

export type SortDirection = "asc" | "desc";

export const sortDirectionSchema = z.enum(["asc", "desc"]);

export function sortFilterSchema<const TFields extends readonly [string, ...string[]]>(
  fields: TFields,
  defaultField: TFields[number] | "",
  defaultDirection: SortDirection = "asc",
) {
  return {
    sort: z
      .union([z.enum(fields), z.literal("")])
      .catch(defaultField)
      .default(defaultField),
    order: sortDirectionSchema.catch(defaultDirection).default(defaultDirection),
  };
}

export function toOrderingParam(
  sort: string,
  order: SortDirection,
  fieldMap: Readonly<Record<string, string>> = {},
): string {
  const field = fieldMap[sort] ?? sort;
  return order === "desc" ? `-${field}` : field;
}
