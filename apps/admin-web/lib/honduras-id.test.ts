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
      SEXO F
    `);

    expect(identity).toEqual({
      dni: "0801-1999-01234",
      firstName: "Lucía María",
      lastName: "Gómez López",
      birthDate: "1999-04-07",
      sex: "female",
    });
    expect(identityFieldsFound(identity)).toBe(5);
  });

  it("acepta un QR con carga JSON", () => {
    expect(
      parseHondurasIdentityText(
        JSON.stringify({
          dni: "0801199901234",
          nombres: "ANA SOFÍA",
          apellidos: "REYES",
          fecha_nacimiento: "03/12/1999",
          sexo: "Femenino",
        }),
      ),
    ).toEqual({
      dni: "0801-1999-01234",
      firstName: "Ana Sofía",
      lastName: "Reyes",
      birthDate: "1999-12-03",
      sex: "female",
    });
  });

  it("prioriza MRZ hondureña para evitar leer labels como nombres", () => {
    const identity = parseHondurasIdentityText(`
      NOMBRE / FORENAME
      TIFFANY JUSELL
      APELLIDO / SURNAME
      CACERES RAMIREZ
      FECHA DE NACIMIENTO / DATE OF BIRTH
      14-06-1995
      NÚMERO DE IDENTIFICACIÓN / ID NUMBER
      1518 1995 00242
      I<HN0051445209<<<<<<<<<<<<<<
      9506147F3106143HND<<<<<<<<<<<0
      CACERES<RAMIREZ<<TIFFANY<JUSELL
    `);

    expect(identity).toEqual({
      dni: "1518-1995-00242",
      firstName: "Tiffany Jusell",
      lastName: "Caceres Ramirez",
      birthDate: "1995-06-14",
      sex: "female",
    });
  });

  it("no usa etiquetas mal leídas como apellido del cliente", () => {
    const identity = parseHondurasIdentityText(`
      NOMBRE / FORENAME
      TIFFANY JUSELL
      APELUDO
      FECHA DE NACIMIENTO / DATE OF BIRTH
      14-06-1995
      NÚMERO DE IDENTIFICACIÓN / ID NUMBER
      1518 1995 00242
    `);

    expect(identity.lastName).toBe("");
  });

  it("corrige ruido común de OCR en nombres impresos del DNI", () => {
    const identity = parseHondurasIdentityText(`
      NOMBRE / FORENAME
      TFIFFANY JUSEL
      APELLIDO / SURNAME
      ZACACERES RAMIREZ
      FECHA DE NACIMIENTO / DATE OF BIRTH
      14-06-1995
      NÚMERO DE IDENTIFICACIÓN / ID NUMBER
      1518 1995 00242
      SEXO F
    `);

    expect(identity.firstName).toBe("Tiffany Jusell");
    expect(identity.lastName).toBe("Caceres Ramirez");
  });
});
