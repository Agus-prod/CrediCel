import { z } from "zod";
export const normalizedDni = z.string().transform((value) => value.replace(/\D/g, "")).pipe(z.string().min(8).max(20));
export const branchSchema = z.object({ name: z.string().min(2), code: z.string().min(2).max(20).regex(/^[A-Z0-9-]+$/), businessUnitId: z.string().uuid(), branchType: z.enum(["store","warehouse","office"]), address: z.string().min(5), phone: z.string().max(30).nullable() });
export const customerSchema = z.object({ firstName: z.string().min(2), lastName: z.string().min(2), dni: normalizedDni, phone: z.string().min(8).max(30), email: z.string().email().nullable() });
