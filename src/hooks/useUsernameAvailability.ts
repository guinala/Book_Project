import { useEffect, useState } from "react";
import {
  checkUsernameAvailable,
  isValidUsername,
  normalizeUsername,
} from "@/services/firebase/firebaseUsernames";

export type UsernameStatus = "idle" | "checking" | "available" | "taken";

export function useUsernameAvailability(value: string, uid?: string): UsernameStatus {
  const [result, setResult] = useState<{ name: string; available: boolean } | null>(null);

  const normalized = normalizeUsername(value);
  const valid = isValidUsername(normalized);

  useEffect(() => {
    if (!valid) return;
    let cancelled = false;
    const handle = setTimeout(() => {
      void (async () => {
        try {
          const available = await checkUsernameAvailable(normalized, uid);
          if (!cancelled) setResult({ name: normalized, available });
        } catch {
          if (!cancelled) setResult(null);
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [normalized, valid, uid]);

  if (!valid) return "idle";
  if (result?.name === normalized) return result.available ? "available" : "taken";
  return "checking";
}
