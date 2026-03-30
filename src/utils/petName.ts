export function normalizePetName(input: string, fallback: string): string {
  const trimmed = input.trim().slice(0, 12);
  return trimmed.length > 0 ? trimmed : fallback;
}
