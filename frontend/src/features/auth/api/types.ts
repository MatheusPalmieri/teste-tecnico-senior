export interface AuthUser {
  id: string;
  name: string;
  email: string;
  date_joined: string;
}

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface ApiError {
  detail: string;
  code: string;
  fields?: Record<string, string[]>;
}
