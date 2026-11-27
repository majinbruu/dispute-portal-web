/** The value when it is one of the allowed ones, otherwise undefined. For reading URL parameters. */
export function oneOf<T extends string>(
  allowed: readonly T[],
  value: string | null,
): T | undefined {
  return allowed.find((candidate) => candidate === value);
}
