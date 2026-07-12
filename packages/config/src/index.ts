export const PRODUCT_NAME = "CrediCel";
export const CURRENCY = "HNL";
export function requiredEnvironment(environment: Readonly<Record<string,string | undefined>>, key: string): string { const value = environment[key]; if (!value) throw new Error(`Missing environment variable: ${key}`); return value; }
