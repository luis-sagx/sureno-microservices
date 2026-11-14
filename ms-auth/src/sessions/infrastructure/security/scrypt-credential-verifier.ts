import { Injectable } from '@nestjs/common';
import { verifyPassword } from '../../../identity/infrastructure/security/scrypt-password-hasher.js';
import type { CredentialVerifier } from '../../application/credential-verifier.port.js';

@Injectable()
export class ScryptCredentialVerifier implements CredentialVerifier {
  verify(password: string, storedHash: string): Promise<boolean> {
    return verifyPassword(password, storedHash);
  }
}
