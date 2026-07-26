import { calculateFinancingQuote } from "@/lib/financing";
import styles from "./page.module.css";

const money = new Intl.NumberFormat("es-HN", {
  style: "currency",
  currency: "HNL",
  minimumFractionDigits: 2,
});

const quote = calculateFinancingQuote({
  price: 23990,
  downPayment: 5000,
  term: 12,
  monthlyInterestRate: 3.5,
  administrativeFeePercentage: 3,
});

const startDate = new Date(Date.UTC(2026, 6, 25));
let balance = quote.financedSubtotal;
const monthlyRate = quote.monthlyInterestRate / 100;
const schedule = Array.from({ length: quote.term }, (_, index) => {
  const interest = Math.round(balance * monthlyRate * 100) / 100;
  const payment =
    index === quote.term - 1
      ? Math.round((balance + interest) * 100) / 100
      : quote.monthlyInstallment;
  const principal = Math.round((payment - interest) * 100) / 100;
  balance = Math.max(0, Math.round((balance - principal) * 100) / 100);
  const dueDate = new Date(startDate);
  dueDate.setUTCMonth(dueDate.getUTCMonth() + index + 1);
  return {
    number: index + 1,
    dueDate: dueDate.toLocaleDateString("es-HN", { timeZone: "UTC" }),
    payment,
    principal,
    interest,
    balance,
  };
});
const firstInstallment = schedule[0]!;
const secondInstallment = schedule[1]!;

function Header({ title, code }: { readonly title: string; readonly code: string }) {
  return (
    <header className={styles.documentHeader}>
      <div><strong className={styles.brand}>Credi<span>Cel</span></strong><small>Documento demostrativo</small></div>
      <div className={styles.documentMeta}><strong>{title}</strong><span>{code}</span></div>
    </header>
  );
}

function Signatures() {
  return (
    <div className={styles.signatures}>
      <div><span>María Fernanda López</span><small>Cliente / Deudora</small></div>
      <div><span>CrediCel Honduras</span><small>Acreedor</small></div>
    </div>
  );
}

