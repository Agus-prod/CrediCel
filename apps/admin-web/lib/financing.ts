export type FinancingQuote = {
  readonly administrativeFee: number;
  readonly administrativeFeePercentage: number;
  readonly annualEffectiveRate: number;
  readonly downPayment: number;
  readonly financedSubtotal: number;
  readonly interestAmount: number;
  readonly monthlyInstallment: number;
  readonly monthlyInterestRate: number;
  readonly principal: number;
  readonly price: number;
  readonly term: number;
  readonly totalCustomerPays: number;
  readonly totalFinancedToPay: number;
};

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export function calculateLevelPayment(
  amount: number,
  monthlyRatePercentage: number,
  term: number,
) {
  if (amount <= 0 || term <= 0) return 0;
  const monthlyRate = monthlyRatePercentage / 100;
  if (monthlyRate <= 0) return roundMoney(amount / term);
  const factor = Math.pow(1 + monthlyRate, term);
  return roundMoney((amount * monthlyRate * factor) / (factor - 1));
}

export function calculateFinancingQuote({
  administrativeFeePercentage,
  downPayment,
  monthlyInterestRate,
  price,
  term,
}: {
  readonly administrativeFeePercentage: number;
  readonly downPayment: number;
  readonly monthlyInterestRate: number;
  readonly price: number;
  readonly term: number;
}): FinancingQuote {
  const safePrice = Math.max(Number.isFinite(price) ? price : 0, 0);
  const safeDownPayment = Math.min(
    Math.max(Number.isFinite(downPayment) ? downPayment : 0, 0),
    safePrice,
  );
  const safeTerm = Math.max(Math.floor(Number.isFinite(term) ? term : 0), 0);
  const safeMonthlyRate = Math.max(
    Number.isFinite(monthlyInterestRate) ? monthlyInterestRate : 0,
    0,
  );
  const safeAdministrativeFeePercentage = Math.max(
    Number.isFinite(administrativeFeePercentage)
      ? administrativeFeePercentage
      : 0,
    0,
  );
  const principal = roundMoney(safePrice - safeDownPayment);
  const administrativeFee = roundMoney(
    principal * (safeAdministrativeFeePercentage / 100),
  );
  const financedSubtotal = roundMoney(principal + administrativeFee);
  const monthlyInstallment = calculateLevelPayment(
    financedSubtotal,
    safeMonthlyRate,
    safeTerm,
  );
  const totalFinancedToPay = roundMoney(monthlyInstallment * safeTerm);
  const interestAmount = roundMoney(totalFinancedToPay - financedSubtotal);

  return {
    administrativeFee,
    administrativeFeePercentage: safeAdministrativeFeePercentage,
    annualEffectiveRate: roundMoney(
      (Math.pow(1 + safeMonthlyRate / 100, 12) - 1) * 100,
    ),
    downPayment: safeDownPayment,
    financedSubtotal,
    interestAmount,
    monthlyInstallment,
    monthlyInterestRate: safeMonthlyRate,
    principal,
    price: safePrice,
    term: safeTerm,
    totalCustomerPays: roundMoney(safeDownPayment + totalFinancedToPay),
    totalFinancedToPay,
  };
}
