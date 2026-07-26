"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  CheckCircle2,
  ContactRound,
  FileImage,
  LoaderCircle,
  ScanLine,
  ShieldCheck,
  Smartphone,
} from "lucide-react";

import {
  identityFieldsFound,
  parseHondurasIdentityText,
} from "@/lib/honduras-id";
import type { ParsedHondurasIdentity } from "@/lib/honduras-id";
import { calculateApplicationDefaults } from "@/lib/application-defaults";
import { calculateFinancingQuote } from "@/lib/financing";
import { lookupExistingCustomer, submitCreditApplication } from "./actions";
import {
  IdentityCameraScanner,
  type IdentityScannerSide,
} from "./identity-camera-scanner";
import { SelfieCapture } from "./selfie-capture";

export type BranchOption = {
  readonly id: string;
  readonly name: string;
};

export type InventoryOption = {
  readonly branchId: string;
  readonly cashPrice: number;
  readonly description: string;
  readonly id: string;
  readonly imei: string;
};

type FormValues = {
  birth_date: string;
  current_address: string;
  dependents: string;
  dni: string;
  down_payment: string;
  email: string;
  employer_name: string;
  employment_months: string;
  first_name: string;
  housing_type: string;
  job_title: string;
  last_name: string;
  marital_status: string;
  monthly_expenses: string;
  monthly_income: string;
  phone: string;
  reference_one_name: string;
  reference_one_phone: string;
  reference_one_relationship: string;
  reference_two_name: string;
  reference_two_phone: string;
  reference_two_relationship: string;
  requested_price: string;
  sex: string;
  term: string;
};

type ReferencePrefix = "reference_one" | "reference_two";
type ValidationIssue = {
  readonly field?:
    | keyof FormValues
    | "address_proof"
    | "branch_id"
    | "inventory_unit_id"
    | "selfie";
  readonly message: string;
  readonly step: number;
};

type BarcodeResult = { readonly rawValue: string };
type BarcodeDetectorInstance = {
  detect(source: ImageBitmap): Promise<readonly BarcodeResult[]>;
};
type BarcodeDetectorConstructor = new (
  options: Readonly<{ formats: readonly string[] }>,
) => BarcodeDetectorInstance;

const steps = [
  { short: "Identidad", title: "Escanear identidad" },
  { short: "Ingresos", title: "Domicilio e ingresos" },
  { short: "Referencias", title: "Referencias personales" },
  { short: "Documentos", title: "Documentos complementarios" },
  { short: "Condiciones", title: "Dispositivo y condiciones" },
] as const;

const initialValues: FormValues = {
  birth_date: "",
  current_address: "",
  dependents: "0",
  dni: "",
  down_payment: "",
  email: "",
  employer_name: "",
  employment_months: "",
  first_name: "",
  housing_type: "owned",
  job_title: "",
  last_name: "",
  marital_status: "single",
  monthly_expenses: "",
  monthly_income: "",
  phone: "",
  reference_one_name: "",
  reference_one_phone: "",
  reference_one_relationship: "",
  reference_two_name: "",
  reference_two_phone: "",
  reference_two_relationship: "",
  requested_price: "",
  sex: "",
  term: "",
};

const relationshipOptions = [
  "Madre",
  "Padre",
  "Hermano(a)",
  "Pareja",
  "Familiar",
  "Amigo(a)",
  "Compañero(a) de trabajo",
  "Vecino(a)",
  "Otro",
];

function money(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);
}

