import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env";

/**
 * DynamoDB Document Client initialization.
 * - In AWS environments, IAM Role credentials and region are automatically loaded.
 * - In local development or CI, endpoint can point to DynamoDB Local (e.g. http://localhost:8000).
 * - MarshallOptions: removeUndefinedValues ensures undefined fields aren't sent to DynamoDB (which would throw a ValidationException).
 */
const client = new DynamoDBClient({
  region: env.AWS_REGION,
  ...(env.DYNAMODB_ENDPOINT ? { endpoint: env.DYNAMODB_ENDPOINT } : {}),
});

export const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});
