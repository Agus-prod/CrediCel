export type ParsedHondurasIdentity = {
  readonly birthDate: string;
  readonly dni: string;
  readonly firstName: string;
  readonly lastName: string;
};

const emptyIdentity: ParsedHondurasIdentity = {
  birthDate: "",
  dni: "",
  firstName: "",
  lastName: "",
};

function titleCase(value: string): string {
  return value
    .toLocaleLowerCase("es-HN")
    .replace(/(^|[\s'-])\p{L}/gu, (letter) =>
      letter.toLocaleUpperCase("es-HN"),
    );
}

function cleanName(value: string): string {
  const cleaned = value
    .replace(/\b(SURNAMES?|APELLIDOS?|GIVEN\s+NAMES?|NOMBRES?)\b/gi, "")
    .replace(/[^\p{L}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.length >= 2 ? titleCase(cleaned) : "";
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

function labeledValue(lines: readonly string[], label: RegExp): string {
  const labelIndex = lines.findIndex((line) => label.test(line));
  if (labelIndex === -1) return "";

  const inlineValue =
    lines[labelIndex]
      ?.replace(label, "")
      .replace(/^\s*[:/-]\s*/, "")
      .trim() ?? "";
  if (cleanName(inlineValue)) return inlineValue;

  for (
    let index = labelIndex + 1;
    index < Math.min(lines.length, labelIndex + 4);
    index += 1
  ) {
    const candidate = lines[index] ?? "";
    if (
      /APELLIDOS?|SURNAMES?|NOMBRES?|GIVEN\s+NAMES?|FECHA|NACIMIENTO|SEXO|NACIONALIDAD|IDENTIFICACI[ÓO]N/i.test(
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

    return dni || firstName || lastName || birthDate
      ? { dni, firstName, lastName, birthDate }
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

  const lines = text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const dniMatch = text.match(/\b\d{4}[\s-]?\d{4}[\s-]?\d{5}\b/);
  const birthLabelMatch = text.match(
    /(?:FECHA\s+DE\s+NACIMIENTO|DATE\s+OF\s+BIRTH)[^\d]{0,20}(\d{1,2}[\s/.-]\d{1,2}[\s/.-]\d{4})/i,
  );
  const fallbackDate = text.match(
    /\b\d{1,2}[\s/.-]\d{1,2}[\s/.-](?:19|20)\d{2}\b/,
  );

  return {
    dni: normalizeDni(dniMatch?.[0] ?? ""),
    firstName: cleanName(labeledValue(lines, /(?:NOMBRES?|GIVEN\s+NAMES?)/i)),
    lastName: cleanName(labeledValue(lines, /(?:APELLIDOS?|SURNAMES?)/i)),
    birthDate: isoDate(birthLabelMatch?.[1] ?? fallbackDate?.[0] ?? ""),
  };
}

export function identityFieldsFound(identity: ParsedHondurasIdentity): number {
  return [
    identity.dni,
    identity.firstName,
    identity.lastName,
    identity.birthDate,
  ].filter(Boolean).length;
}
