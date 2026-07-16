import { z } from "zod";

const money = (label: string, allowZero = false) =>
  z.string().refine((value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && (allowZero ? parsed >= 0 : parsed > 0);
  }, `${label} debe ser un monto válido.`);

const nonNegativeInteger = (label: string) =>
  z
    .string()
    .regex(/^\d+$/, `${label} debe ser un número entero.`)
    .refine((value) => Number(value) >= 0, `${label} no puede ser negativo.`);

const adultBirthDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Usa AAAA-MM-DD para la fecha de nacimiento.")
  .refine((value) => {
    const birthDate = new Date(`${value}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return false;
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    return birthDate <= cutoff;
  }, "El solicitante debe ser mayor de 18 años.");

export const applicationSchema = z
  .object({
    branchId: z.string().uuid("Selecciona una tienda."),
    inventoryUnitId: z.string().uuid("Selecciona un dispositivo."),
    dni: z
      .string()
      .transform((value) => value.replace(/\D/g, ""))
      .pipe(z.string().min(8, "El DNI es demasiado corto.").max(20)),
    firstName: z.string().trim().min(2, "Ingresa los nombres."),
    lastName: z.string().trim().min(2, "Ingresa los apellidos."),
    phone: z
      .string()
      .transform((value) => value.replace(/\D/g, ""))
      .pipe(z.string().min(8, "Ingresa un teléfono válido.").max(20)),
    email: z.union([
      z.literal(""),
      z.string().trim().email("Ingresa un correo válido."),
    ]),
    requestedPrice: money("El precio"),
    downPayment: money("La prima", true),
    term: z
      .string()
      .regex(/^\d+$/, "El plazo debe ser un número entero.")
      .refine(
        (value) => Number(value) >= 1,
        "El plazo debe ser de al menos un mes.",
      ),
    birthDate: adultBirthDate,
    maritalStatus: z.enum(["single", "married", "union", "other"]),
    dependents: nonNegativeInteger("Los dependientes"),
    currentAddress: z.string().trim().min(5, "Ingresa el domicilio actual."),
    housingType: z.enum(["owned", "rented", "family"]),
    employerName: z.string().trim().min(2, "Ingresa la empresa o actividad."),
    jobTitle: z.string(),
    monthlyIncome: money("El ingreso mensual"),
    monthlyExpenses: money("Los gastos mensuales", true),
    employmentMonths: nonNegativeInteger("La antigüedad laboral"),
    referenceOneName: z.string().trim().min(2, "Completa la referencia 1."),
    referenceOnePhone: z
      .string()
      .trim()
      .min(8, "Completa el teléfono de la referencia 1."),
    referenceOneRelationship: z
      .string()
      .trim()
      .min(2, "Completa la relación de la referencia 1."),
    referenceTwoName: z.string().trim().min(2, "Completa la referencia 2."),
    referenceTwoPhone: z
      .string()
      .trim()
      .min(8, "Completa el teléfono de la referencia 2."),
    referenceTwoRelationship: z
      .string()
      .trim()
      .min(2, "Completa la relación de la referencia 2."),
    consentDataProcessing: z.literal(true, {
      error: "Confirma el consentimiento de tratamiento de datos.",
    }),
    consentCreditReview: z.literal(true, {
      error: "Confirma el consentimiento de evaluación crediticia.",
    }),
  })
  .refine(
    (value) => Number(value.monthlyExpenses) < Number(value.monthlyIncome),
    {
      path: ["monthlyExpenses"],
      message: "Los gastos deben ser menores que los ingresos.",
    },
  )
  .refine(
    (value) => Number(value.downPayment) <= Number(value.requestedPrice),
    {
      path: ["downPayment"],
      message: "La prima no puede superar el precio.",
    },
  );

export function firstValidationMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa la información de la solicitud.";
}
