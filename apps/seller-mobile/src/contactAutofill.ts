export interface ContactForReference {
  readonly name?: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly phoneNumbers?: readonly {
    readonly digits?: string;
    readonly number?: string;
    readonly isPrimary?: boolean;
  }[];
}

export interface ReferenceAutofill {
  readonly name: string;
  readonly phone: string;
}

/** Extracts the useful reference fields while leaving relationship manual. */
export function referenceAutofillFromContact(
  contact: ContactForReference,
): ReferenceAutofill | null {
  const fallbackName = [contact.firstName, contact.lastName]
    .filter(Boolean)
    .join(" ");
  const name = (contact.name || fallbackName).trim();
  const phoneEntry =
    contact.phoneNumbers?.find(
      (phone) => phone.isPrimary && (phone.digits || phone.number),
    ) ?? contact.phoneNumbers?.find((phone) => phone.digits || phone.number);
  const phone = (phoneEntry?.digits || phoneEntry?.number || "").trim();

  return name || phone ? { name, phone } : null;
}
