import { z } from "zod";

type RawEnv = {
  DATABASE_URL?: string;
  SESSION_SECRET?: string;
  PLATFORM_UPLOAD_ROOT?: string;
  PLATFORM_UPLOAD_TMP?: string;
  PLATFORM_NGINX_SNIPPETS?: string;
  PLATFORM_FREE_DOMAIN?: string;
  PLATFORM_EDGE_IP?: string;
  PLATFORM_ZONE_NAME?: string;
  CLOUDFLARE_EMAIL?: string;
  CLOUDFLARE_API_KEY?: string;
  PLATFORM_CERT_ROOT?: string;
  ACME_ACCOUNT_EMAIL?: string;
  MAX_ARCHIVE_SIZE_MB?: string;
  PLATFORM_PHP_FPM_POOL_DIR?: string;
  PLATFORM_PHP_FPM_SOCKET_ROOT?: string;
  PLATFORM_PHP_FPM_SERVICE?: string;
  DEFAULT_RUNTIME_CPU_PERCENT?: string;
  DEFAULT_RUNTIME_MEMORY_MB?: string;
  DEFAULT_RUNTIME_PROCESS_LIMIT?: string;
};

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  PLATFORM_UPLOAD_ROOT: z.string().min(1, "PLATFORM_UPLOAD_ROOT is required"),
  PLATFORM_UPLOAD_TMP: z.string().min(1, "PLATFORM_UPLOAD_TMP is required"),
  PLATFORM_NGINX_SNIPPETS: z.string().min(1, "PLATFORM_NGINX_SNIPPETS is required"),
  PLATFORM_FREE_DOMAIN: z.string().min(1, "PLATFORM_FREE_DOMAIN is required"),
  PLATFORM_EDGE_IP: z
    .string()
    .regex(
      /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)){3}$/,
      "PLATFORM_EDGE_IP must be a valid IPv4 address",
    ),
  PLATFORM_ZONE_NAME: z.string().min(1, "PLATFORM_ZONE_NAME is required"),
  CLOUDFLARE_EMAIL: z.string().email("CLOUDFLARE_EMAIL must be a valid email"),
  CLOUDFLARE_API_KEY: z.string().min(20, "CLOUDFLARE_API_KEY is required"),
  PLATFORM_CERT_ROOT: z.string().min(1, "PLATFORM_CERT_ROOT is required"),
  ACME_ACCOUNT_EMAIL: z.string().email("ACME_ACCOUNT_EMAIL must be a valid email"),
  MAX_ARCHIVE_SIZE_MB: z.coerce.number().min(50).max(1024).default(200),
  PLATFORM_PHP_FPM_POOL_DIR: z.string().min(1, "PLATFORM_PHP_FPM_POOL_DIR is required"),
  PLATFORM_PHP_FPM_SOCKET_ROOT: z.string().min(1, "PLATFORM_PHP_FPM_SOCKET_ROOT is required"),
  PLATFORM_PHP_FPM_SERVICE: z.string().min(1, "PLATFORM_PHP_FPM_SERVICE is required"),
  DEFAULT_RUNTIME_CPU_PERCENT: z.coerce.number().min(5).max(100).default(25),
  DEFAULT_RUNTIME_MEMORY_MB: z.coerce.number().min(128).max(2048).default(256),
  DEFAULT_RUNTIME_PROCESS_LIMIT: z.coerce.number().min(2).max(64).default(12),
});

export const env = envSchema.parse(process.env as RawEnv);

export const MAX_ARCHIVE_BYTES = env.MAX_ARCHIVE_SIZE_MB * 1024 * 1024;
export const EDGE_IP = env.PLATFORM_EDGE_IP;
export const ZONE_NAME = env.PLATFORM_ZONE_NAME;
export const CLOUDFLARE_EMAIL = env.CLOUDFLARE_EMAIL;
export const CLOUDFLARE_API_KEY = env.CLOUDFLARE_API_KEY;
export const CERT_ROOT = env.PLATFORM_CERT_ROOT;
export const ACME_EMAIL = env.ACME_ACCOUNT_EMAIL;
export const PHP_FPM_POOL_DIR = env.PLATFORM_PHP_FPM_POOL_DIR;
export const PHP_FPM_SOCKET_ROOT = env.PLATFORM_PHP_FPM_SOCKET_ROOT;
export const PHP_FPM_SERVICE = env.PLATFORM_PHP_FPM_SERVICE;
export const DEFAULT_CPU_PERCENT = env.DEFAULT_RUNTIME_CPU_PERCENT;
export const DEFAULT_MEMORY_LIMIT_MB = env.DEFAULT_RUNTIME_MEMORY_MB;
export const DEFAULT_PROCESS_LIMIT = env.DEFAULT_RUNTIME_PROCESS_LIMIT;
