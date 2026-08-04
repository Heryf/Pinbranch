import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar skeleton */}
      <div className="w-[260px] border-r border-border/40 bg-sidebar flex flex-col p-4 space-y-4 shrink-0">
        <div className="flex items-center gap-3 px-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-5 w-24 rounded" />
        </div>
        <div className="space-y-2 px-2">
          <Skeleton className="h-3 w-16 rounded" />
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header skeleton */}
        <div className="h-16 border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-4 w-px" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
          </div>
        </div>

        {/* Search bar skeleton */}
        <div className="px-4 pt-4 pb-2 flex justify-center">
          <Skeleton className="h-12 w-[600px] rounded-full" />
        </div>

        {/* Content skeleton */}
        <div className="flex-1 px-8 py-4 space-y-8">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-[130px] rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-5">
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="h-[90px] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
