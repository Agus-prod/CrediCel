export type ApplicationDefaults = {
  readonly downPayment: number;
  readonly price: number;
  readonly term: number | null;
};

export function calculateApplicationDefaults(
  price: number,
  minimumDownPaymentPercentage: number | null,
  maximumTerm: number | null,
): ApplicationDefaults {
  const safePrice = Number.isFinite(price) && price > 0 ? price : 0;
  const percentage =
    minimumDownPaymentPercentage === null
      ? 0
      : Math.max(0, minimumDownPaymentPercentage);

  return {
    price: Math.round(safePrice * 100) / 100,
    downPayment: Math.ceil(safePrice * (percentage / 100) * 100) / 100,
    term:
      maximumTerm !== null && maximumTerm > 0 ? Math.floor(maximumTerm) : null,
  };
}
