import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as DeleteExposedCredentials from '../lib/delete-exposed-credentials-stack';

test('Empty Stack', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new DeleteExposedCredentials.DeleteExposedCredentialsStack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.EXACT))
});
