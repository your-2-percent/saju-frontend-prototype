export interface AuthRepo {
  login: () => Promise<void>;
  logout: () => Promise<void>;
}