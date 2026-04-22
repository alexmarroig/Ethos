import { lazy, ComponentType } from "react";
import { recoverFromChunkLoadFailure } from "./chunkRecovery";

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
        if (typeof window !== "undefined") {
          void recoverFromChunkLoadFailure();
        }
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, interval));

      return (lazyRetry(importFn, retriesLeft - 1, interval) as any)._payload._result();
    }
  });
};
