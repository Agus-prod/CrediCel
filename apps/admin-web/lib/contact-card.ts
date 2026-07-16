export type ContactCard = {
  readonly name: string;
  readonly phone: string;
};

function unfoldVCard(source: string): string[] {
  return source
    .replace(/\r\n[ \t]/g, "")
    .replace(/\r/g, "")
    .split("\n");
}

function valueAfterColon(line: string): string {
  const colon = line.indexOf(":");
  return colon === -1 ? "" : line.slice(colon + 1).trim();
}

export function parseContactCard(source: string): ContactCard | null {
  const lines = unfoldVCard(source);
  const formattedName = lines.find((line) => /^FN(?:;[^:]*)?:/i.test(line));
  const structuredName = lines.find((line) => /^N(?:;[^:]*)?:/i.test(line));
  const telephone = lines.find((line) => /^TEL(?:;[^:]*)?:/i.test(line));

  let name = formattedName ? valueAfterColon(formattedName) : "";
  if (!name && structuredName) {
    const [lastName, firstName] = valueAfterColon(structuredName).split(";");
    name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  }

  const phone = telephone
    ? valueAfterColon(telephone).replace(/^tel:/i, "")
    : "";
  return name && phone ? { name, phone } : null;
}
