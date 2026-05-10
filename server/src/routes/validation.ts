export function requireField(body: Record<string, unknown>, field: string, label: string): string {
  const value = body[field];
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required`);
  }
  return value.trim();
}

export function optionalString(body: Record<string, unknown>, field: string): string | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  return String(value);
}

export function optionalInt(
  body: Record<string, unknown>,
  field: string,
  min: number,
  max: number,
): number | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (!Number.isInteger(num) || num < min || num > max) {
    throw new Error(`${field} must be an integer between ${min} and ${max}`);
  }
  return num;
}

export function optionalEnum<T extends string>(
  body: Record<string, unknown>,
  field: string,
  allowed: readonly T[],
  label: string,
): T | undefined {
  const value = body[field];
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${label} must be one of: ${allowed.join(', ')}`);
  }
  return value as T;
}

export const VALID_STATUSES = ['todo', 'analyzing', 'in-progress', 'review', 'merged'] as const;
export const VALID_PRIORITIES = ['low', 'normal', 'high'] as const;
