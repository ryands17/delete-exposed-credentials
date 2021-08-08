#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { DeleteExposedCredentialsStack } from '../lib/delete-exposed-credentials-stack'

const app = new cdk.App()
new DeleteExposedCredentialsStack(app, 'DeleteExposedCredentialsStack', {
  env: { region: process.env.CDK_DEFAULT_REGION || 'us-east-1' },
})
