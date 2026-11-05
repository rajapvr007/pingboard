import { z } from "zod";
import { CHECK_INTERVALS, HTTP_METHODS } from "./constants";

export const CreateMonitorSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name cannot exceed 100 characters"),
  url: z.string().trim().url("Must be a valid HTTP or HTTPS URL"),
  httpMethod: z.enum(HTTP_METHODS).default("GET"),
  checkInterval: z.union([
    z.literal(1),
    z.literal(5),
    z.literal(10),
    z.enum(["1", "5", "10"]).transform((v) => Number(v) as 1 | 5 | 10),
  ]),
  expectedStatusCode: z.coerce.number().int().min(100).max(599).default(200),
});

export const UpdateMonitorSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  url: z.string().trim().url().optional(),
  httpMethod: z.enum(HTTP_METHODS).optional(),
  checkInterval: z.union([
    z.literal(1),
    z.literal(5),
    z.literal(10),
    z.enum(["1", "5", "10"]).transform((v) => Number(v) as 1 | 5 | 10),
  ]).optional(),
  expectedStatusCode: z.coerce.number().int().min(100).max(599).optional(),
  isActive: z.boolean().optional(),
});

export const StatusPageConfigSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug cannot exceed 50 characters")
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  companyName: z.string().trim().min(1, "Company name is required").max(100),
  supportEmail: z.string().trim().email("Invalid email format").optional().or(z.literal("")),
  isPublic: z.boolean().default(true),
});

export const MetricsQuerySchema = z.object({
  range: z.enum(["24h", "7d", "30d"]).default("24h"),
});

export type CreateMonitorInput = z.infer<typeof CreateMonitorSchema>;
export type UpdateMonitorInput = z.infer<typeof UpdateMonitorSchema>;
export type StatusPageConfigInput = z.infer<typeof StatusPageConfigSchema>;
export type MetricsQueryInput = z.infer<typeof MetricsQuerySchema>;