function percent(value: number): string {
  return new Intl.NumberFormat("es-HN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function birthDateForForm(value: string): string {
  if (!value) return "";
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
  const local = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (local) return `${local[1]}-${local[2]}-${local[3]}`;
  return value;
}

function birthDateForSubmit(value: string): string {
  const local = value.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (local) return `${local[3]}-${local[2]}-${local[1]}`;
  return value;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function phoneDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function isValidDisplayBirthDate(value: string): boolean {
  const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    year >= 1900 &&
    year <= new Date().getFullYear() &&
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isPlausibleIdentityName(value: string, minimumWords = 1): boolean {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = normalized.split(" ").filter((word) => word.length >= 2);
  if (words.length < minimumWords) return false;
  if (
    /^(NOMBRE|NOMBRES|FORENAME|APELLIDO|APELLIDOS|SURNAME|APELUDO|APEIUDO)$/.test(
      normalized,
    )
  ) {
    return false;
  }
  return words.every(
    (word) =>
      !/^(NOMBRE|NOMBRES|FORENAME|APELLIDO|APELLIDOS|SURNAME|APELUDO|APEIUDO)$/.test(
        word,
      ),
  );
}

function suspiciousIdentityNameReason(
  field: "firstName" | "lastName",
  value: string,
): string {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/[^A-Z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!normalized) return "";
  if (/\bJUSEL\b/.test(normalized)) {
    return "El nombre parece incompleto. Verifica si debe decir JUSELL.";
  }
  if (/\bZ?A?CACERES\b/.test(normalized) && !/\bCACERES\b/.test(normalized)) {
    return "El apellido parece mal leído. Revisa la captura o corrige el apellido.";
  }
  if (!isPlausibleIdentityName(value, field === "lastName" ? 2 : 1)) {
    return field === "lastName"
      ? "El apellido no parece válido. Revisa la captura o corrígelo."
      : "El nombre no parece válido. Revisa la captura o corrígelo.";
  }
  return "";
}

async function detectBarcode(file: File): Promise<string> {
  const constructor = (
    window as typeof window & { BarcodeDetector?: BarcodeDetectorConstructor }
  ).BarcodeDetector;
  if (!constructor) return "";

  try {
    const bitmap = await createImageBitmap(file);
    const detector = new constructor({ formats: ["qr_code"] });
    const results = await detector.detect(bitmap);
    bitmap.close();
    return results[0]?.rawValue ?? "";
  } catch {
    return "";
  }
}

async function readIdentity(
  file: File,
  onProgress: (message: string) => void,
): Promise<ParsedHondurasIdentity> {
  onProgress("Verificando documento…");
  const barcodeValue = await detectBarcode(file);
  const barcodeIdentity = parseHondurasIdentityText(barcodeValue);
  if (identityFieldsFound(barcodeIdentity) >= 3) return barcodeIdentity;

  const { recognize } = await import("tesseract.js");
  const result = await recognize(file, "spa+eng", {
    logger: (message) => {
      if (message.status === "recognizing text") {
        onProgress(`Verificando documento… ${Math.round(message.progress * 100)}%`);
      } else if (message.status === "loading language traineddata") {
        onProgress("Preparando verificación…");
      }
    },
  });
  return parseHondurasIdentityText(`${barcodeValue}\n${result.data.text}`);
}

function identityFileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

function readableIdentityResult(
  side: IdentityScannerSide,
  identity: ParsedHondurasIdentity,
): Readonly<{ accepted: boolean; message: string }> {
  const displayBirthDate = birthDateForForm(identity.birthDate);
  const hasValidDni = /^\d{4}-\d{4}-\d{5}$/.test(identity.dni);
  const hasValidBirthDate =
    Boolean(displayBirthDate) && isValidDisplayBirthDate(displayBirthDate);
  const hasValidFirstName = isPlausibleIdentityName(identity.firstName);
  const hasValidLastName = isPlausibleIdentityName(identity.lastName, 2);
  const hasSex = identity.sex === "female" || identity.sex === "male";
  const accepted =
    side === "front"
      ? hasValidDni && hasValidBirthDate && hasValidFirstName && hasValidLastName
      : hasValidBirthDate && hasSex && (hasValidFirstName || hasValidLastName);

  return accepted
    ? {
        accepted: true,
        message:
          side === "front"
            ? "Documento validado. Revisa la vista previa antes de continuar."
            : "Documento validado. Revisa la vista previa antes de continuar.",
      }
    : {
        accepted: false,
        message:
          side === "front"
            ? "No se pudo validar la identidad. Mejora luz, enfoque y encuadre."
            : "No se pudo validar la identidad. Mejora luz, enfoque y encuadre.",
      };
}

function InputField({
  help,
  inputMode,
  label,
  max,
  min,
  name,
  onBlur,
  onChange,
  pattern,
  placeholder,
  readOnly = false,
  required = true,
  step,
  type = "text",
  value,
}: Readonly<{
  help?: string;
  inputMode?: "decimal" | "email" | "numeric" | "search" | "tel" | "text" | "url";
  label: string;
  max?: number | undefined;
  min?: number;
  name: keyof FormValues;
  onBlur?: () => void;
  onChange: (name: keyof FormValues, value: string) => void;
  pattern?: string;
  placeholder?: string;
  readOnly?: boolean;
  required?: boolean;
  step?: number | string;
  type?: string;
  value: string;
}>) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        max={max}
        min={min}
        name={name}
        onBlur={onBlur}
        onChange={(event) => onChange(name, event.target.value)}
        inputMode={inputMode}
        pattern={pattern}
        placeholder={placeholder}
        readOnly={readOnly}
        required={required}
        step={step}
        type={type}
        value={value}
      />
      {help ? <small className="field-help">{help}</small> : null}
    </div>
  );
}

function CaptureCard({
  accept = "image/jpeg,image/png",
  capture,
  description,
  fileName,
  icon,
  id,
  label,
  onChange,
  preview,
  required = true,
}: Readonly<{
  accept?: string;
  capture?: "environment" | "user";
  description: string;
  fileName?: string | undefined;
  icon: ReactNode;
  id: string;
  label: string;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  preview?: string;
  required?: boolean;
}>) {
  return (
    <label
      className={`capture-card ${preview ? "has-preview" : ""}`}
      data-validation-field={id}
      htmlFor={id}
    >
      <input
        accept={accept}
        capture={capture}
        className="capture-input"
        id={id}
        name={id}
        onChange={onChange}
        required={required}
        type="file"
      />
      {preview ? (
        <span className="capture-preview">
          <Image
            alt={`Vista previa de ${label}`}
            fill
            sizes="(max-width: 720px) 100vw, 40vw"
            src={preview}
            unoptimized
          />
        </span>
      ) : fileName ? (
        <span className="capture-icon ready" aria-hidden="true">
          <CheckCircle2 size={23} />
        </span>
      ) : (
        <span className="capture-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="capture-copy">
        <strong>{preview || fileName ? `${label} listo` : label}</strong>
        <small>
          {preview || fileName ? fileName ?? "Toca para reemplazar el archivo" : description}
        </small>
      </span>
      {preview || fileName ? (
        <CheckCircle2 className="capture-check" aria-hidden="true" size={22} />
      ) : null}
    </label>
  );
}

function ReferenceCard({
  number,
  onFieldChange,
  prefix,
  values,
}: Readonly<{
  number: 1 | 2;
  onFieldChange: (name: keyof FormValues, value: string) => void;
  prefix: ReferencePrefix;
  values: FormValues;
}>) {
  const nameKey = `${prefix}_name` as keyof FormValues;
  const phoneKey = `${prefix}_phone` as keyof FormValues;
  const relationshipKey = `${prefix}_relationship` as keyof FormValues;
  const relationship = values[relationshipKey];

  return (
    <article className="reference-card">
      <div className="reference-card-head">
        <div>
          <span className="step">Referencia {number}</span>
          <h3>Contacto verificable</h3>
        </div>
      </div>
      <div className="reference-fields">
        <InputField
          label="Nombre completo"
          name={nameKey}
          onChange={onFieldChange}
          value={values[nameKey]}
        />
        <InputField
          label="Teléfono"
          name={phoneKey}
          onChange={onFieldChange}
          type="tel"
          value={values[phoneKey]}
        />
        <div className="field">
          <label htmlFor={relationshipKey}>Relación con el cliente</label>
          <select
            id={relationshipKey}
            name={relationshipKey}
            onChange={(event) =>
              onFieldChange(relationshipKey, event.target.value)
            }
            required
            value={relationship}
          >
            <option value="">Selecciona la relación</option>
            {relationship && !relationshipOptions.includes(relationship) ? (
              <option value={relationship}>{relationship}</option>
            ) : null}
            {relationshipOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </article>
  );
}

const stepIcons = [
  ScanLine,
  ShieldCheck,
  ContactRound,
  FileImage,
  Smartphone,
] as const;

function ApplicationStepper({
  currentStep,
  onStepChange,
}: Readonly<{
  currentStep: number;
  onStepChange: (step: number) => void;
}>) {
  const activeStep = steps[currentStep - 1] ?? steps[0];
  const activeButtonRef = useRef<HTMLButtonElement>(null);
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    activeButtonRef.current?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [currentStep]);

  return (
    <nav className="applicationStepper" aria-label="Progreso de la solicitud">
      <div className="stepperHeading">
        <div>
          <span className="stepperEyebrow">Solicitud de crédito</span>
          <strong aria-atomic="true" aria-live="polite">
            {activeStep.title}
          </strong>
        </div>
        <div className="stepperCount" aria-label={`Paso ${currentStep} de 5`}>
          <small>Progreso</small>
          <strong>
            {currentStep} <span>/ {steps.length}</span>
          </strong>
        </div>
      </div>

      <div className="stepperTrack" aria-hidden="true">
        <span style={{ width: `${progress}%` }} />
      </div>

      <ol>
        {steps.map((item, index) => {
          const number = index + 1;
          const completed = number < currentStep;
          const active = number === currentStep;
          const Icon = stepIcons[index] ?? ScanLine;
          const state = completed
            ? "completed"
            : active
              ? "active"
              : "upcoming";

          return (
            <li data-state={state} key={item.short}>
              <button
                aria-current={active ? "step" : undefined}
                disabled={number > currentStep}
                onClick={() => onStepChange(number)}
                ref={active ? activeButtonRef : undefined}
                type="button"
              >
                <span className="stepMarker">
                  {completed ? (
                    <Check aria-hidden="true" size={18} strokeWidth={3} />
                  ) : (
                    <Icon aria-hidden="true" size={18} strokeWidth={2.2} />
                  )}
                </span>
                <span className="stepCopy">
                  <small>Paso {number}</small>
                  <strong>{item.short}</strong>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <style jsx>{`
        .applicationStepper {
          display: grid;
          gap: 14px;
          padding: 18px 20px 20px;
          border: 1px solid #d7e5df;
          border-radius: 20px;
          background:
            radial-gradient(
              circle at 100% 0,
              rgba(8, 118, 83, 0.08),
              transparent 28%
            ),
            #ffffff;
          box-shadow: 0 14px 34px rgba(14, 58, 44, 0.08);
        }

        .stepperHeading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
        }

        .stepperHeading > div:first-child {
          display: grid;
          min-width: 0;
          gap: 3px;
        }

        .stepperEyebrow {
          color: #087653;
          font-size: 0.65rem;
          font-weight: 850;
          letter-spacing: 0.11em;
          text-transform: uppercase;
        }

        .stepperHeading > div:first-child > strong {
          overflow: hidden;
          color: #142b23;
          font-size: 1rem;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .stepperCount {
          display: flex;
          flex: 0 0 auto;
          align-items: baseline;
          gap: 8px;
          padding: 7px 11px;
          border: 1px solid #d7e7e0;
          border-radius: 999px;
          background: #f4faf7;
        }

        .stepperCount small {
          color: #52665e;
          font-size: 0.65rem;
          font-weight: 700;
        }

        .stepperCount strong {
          color: #087653;
          font-size: 0.86rem;
        }

        .stepperCount strong span {
          color: #82938c;
          font-weight: 650;
        }

        .stepperTrack {
          height: 6px;
          overflow: hidden;
          border-radius: 99px;
          background: #e8efec;
        }

        .stepperTrack span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #087653, #24a779 72%, #f4bd3f);
          box-shadow: 0 0 14px rgba(8, 118, 83, 0.24);
          transition: width 0.35s ease;
        }

        ol {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 9px;
          margin: 0;
          padding: 0;
          list-style: none;
        }

        li {
          min-width: 0;
        }

        button {
          display: grid;
          width: 100%;
          min-height: 68px;
          grid-template-columns: 40px minmax(0, 1fr);
          align-items: center;
          gap: 9px;
          padding: 9px;
          color: #587068;
          text-align: left;
          border: 1px solid #e3ece8;
          border-radius: 14px;
          background: #f8fbfa;
          cursor: pointer;
          transition:
            transform 0.18s ease,
            border-color 0.18s ease,
            box-shadow 0.18s ease,
            background 0.18s ease;
        }

        button:disabled {
          cursor: default;
          opacity: 1;
        }

        button:not(:disabled):hover {
          border-color: #9dcfbc;
          transform: translateY(-1px);
        }

        button:focus-visible {
          outline: 3px solid #f4bd3f;
          outline-offset: 2px;
        }

        .stepMarker {
          display: grid;
          width: 40px;
          height: 40px;
          place-items: center;
          border: 1px solid #d5e2dd;
          border-radius: 12px;
          background: #ffffff;
          color: #7a8d86;
        }

        .stepCopy {
          display: grid;
          min-width: 0;
          gap: 2px;
        }

        .stepCopy small {
          color: #52665e;
          font-size: 0.58rem;
          font-weight: 750;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .stepCopy strong {
          overflow: hidden;
          font-size: 0.74rem;
          line-height: 1.2;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        li[data-state="active"] button {
          border-color: #0a6f51;
          background: linear-gradient(140deg, #0a6f51, #075c44);
          color: #ffffff;
          box-shadow: 0 10px 22px rgba(8, 98, 72, 0.2);
          transform: translateY(-1px);
        }

        li[data-state="active"] .stepMarker {
          border-color: rgba(255, 255, 255, 0.26);
          background: rgba(255, 255, 255, 0.13);
          color: #f8c74f;
        }

        li[data-state="active"] .stepCopy small {
          color: #d2e8e0;
        }

        li[data-state="completed"] button {
          border-color: #b7ddce;
          background: #ecf8f3;
          color: #086848;
        }

        li[data-state="completed"] .stepMarker {
          border-color: #087653;
          background: #087653;
          color: #ffffff;
        }

        @media (max-width: 780px) {
          .applicationStepper {
            gap: 12px;
            padding: 15px;
            border-radius: 17px;
          }

          ol {
            display: flex;
            overflow-x: auto;
            margin-inline: -2px;
            padding: 2px 2px 5px;
            scrollbar-width: none;
            scroll-snap-type: x proximity;
          }

          ol::-webkit-scrollbar {
            display: none;
          }

          li {
            flex: 0 0 132px;
            scroll-snap-align: start;
          }

          button {
            min-height: 62px;
            grid-template-columns: 36px minmax(0, 1fr);
            gap: 8px;
            padding: 8px;
          }

          .stepMarker {
            width: 36px;
            height: 36px;
            border-radius: 11px;
          }
        }

        @media (max-width: 430px) {
          .stepperHeading > div:first-child > strong {
            font-size: 0.92rem;
          }

          .stepperCount small {
            display: none;
          }

          .stepperCount {
            padding: 7px 10px;
          }

          li {
            flex-basis: 124px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .stepperTrack span,
          button {
            transition: none;
          }
        }
      `}</style>
    </nav>
  );
}

export function CreditApplicationWizard({
  branches,
  error,
  inventory,
  interestRate,
  maximumTerm,
  minimumDownPaymentPercentage,
}: Readonly<{
  branches: readonly BranchOption[];
  error?: string | undefined;
  inventory: readonly InventoryOption[];
  interestRate: number | null;
  maximumTerm: number | null;
  minimumDownPaymentPercentage: number | null;
}>) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastLookupDni = useRef("");
  const readableIdentityCacheRef = useRef(
    new Map<string, ParsedHondurasIdentity>(),
  );
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [selectedBranch, setSelectedBranch] = useState(
    branches.length === 1 ? (branches[0]?.id ?? "") : "",
  );
  const [selectedInventory, setSelectedInventory] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [addressProofFile, setAddressProofFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState("");
  const [backPreview, setBackPreview] = useState("");
  const [selfiePreview, setSelfiePreview] = useState("");
  const [addressProofPreview, setAddressProofPreview] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerSide, setScannerSide] = useState<IdentityScannerSide>("front");
  const [scanMessage, setScanMessage] = useState(
    "Captura el frente de la identidad para completar los datos automáticamente.",
  );
  const [scanState, setScanState] = useState<
    "idle" | "loading" | "success" | "warning"
  >("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [clientError, setClientError] = useState("");
  const previousStep = useRef(step);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    formRef.current
      ?.querySelector<HTMLElement>(`[data-wizard-step="${step}"] h2`)
      ?.focus({ preventScroll: true });
  }, [step]);

  const branchInventory = useMemo(
    () =>
      selectedBranch
        ? inventory.filter((unit) => unit.branchId === selectedBranch)
        : [],
    [inventory, selectedBranch],
  );
  const assignedBranch = branches.length === 1 ? branches[0] : null;
  const selectedUnit = inventory.find((unit) => unit.id === selectedInventory);
  const generatedDefaults = selectedUnit
    ? calculateApplicationDefaults(
        selectedUnit.cashPrice,
        minimumDownPaymentPercentage,
        maximumTerm,
      )
    : null;
  const minimumDownAmount = generatedDefaults?.downPayment ?? null;
  const quotedPrice = Number(values.requested_price) || selectedUnit?.cashPrice || 0;
  const quotedDownPayment = Number(values.down_payment) || 0;
  const quotedTerm = Number(values.term) || maximumTerm || 0;
  const administrativeFeePercentage = 3;
  const quote = calculateFinancingQuote({
    administrativeFeePercentage,
    downPayment: quotedDownPayment,
    monthlyInterestRate: interestRate ?? 3.5,
    price: quotedPrice,
    term: quotedTerm,
  });

  function setField(name: keyof FormValues, value: string) {
    if (clientError) setClientError("");
    setValues((current) => ({ ...current, [name]: value }));
  }

  function validationIssueForStep(targetStep: number): ValidationIssue | null {
    const applicantPhone = phoneDigits(values.phone);
    const referenceOnePhone = phoneDigits(values.reference_one_phone);
    const referenceTwoPhone = phoneDigits(values.reference_two_phone);

    if (targetStep === 1) {
      if (!frontFile) {
        return {
          field: "dni",
          message: "Primero captura el frente de la identidad.",
          step: 1,
        };
      }
      if (!backFile) {
        return {
          field: "dni",
          message: "Falta capturar el reverso de la identidad.",
          step: 1,
        };
      }
      if (values.dni.replace(/\D/g, "").length !== 13) {
        return {
          field: "dni",
          message: "El DNI debe contener exactamente 13 dígitos.",
          step: 1,
        };
      }
      if (!isValidDisplayBirthDate(values.birth_date)) {
        return {
          field: "birth_date",
          message: "La fecha de nacimiento debe ir en formato DD-MM-AAAA.",
          step: 1,
        };
      }
      if (!values.sex) {
        return { field: "sex", message: "Selecciona el sexo del cliente.", step: 1 };
      }
      const firstNameProblem = suspiciousIdentityNameReason(
        "firstName",
        values.first_name,
      );
      if (firstNameProblem) {
        return { field: "first_name", message: firstNameProblem, step: 1 };
      }
      const lastNameProblem = suspiciousIdentityNameReason(
        "lastName",
        values.last_name,
      );
      if (lastNameProblem) {
        return { field: "last_name", message: lastNameProblem, step: 1 };
      }
      if (applicantPhone.length !== 8) {
        return {
          field: "phone",
          message: "El teléfono del cliente debe tener 8 dígitos.",
          step: 1,
        };
      }
      if (values.email && !emailPattern.test(values.email)) {
        return {
          field: "email",
          message: "Ingresa un correo válido o deja el campo vacío.",
          step: 1,
        };
      }
      if (Number(values.dependents) < 0) {
        return {
          field: "dependents",
          message: "Los dependientes no pueden ser negativos.",
          step: 1,
        };
      }
    }

    if (targetStep === 2) {
      if (!values.current_address.trim()) {
        return {
          field: "current_address",
          message: "Ingresa la dirección actual del cliente.",
          step: 2,
        };
      }
      if (!values.employer_name.trim()) {
        return {
          field: "employer_name",
          message: "Ingresa la empresa o actividad económica del cliente.",
          step: 2,
        };
      }
      if (Number(values.employment_months) < 0) {
        return {
          field: "employment_months",
          message: "La antigüedad laboral no puede ser negativa.",
          step: 2,
        };
      }
      if (Number(values.monthly_income) <= 0) {
        return {
          field: "monthly_income",
          message: "El ingreso mensual debe ser mayor que cero.",
          step: 2,
        };
      }
      if (Number(values.monthly_expenses) < 0) {
        return {
          field: "monthly_expenses",
          message: "Los gastos mensuales no pueden ser negativos.",
          step: 2,
        };
      }
      if (Number(values.monthly_expenses) >= Number(values.monthly_income)) {
        return {
          field: "monthly_expenses",
          message: "Los gastos no pueden ser iguales o mayores al ingreso.",
          step: 2,
        };
      }
    }

    if (targetStep === 3) {
      if (!values.reference_one_name.trim()) {
        return {
          field: "reference_one_name",
          message: "Ingresa el nombre de la primera referencia.",
          step: 3,
        };
      }
      if (referenceOnePhone.length !== 8) {
        return {
          field: "reference_one_phone",
          message: "El teléfono de la primera referencia debe tener 8 dígitos.",
          step: 3,
        };
      }
      if (!values.reference_one_relationship) {
        return {
          field: "reference_one_relationship",
          message: "Selecciona la relación de la primera referencia.",
          step: 3,
        };
      }
      if (!values.reference_two_name.trim()) {
        return {
          field: "reference_two_name",
          message: "Ingresa el nombre de la segunda referencia.",
          step: 3,
        };
      }
      if (referenceTwoPhone.length !== 8) {
        return {
          field: "reference_two_phone",
          message: "El teléfono de la segunda referencia debe tener 8 dígitos.",
          step: 3,
        };
      }
      if (!values.reference_two_relationship) {
        return {
          field: "reference_two_relationship",
          message: "Selecciona la relación de la segunda referencia.",
          step: 3,
        };
      }
      if (referenceOnePhone === referenceTwoPhone) {
        return {
          field: "reference_two_phone",
          message: "Las dos referencias no pueden tener el mismo teléfono.",
          step: 3,
        };
      }
      if (
        referenceOnePhone === applicantPhone ||
        referenceTwoPhone === applicantPhone
      ) {
        return {
          field:
            referenceOnePhone === applicantPhone
              ? "reference_one_phone"
              : "reference_two_phone",
          message:
            "El teléfono de una referencia no puede ser el mismo del cliente.",
          step: 3,
        };
      }
    }

    if (targetStep === 4) {
      if (!selfieFile) {
        return {
          field: "selfie",
          message: "Falta capturar la selfie de verificación del cliente.",
          step: 4,
        };
      }
      if (!addressProofFile) {
        return {
          field: "address_proof",
          message: "Falta cargar el comprobante de domicilio.",
          step: 4,
        };
      }
    }

    if (targetStep === 5) {
      if (!selectedBranch) {
        return { field: "branch_id", message: "Selecciona la tienda.", step: 5 };
      }
      if (!selectedInventory) {
        return {
          field: "inventory_unit_id",
          message: "Selecciona el dispositivo que se financiará.",
          step: 5,
        };
      }
      if (Number(values.requested_price) <= 0) {
        return {
          field: "requested_price",
          message: "El dispositivo seleccionado no tiene precio válido.",
          step: 5,
        };
      }
      if (
        minimumDownAmount !== null &&
        Number(values.down_payment) < minimumDownAmount
      ) {
        return {
          field: "down_payment",
          message: `La prima mínima permitida es ${money(minimumDownAmount)}.`,
          step: 5,
        };
      }
      if (Number(values.down_payment) >= Number(values.requested_price)) {
        return {
          field: "down_payment",
          message: "La prima debe ser menor que el precio del equipo.",
          step: 5,
        };
      }
      if (Number(values.term) <= 0) {
        return {
          field: "term",
          message: "Ingresa el plazo del crédito.",
          step: 5,
        };
      }
      if (maximumTerm !== null && Number(values.term) > maximumTerm) {
        return {
          field: "term",
          message: `El plazo máximo permitido es ${maximumTerm} meses.`,
          step: 5,
        };
      }
    }

    return null;
  }

  function markValidationIssue(issue: ValidationIssue) {
    setClientError(issue.message);
    setScanState("warning");
    setScanMessage(issue.message);

    window.setTimeout(() => {
      const form = formRef.current;
      if (!form) return;
      form
        .querySelectorAll(".field-control-error")
        .forEach((element) => element.classList.remove("field-control-error"));
      if (!issue.field) return;
      const target = form.querySelector<HTMLElement>(
        `[data-validation-field="${issue.field}"],[name="${issue.field}"],#${issue.field}`,
      );
      target?.classList.add("field-control-error");
      target?.focus({ preventScroll: true });
    }, 40);
  }

  async function enrichFromExistingCustomer(
    dni: string,
    identity?: ParsedHondurasIdentity,
  ) {
    const normalized = dni.replace(/\D/g, "");
    if (normalized.length !== 13 || lastLookupDni.current === normalized)
      return;
    lastLookupDni.current = normalized;
    setLookupMessage("Buscando un expediente existente…");
    const result = await lookupExistingCustomer(dni);

    if (result.found && result.values) {
      const identityMismatch = Boolean(
        identity &&
        ((identity.firstName &&
          result.values.first_name &&
          identity.firstName !== result.values.first_name) ||
          (identity.lastName &&
            result.values.last_name &&
            identity.lastName !== result.values.last_name)),
      );
      setValues((current) => ({
        ...current,
        ...result.values,
        dni: identity?.dni || current.dni,
        first_name:
          result.values?.first_name ||
          identity?.firstName ||
          current.first_name,
        last_name:
          result.values?.last_name || identity?.lastName || current.last_name,
        birth_date:
          birthDateForForm(result.values?.birth_date ?? "") ||
          birthDateForForm(identity?.birthDate ?? "") ||
          current.birth_date,
        sex: identity?.sex || current.sex,
      }));
      setLookupMessage(
        identityMismatch
          ? "Cliente encontrado. Recuperamos su expediente; verifica que el nombre coincida con la identidad capturada."
          : "Cliente encontrado: recuperamos la información disponible de su expediente.",
      );
    } else {
      setLookupMessage(
        "Cliente nuevo: completa teléfono y correo.",
      );
    }
  }

  async function validateReadableIdentityCapture(
    side: IdentityScannerSide,
    file: File,
  ) {
    const key = identityFileKey(file);
    setScanState("loading");
    setScanMessage("Verificando documento…");

    const identity = await readIdentity(file, (message) =>
      setScanMessage(message),
    );
    const result = readableIdentityResult(side, identity);
    if (result.accepted) {
      readableIdentityCacheRef.current.set(key, identity);
    } else {
      readableIdentityCacheRef.current.delete(key);
    }
    setScanState(result.accepted ? "success" : "warning");
    setScanMessage(result.message);
    return result;
  }

  async function processIdentityFile(side: IdentityScannerSide, file: File) {
    if (side === "front") {
      if (frontPreview) URL.revokeObjectURL(frontPreview);
      setFrontFile(file);
      setFrontPreview(URL.createObjectURL(file));
    } else {
      if (backPreview) URL.revokeObjectURL(backPreview);
      setBackFile(file);
      setBackPreview(URL.createObjectURL(file));
    }

    setScanState("loading");
    setScanMessage("Verificando documento…");

    try {
      const key = identityFileKey(file);
      const cachedIdentity = readableIdentityCacheRef.current.get(key);
      const identity =
        cachedIdentity ??
        (await readIdentity(file, (message) =>
          setScanMessage(message),
        ));
      readableIdentityCacheRef.current.delete(key);
      const found = identityFieldsFound(identity);
      setValues((current) => ({
        ...current,
        dni: identity.dni || current.dni,
        first_name: identity.firstName || current.first_name,
        last_name: identity.lastName || current.last_name,
        birth_date: birthDateForForm(identity.birthDate) || current.birth_date,
        sex: identity.sex || current.sex,
      }));
      setScanState(found >= 3 ? "success" : "warning");
      setScanMessage(
        found >= 3
          ? "Documento procesado. Verifica los datos antes de continuar."
          : "Documento guardado. Completa manualmente los datos pendientes.",
      );
      if (identity.dni) {
        await enrichFromExistingCustomer(identity.dni, identity);
      }
    } catch {
      setScanState("warning");
      setScanMessage(
        "Documento guardado. Completa manualmente los datos pendientes.",
      );
    }
  }

  function handleSelfieCapture(file: File | null) {
    if (clientError) setClientError("");
    if (selfiePreview) URL.revokeObjectURL(selfiePreview);
    setSelfieFile(file);
    setSelfiePreview(file ? URL.createObjectURL(file) : "");
  }

  function handleAddressProofChange(event: ChangeEvent<HTMLInputElement>) {
    if (clientError) setClientError("");
    const file = event.target.files?.[0] ?? null;
    if (addressProofPreview) URL.revokeObjectURL(addressProofPreview);
    setAddressProofFile(file);
    setAddressProofPreview(
      file && file.type.startsWith("image/") ? URL.createObjectURL(file) : "",
    );
  }

  function openScanner(side: IdentityScannerSide) {
    setScannerSide(side);
    setScannerOpen(true);
  }

  function validateCurrentStep(): boolean {
    const issue = validationIssueForStep(step);
    if (issue) {
      markValidationIssue(issue);
      if (step === 1 && (!frontFile || !backFile)) {
        openScanner(frontFile ? "back" : "front");
      }
      return false;
    }

    if (step === 1 && (!frontFile || !backFile)) {
      const missingSide = frontFile ? "back" : "front";
      setScanState("warning");
      setScanMessage(
        `Falta capturar el ${missingSide === "front" ? "frente" : "reverso"} de la identidad.`,
      );
      openScanner(missingSide);
      return false;
    }

    if (step === 4 && !selfieFile) {
      setScanState("warning");
      setScanMessage("Falta capturar la selfie de verificación del cliente.");
      return false;
    }

    if (step === 4 && !addressProofFile) {
      setScanState("warning");
      setScanMessage("Falta cargar el comprobante de domicilio.");
      return false;
    }

    const section = formRef.current?.querySelector<HTMLElement>(
      `[data-wizard-step="${step}"]`,
    );
    if (!section) return false;

    const birthDateInput =
      section.querySelector<HTMLInputElement>('input[name="birth_date"]');
    if (birthDateInput) {
      birthDateInput.setCustomValidity(
        isValidDisplayBirthDate(birthDateInput.value)
          ? ""
          : "Escribe la fecha completa en formato DD-MM-AAAA.",
      );
    }

    const firstNameInput =
      section.querySelector<HTMLInputElement>('input[name="first_name"]');
    if (firstNameInput) {
      firstNameInput.setCustomValidity(
        suspiciousIdentityNameReason("firstName", firstNameInput.value),
      );
    }

    const lastNameInput =
      section.querySelector<HTMLInputElement>('input[name="last_name"]');
    if (lastNameInput) {
      lastNameInput.setCustomValidity(
        suspiciousIdentityNameReason("lastName", lastNameInput.value),
      );
    }

    const emailInput =
      section.querySelector<HTMLInputElement>('input[name="email"]');
    if (emailInput) {
      emailInput.setCustomValidity(
        !emailInput.value || emailPattern.test(emailInput.value)
          ? ""
          : "Ingresa un correo válido.",
      );
    }

    const controls = [
      ...section.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input:not([type='hidden']),select",
      ),
    ];
    controls.forEach((control) => {
      if (control.checkValidity()) control.classList.remove("field-control-error");
    });
    const invalid = controls.find((control) => !control.checkValidity());
    if (invalid) {
      invalid.classList.add("field-control-error");
      setScanState("warning");
      setScanMessage("Revisa los campos marcados en rojo.");
      setClientError(
        invalid.validationMessage || "Revisa los campos marcados en rojo.",
      );
      invalid.reportValidity();
      return false;
    }
    setClientError("");
    return true;
  }

  function validateAllStepsBeforeSubmit(): boolean {
    for (let targetStep = 1; targetStep <= steps.length; targetStep += 1) {
      const issue = validationIssueForStep(targetStep);
      if (!issue) continue;
      setStep(targetStep);
      markValidationIssue(issue);
      return false;
    }

    const form = formRef.current;
    if (form && !form.checkValidity()) {
      const invalid = form.querySelector<HTMLInputElement | HTMLSelectElement>(
        "input:invalid,select:invalid",
      );
      const section = invalid?.closest<HTMLElement>("[data-wizard-step]");
      const invalidStep = Number(section?.dataset.wizardStep || step);
      setStep(Number.isFinite(invalidStep) && invalidStep > 0 ? invalidStep : step);
      setClientError(
        invalid?.validationMessage || "Revisa los campos marcados en rojo.",
      );
      window.setTimeout(() => {
        invalid?.classList.add("field-control-error");
        invalid?.reportValidity();
      }, 40);
      return false;
    }

    setClientError("");
    return true;
  }

  async function submitWithIdentityFiles(formData: FormData) {
    if (frontFile) formData.set("dni_front", frontFile);
    if (backFile) formData.set("dni_back", backFile);
    if (selfieFile) formData.set("selfie", selfieFile);
    if (addressProofFile) formData.set("address_proof", addressProofFile);
    formData.set("birth_date", birthDateForSubmit(values.birth_date));
    await submitCreditApplication(formData);
  }

  function handleFormSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (!validateAllStepsBeforeSubmit()) {
      event.preventDefault();
    }
  }

  function goToStep(nextStep: number) {
    if (nextStep > step && !validateCurrentStep()) return;
    setStep(Math.max(1, Math.min(steps.length, nextStep)));
    document
      .querySelector(".credit-wizard")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleBranchChange(branchId: string) {
    if (clientError) setClientError("");
    setSelectedBranch(branchId);
    setSelectedInventory("");
    setValues((current) => ({
      ...current,
      requested_price: "",
      down_payment: "",
      term: "",
    }));
  }

  function handleInventoryChange(inventoryId: string) {
    if (clientError) setClientError("");
    setSelectedInventory(inventoryId);
    const unit = inventory.find((candidate) => candidate.id === inventoryId);
    if (!unit) {
      setValues((current) => ({
        ...current,
        requested_price: "",
        down_payment: "",
        term: "",
      }));
      return;
    }

    const defaults = calculateApplicationDefaults(
      unit.cashPrice,
      minimumDownPaymentPercentage,
      maximumTerm,
    );
    setValues((current) => ({
      ...current,
      requested_price: defaults.price.toFixed(2),
      down_payment: defaults.downPayment.toFixed(2),
      term: defaults.term === null ? "" : String(defaults.term),
    }));
  }

  return (
    <div className="credit-wizard">
      {clientError ? (
        <div className="error" role="alert">
          {clientError}
        </div>
      ) : error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}

      <ApplicationStepper currentStep={step} onStepChange={goToStep} />

      <form
        action={submitWithIdentityFiles}
        className="wizard-form"
        onSubmit={handleFormSubmit}
        ref={formRef}
      >
        <section
          className="card wizard-panel"
          data-wizard-step="1"
          hidden={step !== 1}
        >
          <div className="wizard-panel-heading">
            <div className="wizard-heading-icon">
              <ScanLine aria-hidden="true" size={22} />
            </div>
            <div>
              <span>Paso 1 de 5</span>
              <h2 tabIndex={-1}>Escanear identidad</h2>
              <p>
                Escanea el frente y reverso. El sistema leerá los datos y
                guardará ambas imágenes en el expediente.
              </p>
            </div>
          </div>

          {frontFile && backFile ? (
            <div className="identity-scan-complete">
              <CheckCircle2 aria-hidden="true" size={24} />
              <div>
                <strong>Identidad capturada</strong>
                <span>Frente y reverso guardados.</span>
              </div>
              <button onClick={() => openScanner("front")} type="button">
                Repetir escaneo
              </button>
            </div>
          ) : (
            <div className="identity-scanner-entry">
              <div className="identity-scanner-visual" aria-hidden="true">
                <div className="identity-card-outline">
                  <span className="identity-card-photo" />
                  <span className="identity-card-line wide" />
                  <span className="identity-card-line" />
                  <span className="identity-card-line short" />
                  <i />
                </div>
                <span className="identity-scan-beam" />
              </div>
              <div className="identity-scanner-copy">
                <span className="scanner-kicker">
                  <ScanLine aria-hidden="true" size={15} /> Escáner con cámara
                </span>
                <h3>Enmarca la identidad y captura ambos lados</h3>
                <p>
                  La cámara muestra una guía con la proporción correcta, recorta
                  la tarjeta y lee automáticamente el DNI, nombre, apellidos,
                  fecha de nacimiento y sexo cuando el documento lo permite.
                </p>
                <button
                  className="button scanner-launch-button"
                  onClick={() => openScanner(frontFile ? "back" : "front")}
                  type="button"
                >
                  <Camera aria-hidden="true" size={18} />
                  {frontFile ? "Escanear reverso" : "Abrir escáner"}
                </button>
              </div>
            </div>
          )}

          {frontFile && backFile ? null : (
          <div className="identity-capture-results">
            {(
              [
                {
                  file: frontFile,
                  label: "Frente",
                  preview: frontPreview,
                  side: "front" as const,
                },
                {
                  file: backFile,
                  label: "Reverso",
                  preview: backPreview,
                  side: "back" as const,
                },
              ] as const
            ).map((capture, index) => (
              <article
                className={`identity-capture-result ${capture.file ? "ready" : ""}`}
                key={capture.side}
              >
                <div className="identity-result-preview">
                  {capture.preview ? (
                    <Image
                      alt={`${capture.label} de la identidad capturado`}
                      fill
                      sizes="(max-width: 620px) 100vw, 40vw"
                      src={capture.preview}
                      unoptimized
                    />
                  ) : (
                    <FileImage aria-hidden="true" size={22} />
                  )}
                </div>
                <div>
                  <span>{index + 1} de 2</span>
                  <strong>
                    {capture.file
                      ? `${capture.label} listo`
                      : `${capture.label} pendiente`}
                  </strong>
                </div>
                <button onClick={() => openScanner(capture.side)} type="button">
                  {capture.file ? "Repetir" : "Capturar"}
                </button>
              </article>
            ))}
          </div>
          )}

          {frontFile && backFile && scanState === "success" ? null : (
          <div className={`scan-status ${scanState}`} role="status">
            {scanState === "loading" ? (
              <LoaderCircle className="spin" aria-hidden="true" size={18} />
            ) : scanState === "success" ? (
              <CheckCircle2 aria-hidden="true" size={18} />
            ) : (
              <ScanLine aria-hidden="true" size={18} />
            )}
            <span>{scanMessage}</span>
          </div>
          )}
          {lookupMessage ? (
            <div className="customer-lookup-note">
              <ShieldCheck aria-hidden="true" size={17} />
              {lookupMessage}
            </div>
          ) : null}

          <div className="wizard-fields two-columns">
            <InputField
              label="DNI"
              name="dni"
              onBlur={() => void enrichFromExistingCustomer(values.dni)}
              onChange={setField}
              value={values.dni}
            />
            <InputField
              inputMode="numeric"
              label="Fecha de nacimiento"
              name="birth_date"
              onChange={setField}
              pattern="\d{2}-\d{2}-\d{4}"
              placeholder="DD-MM-AAAA"
              value={values.birth_date}
            />
            <div className="field">
              <label htmlFor="sex">Sexo</label>
              <select
                id="sex"
                name="sex"
                onChange={(event) => setField("sex", event.target.value)}
                required
                value={values.sex}
              >
                <option value="">Selecciona</option>
                <option value="female">Femenino</option>
                <option value="male">Masculino</option>
              </select>
            </div>
            <InputField
              label="Nombres"
              name="first_name"
              onChange={setField}
              value={values.first_name}
            />
            <InputField
              label="Apellidos"
              name="last_name"
              onChange={setField}
              value={values.last_name}
            />
            <InputField
              label="Teléfono"
              name="phone"
              onChange={setField}
              type="tel"
              value={values.phone}
            />
            <InputField
              label="Correo"
              name="email"
              onChange={setField}
              pattern={emailPattern.source}
              required={false}
              type="email"
              value={values.email}
            />
            <div className="field">
              <label htmlFor="marital_status">Estado civil</label>
              <select
                id="marital_status"
                name="marital_status"
                onChange={(event) =>
                  setField("marital_status", event.target.value)
                }
                required
                value={values.marital_status}
              >
                <option value="single">Soltero(a)</option>
                <option value="married">Casado(a)</option>
                <option value="union">Unión libre</option>
                <option value="other">Otro</option>
              </select>
            </div>
            <InputField
              label="Dependientes"
              min={0}
              name="dependents"
              onChange={setField}
              type="number"
              value={values.dependents}
            />
          </div>
        </section>

        <section
          className="card wizard-panel"
          data-wizard-step="2"
          hidden={step !== 2}
        >
          <div className="wizard-panel-heading">
            <div className="wizard-heading-icon">
              <ShieldCheck aria-hidden="true" size={21} />
            </div>
            <div>
              <span>Paso 2 de 5</span>
              <h2 tabIndex={-1}>Domicilio e ingresos</h2>
              <p>
                Completa únicamente la información necesaria para evaluar
                capacidad de pago.
              </p>
            </div>
          </div>
          <div className="wizard-fields two-columns">
            <InputField
              label="Dirección actual"
              name="current_address"
              onChange={setField}
              value={values.current_address}
            />
            <div className="field">
              <label htmlFor="housing_type">Vivienda</label>
              <select
                id="housing_type"
                name="housing_type"
                onChange={(event) =>
                  setField("housing_type", event.target.value)
                }
                required
                value={values.housing_type}
              >
                <option value="owned">Propia</option>
                <option value="rented">Alquilada</option>
                <option value="family">Familiar</option>
              </select>
            </div>
            <InputField
              label="Empresa o actividad económica"
              name="employer_name"
              onChange={setField}
              value={values.employer_name}
            />
            <InputField
              label="Cargo u oficio"
              name="job_title"
              onChange={setField}
              required={false}
              value={values.job_title}
            />
            <InputField
              label="Antigüedad laboral (meses)"
              min={0}
              name="employment_months"
              onChange={setField}
              type="number"
              value={values.employment_months}
            />
            <InputField
              label="Ingreso mensual"
              min={0}
              name="monthly_income"
              onChange={setField}
              type="number"
              value={values.monthly_income}
            />
            <InputField
              label="Gastos mensuales"
              min={0}
              name="monthly_expenses"
              onChange={setField}
              type="number"
              value={values.monthly_expenses}
            />
          </div>
        </section>

        <section
          className="card wizard-panel"
          data-wizard-step="3"
          hidden={step !== 3}
        >
          <div className="wizard-panel-heading">
            <div className="wizard-heading-icon">
              <ContactRound aria-hidden="true" size={21} />
            </div>
            <div>
              <span>Paso 3 de 5</span>
              <h2 tabIndex={-1}>Referencias personales</h2>
              <p>
                Solicita al cliente dos referencias verificables y escribe los
                datos proporcionados.
              </p>
            </div>
          </div>
          <div className="reference-grid">
            <ReferenceCard
              number={1}
              onFieldChange={setField}
              prefix="reference_one"
              values={values}
            />
            <ReferenceCard
              number={2}
              onFieldChange={setField}
              prefix="reference_two"
              values={values}
            />
          </div>
        </section>

        <section
          className="card wizard-panel"
          data-wizard-step="4"
          hidden={step !== 4}
        >
          <div className="wizard-panel-heading">
            <div className="wizard-heading-icon">
              <Camera aria-hidden="true" size={21} />
            </div>
            <div>
              <span>Paso 4 de 5</span>
              <h2 tabIndex={-1}>Documentos complementarios</h2>
              <p>
                La identidad ya está guardada. Solo faltan la selfie y el
                comprobante de domicilio.
              </p>
            </div>
          </div>
          <div className="identity-capture-grid supplemental-documents">
            <div className="field full-span" data-validation-field="selfie">
              <label>Selfie del cliente</label>
              <SelfieCapture
                file={selfieFile}
                onCapture={handleSelfieCapture}
                preview={selfiePreview}
              />
            </div>
            <CaptureCard
              accept="image/jpeg,image/png,application/pdf"
              capture="environment"
              description="Fotografía o selecciona el recibo"
              fileName={addressProofFile?.name}
              icon={<FileImage size={23} />}
              id="address_proof"
              label="Comprobante de domicilio"
              onChange={handleAddressProofChange}
              preview={addressProofPreview}
            />
          </div>
          <p className="document-safety-note">
            <ShieldCheck aria-hidden="true" size={16} /> Archivos privados, JPG,
            PNG o PDF. Máximo 7 MB por documento.
          </p>
        </section>

        <section
          className="card wizard-panel"
          data-wizard-step="5"
          hidden={step !== 5}
        >
          <div className="wizard-panel-heading">
            <div className="wizard-heading-icon">
              <Smartphone aria-hidden="true" size={21} />
            </div>
            <div>
              <span>Paso 5 de 5</span>
              <h2 tabIndex={-1}>Dispositivo y condiciones</h2>
              <p>
                Selecciona el equipo. El precio, la prima mínima y el plazo
                sugerido se completan automáticamente.
              </p>
            </div>
          </div>
          <div className="wizard-fields two-columns">
            {assignedBranch ? (
              <div className="field readonly-field">
                <label htmlFor="branch_id_display">Tienda asignada</label>
                <input
                  id="branch_id_display"
                  readOnly
                  value={assignedBranch.name}
                />
                <input name="branch_id" type="hidden" value={assignedBranch.id} />
                <small className="field-help">
                  El vendedor solo puede vender dispositivos de su tienda.
                </small>
              </div>
            ) : (
              <div className="field">
                <label htmlFor="branch_id">Tienda</label>
                <select
                  id="branch_id"
                  name="branch_id"
                  onChange={(event) => handleBranchChange(event.target.value)}
                  required
                  value={selectedBranch}
                >
                  <option value="">Selecciona una tienda</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="field">
              <label htmlFor="inventory_unit_id">Dispositivo disponible</label>
              <select
                disabled={!selectedBranch}
                id="inventory_unit_id"
                name="inventory_unit_id"
                onChange={(event) => handleInventoryChange(event.target.value)}
                required
                value={selectedInventory}
              >
                <option value="">
                  {selectedBranch
                    ? "Selecciona un dispositivo"
                    : "Selecciona primero la tienda"}
                </option>
                {branchInventory.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.imei} · {unit.description} · {money(unit.cashPrice)}
                  </option>
                ))}
              </select>
            </div>
            <InputField
              help="Se obtiene directamente del dispositivo seleccionado y no se puede modificar."
              label="Precio financiado"
              min={0}
              name="requested_price"
              onChange={setField}
              readOnly
              step="0.01"
              type="number"
              value={values.requested_price}
            />
            <InputField
              help={
                minimumDownAmount === null
                  ? "Se validará con la configuración vigente."
                  : `Mínimo vigente: ${money(minimumDownAmount)} (${minimumDownPaymentPercentage}%). Puedes proponer una prima mayor.`
              }
              label="Prima propuesta"
              min={minimumDownAmount ?? 0}
              name="down_payment"
              onChange={setField}
              step="0.01"
              type="number"
              value={values.down_payment}
            />
            <InputField
              help={
                maximumTerm === null
                  ? "No existe una configuración de crédito vigente."
                  : `Valor automático según la configuración vigente: ${maximumTerm} meses.`
              }
              label="Plazo propuesto (meses)"
              max={maximumTerm ?? undefined}
              min={1}
              name="term"
              onChange={setField}
              type="number"
              value={values.term}
            />
            <div className="automatic-values-card">
              <CheckCircle2 aria-hidden="true" size={20} />
              <div>
                <strong>Condiciones calculadas</strong>
                <span>
                  {selectedUnit
                    ? `${selectedUnit.description} · ${money(selectedUnit.cashPrice)}`
                    : "Selecciona un dispositivo para generar los valores."}
                </span>
              </div>
            </div>
            <div className="financing-summary full-span">
              <div className="financing-summary-head">
                <div>
                  <span className="eyebrow">Cálculo de cuota</span>
                  <strong>{money(quote.monthlyInstallment)} / mes</strong>
                </div>
                <span>{quote.term} cuotas</span>
              </div>
              <dl>
                <div>
                  <dt>Precio del equipo</dt>
                  <dd>{money(quote.price)}</dd>
                </div>
                <div>
                  <dt>Prima</dt>
                  <dd>- {money(quote.downPayment)}</dd>
                </div>
                <div>
                  <dt>Saldo financiado</dt>
                  <dd>{money(quote.principal)}</dd>
                </div>
                <div>
                  <dt>Gastos administrativos</dt>
                  <dd>
                    {money(quote.administrativeFee)} (
                    {percent(quote.administrativeFeePercentage)}%)
                  </dd>
                </div>
                <div>
                  <dt>Total base a financiar</dt>
                  <dd>{money(quote.financedSubtotal)}</dd>
                </div>
                <div>
                  <dt>Tasa aplicada</dt>
                  <dd>
                    {percent(quote.monthlyInterestRate)}% mensual ·{" "}
                    {percent(quote.annualEffectiveRate)}% efectivo anual
                  </dd>
                </div>
                <div>
                  <dt>Interés generado</dt>
                  <dd>{money(quote.interestAmount)}</dd>
                </div>
                <div>
                  <dt>Total financiado a pagar</dt>
                  <dd>{money(quote.totalFinancedToPay)}</dd>
                </div>
                <div>
                  <dt>Total cliente incluyendo prima</dt>
                  <dd>{money(quote.totalCustomerPays)}</dd>
                </div>
              </dl>
              <p>
                Método: cuota nivelada sobre el saldo financiado más gastos. Se
                actualiza al cambiar prima, plazo o dispositivo.
              </p>
            </div>
            <label className="consent">
              <input name="consent_data_processing" type="checkbox" required />{" "}
              El cliente autoriza el tratamiento de sus datos.
            </label>
            <label className="consent">
              <input name="consent_credit_review" type="checkbox" required /> El
              cliente autoriza la evaluación crediticia.
            </label>
          </div>
        </section>

        <div className="wizard-actions">
          {step > 1 ? (
            <button
              className="button secondary"
              onClick={() => goToStep(step - 1)}
              type="button"
            >
              <ArrowLeft aria-hidden="true" size={17} />
              Anterior
            </button>
          ) : (
            <span />
          )}
          {step < steps.length ? (
            <button
              className="button"
              onClick={() => goToStep(step + 1)}
              type="button"
            >
              Continuar
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          ) : (
            <button
              className="button"
              disabled={maximumTerm === null}
              type="submit"
            >
              Enviar a análisis
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          )}
        </div>
      </form>

      <IdentityCameraScanner
        initialFiles={{ front: frontFile, back: backFile }}
        initialSide={scannerSide}
        onCapture={(side, file) => void processIdentityFile(side, file)}
        onClose={() => setScannerOpen(false)}
        open={scannerOpen}
        validateCapture={validateReadableIdentityCapture}
      />
    </div>
  );
}
