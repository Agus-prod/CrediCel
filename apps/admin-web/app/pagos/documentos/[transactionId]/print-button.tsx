"use client";

export function PrintButton() {
  return (
    <button className="button" onClick={() => window.print()} type="button">
      Imprimir documentación
    </button>
  );
}
