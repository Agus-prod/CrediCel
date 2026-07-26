import "server-only";

import { exec, execFile } from "node:child_process";
import { promisify } from "node:util";
import { GoogleAuth, Impersonated } from "google-auth-library";

const execFileAsync = promisify(execFile);
const execAsync = promisify(exec);
const androidManagementScope =
  "https://www.googleapis.com/auth/androidmanagement";
const apiBase = "https://androidmanagement.googleapis.com/v1";

export type AndroidEnrollmentToken = {
  readonly name: string;
  readonly qrCode: string;
  readonly expirationTimestamp: string;
};

function requiredEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta configurar ${name}`);
  return value;
}

function validateResourceName(value: string, pattern: RegExp, label: string) {
  if (!pattern.test(value)) throw new Error(`${label} de Google no válido`);
  return value;
}

async function localGcloudAccessToken() {
  if (process.env.NODE_ENV === "production") return null;
  const serviceAccount = requiredEnvironment("GOOGLE_MDM_SERVICE_ACCOUNT");
  if (!/^[a-z0-9-]+@[a-z0-9-]+\.iam\.gserviceaccount\.com$/.test(serviceAccount)) {
    throw new Error("Cuenta de servicio MDM no válida");
  }
  const configuredPath = process.env.GCLOUD_COMMAND?.trim();
  const executable =
    configuredPath ||
    (process.platform === "win32"
      ? "C:\\Program Files (x86)\\Google\\Cloud SDK\\google-cloud-sdk\\bin\\gcloud.cmd"
      : "gcloud");
  const argumentsList = [
    "auth",
    "print-access-token",
    `--impersonate-service-account=${serviceAccount}`,
    `--scopes=${androidManagementScope}`,
  ];
  const { stdout } = process.platform === "win32"
    ? await execAsync(
        `"${executable.replaceAll('"', '')}" ${argumentsList.join(" ")}`,
        { shell: process.env.ComSpec || "cmd.exe" },
      )
    : await execFileAsync(executable, argumentsList);
  return stdout.trim() || null;
}

async function accessToken() {
  const auth = new GoogleAuth({ scopes: [androidManagementScope] });
  try {
    const sourceClient = await auth.getClient();
    const serviceAccount = process.env.GOOGLE_MDM_SERVICE_ACCOUNT?.trim();
    const client =
      process.env.GOOGLE_MDM_USE_IMPERSONATION === "true" && serviceAccount
        ? new Impersonated({
            sourceClient,
            targetPrincipal: serviceAccount,
            targetScopes: [androidManagementScope],
            lifetime: 3600,
          })
        : sourceClient;
    const result = await client.getAccessToken();
    if (result.token) return result.token;
  } catch (error) {
    const localToken = await localGcloudAccessToken();
    if (localToken) return localToken;
    throw error;
  }
  const localToken = await localGcloudAccessToken();
  if (!localToken) throw new Error("Google no entregó un token de acceso");
  return localToken;
}

async function googleRequest<T>(path: string, init: RequestInit) {
  const token = await accessToken();
  const response = await fetch(`${apiBase}/${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(
      body?.error?.message ||
        `Android Management API respondió ${response.status}`,
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export async function createAndroidEnrollmentToken({
  enrollmentId,
  durationHours,
}: {
  readonly enrollmentId: string;
  readonly durationHours: 1 | 8 | 24;
}) {
  const enterprise = validateResourceName(
    requiredEnvironment("GOOGLE_ANDROID_ENTERPRISE_NAME"),
    /^enterprises\/[A-Za-z0-9_-]+$/,
    "Empresa Android",
  );
  const policyId = validateResourceName(
    requiredEnvironment("GOOGLE_ANDROID_POLICY_ID"),
    /^[A-Za-z0-9_-]+$/,
    "Política Android",
  );
  if (!/^[0-9a-f-]{36}$/i.test(enrollmentId)) {
    throw new Error("Identificador de enrolamiento no válido");
  }
  return googleRequest<AndroidEnrollmentToken>(
    `${enterprise}/enrollmentTokens`,
    {
      method: "POST",
      body: JSON.stringify({
        policyName: `${enterprise}/policies/${policyId}`,
        duration: `${durationHours * 3600}s`,
        oneTimeOnly: true,
        allowPersonalUsage: "PERSONAL_USAGE_DISALLOWED",
        additionalData: enrollmentId,
      }),
    },
  );
}

export async function deleteAndroidEnrollmentToken(name: string) {
  const validName = validateResourceName(
    name,
    /^enterprises\/[A-Za-z0-9_-]+\/enrollmentTokens\/[A-Za-z0-9_-]+$/,
    "Token Android",
  );
  await googleRequest<void>(validName, { method: "DELETE" });
}
