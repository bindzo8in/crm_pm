"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import { getExpenseCategoryPage } from "@/actions/finance";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@/components/ui/combobox";
import { useDebounce } from "@/hooks/use-debounce";

export type ExpenseCategoryOption = {
  id: string;
  name: string;
  isActive: boolean;
};

const CATEGORY_PAGE_SIZE = 20;

type Props = {
  selectedCategory: ExpenseCategoryOption | null;
  onValueChange: (category: ExpenseCategoryOption) => void;
  onCreateCategory: () => void;
};

export function ExpenseCategoryCombobox({
  selectedCategory,
  onValueChange,
  onCreateCategory,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [categories, setCategories] = React.useState<ExpenseCategoryOption[]>([]);
  const [nextCursor, setNextCursor] = React.useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = React.useState<string | null>(null);
  const [retryCount, setRetryCount] = React.useState(0);

  React.useEffect(() => {
    if (!open || search !== debouncedSearch) {
      return;
    }

    let cancelled = false;

    getExpenseCategoryPage({ search: debouncedSearch, pageSize: CATEGORY_PAGE_SIZE })
      .then((response) => {
        if (cancelled) return;
        if (!response.success || !response.data) {
          setLoadError(response.message);
          return;
        }

        setCategories(response.data.items);
        setNextCursor(response.data.nextCursor);
        setHasNextPage(response.data.hasNextPage);
      })
      .catch((error: unknown) => {
        console.error("Failed to load expense categories:", error);
        if (!cancelled) {
          setLoadError("Could not load expense categories. Try again.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, open, retryCount, search]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setCategories([]);
    setNextCursor(null);
    setHasNextPage(false);
    setLoadError(null);
    setLoadMoreError(null);
    setIsLoading(true);
  }

  function handleOpenChange(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      setSearch("");
      setCategories([]);
      setNextCursor(null);
      setHasNextPage(false);
      setLoadError(null);
      setLoadMoreError(null);
      setIsLoading(true);
    }
  }

  async function handleLoadMore() {
    if (!nextCursor || !hasNextPage || isLoadingMore || isLoading || search !== debouncedSearch) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);

    try {
      const response = await getExpenseCategoryPage({
        search: debouncedSearch,
        cursor: nextCursor,
        pageSize: CATEGORY_PAGE_SIZE,
      });

      if (!response.success || !response.data) {
        setLoadMoreError(response.message);
        return;
      }

      const page = response.data;
      setCategories((current) => {
        const existingIds = new Set(current.map((category) => category.id));
        return [
          ...current,
          ...page.items.filter((category) => !existingIds.has(category.id)),
        ];
      });
      setNextCursor(page.nextCursor);
      setHasNextPage(page.hasNextPage);
    } catch (error) {
      console.error("Failed to load more expense categories:", error);
      setLoadMoreError("Could not load more categories. Try again.");
    } finally {
      setIsLoadingMore(false);
    }
  }

  const visibleCategories = search === debouncedSearch ? categories : [];
  const isSearching = isLoading || search !== debouncedSearch;

  return (
    <>
      <input type="hidden" name="categoryId" value={selectedCategory?.id ?? ""} />
      <Combobox
        items={visibleCategories}
        value={selectedCategory}
        onValueChange={(category) => {
          if (!category) return;
          onValueChange(category);
          setOpen(false);
        }}
        inputValue={search}
        onInputValueChange={handleSearchChange}
        onOpenChange={handleOpenChange}
        open={open}
        filter={null}
        itemToStringLabel={(category) => category?.name}
      >
        <ComboboxTrigger
          id="expense-category"
          aria-required="true"
          render={
            <Button variant="outline" className="w-full justify-between font-normal">
              <ComboboxValue placeholder="Select a category" />
            </Button>
          }
        />
        <ComboboxContent>
          <ComboboxInput
            aria-label="Search expense categories"
            placeholder="Search categories..."
            showTrigger={false}
          />
          <ComboboxEmpty>
            {isSearching
              ? "Loading categories..."
              : loadError
                ? "Categories could not be loaded."
                : "No categories found."}
          </ComboboxEmpty>
          <ComboboxList>
            {(category) => (
              <ComboboxItem key={category.id} value={category}>
                {category.name}
              </ComboboxItem>
            )}
          </ComboboxList>
          {loadError && (
            <div className="border-t p-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  setLoadError(null);
                  setIsLoading(true);
                  setRetryCount((count) => count + 1);
                }}
              >
                Retry
              </Button>
            </div>
          )}
          {hasNextPage && (
            <div className="border-t p-2">
              {loadMoreError && (
                <p role="alert" className="mb-2 text-xs text-destructive">
                  {loadMoreError}
                </p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                disabled={isLoadingMore || isLoading}
                onClick={handleLoadMore}
              >
                {isLoadingMore ? "Loading…" : loadMoreError ? "Retry loading more" : "Load more categories"}
              </Button>
            </div>
          )}
          <div className="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full justify-start font-normal"
              onClick={() => {
                setOpen(false);
                onCreateCategory();
              }}
            >
              <Plus />
              Create category
            </Button>
          </div>
        </ComboboxContent>
      </Combobox>
    </>
  );
}
