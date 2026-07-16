import { z } from "zod";
export const normalizedDni = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().min(8).max(20));
export const branchSchema = z.object({
  name: z.string().min(2),
  code: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[A-Z0-9-]+$/),
  businessUnitId: z.string().uuid(),
  branchType: z.enum(["store", "warehouse", "office"]),
  address: z.string().min(5),
  phone: z.string().max(30).nullable(),
});
export const customerSchema = z.object({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  dni: normalizedDni,
  phone: z.string().min(8).max(30),
  email: z.string().email().nullable(),
});

export const businessUnitSchema = z.object({
  legalName: z.string().trim().min(2).max(180),
  commercialName: z.string().trim().min(2).max(120),
  ownerName: z.string().trim().min(2).max(150),
  rtn: z
    .string()
    .transform((value) => value.replace(/\D/g, ""))
    .pipe(z.string().length(14)),
});

export const inventoryTransferSchema = z
  .object({
    origin: z.string().uuid(),
    destination: z.string().uuid(),
    inventoryIds: z.array(z.string().uuid()).min(1),
    transferOwnership: z.boolean(),
    destinationOwnerBusinessUnitId: z.string().uuid().nullable(),
  })
  .superRefine((transfer, context) => {
    if (transfer.origin === transfer.destination) {
      context.addIssue({
        code: "custom",
        path: ["destination"],
        message: "El origen y el destino deben ser diferentes",
      });
    }

    if (
      transfer.transferOwnership &&
      transfer.destinationOwnerBusinessUnitId === null
    ) {
      context.addIssue({
        code: "custom",
        path: ["destinationOwnerBusinessUnitId"],
        message: "Seleccione la unidad propietaria de destino",
      });
    }
  });

export const transferScanSchema = z.object({
  transferId: z.string().uuid(),
  imeis: z.array(z.string().regex(/^\d{14,16}$/)).min(1),
});

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use una fecha válida");

export const configurationDraftSchema = z
  .object({
    versionId: z.string().uuid(),
    minimumDownPaymentPercentage: z.coerce.number().min(0).max(90),
    maximumTermMonths: z.coerce.number().int().min(1).max(120),
    maximumPaymentIncomePercentage: z.coerce.number().min(1).max(100),
    minimumEmploymentMonths: z.coerce.number().int().min(0).max(600),
    requireGuarantorBelowScore: z.coerce.number().int().min(0).max(100),
    effectiveFrom: isoDateSchema,
    effectiveUntil: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      isoDateSchema.nullable(),
    ),
  })
  .superRefine((configuration, context) => {
    if (
      configuration.effectiveUntil !== null &&
      configuration.effectiveUntil <= configuration.effectiveFrom
    ) {
      context.addIssue({
        code: "custom",
        path: ["effectiveUntil"],
        message: "La fecha final debe ser posterior a la fecha inicial",
      });
    }
  });

export const configurationVersionStateSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  status: z.enum(["draft", "active", "retired"]),
  published_at: z.string().nullable(),
  effective_from: z.string(),
  effective_until: z.string().nullable(),
  values: z.object({
    "credit.minimum_down_payment_percentage": z.number(),
    "credit.maximum_term_months": z.number(),
    "credit.maximum_payment_income_percentage": z.number(),
    "credit.minimum_employment_months": z.number(),
    "credit.require_guarantor_below_score": z.number(),
  }),
});

export const configurationStateSchema = z.object({
  active: configurationVersionStateSchema.nullable(),
  draft: configurationVersionStateSchema.nullable(),
});
