import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const deriveKey = (password: string, salt: string) =>
  new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await deriveKey(password, salt);
  return `scrypt$${salt}$${key.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algorithm, salt, storedKey] = stored.split('$');
  if (
    algorithm !== 'scrypt' ||
    !/^[a-f0-9]{32}$/.test(salt ?? '') ||
    !/^[a-f0-9]{128}$/.test(storedKey ?? '')
  ) {
    return false;
  }

  const expected = Buffer.from(storedKey, 'hex');
  const actual = await deriveKey(password, salt);
  return timingSafeEqual(actual, expected);
}
