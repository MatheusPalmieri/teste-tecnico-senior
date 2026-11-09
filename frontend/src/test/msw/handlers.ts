import { HttpResponse, http } from "msw";

const API_URL = "http://localhost:8000/api";

export const handlers = [
  http.get(`${API_URL}/auth/me/`, () =>
    HttpResponse.json(
      { detail: "Não autenticado.", code: "not_authenticated" },
      { status: 401 },
    ),
  ),

  http.post(`${API_URL}/auth/login/`, async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };
    if (body.email === "atendente@hotel.com" && body.password === "senha123") {
      return HttpResponse.json({
        user: {
          id: "1",
          name: "Atendente Demo",
          email: "atendente@hotel.com",
          date_joined: "2026-01-01T00:00:00-03:00",
        },
      });
    }
    return HttpResponse.json(
      { detail: "E-mail ou senha inválidos.", code: "invalid_credentials" },
      { status: 401 },
    );
  }),

  http.post(`${API_URL}/auth/register/`, async ({ request }) => {
    const body = (await request.json()) as {
      name: string;
      email: string;
      password: string;
    };

    if (body.email === "atendente@hotel.com") {
      return HttpResponse.json(
        {
          detail: "Este e-mail já está em uso.",
          code: "email_taken",
          fields: { email: ["Este e-mail já está em uso."] },
        },
        { status: 400 },
      );
    }

    if (body.password === "P@ssword1") {
      return HttpResponse.json(
        {
          detail: "Dados inválidos.",
          code: "password_too_weak",
          fields: { password: ["Esta senha é muito comum."] },
        },
        { status: 400 },
      );
    }

    return HttpResponse.json(
      {
        user: {
          id: "2",
          name: body.name,
          email: body.email,
          date_joined: "2026-09-07T00:00:00-03:00",
        },
      },
      { status: 201 },
    );
  }),

  http.post(`${API_URL}/auth/logout/`, () => new HttpResponse(null, { status: 204 })),

  http.post(`${API_URL}/auth/refresh/`, () =>
    HttpResponse.json(
      { detail: "Refresh token ausente.", code: "token_not_valid" },
      { status: 401 },
    ),
  ),

  http.get(`${API_URL}/guests/`, () =>
    HttpResponse.json({
      count: 2,
      next: null,
      previous: null,
      results: [
        {
          id: "g1",
          name: "Jose Antonio Silva",
          document_type: "CPF",
          document: "12345678900",
          phone: "11988887777",
          email: "jose@example.com",
          notes: "",
          current_status: "CHECKED_IN",
          current_reservation: {
            id: "r1",
            code: "R-0001",
            check_in_date: "2026-09-03",
            check_out_date: "2026-09-06",
            room: "204",
            uses_parking: true,
            status: "CHECKED_IN",
          },
          created_at: "2026-09-01T00:00:00Z",
          updated_at: "2026-09-01T00:00:00Z",
        },
        {
          id: "g2",
          name: "Maria Fernanda",
          document_type: "CPF",
          document: "98765432100",
          phone: "11977776666",
          email: "",
          notes: "",
          current_status: null,
          current_reservation: null,
          created_at: "2026-09-01T00:00:00Z",
          updated_at: "2026-09-01T00:00:00Z",
        },
      ],
    }),
  ),

  http.post(`${API_URL}/guests/`, async ({ request }) => {
    const body = (await request.json()) as { document: string };
    if (body.document === "98765432100") {
      return HttpResponse.json(
        {
          detail: "Já existe um hóspede com este documento.",
          code: "guest_document_taken",
          fields: { document: ["Já existe um hóspede com este documento."] },
        },
        { status: 409 },
      );
    }
    return HttpResponse.json(
      {
        id: "g3",
        name: "Novo Hóspede",
        document_type: "CPF",
        document: body.document,
        phone: "11966665555",
        email: "",
        notes: "",
        current_status: null,
        current_reservation: null,
        created_at: "2026-09-01T00:00:00Z",
        updated_at: "2026-09-01T00:00:00Z",
      },
      { status: 201 },
    );
  }),

  http.get(`${API_URL}/reservations/`, () =>
    HttpResponse.json({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: "r1",
          code: "R-0001",
          guest: {
            id: "g1",
            name: "Jose Antonio Silva",
            document: "12345678900",
            phone: "11988887777",
          },
          status: "RESERVED",
          check_in_date: "2026-09-03",
          check_out_date: "2026-09-06",
          room: "204",
          uses_parking: true,
          vehicle_plate: "",
          notes: "",
          checked_in_at: null,
          checked_out_at: null,
          early_check_in_authorized: false,
          total_amount: null,
          charges_snapshot: null,
          estimated_total: "470.00",
          created_at: "2026-09-01T00:00:00Z",
        },
      ],
    }),
  ),

  http.get(`${API_URL}/rooms/available/`, () =>
    HttpResponse.json({
      total_rooms: 15,
      available: ["101", "102", "103"],
      occupied: ["104", "105"],
    }),
  ),

  http.post(`${API_URL}/reservations/quote/`, () =>
    HttpResponse.json({
      nights: 3,
      lines: [
        {
          kind: "NIGHTLY",
          day_type: "WEEKDAY",
          description: "Diárias de segunda a sexta",
          quantity: 2,
          unit_amount: "120.00",
          amount: "240.00",
        },
        {
          kind: "NIGHTLY",
          day_type: "WEEKEND",
          description: "Diárias de sábado e domingo",
          quantity: 1,
          unit_amount: "180.00",
          amount: "180.00",
        },
        {
          kind: "PARKING",
          day_type: "WEEKDAY",
          description: "Vaga de garagem - segunda a sexta",
          quantity: 2,
          unit_amount: "15.00",
          amount: "30.00",
        },
        {
          kind: "PARKING",
          day_type: "WEEKEND",
          description: "Vaga de garagem — sábado e domingo",
          quantity: 1,
          unit_amount: "20.00",
          amount: "20.00",
        },
      ],
      nightly_subtotal: "420.00",
      parking_subtotal: "50.00",
      late_check_out_fee: "0.00",
      total: "470.00",
    }),
  ),

  http.get(`${API_URL}/reservations/arrivals/`, ({ request }) => {
    if (new URL(request.url).searchParams.get("scope") === "history") {
      return HttpResponse.json({
        count: 1,
        results: [
          {
            id: "r9",
            code: "R-0009",
            guest: {
              id: "g2",
              name: "Marina Souza",
              document: "98765432100",
              phone: "11977776666",
            },
            status: "CHECKED_OUT",
            check_in_date: "2026-08-20",
            check_out_date: "2026-08-23",
            room: "101",
            uses_parking: false,
            is_overdue: false,
          },
        ],
      });
    }
    return HttpResponse.json({
      count: 1,
      results: [
        {
          id: "r1",
          code: "R-0001",
          guest: {
            id: "g1",
            name: "Jose Antonio Silva",
            document: "12345678900",
            phone: "11988887777",
          },
          status: "RESERVED",
          check_in_date: "2026-09-03",
          check_out_date: "2026-09-06",
          room: "204",
          uses_parking: true,
          is_overdue: false,
        },
      ],
    });
  }),

  http.post(`${API_URL}/reservations/:id/check-in/`, () =>
    HttpResponse.json({
      id: "r1",
      code: "R-0001",
      guest: {
        id: "g1",
        name: "Jose Antonio Silva",
        document: "12345678900",
        phone: "11988887777",
      },
      status: "CHECKED_IN",
      check_in_date: "2026-09-03",
      check_out_date: "2026-09-06",
      room: "204",
      uses_parking: true,
      vehicle_plate: "",
      notes: "",
      checked_in_at: "2026-09-03T17:00:00Z",
      checked_out_at: null,
      early_check_in_authorized: false,
      total_amount: null,
      charges_snapshot: null,
      estimated_total: "470.00",
      created_at: "2026-09-01T00:00:00Z",
    }),
  ),

  http.get(`${API_URL}/reservations/departures/`, ({ request }) => {
    if (new URL(request.url).searchParams.get("scope") === "history") {
      return HttpResponse.json({
        count: 1,
        results: [
          {
            id: "r8",
            code: "R-0008",
            guest: {
              id: "g2",
              name: "Marina Souza",
              document: "98765432100",
              phone: "11977776666",
            },
            status: "CHECKED_OUT",
            check_in_date: "2026-08-20",
            check_out_date: "2026-08-23",
            room: "101",
            uses_parking: false,
            is_late_check_out: false,
          },
        ],
      });
    }
    return HttpResponse.json({
      count: 1,
      results: [
        {
          id: "r2",
          code: "R-0002",
          guest: {
            id: "g1",
            name: "Jose Antonio Silva",
            document: "12345678900",
            phone: "11988887777",
          },
          status: "CHECKED_IN",
          check_in_date: "2026-09-03",
          check_out_date: "2026-09-06",
          room: "204",
          uses_parking: true,
          is_late_check_out: true,
        },
      ],
    });
  }),

  http.get(`${API_URL}/reservations/:id/`, ({ params }) =>
    HttpResponse.json({
      id: params.id,
      code: "R-0001",
      guest: {
        id: "g1",
        name: "Jose Antonio Silva",
        document: "12345678900",
        phone: "11988887777",
      },
      status: "RESERVED",
      check_in_date: "2026-09-03",
      check_out_date: "2026-09-06",
      room: "204",
      uses_parking: true,
      vehicle_plate: "",
      notes: "",
      checked_in_at: null,
      checked_out_at: null,
      early_check_in_authorized: false,
      total_amount: null,
      charges_snapshot: null,
      estimated_total: "470.00",
      created_at: "2026-09-01T00:00:00Z",
    }),
  ),

  http.get(`${API_URL}/reservations/:id/check-out-preview/`, () =>
    HttpResponse.json({
      nights: 3,
      lines: [
        {
          kind: "NIGHTLY",
          day_type: "WEEKDAY",
          description: "Diárias de segunda a sexta",
          quantity: 2,
          unit_amount: "120.00",
          amount: "240.00",
        },
        {
          kind: "NIGHTLY",
          day_type: "WEEKEND",
          description: "Diárias de sábado e domingo",
          quantity: 1,
          unit_amount: "180.00",
          amount: "180.00",
        },
        {
          kind: "LATE_CHECK_OUT",
          day_type: null,
          description: "Multa de late check-out",
          quantity: 1,
          unit_amount: "90.00",
          amount: "90.00",
        },
      ],
      nightly_subtotal: "420.00",
      parking_subtotal: "0.00",
      late_check_out_fee: "90.00",
      total: "510.00",
      is_late_check_out: true,
      check_out_deadline: "12:00",
      current_time: "14:30",
    }),
  ),

  http.post(`${API_URL}/reservations/:id/check-out/`, () =>
    HttpResponse.json({
      id: "r2",
      code: "R-0002",
      guest: {
        id: "g1",
        name: "Jose Antonio Silva",
        document: "12345678900",
        phone: "11988887777",
      },
      status: "CHECKED_OUT",
      check_in_date: "2026-09-03",
      check_out_date: "2026-09-06",
      room: "204",
      uses_parking: false,
      vehicle_plate: "",
      notes: "",
      checked_in_at: "2026-09-03T17:00:00Z",
      checked_out_at: "2026-09-06T17:30:00Z",
      early_check_in_authorized: false,
      total_amount: "510.00",
      charges_snapshot: {
        nights: 3,
        lines: [],
        nightly_subtotal: "420.00",
        parking_subtotal: "0.00",
        late_check_out_fee: "90.00",
        total: "510.00",
      },
      estimated_total: null,
      created_at: "2026-09-01T00:00:00Z",
    }),
  ),

  http.patch(`${API_URL}/auth/me/`, async ({ request }) => {
    const body = (await request.json()) as { name?: string; email?: string };
    return HttpResponse.json({
      id: "1",
      name: body.name ?? "Atendente Demo",
      email: body.email ?? "atendente@hotel.com",
      date_joined: "2026-01-01T00:00:00-03:00",
    });
  }),

  http.post(
    `${API_URL}/auth/change-password/`,
    () => new HttpResponse(null, { status: 204 }),
  ),

  http.get(`${API_URL}/dashboard/summary/`, () =>
    HttpResponse.json({
      reference_date: "2026-09-03",
      in_house_count: 12,
      arrivals_today_count: 5,
      departures_today_count: 4,
      awaiting_check_in_count: 3,
      late_check_out_count: 1,
      occupancy_rate: "0.80",
      revenue_month: "18450.00",
    }),
  ),
];
