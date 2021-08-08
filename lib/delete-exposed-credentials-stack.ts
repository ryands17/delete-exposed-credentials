import * as cdk from '@aws-cdk/core'
import * as sfn from '@aws-cdk/aws-stepfunctions'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'
import * as iam from '@aws-cdk/aws-iam'
import * as logs from '@aws-cdk/aws-logs'
import * as sns from '@aws-cdk/aws-sns'
import * as events from '@aws-cdk/aws-events'
import * as eventTarget from '@aws-cdk/aws-events-targets'
import { lambda } from './helpers'

export class DeleteExposedCredentialsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // SNS topic and subscription to notify the user of exposed credentials
    const topic = new sns.Topic(this, 'securityNotification')
    new sns.Subscription(this, 'sendEmail', {
      topic,
      endpoint: process.env.SNS_ENDPOINT,
      protocol: sns.SubscriptionProtocol.EMAIL,
    })

    // State Machine and tasks to perform deletion of exposed keys
    const deleteAccessKeyFn = lambda(this, 'deleteAccessKey')
    deleteAccessKeyFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['iam:DeleteAccessKey', 'iam:GetAccessKeyLastUsed'],
        resources: ['*'],
      })
    )
    const deleteAccessKeyPair = new tasks.LambdaInvoke(
      this,
      'deleteAccessKeyPair',
      {
        comment: 'Deletes exposed IAM access keypairs and notifies security',
        lambdaFunction: deleteAccessKeyFn,
        resultPath: '$.deleteAccessKey',
      }
    )

    const lookupCloudTrailEventsFn = lambda(
      this,
      'cloudTrailLookup'
    ).addEnvironment('TOPIC_ARN', topic.topicArn)
    lookupCloudTrailEventsFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['cloudtrail:LookupEvents'],
        resources: ['*'],
      })
    )
    const lookupCloudTrailEvents = new tasks.LambdaInvoke(
      this,
      'lookupCloudTrailEvents',
      {
        lambdaFunction: lookupCloudTrailEventsFn,
        resultPath: '$.cloudTrailEvent',
      }
    )

    const notifyUserFn = lambda(this, 'notifyUserViaSNS')
    notifyUserFn.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['sns:Publish'],
        resources: [topic.topicArn],
      })
    )
    const notifyUser = new tasks.LambdaInvoke(this, 'notifyUser', {
      lambdaFunction: notifyUserFn,
    })

    const definition = deleteAccessKeyPair
      .next(lookupCloudTrailEvents)
      .next(notifyUser)

    const deleteExposedCredentials = new sfn.StateMachine(
      this,
      'deleteExposedCredentials',
      {
        definition,
        logs: {
          destination: new logs.LogGroup(this, 'deleteExposedCredentialsLogs', {
            retention: logs.RetentionDays.ONE_WEEK,
          }),
        },
      }
    )

    const watchForExposedCreds = new events.Rule(this, 'watchForExposedCreds', {
      eventPattern: {
        source: ['aws.health'],
        detailType: ['AWS Health Event'],
        detail: {
          service: ['RISK'],
          eventTypeCategory: ['issue'],
          eventTypeCode: ['AWS_RISK_CREDENTIALS_EXPOSED'],
        },
      },
    })

    watchForExposedCreds.addTarget(
      new eventTarget.SfnStateMachine(deleteExposedCredentials)
    )
  }
}
