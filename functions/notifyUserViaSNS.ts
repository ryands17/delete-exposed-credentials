import { Handler } from 'aws-lambda'
import { SNS } from 'aws-sdk'
import { NotifyUserViaSNSRequest } from './types'

const sns = new SNS()

export const handler: Handler<NotifyUserViaSNSRequest> = async (event) => {
  try {
    let subject = `Security Alert: Exposed IAM Key For User ${event.deleteAccessKey.username} On Account ${event.deleteAccessKey.accountId}`

    let message = `
    At ${event.deleteAccessKey.timeDiscovered} the IAM access key ${
      event.deleteAccessKey.deletedKey
    } for user ${event.deleteAccessKey.username} on account ${
      event.deleteAccessKey.accountId
    } was deleted after it was found to have been publicly exposed on the internet.
Below are summaries of the most recent actions, resource names, and resource types associated with this user over the last 24 hours.
Actions:
${generateSummaryParagraph(event.cloudTrailEvent.eventNames)}
Resource Names:
${generateSummaryParagraph(event.cloudTrailEvent.resourceNames)}
Resource Types:
${generateSummaryParagraph(event.cloudTrailEvent.resourceTypes)}
These are summaries of only the most recent API calls made by this user. Please ensure your account remains secure by further reviewing the API calls made by this user in CloudTrail.
    `.trim()

    await publishMessage(subject, message)
  } catch (e) {
    console.error(e)
    throw Error(`Couldn't publish message`)
  }
}

const generateSummaryParagraph = (summary: [string, number][]) => {
  return summary.map((s) => `${s[0]}: ${s[1]}`).join(`\t \n\t`)
}

const publishMessage = (subject: string, message: string) => {
  return sns
    .publish({
      TopicArn: process.env.TOPIC_ARN,
      Message: message,
      Subject: subject,
      MessageStructure: 'string',
    })
    .promise()
}
