import { Skeleton } from "@/components/ui/skeleton";

export default function LeavesLoading() {
  return (
    <div aria-busy="true" aria-label="Loading leave management" className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-48 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
