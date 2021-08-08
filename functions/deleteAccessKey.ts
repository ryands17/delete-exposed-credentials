import { IAM } from 'aws-sdk'
import { EventBridgeHandler } from 'aws-lambda'
import { AffectedEntity } from 'aws-sdk/clients/health'
import { DeleteAccessKeyResponse } from './types'

const iam = new IAM()

interface EventDetail {
  affectedEntities: AffectedEntity[]
}

export const handler: EventBridgeHandler<
  string,
  EventDetail,
  DeleteAccessKeyResponse
> = async (event) => {
  try {
    let accessKeyId = event.detail.affectedEntities[0].entityValue || ''

    let { UserName } = await iam
      .getAccessKeyLastUsed({ AccessKeyId: accessKeyId })
      .promise()

    await iam.deleteAccessKey({ UserName, AccessKeyId: accessKeyId }).promise()

    return {
      accountId: event.account,
      username: UserName,
      timeDiscovered: event.time,
      deletedKey: accessKeyId,
    }
  } catch (e) {
    console.error(e)
    throw Error('unable to delete access key')
  }
}
