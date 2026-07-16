import { headers } from "next/headers";
import { resolvePublicAppUrl } from "./public-url";

export async function getPublicAppUrl(path: string): Promise<string> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  const requestOrigin = host ? `${protocol}://${host}` : undefined;

  return resolvePublicAppUrl(
    path,
    process.env.NEXT_PUBLIC_APP_URL,
    requestOrigin,
  );
}
