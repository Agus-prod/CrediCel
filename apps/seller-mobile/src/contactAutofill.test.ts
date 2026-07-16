import { describe, expect, it } from "vitest";
import { referenceAutofillFromContact } from "./contactAutofill";

describe("referenceAutofillFromContact", () => {
  it("uses the contact name and primary phone", () => {
    expect(
      referenceAutofillFromContact({
        name: "María López",
        phoneNumbers: [
          { digits: "22223333" },
          { digits: "99991111", isPrimary: true },
        ],
      }),
    ).toEqual({ name: "María López", phone: "99991111" });
  });

  it("falls back to split names and a formatted phone number", () => {
    expect(
      referenceAutofillFromContact({
        firstName: "José",
        lastName: "Pérez",
        phoneNumbers: [{ number: "+504 9999-2222" }],
      }),
    ).toEqual({ name: "José Pérez", phone: "+504 9999-2222" });
  });

  it("returns a partial value so the user can complete it manually", () => {
    expect(referenceAutofillFromContact({ name: "Ana" })).toEqual({
      name: "Ana",
      phone: "",
    });
  });
});
