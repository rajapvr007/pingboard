import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { env } from "../config/env";
import { logger } from "../utils/logger";

const hasAwsCredentials =
  Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
  Boolean(process.env.AWS_PROFILE);

class LocalMemoryDocumentClient {
  private store = new Map<string, any>();

  private getKey(pk: string, sk: string): string {
    return `${pk}##${sk}`;
  }

  async send(command: any): Promise<any> {
    const input = command.input || {};
    const commandName = command.constructor?.name || "";

    if (commandName.includes("Put") || input.Item) {
      const item = input.Item;
      if (item && item.PK && item.SK) {
        this.store.set(this.getKey(item.PK, item.SK), JSON.parse(JSON.stringify(item)));
      }
      return {};
    }

    if (commandName.includes("Get") && input.Key) {
      const key = this.getKey(input.Key.PK, input.Key.SK);
      const item = this.store.get(key);
      return { Item: item ? JSON.parse(JSON.stringify(item)) : undefined };
    }

    if (commandName.includes("Delete") && input.Key) {
      const key = this.getKey(input.Key.PK, input.Key.SK);
      this.store.delete(key);
      return {};
    }

    if (commandName.includes("BatchWrite") && input.RequestItems) {
      for (const table of Object.keys(input.RequestItems)) {
        for (const req of input.RequestItems[table]) {
          if (req.DeleteRequest?.Key) {
            this.store.delete(this.getKey(req.DeleteRequest.Key.PK, req.DeleteRequest.Key.SK));
          }
        }
      }
      return { UnprocessedItems: {} };
    }

    if (commandName.includes("Update") && input.Key) {
      const key = this.getKey(input.Key.PK, input.Key.SK);
      let item = this.store.get(key) || { PK: input.Key.PK, SK: input.Key.SK };
      item = JSON.parse(JSON.stringify(item));

      const exprValues = input.ExpressionAttributeValues || {};
      const exprNames = input.ExpressionAttributeNames || {};
      const updateExpr = (input.UpdateExpression || "") as string;

      if (updateExpr.startsWith("SET")) {
        const parts = updateExpr.replace(/^SET\s+/, "").split(",");
        for (const part of parts) {
          const [leftRaw, rightRaw] = part.split("=").map((s) => s.trim());
          if (!leftRaw || !rightRaw) continue;
          let attr = leftRaw;
          if (attr.startsWith("#") && exprNames[attr]) {
            attr = exprNames[attr];
          }
          if (exprValues[rightRaw] !== undefined) {
            item[attr] = exprValues[rightRaw];
          }
        }
      }

      this.store.set(key, item);
      return { Attributes: item };
    }

    if (commandName.includes("Query")) {
      const exprValues = input.ExpressionAttributeValues || {};
      const indexName = input.IndexName;
      const keyCondition = (input.KeyConditionExpression || "") as string;

      const items: Record<string, any>[] = [];

      for (const item of this.store.values()) {
        if (indexName === "GSI1") {
          const slugPk = exprValues[":slugPk"];
          const skVal = exprValues[":sk"];
          if (slugPk && item.GSI1PK !== slugPk) continue;
          if (skVal && item.GSI1SK !== skVal) continue;
          items.push(JSON.parse(JSON.stringify(item)));
        } else {
          const targetPk = exprValues[":pk"];
          if (targetPk && item.PK !== targetPk) continue;

          if (keyCondition.includes("begins_with(SK,")) {
            const prefix = exprValues[":skPrefix"];
            if (prefix && (!item.SK || !item.SK.startsWith(prefix))) continue;
          } else if (keyCondition.includes("BETWEEN")) {
            const startSk = exprValues[":startSk"];
            const endSk = exprValues[":endSk"];
            if (startSk && endSk && (item.SK < startSk || item.SK > endSk)) continue;
          } else if (exprValues[":sk"] && item.SK !== exprValues[":sk"]) {
            continue;
          }

          items.push(JSON.parse(JSON.stringify(item)));
        }
      }

      if (input.ScanIndexForward === false) {
        items.sort((a, b) => (b.SK > a.SK ? 1 : -1));
      } else {
        items.sort((a, b) => (a.SK > b.SK ? 1 : -1));
      }

      const limit = input.Limit || items.length;
      return { Items: items.slice(0, limit) };
    }

    return {};
  }
}

let clientInstance: any;

if (hasAwsCredentials || env.DYNAMODB_ENDPOINT) {
  logger.info("Connecting to DynamoDB with AWS credentials / endpoint", {
    region: env.AWS_REGION,
    endpoint: env.DYNAMODB_ENDPOINT,
  });
  const client = new DynamoDBClient({
    region: env.AWS_REGION,
    ...(env.DYNAMODB_ENDPOINT ? { endpoint: env.DYNAMODB_ENDPOINT } : {}),
  });
  clientInstance = DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
    unmarshallOptions: { wrapNumbers: false },
  });
} else {
  logger.info("ℹ️ AWS credentials not found in environment. Using in-memory DynamoDB store for local development.");
  clientInstance = new LocalMemoryDocumentClient();
}

export const docClient = clientInstance as unknown as DynamoDBDocumentClient;
