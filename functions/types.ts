import { summaryOfEvents } from './cloudTrailLookup'

export type Tuple = Record<string, number>

export interface DeleteAccessKeyResponse {
  accountId: string
  username?: string
  timeDiscovered: string
  deletedKey: string
}

export interface CloudTrailLookupEvent {
  deleteAccessKey: DeleteAccessKeyResponse
}
export interface CloudTrailLookupResponse {
  cloudTrailEvent: ReturnType<typeof summaryOfEvents>
}

export interface NotifyUserViaSNSRequest
  extends CloudTrailLookupEvent,
    CloudTrailLookupResponse {}
