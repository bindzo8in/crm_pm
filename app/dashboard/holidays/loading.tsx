import { Skeleton } from "@/components/ui/skeleton";

export default function HolidaysLoading() {
  return (
    <div aria-busy="true" aria-label="Loading company holidays" className="flex-1 space-y-6 p-4 pt-6 md:p-8">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}
