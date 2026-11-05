import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  AWS_REGION: z.string().default("us-east-1"),
  DYNAMODB_TABLE_NAME: z.string().default("PingBoardTable"),
  DYNAMODB_ENDPOINT: z.string().optional(),
  COGNITO_USER_POOL_ID: z.string().default("us-east-1_mockPoolId"),
  COGNITO_CLIENT_ID: z.string().default("mockClientId"),
  MOCK_AUTH: z
    .string()
    .optional()
    .transform((val) => val === "true" || process.env.NODE_ENV === "test"),
});

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
