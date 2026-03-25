import { Skeleton } from "@/components/ui/skeleton";

export const SessionCardSkeleton = () => (
  <div className="session-card space-y-3">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="h-6 w-20 rounded-full" />
    </div>
  </div>
);

export const PatientCardSkeleton = () => (
  <div className="session-card flex items-center justify-between">
    <div className="space-y-2 flex-1">
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-4 w-32" />
    </div>
    <Skeleton className="h-5 w-5 rounded" />
  </div>
);

export const FinanceCardSkeleton = () => (
  <div className="session-card space-y-3">
    <div className="flex items-center justify-between">
      <div className="space-y-2 flex-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  </div>
);

export const AgendaGridSkeleton = () => (
  <div className="border border-border rounded-xl overflow-hidden bg-card">
    <div className="grid grid-cols-5 border-b border-border">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="py-4 flex justify-center border-r border-border last:border-r-0">
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-5 min-h-[400px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="p-3 space-y-2 border-r border-border last:border-r-0">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ))}
    </div>
  </div>
);

export const ScaleCardSkeleton = () => (
  <div className="session-card space-y-2">
    <Skeleton className="h-5 w-44" />
    <Skeleton className="h-4 w-64" />
  </div>
);
