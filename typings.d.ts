declare namespace NodeJS {
  export interface ProcessEnv {
    CDK_DEFAULT_REGION?: string
    AWS_REGION?: string
    SNS_ENDPOINT: string
    TOPIC_ARN: string
  }
}
