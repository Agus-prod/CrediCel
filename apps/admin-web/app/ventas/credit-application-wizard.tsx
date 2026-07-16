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
  Upload,
} from "lucide-react";

import {
  identityFieldsFound,
  parseHondurasIdentityText,
} from "@/lib/honduras-id";
import type { ParsedHondurasIdentity } from "@/lib/honduras-id";
import { parseContactCard } from "@/lib/contact-card";
import { calculateApplicationDefaults } from "@/lib/application-defaults";
import { lookupExistingCustomer, submitCreditApplication } from "./actions";
import {
  IdentityCameraScanner,
  type IdentityScannerSide,
} from "./identity-camera-scanner";

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
  term: string;
};

type ReferencePrefix = "reference_one" | "reference_two";

type ContactSelection = {
  readonly name?: readonly string[];
  readonly tel?: readonly string[];
};

type ContactsManager = {
  select(
    properties: readonly ["name", "tel"],
    options: Readonly<{ multiple: false }>,
  ): Promise<readonly ContactSelection[]>;
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
  onProgress("Buscando datos de la identidad…");
  const barcodeValue = await detectBarcode(file);
  const barcodeIdentity = parseHondurasIdentityText(barcodeValue);
  if (identityFieldsFound(barcodeIdentity) >= 3) return barcodeIdentity;

  const { recognize } = await import("tesseract.js");
  const result = await recognize(file, "spa", {
    logger: (message) => {
      if (message.status === "recognizing text") {
        onProgress(`Leyendo identidad… ${Math.round(message.progress * 100)}%`);
      } else if (message.status === "loading language traineddata") {
        onProgress("Preparando lectura en español…");
      }
    },
  });
  return parseHondurasIdentityText(`${barcodeValue}\n${result.data.text}`);
}

function InputField({
  help,
  label,
  max,
  min,
  name,
  onBlur,
  onChange,
  readOnly = false,
  required = true,
  step,
  type = "text",
  value,
}: Readonly<{
  help?: string;
  label: string;
  max?: number | undefined;
  min?: number;
  name: keyof FormValues;
  onBlur?: () => void;
  onChange: (name: keyof FormValues, value: string) => void;
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
      ) : (
        <span className="capture-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="capture-copy">
        <strong>{preview ? `${label} lista` : label}</strong>
        <small>
          {preview ? "Toca para reemplazar la imagen" : description}
        </small>
      </span>
      {preview ? (
        <CheckCircle2 className="capture-check" aria-hidden="true" size={22} />
      ) : null}
    </label>
  );
}

