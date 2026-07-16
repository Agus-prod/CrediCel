const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parsePortalToken(value: string | undefined): string | null {
  const token = value?.trim();
  return token && UUID_PATTERN.test(token) ? token : null;
}
