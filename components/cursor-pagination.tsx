"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CursorPaginationProps {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  isFetching?: boolean;

  onNext: () => void;
  onPrevious: () => void;
}

export function CursorPagination({
  hasNextPage,
  hasPreviousPage,
  isFetching,
  onNext,
  onPrevious,
}: CursorPaginationProps) {
  return (
    <div className="flex items-center justify-end gap-2 border-t p-4">
      <Button
        variant="outline"
        size="sm"
        onClick={onPrevious}
        disabled={!hasPreviousPage || isFetching}
      >
        <ChevronLeft />
        Previous
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={onNext}
        disabled={!hasNextPage || isFetching}
      >
        Next
        <ChevronRight />
      </Button>
    </div>
  );
}