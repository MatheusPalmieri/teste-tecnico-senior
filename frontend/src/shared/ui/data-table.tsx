import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Inbox,
  SearchX,
} from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/shared/lib/cn";

import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Skeleton, SkeletonText } from "@/shared/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- assinatura fixa do módulo aumentado
  interface ColumnMeta<TData extends RowData, TValue> {
    skeleton?: { shape?: SkeletonCellShape; width?: number | string };
  }
}

type SkeletonCellShape = "text" | "badge" | "action";

const MAX_SKELETON_ROWS = 10;

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export interface DataTablePagination {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pageSize: number;
  onPageSizeChange: (pageSize: number) => void;
  totalCount: number;
}

export interface DataTableViewProps {
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  isFiltered: boolean;
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
  pagination: DataTablePagination;
}

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  isFiltered?: boolean;
  emptyState?: { title: string; description?: string; action?: ReactNode };
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  pagination?: DataTablePagination;
}

export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  isError = false,
  onRetry,
  isFiltered = false,
  emptyState,
  sorting,
  onSortingChange,
  pagination,
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    state: sorting ? { sorting } : undefined,
    onSortingChange,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    enableSorting: sorting !== undefined,
    manualPagination: true,
    enableSortingRemoval: false,
    sortDescFirst: false,
  });

  if (isError) {
    return <ErrorState onRetry={onRetry} />;
  }

  const skeletonRows = Math.min(pagination?.pageSize ?? 5, MAX_SKELETON_ROWS);

  return (
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <Table
        className={cn(
          "[&_tbody_td:first-child]:font-medium [&_tbody_td:first-child]:text-neutral-900",
        )}
      >
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                const content = header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext());

                return (
                  <TableHead
                    key={header.id}
                    aria-sort={
                      !header.column.getCanSort()
                        ? undefined
                        : sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : "none"
                    }
                  >
                    {header.column.getCanSort() ? (
                      <button
                        type="button"
                        className={cn(
                          "flex cursor-pointer items-center gap-1 text-[11px] font-medium uppercase leading-4 tracking-[0.06em]",
                          "rounded-sm hover:text-neutral-900 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500",
                          sorted ? "text-neutral-900" : "text-neutral-600",
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {content}
                        {sorted === "asc" && <ArrowUp className="h-3.5 w-3.5" />}
                        {sorted === "desc" && <ArrowDown className="h-3.5 w-3.5" />}
                        {!sorted && (
                          <ArrowUpDown className="h-3.5 w-3.5 text-neutral-500" />
                        )}
                      </button>
                    ) : (
                      content
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: skeletonRows }).map((_, rowIndex) => (
              <TableRow key={`skeleton-${rowIndex}`} className="hover:bg-transparent">
                {columns.map((column, colIndex) => (
                  <TableCell key={`skeleton-cell-${colIndex}`}>
                    <SkeletonCell skeleton={column.meta?.skeleton} />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : data.length === 0 ? (
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={columns.length} className="whitespace-normal">
                {isFiltered ? (
                  <EmptyState
                    icon={SearchX}
                    title="Nenhum resultado encontrado"
                    description="Tente ajustar os filtros ou o termo buscado."
                    {...emptyState}
                  />
                ) : (
                  <EmptyState
                    icon={Inbox}
                    title={emptyState?.title ?? "Nada por aqui ainda"}
                    description={emptyState?.description}
                    action={emptyState?.action}
                  />
                )}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pagination && pagination.totalCount > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-caption text-neutral-600">
          <span className="tabular-nums">
            Mostrando {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.totalCount)} de{" "}
            {pagination.totalCount}
          </span>

          <Select
            value={String(pagination.pageSize)}
            onValueChange={(value) => pagination.onPageSizeChange(Number(value))}
          >
            <SelectTrigger
              className="h-7 w-[68px] text-caption"
              aria-label="Itens por página"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size} por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <nav className="ml-auto flex items-center gap-1" aria-label="Paginação">
            <PagerButton
              aria-label="Página anterior"
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </PagerButton>
            {getPagerItems(pagination.page, pagination.pageCount).map((item, index) =>
              item === "gap" ? (
                <span key={`gap-${index}`} className="px-1 text-neutral-500">
                  …
                </span>
              ) : (
                <PagerButton
                  key={item}
                  aria-label={`Página ${item}`}
                  aria-current={item === pagination.page ? "page" : undefined}
                  onClick={() => pagination.onPageChange(item)}
                >
                  {item}
                </PagerButton>
              ),
            )}
            <PagerButton
              aria-label="Próxima página"
              disabled={pagination.page >= pagination.pageCount}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </PagerButton>
          </nav>
        </div>
      )}
    </div>
  );
}

interface SkeletonCellProps {
  skeleton?: { shape?: SkeletonCellShape; width?: number | string };
}

function SkeletonCell({ skeleton }: SkeletonCellProps) {
  switch (skeleton?.shape ?? "text") {
    case "action":
      return (
        <div className="flex items-center justify-end">
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
      );
    case "badge":
      return (
        <Skeleton
          className="h-[22px] rounded-full"
          style={{ width: skeleton?.width ?? 84 }}
        />
      );
    default:
      return <SkeletonText variant="small" width={skeleton?.width ?? "80%"} />;
  }
}

function getPagerItems(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const items: (number | "gap")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) items.push("gap");
  for (let current = start; current <= end; current += 1) items.push(current);
  if (end < pageCount - 1) items.push("gap");
  items.push(pageCount);

  return items;
}

type PagerButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

function PagerButton({ className, ...props }: PagerButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md border border-neutral-200 bg-white px-1.5",
        "text-caption tabular-nums text-neutral-600 transition-colors",
        "hover:bg-neutral-100 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500",
        "disabled:pointer-events-none disabled:opacity-40",
        "aria-[current=page]:border-primary-200 aria-[current=page]:bg-primary-50 aria-[current=page]:font-medium aria-[current=page]:text-primary-700",
        className,
      )}
      {...props}
    />
  );
}
