declare namespace NodeJS {
  export interface ProcessEnv {
    AWS_REGION?: string
    SNS_ENDPOINT: string
    TOPIC_ARN: string
  }
}
