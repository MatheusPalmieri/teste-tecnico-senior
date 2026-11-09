import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import { guestKeys, guestsApi } from "@/features/guests";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

interface GuestComboboxProps {
  value: string;
  guestLabel?: string;
  onSelect: (guestId: string, guestLabel: string) => void;
}

export function GuestCombobox({ value, guestLabel, onSelect }: GuestComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: guestKeys.list({ search, status: "", page: 1 }),
    queryFn: () => guestsApi.list({ search, page: 1 }),
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="secondary"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value ? guestLabel : "Buscar hóspede..."}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Nome, documento ou telefone"
            value={search}
            onValueChange={setSearch}
          />
          {/* Sem isso, o scroll lock do Dialog bloqueia a rolagem do popover. */}
          <CommandList onWheel={(e) => e.stopPropagation()}>
            {isLoading && <CommandEmpty>Buscando...</CommandEmpty>}
            {!isLoading && (data?.results.length ?? 0) === 0 && (
              <CommandEmpty>Nenhum hóspede encontrado.</CommandEmpty>
            )}
            <CommandGroup>
              {data?.results.map((guest) => (
                <CommandItem
                  key={guest.id}
                  value={guest.id}
                  onSelect={() => {
                    onSelect(guest.id, guest.name);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === guest.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{guest.name}</span>
                    <span className="text-small text-neutral-500">{guest.document}</span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
