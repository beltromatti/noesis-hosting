import { z } from "zod";

type RawEnv = {
  DATABASE_URL?: string;
  SESSION_SECRET?: string;
  PLATFORM_UPLOAD_ROOT?: string;
  PLATFORM_UPLOAD_TMP?: string;
  PLATFORM_NGINX_SNIPPETS?: string;
  PLATFORM_FREE_DOMAIN?: string;
  MAX_ARCHIVE_SIZE_MB?: string;
};

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  PLATFORM_UPLOAD_ROOT: z.string().min(1, "PLATFORM_UPLOAD_ROOT is required"),
  PLATFORM_UPLOAD_TMP: z.string().min(1, "PLATFORM_UPLOAD_TMP is required"),
  PLATFORM_NGINX_SNIPPETS: z.string().min(1, "PLATFORM_NGINX_SNIPPETS is required"),
  PLATFORM_FREE_DOMAIN: z.string().min(1, "PLATFORM_FREE_DOMAIN is required"),
  MAX_ARCHIVE_SIZE_MB: z.coerce.number().min(50).max(1024).default(200),
});

export const env = envSchema.parse(process.env as RawEnv);

export const MAX_ARCHIVE_BYTES = env.MAX_ARCHIVE_SIZE_MB * 1024 * 1024;
