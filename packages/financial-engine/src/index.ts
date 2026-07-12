export interface FinancialEngine { quote(input: FinancialQuoteInput): Promise<FinancialQuote>; }
export interface FinancialQuoteInput { readonly configurationVersionId: string; readonly priceMinor: bigint; readonly downPaymentMinor: bigint; readonly termMonths: number; }
export interface FinancialQuote { readonly status: "not_implemented"; }
export class PendingFinancialEngine implements FinancialEngine { public async quote(_input: FinancialQuoteInput): Promise<FinancialQuote> { return { status: "not_implemented" }; } }
