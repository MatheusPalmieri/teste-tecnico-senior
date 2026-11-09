export interface DashboardSummary {
  reference_date: string;
  in_house_count: number;
  arrivals_today_count: number;
  departures_today_count: number;
  awaiting_check_in_count: number;
  late_check_out_count: number;
  occupancy_rate: string;
  revenue_month: string;
}
