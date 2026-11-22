import { z } from 'zod';

/**
 * Runtime configuration. It is loaded from `/config.js` before the bundle runs, so one build
 * can be promoted through environments without being rebuilt.
 */
const appConfigSchema = z.object({
  oidcAuthority: z
    .url({ protocol: /^https?$/, error: 'oidcAuthority must be an http(s) URL' })
    .transform((value) => value.replace(/\/+$/, '')),
  oidcClientId: z.string().trim().min(1, 'oidcClientId is required'),
  apiBaseUrl: z
    .string()
    .trim()
    .refine((value) => value === '' || /^https?:\/\//.test(value), {
      error: 'apiBaseUrl must be empty (same origin) or an http(s) URL',
    })
    .transform((value) => value.replace(/\/+$/, ''))
    .default(''),
});

export type AppConfig = z.infer<typeof appConfigSchema>;

declare global {
  interface Window {
    __APP_CONFIG__?: unknown;
  }
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function parseAppConfig(raw: unknown): AppConfig {
  if (raw === undefined || raw === null) {
    throw new ConfigError('Application configuration is missing: /config.js did not load.');
  }
  const result = appConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'config'}: ${issue.message}`)
      .join('; ');
    throw new ConfigError(`Application configuration is invalid (${issues}).`);
  }
  return result.data;
}

let cached: AppConfig | undefined;

/** Returns the validated runtime configuration, reading `window.__APP_CONFIG__` once. */
export function getAppConfig(): AppConfig {
  cached ??= parseAppConfig(window.__APP_CONFIG__);
  return cached;
}

/** Test seam: forget the cached configuration. */
export function resetAppConfigCache(): void {
  cached = undefined;
}
