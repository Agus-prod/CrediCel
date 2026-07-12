export interface DocumentTemplateContract { readonly key: string; readonly version: number; readonly requiredVariables: readonly string[]; }
export const pendingContractTemplate: DocumentTemplateContract = { key: "credit-contract", version: 0, requiredVariables: [] };
