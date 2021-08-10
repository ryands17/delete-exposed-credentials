import './helpers'
import { Template } from '@aws-cdk/assertions'
import { expect as expectCDK, haveResourceLike } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import * as DeleteExposedCredentials from '../lib/delete-exposed-credentials-stack'

const LAMBDAS_GENERATED_BY_STACK = 1

const createStack = () => {
  const app = new cdk.App()
  return new DeleteExposedCredentials.DeleteExposedCredentialsStack(
    app,
    'DeleteExposedCredentialsStack'
  )
}

test('SNS Topic and Subscription are created', () => {
  const assert = Template.fromStack(createStack())

  assert.hasResource('AWS::SNS::Topic', {})

  assert.hasResourceProperties('AWS::SNS::Subscription', {
    Protocol: 'email',
  })
})

test('Has the correct amount of Lambdas and structure', () => {
  const assert = Template.fromStack(createStack())

  assert.resourceCountIs(
    'AWS::Lambda::Function',
    3 + LAMBDAS_GENERATED_BY_STACK
  )

  assert.hasResourceProperties('AWS::Lambda::Function', {
    Environment: {
      Variables: {
        NODE_OPTIONS: '--enable-source-maps',
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      },
    },
    Handler: 'index.handler',
    MemorySize: 256,
    ReservedConcurrentExecutions: 5,
    Runtime: 'nodejs14.x',
    Timeout: 5,
  })
})

test('Has appropriate permissions to access CloudTrail and SNS', () => {
  const stack = createStack()
  const assert = Template.fromStack(stack)

  assert.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: 'cloudtrail:LookupEvents',
          Effect: 'Allow',
          Resource: '*',
        },
      ],
      Version: '2012-10-17',
    },
  })

  expectCDK(stack).to(
    haveResourceLike('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'sns:Publish',
            Effect: 'Allow',
            Resource: {},
          },
        ],
        Version: '2012-10-17',
      },
    })
  )
})

test('State Machine and Event to trigger it are created', () => {
  const assert = Template.fromStack(createStack())

  assert.hasResource('AWS::StepFunctions::StateMachine', {})

  assert.hasResourceProperties('AWS::Events::Rule', {
    EventPattern: {
      source: ['aws.health'],
      'detail-type': ['AWS Health Event'],
      detail: {
        service: ['RISK'],
        eventTypeCategory: ['issue'],
        eventTypeCode: ['AWS_RISK_CREDENTIALS_EXPOSED'],
      },
    },
    State: 'ENABLED',
  })
})
