import { describe, expect, it } from "vitest";

import { identityFieldsFound, parseHondurasIdentityText } from "./honduras-id";

describe("parseHondurasIdentityText", () => {
  it("extrae los datos principales de texto OCR de una identidad hondureña", () => {
    const identity = parseHondurasIdentityText(`
      REPÚBLICA DE HONDURAS
      DOCUMENTO NACIONAL DE IDENTIFICACIÓN
      0801-1999-01234
      APELLIDOS / SURNAMES
      GÓMEZ LÓPEZ
      NOMBRES / GIVEN NAMES
      LUCÍA MARÍA
      FECHA DE NACIMIENTO / DATE OF BIRTH 07/04/1999
    `);

    expect(identity).toEqual({
      dni: "0801-1999-01234",
      firstName: "Lucía María",
      lastName: "Gómez López",
      birthDate: "1999-04-07",
    });
    expect(identityFieldsFound(identity)).toBe(4);
  });

  it("acepta un QR con carga JSON", () => {
    expect(
      parseHondurasIdentityText(
        JSON.stringify({
          dni: "0801199901234",
          nombres: "ANA SOFÍA",
          apellidos: "REYES",
          fecha_nacimiento: "03/12/1999",
        }),
      ),
    ).toEqual({
      dni: "0801-1999-01234",
      firstName: "Ana Sofía",
      lastName: "Reyes",
      birthDate: "1999-12-03",
    });
  });
});
