"use client";
export default function ErrorPage({ reset }:{ readonly error:Error & {digest?:string}; readonly reset:()=>void }) {
  return <main className="fatal-state" role="alert"><div className="logo">Credi<span>Cel</span></div><h1>No pudimos abrir esta sección</h1><p>Tu información está segura. Revisa tu conexión e inténtalo nuevamente.</p><button className="button" onClick={reset} type="button">Volver a intentar</button></main>;
}
