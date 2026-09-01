export interface IAuthService {
  isAuthenticated(): Promise<boolean>;
  getUserRoles?(): Promise<string[]>;
  getAccessToken(): Promise<string>;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
}
