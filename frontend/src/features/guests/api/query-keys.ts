import type { GuestListFilters } from "./types";

export const guestKeys = {
  all: ["guests"] as const,
  lists: () => [...guestKeys.all, "list"] as const,
  list: (filters: GuestListFilters) => [...guestKeys.lists(), filters] as const,
  detail: (id: string) => [...guestKeys.all, "detail", id] as const,
};
