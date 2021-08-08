import * as cdk from '@aws-cdk/core'
import * as sfn from '@aws-cdk/aws-stepfunctions'
import * as tasks from '@aws-cdk/aws-stepfunctions-tasks'
import * as iam from '@aws-cdk/aws-iam'
import * as logs from '@aws-cdk/aws-logs'
import { lambda } from './helpers'

export class DeleteExposedCredentialsStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // State Machine to perform deletion and notify the user of exposed credentials
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
      { lambdaFunction: deleteAccessKeyFn }
    )

    const lookupCloudTrailEventsFn = lambda(this, 'cloudTrailLookup')
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
      { lambdaFunction: lookupCloudTrailEventsFn }
    )

    const notifyUserFn = lambda(this, 'notifyUserViaSNS')
    const notifyUser = new tasks.LambdaInvoke(this, 'notifyUser', {
      lambdaFunction: notifyUserFn,
    })

    const definition = deleteAccessKeyPair
      .next(lookupCloudTrailEvents)
      .next(notifyUser)

    new sfn.StateMachine(this, 'deleteExposedCredentials', {
      definition,
      logs: {
        destination: new logs.LogGroup(this, 'deleteExposedCredentialsLogs', {
          retention: logs.RetentionDays.ONE_WEEK,
        }),
      },
    })
  }
}
