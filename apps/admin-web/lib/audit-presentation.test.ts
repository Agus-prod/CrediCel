import { describe, expect, it } from "vitest";

import { presentAuditEvent } from "./audit-presentation";

describe("presentAuditEvent", () => {
  it("presenta una creación con lenguaje de negocio y oculta identificadores", () => {
    const event = presentAuditEvent({
      action: "insert",
      entityType: "rule_sets",
      beforeValues: null,
      afterValues: {
        id: "afac4736-1700-473b-92bd-59276c8fca30",
        organization_id: "8eb4bb7a-bd30-4928-b9af-8f81d61c44e7",
        name: "Evaluación inicial",
        status: "active",
        version: 1,
        created_at: "2026-07-16T03:01:43.552752+00:00",
      },
    });

    expect(event.title).toBe(
      "Se creó el conjunto de reglas “Evaluación inicial”",
    );
    expect(event.actionLabel).toBe("Creación");
    expect(event.changes).toEqual([
      { field: "Nombre", previous: null, current: "Evaluación inicial" },
      { field: "Estado", previous: null, current: "Activo" },
      { field: "Versión", previous: null, current: "1" },
    ]);
  });

  it("muestra solamente los campos modificados", () => {
    const event = presentAuditEvent({
      action: "update",
      entityType: "credit_applications",
      beforeValues: {
        id: "internal",
        status: "under_review",
        proposed_term: 12,
      },
      afterValues: { id: "internal", status: "approved", proposed_term: 12 },
    });

    expect(event.title).toBe("Se actualizó la solicitud de crédito");
    expect(event.changes).toEqual([
      { field: "Estado", previous: "En revisión", current: "Aprobado" },
    ]);
  });

  it("formatea montos y valores eliminados", () => {
    const event = presentAuditEvent({
      action: "delete",
      entityType: "transfer_reports",
      beforeValues: { reference_number: "TRX-100", amount: 1500 },
      afterValues: null,
    });

    expect(event.title).toBe("Se eliminó el reporte de pago “TRX-100”");
    expect(event.changes[1]).toEqual({
      field: "Monto",
      previous: "L 1,500.00",
      current: null,
    });
  });

  it("protege datos personales en el historial visible", () => {
    const event = presentAuditEvent({
      action: "insert",
      entityType: "customers",
      beforeValues: null,
      afterValues: {
        first_name: "Lucía",
        last_name: "Gómez",
        phone: "99992003",
        email: "lucia@example.com",
        national_id: "0801199903333",
        address: "Colonia Centro",
      },
    });

    expect(event.changes).toEqual(
      expect.arrayContaining([
        { field: "Teléfono", previous: null, current: "••••2003" },
        { field: "Correo", previous: null, current: "l•••@example.com" },
        { field: "DNI", previous: null, current: "••••••••03333" },
        {
          field: "Dirección",
          previous: null,
          current: "Información protegida",
        },
      ]),
    );
  });
});
