export function resolveCustomerPortalUrl(
  token: string,
  configuredUrl: string | undefined,
): string {
  const base = configuredUrl?.trim();
  if (!base) {
    throw new Error(
      "Configura NEXT_PUBLIC_CUSTOMER_PORTAL_URL con la URL del portal.",
    );
  }

  const url = new URL(base);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("La URL del portal debe utilizar HTTP o HTTPS.");
  }
  url.searchParams.set("token", token);
  return url.toString();
}
