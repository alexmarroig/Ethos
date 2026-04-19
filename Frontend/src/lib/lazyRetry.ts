import { lazy, ComponentType } from "react";

/**
 * A wrapper for React.lazy() that adds a retry mechanism.
 * This is helpful for handling "Failed to fetch dynamically imported module" errors
 * which often occur after a new deployment when the browser tries to load old,
 * non-existent chunks.
 */
export const lazyRetry = (
  importFn: () => Promise<{ default: ComponentType<any> }>,
  retriesLeft = 2,
  interval = 1000
): ReturnType<typeof lazy> => {
  return lazy(async () => {
    try {
      return await importFn();
    } catch (error: any) {
      if (retriesLeft <= 0) {
        // If no retries left, we reload the whole page to fetch the latest version
        if (typeof window !== "undefined") {
          window.location.reload();
        }
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, interval));

      return (lazyRetry(importFn, retriesLeft - 1, interval) as any)._payload._result();
    }
  });
};
