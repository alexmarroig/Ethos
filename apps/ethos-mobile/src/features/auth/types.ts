export type AuthUser = {
  id: string;
  email: string;
  role: 'psychologist' | 'admin';
};

export type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};
