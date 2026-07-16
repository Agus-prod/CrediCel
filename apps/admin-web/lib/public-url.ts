export function resolvePublicAppUrl(
  path: string,
  configuredUrl: string | undefined,
  requestOrigin?: string,
): string {
  const base = configuredUrl?.trim() || requestOrigin?.trim();

  if (!base) {
    throw new Error(
      "Configura NEXT_PUBLIC_APP_URL con la URL accesible de CrediCel.",
    );
  }

  let url: URL;
  try {
    url = new URL(base);
  } catch {
    throw new Error("NEXT_PUBLIC_APP_URL debe ser una URL absoluta válida.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("NEXT_PUBLIC_APP_URL debe utilizar HTTP o HTTPS.");
  }

  return new URL(path, `${url.origin}/`).toString();
}
