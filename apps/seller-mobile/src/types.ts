import type { ImagePickerAsset } from "expo-image-picker";

export type Relation<T> = T | readonly T[] | null;

export function one<T>(value: Relation<T>): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value as T | null);
}

export interface InventoryDevice {
  readonly id: string;
  readonly branchId: string;
  readonly imei: string;
  readonly brand: string;
  readonly model: string;
  readonly color: string;
  readonly storage: string;
  readonly cashPrice: number;
  readonly branch: string;
}

export interface PortfolioCustomer {
  readonly assignmentId: string;
  readonly customerId: string;
  readonly name: string;
  readonly dni: string;
  readonly phone: string;
  readonly branch: string;
}

export interface BranchOption {
  readonly id: string;
  readonly name: string;
}

export type DocumentType =
  "dni_front" | "dni_back" | "selfie" | "address_proof";

export type CapturedDocuments = Readonly<
  Record<DocumentType, ImagePickerAsset | null>
>;

export interface ApplicationForm {
  readonly branchId: string;
  readonly inventoryUnitId: string;
  readonly dni: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone: string;
  readonly email: string;
  readonly requestedPrice: string;
  readonly downPayment: string;
  readonly term: string;
  readonly birthDate: string;
  readonly maritalStatus: "single" | "married" | "union" | "other";
  readonly dependents: string;
  readonly currentAddress: string;
  readonly housingType: "owned" | "rented" | "family";
  readonly employerName: string;
  readonly jobTitle: string;
  readonly monthlyIncome: string;
  readonly monthlyExpenses: string;
  readonly employmentMonths: string;
  readonly referenceOneName: string;
  readonly referenceOnePhone: string;
  readonly referenceOneRelationship: string;
  readonly referenceTwoName: string;
  readonly referenceTwoPhone: string;
  readonly referenceTwoRelationship: string;
  readonly consentDataProcessing: boolean;
  readonly consentCreditReview: boolean;
}

export const initialApplicationForm: ApplicationForm = {
  branchId: "",
  inventoryUnitId: "",
  dni: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  requestedPrice: "",
  downPayment: "",
  term: "",
  birthDate: "",
  maritalStatus: "single",
  dependents: "0",
  currentAddress: "",
  housingType: "owned",
  employerName: "",
  jobTitle: "",
  monthlyIncome: "",
  monthlyExpenses: "",
  employmentMonths: "",
  referenceOneName: "",
  referenceOnePhone: "",
  referenceOneRelationship: "",
  referenceTwoName: "",
  referenceTwoPhone: "",
  referenceTwoRelationship: "",
  consentDataProcessing: false,
  consentCreditReview: false,
};

export const emptyDocuments: CapturedDocuments = {
  dni_front: null,
  dni_back: null,
  selfie: null,
  address_proof: null,
};
