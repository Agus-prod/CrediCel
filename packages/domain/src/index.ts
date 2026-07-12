export type UUID = string;
export type EntityStatus = "active" | "inactive";
export interface Organization { readonly id: UUID; readonly name: string; readonly commercialName: string; readonly status: EntityStatus; }
export interface BusinessUnit { readonly id: UUID; readonly organizationId: UUID; readonly legalName: string; readonly commercialName: string; readonly ownerName: string; readonly rtn: string | null; readonly status: EntityStatus; }
export interface Branch { readonly id: UUID; readonly organizationId: UUID; readonly businessUnitId: UUID; readonly name: string; readonly code: string; readonly branchType: "store" | "warehouse" | "office"; readonly address: string; readonly phone: string | null; readonly status: EntityStatus; }
export const inventoryStatuses = ["available","reserved","transfer_pending","in_transit","sold_cash","financed_active","delinquent","restricted","warranty","repair","recovered","released","lost"] as const;
export type InventoryStatus = (typeof inventoryStatuses)[number];
export const transferStatuses = ["requested","approved","preparing","dispatched","in_transit","received","received_with_discrepancy","rejected","cancelled","lost"] as const;
export type TransferStatus = (typeof transferStatuses)[number];
export const creditApplicationStatuses = ["draft","documents_pending","submitted","under_review","additional_information_required","preapproved","approved","rejected","contract_pending","signed","device_setup_pending","ready_for_delivery","activated","cancelled"] as const;
export type CreditApplicationStatus = (typeof creditApplicationStatuses)[number];
