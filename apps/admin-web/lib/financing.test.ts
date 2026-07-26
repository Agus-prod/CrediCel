import { describe, expect, it } from "vitest";

import { calculateFinancingQuote } from "./financing";

describe("calculateFinancingQuote", () => {
  it("calculates a level-payment quote with administrative fee", () => {
    const quote = calculateFinancingQuote({
      administrativeFeePercentage: 3,
      downPayment: 1300,
      monthlyInterestRate: 3.5,
      price: 12990,
      term: 6,
    });

    expect(quote.principal).toBe(11690);
    expect(quote.administrativeFee).toBe(350.7);
    expect(quote.financedSubtotal).toBe(12040.7);
    expect(quote.monthlyInstallment).toBe(2259.66);
    expect(quote.interestAmount).toBe(1517.26);
    expect(quote.totalFinancedToPay).toBe(13557.96);
    expect(quote.totalCustomerPays).toBe(14857.96);
    expect(quote.annualEffectiveRate).toBe(51.11);
  });

  it("does not finance negative values", () => {
    const quote = calculateFinancingQuote({
      administrativeFeePercentage: 3,
      downPayment: 20000,
      monthlyInterestRate: 3.5,
      price: 12990,
      term: 6,
    });

    expect(quote.principal).toBe(0);
    expect(quote.monthlyInstallment).toBe(0);
  });
});
