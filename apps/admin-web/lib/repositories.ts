export interface QueryResult<T>{readonly data:readonly T[];readonly error:string|null}
export interface TenantRepository<TCreate,TRead>{list(organizationId:string):Promise<QueryResult<TRead>>;create(organizationId:string,input:TCreate):Promise<TRead>}
export interface TransferOperations{dispatch(transferId:string,scannedImeis:readonly string[]):Promise<void>;receive(transferId:string,scannedImeis:readonly string[]):Promise<void>}
export interface SignedDocumentAccess{createUploadPath(organizationId:string,customerId:string):string;createSignedReadUrl(storagePath:string,expiresInSeconds:number):Promise<string>}
export function createUnpredictableDocumentPath(organizationId:string,customerId:string):string{return `${organizationId}/${customerId}/${crypto.randomUUID()}/${crypto.randomUUID()}`}
