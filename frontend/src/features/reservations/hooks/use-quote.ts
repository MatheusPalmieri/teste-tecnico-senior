import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { reservationsApi } from "../api/reservations-api";
import { reservationKeys } from "../api/query-keys";

interface UseQuoteParams {
  checkInDate: string;
  checkOutDate: string;
  usesParking: boolean;
}

export function useQuote({ checkInDate, checkOutDate, usesParking }: UseQuoteParams) {
  const [debounced, setDebounced] = useState({ checkInDate, checkOutDate, usesParking });

  useEffect(() => {
    const timeout = setTimeout(
      () => setDebounced({ checkInDate, checkOutDate, usesParking }),
      300,
    );
    return () => clearTimeout(timeout);
  }, [checkInDate, checkOutDate, usesParking]);

  const isValid = Boolean(
    debounced.checkInDate &&
    debounced.checkOutDate &&
    debounced.checkOutDate > debounced.checkInDate,
  );

  return useQuery({
    queryKey: reservationKeys.quote(debounced),
    queryFn: () =>
      reservationsApi.quote({
        check_in_date: debounced.checkInDate,
        check_out_date: debounced.checkOutDate,
        uses_parking: debounced.usesParking,
      }),
    enabled: isValid,
  });
}
