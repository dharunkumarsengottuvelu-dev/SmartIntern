import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { existsSync } from "fs";

// Lazy singleton — only created at request time, NOT at build time.
let _client: SupabaseClient | null = null;

/**
 * Resolves the Supabase URL for the current runtime environment.
 *
 * Problem: When Next.js runs inside a Docker container, 127.0.0.1 points
 * to the *container's own* loopback adapter — not the host machine.
 * The local Supabase CLI runs on the host, so we must use host.docker.internal
 * to reach it from inside any Docker container on Windows/macOS.
 *
 * Detection: Docker injects /.dockerenv into every container filesystem.
 */
function resolveSupabaseUrl(rawUrl: string): string {
  try {
    const isDocker = existsSync("/.dockerenv");
    if (isDocker && rawUrl.includes("127.0.0.1")) {
      const fixed = rawUrl.replace("127.0.0.1", "host.docker.internal");
      console.log(`[supabase] Docker detected — rewrote URL: ${rawUrl} → ${fixed}`);
      return fixed;
    }
  } catch {
    // existsSync may throw in some edge runtimes — fall through to raw URL
  }
  return rawUrl;
}

export function getSupabase(): SupabaseClient {
  if (_client) return _client;

  // OFFLINE REQUIREMENT: These must point at your LOCAL Supabase CLI instance
  // (http://127.0.0.1:54321 after `supabase start`), NOT at *.supabase.co.
  // Any *.supabase.co URL here is an internet dependency that breaks offline mode.
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!rawUrl || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "For offline operation, these must point at your local Supabase CLI instance.\n" +
      "Run `supabase start` and use the URL/key it prints.\n" +
      "Add them to .env.local — do NOT use a hosted *.supabase.co project."
    );
  }

  if (rawUrl.includes(".supabase.co")) {
    console.error(
      "[supabase] WARNING: NEXT_PUBLIC_SUPABASE_URL points at a hosted supabase.co project. " +
      "This breaks the offline requirement. Use your local Supabase CLI URL instead."
    );
  }

  const url = resolveSupabaseUrl(rawUrl);

  _client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return _client;
}

/** Call this to reset the cached singleton (useful in tests or after env changes). */
export function resetSupabaseClient() {
  _client = null;
}
