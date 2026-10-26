export interface LoginRequest {
  username: string;
  password: string;
  client: string;
}

export interface AuthenticatedUser {
  username: string;
  displayName?: string;
  role?: string;
}

export interface LoginResponse {
  token?: string;
  user: AuthenticatedUser;
}

export interface SessionUser {
  username?: string;
  displayName?: string;
  role?: string;
}

export interface UserPreferences {
  theme: string;
  showTips: boolean;
  compact: boolean;
}

export interface TaskRecord {
  id?: number | string;
  status: string;
  priority?: string;
  owner?: string;
  label?: string;
  title?: string;
  description?: string;
}

export interface LoginMessage {
  title: string;
  detail?: string;
}
