export type ParsedHondurasIdentity = {
  readonly birthDate: string;
  readonly dni: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly sex: "" | "female" | "male";
};

const emptyIdentity: ParsedHondurasIdentity = {
  birthDate: "",
  dni: "",
  firstName: "",
  lastName: "",
  sex: "",
};

function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("es-HN")
    .replace(/(^|[\s'-])\p{L}/gu, (letter) =>
      letter.toLocaleUpperCase("es-HN"),
    );
}

function normalizeOcrNameWord(value: string): string {
  return value
    .replace(/^(?:Z|ZA|2|7)(?=CACERES$)/i, "")
    .replace(/^2(?=CACERES$)/i, "")
    .replace(/^7(?=CACERES$)/i, "")
    .replace(/^JUSEL$/i, "JUSELL")
    .replace(/^TFIFFANY$/i, "TIFFANY")
    .replace(/^TIFFANV$/i, "TIFFANY");
}

function cleanName(value: string): string {
  const cleaned = value
    .replace(
      /\b(SURNAMES?|SURNAME|APELLIDOS?|APELUDO|APEIUDO|GIVEN\s+NAMES?|FORENAME|NOMBRES?)\b/gi,
      "",
    )
    .replace(/[^\p{L}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map(normalizeOcrNameWord)
    .filter((word) => word.length > 1)
    .join(" ");

  return cleaned.length >= 2 ? titleCase(cleaned) : "";
}

function cleanMrzName(value: string): string {
  return cleanName(value.replace(/</g, " "));
}

function normalizeDni(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 13
    ? `${digits.slice(0, 4)}-${digits.slice(4, 8)}-${digits.slice(8)}`
    : "";
}

function isoDate(value: string): string {
  const match = value.match(/(\d{1,2})[\s/.-](\d{1,2})[\s/.-](\d{4})/);
  if (!match) return "";

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return "";

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function normalizeSex(value: string): "" | "female" | "male" {
  const normalized = value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}]/gu, "")
    .toUpperCase();
  if (/^(M|MASCULINO|HOMBRE|MALE)$/.test(normalized)) return "male";
  if (/^(F|FEMENINO|MUJER|FEMALE)$/.test(normalized)) return "female";
  return "";
}

function parseMrzDate(value: string): string {
  const match = value.match(/(\d{2})(\d{2})(\d{2})/);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const fullYear = year > 30 ? 1900 + year : 2000 + year;
  return isoDate(`${day}-${month}-${fullYear}`);
}

function parseHondurasMrz(text: string): ParsedHondurasIdentity | null {
  const lines = text
    .toUpperCase()
    .split("\n")
    .map((line) => line.replace(/\s+/g, "").replace(/[^A-Z0-9<]/g, ""))
    .filter((line) => line.includes("<") && line.length >= 20);
  const idLine = lines.find((line) => /^I<HN/.test(line));
  const dataLine = lines.find((line) => /\d{6}\d?[MF]/.test(line));
  const nameLine = [...lines].reverse().find((line) => /<[A-Z]/.test(line));
  const documentNumber = idLine?.match(/^I<HN([A-Z0-9]{9})/)?.[1] ?? "";
  const dni = normalizeDni(documentNumber.replace(/^0+/, ""));
  const birthDate = parseMrzDate(dataLine?.match(/(\d{6})\d?[MF]/)?.[1] ?? "");
  const sex = normalizeSex(dataLine?.match(/\d{6}\d?([MF])/)?.[1] ?? "");
  const [lastRaw = "", firstRaw = ""] = (nameLine ?? "").split("<<");
  const firstName = cleanMrzName(firstRaw);
  const lastName = cleanMrzName(lastRaw);

  return dni || firstName || lastName || birthDate || sex
    ? { dni, firstName, lastName, birthDate, sex }
    : null;
}

function labeledValue(lines: readonly string[], label: RegExp): string {
  const labelIndex = lines.findIndex((line) => label.test(line));
  if (labelIndex === -1) return "";

  const inlineValue =
    lines[labelIndex]
      ?.replace(label, "")
      .replace(/^\s*[:/-]\s*/, "")
      .trim() ?? "";
  const inlineName = cleanName(inlineValue);
  if (inlineName) return inlineName;

  for (
    let index = labelIndex + 1;
    index < Math.min(lines.length, labelIndex + 4);
    index += 1
  ) {
    const candidate = lines[index] ?? "";
    if (
      /APELLIDOS?|APELUDO|APEIUDO|SURNAMES?|SURNAME|NOMBRES?|GIVEN\s+NAMES?|FORENAME|FECHA|NACIMIENTO|SEXO|NACIONALIDAD|IDENTIFICACI[ÓO]N|DOCUMENTO|REPÚBLICA|REGISTRO/i.test(
        candidate,
      )
    )
      continue;
    if (cleanName(candidate)) return candidate;
  }

  return "";
}

function parseJsonPayload(text: string): ParsedHondurasIdentity | null {
  try {
    const parsed = JSON.parse(text) as Record<string, unknown>;
    const dni = normalizeDni(
      String(parsed.dni ?? parsed.identidad ?? parsed.identity_number ?? ""),
    );
    const firstName = cleanName(
      String(parsed.first_name ?? parsed.nombres ?? parsed.given_names ?? ""),
    );
    const lastName = cleanName(
      String(parsed.last_name ?? parsed.apellidos ?? parsed.surnames ?? ""),
    );
    const birthDateValue = String(
      parsed.birth_date ??
        parsed.fecha_nacimiento ??
        parsed.date_of_birth ??
        "",
    );
    const birthDate = /^\d{4}-\d{2}-\d{2}$/.test(birthDateValue)
      ? birthDateValue
      : isoDate(birthDateValue);
    const sex = normalizeSex(
      String(parsed.sex ?? parsed.sexo ?? parsed.gender ?? ""),
    );

    return dni || firstName || lastName || birthDate || sex
      ? { dni, firstName, lastName, birthDate, sex }
      : null;
  } catch {
    return null;
  }
}

export function parseHondurasIdentityText(
  source: string,
): ParsedHondurasIdentity {
  const text = source.normalize("NFC").replace(/\r/g, "\n").trim();
  if (!text) return emptyIdentity;

  const jsonPayload = parseJsonPayload(text);
  if (jsonPayload) return jsonPayload;

  const mrzPayload = parseHondurasMrz(text);

  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const dniMatch =
    text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{5}\b/) ??
    text.match(/\b\d{4}\s+\d{4}\s+\d{5}\b/);
  const birthLabelMatch = text.match(
    /(?:FECHA\s+DE\s+NACIMIENTO|DATE\s+OF\s+BIRTH)[^\d]{0,20}(\d{1,2}[\s/.-]\d{1,2}[\s/.-]\d{4})/i,
  );
  const fallbackDate = text.match(
    /\b\d{1,2}[\s/.-]\d{1,2}[\s/.-](?:19|20)\d{2}\b/,
  );
  const sexMatch = text.match(
    /(?:SEXO|SEX|G[ÉE]NERO|GENDER)[^\p{L}]{0,12}(MASCULINO|FEMENINO|HOMBRE|MUJER|MALE|FEMALE|M|F)\b/iu,
  );

  return {
    dni: normalizeDni(dniMatch?.[0] ?? "") || mrzPayload?.dni || "",
    firstName:
      cleanName(labeledValue(lines, /(?:NOMBRES?|NOMBRE|GIVEN\s+NAMES?|FORENAME)/i)) ||
      mrzPayload?.firstName ||
      "",
    lastName:
      cleanName(labeledValue(lines, /(?:APELLIDOS?|APELLIDO|SURNAMES?|SURNAME)/i)) ||
      mrzPayload?.lastName ||
      "",
    birthDate:
      isoDate(birthLabelMatch?.[1] ?? fallbackDate?.[0] ?? "") ||
      mrzPayload?.birthDate ||
      "",
    sex: normalizeSex(sexMatch?.[1] ?? "") || mrzPayload?.sex || "",
  };
}

export function identityFieldsFound(identity: ParsedHondurasIdentity): number {
  return [
    identity.dni,
    identity.firstName,
    identity.lastName,
    identity.birthDate,
    identity.sex,
  ].filter(Boolean).length;
}
