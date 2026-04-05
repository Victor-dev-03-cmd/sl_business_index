import { Skeleton } from "@/components/ui/skeleton";

export default function SkeletonBusinessCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col h-full">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
        
        <div className="flex items-center gap-1.5 mb-3">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-1 w-1 rounded-full" />
          <Skeleton className="h-3 w-1/4" />
        </div>

        <div className="space-y-2 mb-4 flex-1">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>

        <div className="pt-4 border-t border-gray-50 flex items-center justify-between mt-auto">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
    </div>
  );
}
