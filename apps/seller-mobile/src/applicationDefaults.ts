export interface AutomaticFinancingValues {
  readonly requestedPrice: string;
  readonly downPayment: string;
  readonly term: string;
}

function moneyInput(value: number): string {
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/\.?0+$/, "");
}

/**
 * Builds the values controlled by the selected inventory unit and the active
 * credit configuration. The down payment is rounded up to the next cent so it
 * can never fall just below the configured minimum because of floating point
 * rounding.
 */
export function automaticFinancingValues(
  cashPrice: number,
  minimumDownPaymentPercentage: number | null,
  maximumTerm: number | null,
): AutomaticFinancingValues {
  const validPrice = Number.isFinite(cashPrice) && cashPrice > 0;
  const validPercentage =
    minimumDownPaymentPercentage !== null &&
    Number.isFinite(minimumDownPaymentPercentage) &&
    minimumDownPaymentPercentage >= 0;
  const validMaximumTerm =
    maximumTerm !== null && Number.isFinite(maximumTerm) && maximumTerm >= 1;

  if (!validPrice) {
    return { requestedPrice: "", downPayment: "", term: "" };
  }

  const priceInCents = Math.round(cashPrice * 100);
  const minimumDownPaymentInCents = validPercentage
    ? Math.ceil((priceInCents * minimumDownPaymentPercentage) / 100 - 1e-9)
    : null;

  return {
    requestedPrice: moneyInput(priceInCents / 100),
    downPayment:
      minimumDownPaymentInCents === null
        ? ""
        : moneyInput(minimumDownPaymentInCents / 100),
    term: validMaximumTerm ? String(Math.floor(maximumTerm)) : "",
  };
}
