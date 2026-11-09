import { useQuery } from "@tanstack/react-query";

import { Callout } from "@/shared/ui/callout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

import { reservationsApi } from "../api/reservations-api";
import { reservationKeys } from "../api/query-keys";

interface RoomSelectProps {
  value: string;
  onChange: (room: string) => void;
  checkInDate: string;
  checkOutDate: string;
  excludeReservationId?: string;
}

export function RoomSelect({
  value,
  onChange,
  checkInDate,
  checkOutDate,
  excludeReservationId,
}: RoomSelectProps) {
  const hasPeriod = Boolean(checkInDate && checkOutDate && checkOutDate > checkInDate);

  const { data, isLoading } = useQuery({
    queryKey: reservationKeys.availableRooms(
      checkInDate,
      checkOutDate,
      excludeReservationId,
    ),
    queryFn: () =>
      reservationsApi.availableRooms({
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        exclude_reservation: excludeReservationId,
      }),
    enabled: hasPeriod,
  });

  if (!hasPeriod) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Escolha o período primeiro" />
        </SelectTrigger>
        <SelectContent />
      </Select>
    );
  }

  const isFullyBooked = !isLoading && data && data.available.length === 0;

  if (isFullyBooked) {
    return (
      <Callout title="Nenhum quarto disponível no período escolhido">
        Os {data.total_rooms} quartos estão ocupados neste período. Ajuste as datas para
        continuar.
      </Callout>
    );
  }

  return (
    <Select value={value} onValueChange={onChange} disabled={isLoading}>
      <SelectTrigger>
        <SelectValue
          placeholder={isLoading ? "Carregando quartos..." : "Selecione um quarto"}
        />
      </SelectTrigger>
      <SelectContent>
        {data?.available.map((room) => (
          <SelectItem key={room} value={room}>
            {room}
          </SelectItem>
        ))}
        {data?.occupied.map((room) => (
          <SelectItem key={room} value={room} disabled>
            {room} (ocupado)
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
