import { scryptSync, randomBytes, timingSafeEqual } from 'node:crypto';

export function hashPassword(pwd: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pwd, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(pwd: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(pwd, salt, 64);
  return timingSafeEqual(Buffer.from(hash, 'hex'), candidate);
}
