import { createHmac } from 'node:crypto';

export function createHash(secret) {
  if (!secret) throw new Error('SERVER_SECRET is required');
  return function hash(value) {
    if (value == null) return null;
    const normalized = String(value).trim().toLowerCase();
    return createHmac('sha256', secret).update(normalized).digest('hex');
  };
}
