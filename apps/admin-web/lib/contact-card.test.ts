import { describe, expect, it } from "vitest";

import { parseContactCard } from "./contact-card";

describe("parseContactCard", () => {
  it("lee nombre y teléfono de una tarjeta vCard", () => {
    expect(
      parseContactCard(
        "BEGIN:VCARD\nVERSION:3.0\nN:Castillo;Pedro;;;\nFN:Pedro Castillo\nTEL;TYPE=CELL:99992002\nEND:VCARD",
      ),
    ).toEqual({ name: "Pedro Castillo", phone: "99992002" });
  });
});
