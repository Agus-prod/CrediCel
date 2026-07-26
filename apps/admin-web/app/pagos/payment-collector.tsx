"use client";

import { useEffect, useMemo, useState } from "react";
import { recordCashPayment } from "./actions";

export type PaymentAccount = {
  readonly id: string;
  readonly outstanding_balance: number;
  readonly installment_amount: number;
  readonly customerName: string;
  readonly branchName: string;
  readonly installments: readonly {
    readonly installment_number: number;
    readonly due_date: string;
    readonly amount: number;
    readonly paid_amount: number;
    readonly status: string;
  }[];
};

const money = (value: number) =>
  new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency: "HNL",
  }).format(value);

export function PaymentCollector({
  accounts,
}: {
  readonly accounts: readonly PaymentAccount[];
}) {
  const [accountId, setAccountId] = useState("");
  const [mode, setMode] = useState("single");
  const [count, setCount] = useState(2);
  const account = accounts.find((item) => item.id === accountId);
  const pending = useMemo(
    () =>
      (account?.installments ?? [])
        .filter((item) => ["pending", "partial", "overdue"].includes(item.status))
        .sort((a, b) => a.installment_number - b.installment_number),
    [account],
  );
  useEffect(() => {
    if (mode === "multiple" && pending.length < 2) setMode("single");
    if (pending.length >= 2 && count > pending.length) setCount(pending.length);
  }, [count, mode, pending.length]);
  const selectedCount = mode === "single" ? 1 : mode === "multiple" ? count : 0;
  const selectedInstallments = mode === "payoff" ? pending : pending.slice(0, selectedCount);
  const amount = !account
    ? 0
    : mode === "payoff"
      ? Number(account.outstanding_balance)
      : Math.min(
          Number(account.outstanding_balance),
          pending
            .slice(0, selectedCount)
            .reduce(
              (total, item) => total + Number(item.amount) - Number(item.paid_amount),
              0,
            ),
        );

  return (
    <div className="card form-card payment-collector">
      <div className="form-title">
        <div>
          <h2>Recibir pago en caja</h2>
          <p className="muted">
            Selecciona las cuotas a cubrir o cancela el saldo completo.
          </p>
        </div>
      </div>
      <form action={recordCashPayment} className="form">
        <div className="field full-field">
          <label htmlFor="account_id">Cliente y crédito</label>
          <select
            id="account_id"
            name="account_id"
            onChange={(event) => setAccountId(event.target.value)}
            required
            value={accountId}
          >
            <option value="">Seleccionar</option>
            {accounts.map((item) => (
              <option value={item.id} key={item.id}>
                {item.customerName} · {item.branchName} · saldo {money(Number(item.outstanding_balance))}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="payment_mode">Tipo de pago</label>
          <select
            id="payment_mode"
            name="payment_mode"
            onChange={(event) => setMode(event.target.value)}
            value={mode}
          >
            <option value="single">Pagar una cuota</option>
            <option disabled={pending.length < 2} value="multiple">Pagar varias cuotas</option>
            <option value="payoff">Cancelación total de la deuda</option>
          </select>
        </div>
        {mode === "multiple" ? (
          <div className="field">
            <label htmlFor="installment_count">Cantidad de cuotas</label>
            <input
              id="installment_count"
              max={pending.length}
              min="2"
              name="installment_count"
              onChange={(event) => setCount(Number(event.target.value))}
              type="number"
              value={count}
            />
          </div>
        ) : (
          <input name="installment_count" type="hidden" value="1" />
        )}
        <div className="field">
          <label>Monto exacto a recibir</label>
          <output className="payment-total">{account ? money(amount) : "Selecciona un crédito"}</output>
        </div>
        {account ? (
          <div className="payment-installment-selection full-field">
            <strong>
              {mode === "payoff" ? "Cuotas incluidas en la cancelación" : "Cuotas que se aplicarán"}
            </strong>
            <div className="payment-installment-chips">
              {selectedInstallments.map((installment) => (
                <span key={installment.installment_number}>
                  Cuota #{installment.installment_number} · vence {new Date(`${installment.due_date}T12:00:00`).toLocaleDateString("es-HN")} · {money(Number(installment.amount) - Number(installment.paid_amount))}
                </span>
              ))}
            </div>
            <small>El sistema aplica el pago desde la obligación más antigua para conservar el historial correcto.</small>
          </div>
        ) : null}
        <div className="field">
          <label htmlFor="payment_method">Forma de pago</label>
          <select id="payment_method" name="payment_method">
            <option value="cash">Efectivo</option>
            <option value="card">Tarjeta</option>
            <option value="transfer">Transferencia</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div className="field full-field">
          <label htmlFor="reference">Referencia u observación</label>
          <input id="reference" name="reference" />
        </div>
        {mode === "payoff" && account ? (
          <div className="payment-payoff-warning full-field">
            <strong>Cancelación total</strong>
            <span>
              Al confirmar se cerrará el crédito y se generarán recibo, estado
              final y finiquito imprimible.
            </span>
          </div>
        ) : null}
        <div className="form-actions full-field">
          <button className="button" disabled={!account || amount <= 0} type="submit">
            {mode === "payoff"
              ? "Cobrar y generar finiquito"
              : "Cobrar y emitir recibo"}
          </button>
        </div>
      </form>
    </div>
  );
}
