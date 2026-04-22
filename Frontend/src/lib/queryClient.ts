import { QueryClient } from "@tanstack/react-query";
import { retryDelayByError, shouldRetryByError } from "@/hooks/useDomainQueries";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: shouldRetryByError,
      retryDelay: retryDelayByError,
    },
  },
});
