export interface CredentialVerifier {
  verify(password: string, storedHash: string): Promise<boolean>;
}
