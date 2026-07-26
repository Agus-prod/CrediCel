export default function Loading() {
  return <main className="route-loading" aria-busy="true" aria-label="Cargando contenido"><div className="loading-brand">Credi<span>Cel</span></div><div className="loading-line wide"/><div className="loading-grid">{[0,1,2,3].map(item => <div className="loading-card" key={item}/>)}</div><span className="sr-only">Cargando</span></main>;
}