export default function DemoDocumentsPage() {
  return (
    <main className={styles.workspace}>
      <nav className={styles.toolbar}>
        <div><strong>Expediente demo CC-202607-DEMO001</strong><span>Vista previa de documentos financieros</span></div>
        <div className={styles.links}>
          <a href="#pagare">Pagaré</a><a href="#contrato">Contrato</a><a href="#amortizacion">Amortización</a><a href="#pagos">Pagos</a>
        </div>
      </nav>
      <div className={styles.warning}><strong>BORRADOR DE PRUEBA — NO VÁLIDO PARA FIRMA</strong><span>El contenido legal debe ser revisado y aprobado por asesoría jurídica en Honduras.</span></div>

      <section className={styles.paper} id="pagare">
        <Header title="PAGARÉ" code="PAG-202607-DEMO001" />
        <h1>Pagaré a la orden</h1>
        <p className={styles.lead}>Por <strong>{money.format(quote.totalFinancedToPay)}</strong></p>
        <p>Yo, <strong>María Fernanda López</strong>, mayor de edad, hondureña, con identidad <strong>0801-1992-12345</strong>, prometo pagar incondicionalmente a la orden de <strong>CrediCel Honduras</strong> la suma indicada, correspondiente al financiamiento del dispositivo descrito en el contrato <strong>CC-202607-DEMO001</strong>.</p>
        <p>El pago se realizará en <strong>{quote.term} cuotas mensuales</strong> conforme al calendario de amortización anexo. La primera cuota vence el <strong>{firstInstallment.dueDate}</strong>. Todo pago deberá acreditarse mediante recibo emitido por CrediCel.</p>
        <div className={styles.summary}><div><span>Monto financiado inicial</span><strong>{money.format(quote.financedSubtotal)}</strong></div><div><span>Cuota mensual estimada</span><strong>{money.format(quote.monthlyInstallment)}</strong></div><div><span>Tasa mensual</span><strong>{quote.monthlyInterestRate}%</strong></div><div><span>Total de cuotas</span><strong>{money.format(quote.totalFinancedToPay)}</strong></div></div>
        <p className={styles.clause}>Las condiciones de mora, vencimiento anticipado, gastos de cobranza, jurisdicción y demás efectos jurídicos deberán incorporarse únicamente después de revisión legal y aceptación expresa del cliente.</p>
        <Signatures />
      </section>

      <section className={styles.paper} id="contrato">
        <Header title="CONTRATO DE COMPRAVENTA A CRÉDITO" code="CC-202607-DEMO001" />
        <h1>Contrato de venta y financiamiento</h1>
        <div className={styles.parties}><p><strong>Vendedor:</strong> CrediCel Honduras · RTN 08019000000001</p><p><strong>Cliente:</strong> María Fernanda López · Identidad 0801-1992-12345</p></div>
        <h2>1. Equipo financiado</h2><p>Apple iPhone 15, 128 GB, color negro, IMEI demo 354000000000001. Precio de venta: <strong>{money.format(quote.price)}</strong>.</p>
        <h2>2. Prima y financiamiento</h2><p>El cliente entrega una prima de <strong>{money.format(quote.downPayment)}</strong>. El saldo principal es {money.format(quote.principal)}; se incorpora un cargo administrativo demo de {money.format(quote.administrativeFee)}, para un monto inicial financiado de <strong>{money.format(quote.financedSubtotal)}</strong>.</p>
        <h2>3. Forma de pago</h2><p>{quote.term} cuotas mensuales niveladas de aproximadamente <strong>{money.format(quote.monthlyInstallment)}</strong>, sujetas al ajuste final indicado en la tabla de amortización. Tasa mensual demo: {quote.monthlyInterestRate}%; tasa efectiva anual de referencia: {quote.annualEffectiveRate}%.</p>
        <h2>4. Entrega y garantía</h2><p>La entrega del equipo, su estado, accesorios, garantía comercial y configuración de protección deberán constar en un acta separada vinculada al expediente.</p>
        <h2>5. Protección de datos</h2><p>La información de identidad, contacto, documentos y pagos se utilizará exclusivamente para originación, administración y cobranza del crédito, conforme al consentimiento registrado en el expediente.</p>
        <p className={styles.clause}>Texto demostrativo. Las cláusulas definitivas sobre mora, garantías, terminación, solución de controversias, tratamiento de datos y protección del dispositivo requieren validación jurídica.</p>
        <Signatures />
      </section>

      <section className={`${styles.paper} ${styles.wide}`} id="amortizacion">
        <Header title="TABLA DE AMORTIZACIÓN" code="CC-202607-DEMO001" />
        <h1>Calendario de cuotas</h1>
        <div className={styles.summary}><div><span>Precio</span><strong>{money.format(quote.price)}</strong></div><div><span>Prima</span><strong>{money.format(quote.downPayment)}</strong></div><div><span>Financiado + cargo</span><strong>{money.format(quote.financedSubtotal)}</strong></div><div><span>Intereses estimados</span><strong>{money.format(quote.interestAmount)}</strong></div></div>
        <div className={styles.tableWrap}><table><thead><tr><th>Cuota</th><th>Vencimiento</th><th>Pago</th><th>Capital</th><th>Interés</th><th>Saldo</th></tr></thead><tbody>{schedule.map(row=><tr key={row.number}><td>{row.number}</td><td>{row.dueDate}</td><td>{money.format(row.payment)}</td><td>{money.format(row.principal)}</td><td>{money.format(row.interest)}</td><td>{money.format(row.balance)}</td></tr>)}</tbody><tfoot><tr><th colSpan={2}>Totales</th><th>{money.format(schedule.reduce((sum,row)=>sum+row.payment,0))}</th><th>{money.format(schedule.reduce((sum,row)=>sum+row.principal,0))}</th><th>{money.format(schedule.reduce((sum,row)=>sum+row.interest,0))}</th><th>—</th></tr></tfoot></table></div>
        <p className={styles.note}>Los importes son demostrativos y pueden variar un centavo en la última cuota por redondeo.</p>
      </section>

      <section className={`${styles.paper} ${styles.wide}`} id="pagos">
        <Header title="HISTORIAL Y RECIBOS DE PAGO" code="CTA-DEMO001" />
        <h1>Pagos de cuotas</h1>
        <div className={styles.paymentGrid}>
          <article><span className={styles.paid}>PAGADO</span><small>Recibo REC-20260725-001</small><h2>Prima inicial</h2><strong>{money.format(quote.downPayment)}</strong><p>25/07/2026 · Efectivo<br/>Caja Centro Tegucigalpa</p></article>
          <article><span className={styles.paid}>PAGADO</span><small>Recibo REC-20260825-014</small><h2>Cuota 1</h2><strong>{money.format(firstInstallment.payment)}</strong><p>25/08/2026 · Transferencia<br/>Referencia DEMO-45821</p></article>
          <article><span className={styles.pending}>PENDIENTE</span><small>Vence {secondInstallment.dueDate}</small><h2>Cuota 2</h2><strong>{money.format(secondInstallment.payment)}</strong><p>Saldo de cuenta demo<br/>{money.format(quote.totalFinancedToPay-firstInstallment.payment)}</p></article>
        </div>
        <div className={styles.tableWrap}><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Método</th><th>Referencia</th><th>Monto</th><th>Estado</th></tr></thead><tbody><tr><td>25/07/2026</td><td>Prima inicial</td><td>Efectivo</td><td>REC-20260725-001</td><td>{money.format(quote.downPayment)}</td><td>Aplicado</td></tr><tr><td>25/08/2026</td><td>Cuota 1</td><td>Transferencia</td><td>DEMO-45821</td><td>{money.format(firstInstallment.payment)}</td><td>Aplicado</td></tr><tr><td>{secondInstallment.dueDate}</td><td>Cuota 2</td><td>—</td><td>—</td><td>{money.format(secondInstallment.payment)}</td><td>Pendiente</td></tr></tbody></table></div>
      </section>
    </main>
  );
}