function ReferenceCard({
  number,
  onContactPick,
  onFieldChange,
  onVCard,
  prefix,
  values,
}: Readonly<{
  number: 1 | 2;
  onContactPick: (prefix: ReferencePrefix) => Promise<void>;
  onFieldChange: (name: keyof FormValues, value: string) => void;
  onVCard: (
    event: ChangeEvent<HTMLInputElement>,
    prefix: ReferencePrefix,
  ) => Promise<void>;
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
        <div className="contact-actions">
          <button
            className="button secondary compact"
            onClick={() => void onContactPick(prefix)}
            type="button"
          >
            <ContactRound aria-hidden="true" size={16} />
            Elegir contacto
          </button>
          <label className="vcard-button" htmlFor={`${prefix}_vcard`}>
            <Upload aria-hidden="true" size={15} />
            Importar .vcf
            <input
              accept=".vcf,text/vcard,text/x-vcard"
              id={`${prefix}_vcard`}
              onChange={(event) => void onVCard(event, prefix)}
              type="file"
            />
          </label>
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
  maximumTerm,
  minimumDownPaymentPercentage,
}: Readonly<{
  branches: readonly BranchOption[];
  error?: string | undefined;
  inventory: readonly InventoryOption[];
  maximumTerm: number | null;
  minimumDownPaymentPercentage: number | null;
}>) {
  const formRef = useRef<HTMLFormElement>(null);
  const lastLookupDni = useRef("");
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<FormValues>(initialValues);
  const [selectedBranch, setSelectedBranch] = useState(
    branches.length === 1 ? (branches[0]?.id ?? "") : "",
  );
  const [selectedInventory, setSelectedInventory] = useState("");
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState("");
  const [backPreview, setBackPreview] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerSide, setScannerSide] = useState<IdentityScannerSide>("front");
  const [scanMessage, setScanMessage] = useState(
    "Captura el frente de la identidad para completar los datos automáticamente.",
  );
  const [scanState, setScanState] = useState<
    "idle" | "loading" | "success" | "warning"
  >("idle");
  const [lookupMessage, setLookupMessage] = useState("");
  const [contactMessage, setContactMessage] = useState("");
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
      inventory.filter(
        (unit) => !selectedBranch || unit.branchId === selectedBranch,
      ),
    [inventory, selectedBranch],
  );
  const selectedUnit = inventory.find((unit) => unit.id === selectedInventory);
  const generatedDefaults = selectedUnit
    ? calculateApplicationDefaults(
        selectedUnit.cashPrice,
        minimumDownPaymentPercentage,
        maximumTerm,
      )
    : null;
  const minimumDownAmount = generatedDefaults?.downPayment ?? null;

  function setField(name: keyof FormValues, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
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
          result.values?.birth_date ||
          identity?.birthDate ||
          current.birth_date,
      }));
      setLookupMessage(
        identityMismatch
          ? "Cliente encontrado. Recuperamos su expediente; verifica que el nombre coincida con la identidad capturada."
          : "Cliente encontrado: recuperamos la información disponible de su expediente.",
      );
    } else {
      setLookupMessage(
        "Cliente nuevo: verifica los datos leídos y completa teléfono y correo.",
      );
    }
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

    const sideName = side === "front" ? "frente" : "reverso";
    setScanState("loading");
    setScanMessage(`Leyendo el ${sideName} de la identidad…`);

    try {
      const identity = await readIdentity(file, (message) =>
        setScanMessage(
          `${sideName === "frente" ? "Frente" : "Reverso"}: ${message}`,
        ),
      );
      const found = identityFieldsFound(identity);
      setValues((current) => ({
        ...current,
        dni: identity.dni || current.dni,
        first_name: identity.firstName || current.first_name,
        last_name: identity.lastName || current.last_name,
        birth_date: identity.birthDate || current.birth_date,
      }));
      setScanState(found >= 3 ? "success" : "warning");
      setScanMessage(
        found >= 3
          ? "Identidad leída. Confirma los datos autocompletados antes de continuar."
          : "La captura quedó guardada; completa manualmente cualquier dato que no se haya podido leer.",
      );
      if (identity.dni) {
        await enrichFromExistingCustomer(identity.dni, identity);
      }
    } catch {
      setScanState("warning");
      setScanMessage(
        "La captura quedó guardada, pero no pudimos leerla automáticamente. Puedes completar los datos manualmente.",
      );
    }
  }

  function openScanner(side: IdentityScannerSide) {
    setScannerSide(side);
    setScannerOpen(true);
  }

  function validateCurrentStep(): boolean {
    if (step === 1 && (!frontFile || !backFile)) {
      const missingSide = frontFile ? "back" : "front";
      setScanState("warning");
      setScanMessage(
        `Falta capturar el ${missingSide === "front" ? "frente" : "reverso"} de la identidad.`,
      );
      openScanner(missingSide);
      return false;
    }

    const section = formRef.current?.querySelector<HTMLElement>(
      `[data-wizard-step="${step}"]`,
    );
    if (!section) return false;
    const controls = [
      ...section.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input[required],select[required]",
      ),
    ];
    const invalid = controls.find((control) => !control.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return false;
    }
    return true;
  }

  async function submitWithIdentityFiles(formData: FormData) {
    if (frontFile) formData.set("dni_front", frontFile);
    if (backFile) formData.set("dni_back", backFile);
    await submitCreditApplication(formData);
  }

  function goToStep(nextStep: number) {
    if (nextStep > step && !validateCurrentStep()) return;
    setStep(Math.max(1, Math.min(steps.length, nextStep)));
    document
      .querySelector(".credit-wizard")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleBranchChange(branchId: string) {
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

  async function chooseContact(prefix: ReferencePrefix) {
    setContactMessage("");
    const contacts = (navigator as Navigator & { contacts?: ContactsManager })
      .contacts;
    if (!contacts) {
      setContactMessage(
        "Este navegador no permite abrir contactos desde una conexión local. Puedes importar el contacto en formato .vcf o escribirlo manualmente.",
      );
      return;
    }

    try {
      const selected = await contacts.select(["name", "tel"], {
        multiple: false,
      });
      const contact = selected[0];
      const name = contact?.name?.[0] ?? "";
      const phone = contact?.tel?.[0] ?? "";
      if (!name || !phone) return;
      setField(`${prefix}_name` as keyof FormValues, name);
      setField(`${prefix}_phone` as keyof FormValues, phone);
      setContactMessage(
        "Contacto importado. Solo falta indicar la relación con el cliente.",
      );
    } catch {
      setContactMessage("No se seleccionó ningún contacto.");
    }
  }

  async function importVCard(
    event: ChangeEvent<HTMLInputElement>,
    prefix: ReferencePrefix,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    const contact = parseContactCard(await file.text());
    if (!contact) {
      setContactMessage("El archivo no contiene un nombre y teléfono válidos.");
      return;
    }
    setField(`${prefix}_name` as keyof FormValues, contact.name);
    setField(`${prefix}_phone` as keyof FormValues, contact.phone);
    setContactMessage(
      "Contacto importado. Solo falta indicar la relación con el cliente.",
    );
  }

  return (
    <div className="credit-wizard">
      {error ? (
        <div className="error" role="alert">
          {error}
        </div>
      ) : null}

      <ApplicationStepper currentStep={step} onStepChange={goToStep} />

      <form
        action={submitWithIdentityFiles}
        className="wizard-form"
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
                Fotografía el frente y reverso. El sistema leerá los datos y
                guardará ambas imágenes en el expediente.
              </p>
            </div>
          </div>

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
                la tarjeta y lee automáticamente el DNI, nombre y fecha de
                nacimiento.
              </p>
              <button
                className="button scanner-launch-button"
                onClick={() => openScanner(frontFile ? "back" : "front")}
                type="button"
              >
                <Camera aria-hidden="true" size={18} />
                {frontFile || backFile ? "Continuar escaneo" : "Abrir escáner"}
              </button>
            </div>
          </div>

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
              label="Fecha de nacimiento"
              name="birth_date"
              onChange={setField}
              type="date"
              value={values.birth_date}
            />
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
                Elige contactos del teléfono o importa sus tarjetas para
                completar nombre y número.
              </p>
            </div>
          </div>
          {contactMessage ? (
            <div className="notice contact-notice" role="status">
              {contactMessage}
            </div>
          ) : null}
          <div className="reference-grid">
            <ReferenceCard
              number={1}
              onContactPick={chooseContact}
              onFieldChange={setField}
              onVCard={importVCard}
              prefix="reference_one"
              values={values}
            />
            <ReferenceCard
              number={2}
              onContactPick={chooseContact}
              onFieldChange={setField}
              onVCard={importVCard}
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
            <CaptureCard
              accept="image/jpeg,image/png"
              capture="user"
              description="Abre la cámara frontal"
              icon={<Camera size={24} />}
              id="selfie"
              label="Selfie del cliente"
            />
            <CaptureCard
              accept="image/jpeg,image/png,application/pdf"
              capture="environment"
              description="Fotografía o selecciona el recibo"
              icon={<FileImage size={23} />}
              id="address_proof"
              label="Comprobante de domicilio"
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
      />
    </div>
  );
}
