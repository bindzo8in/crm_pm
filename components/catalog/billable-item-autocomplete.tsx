"use client";

import { useEffect, useRef, useState, type FocusEventHandler } from "react";
import { Box, LoaderCircle, Package, Plus, Search } from "lucide-react";
import { searchBillableItems, type BillableCatalogItem } from "@/actions/products";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface BillableItemAutocompleteProps {
  value: string;
  currency: string;
  exchangeRate?: number;
  inputId: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  onSelect: (item: BillableCatalogItem) => void;
  onAddCustom?: () => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  inputRef?: (element: HTMLInputElement | null) => void;
  invalid?: boolean;
  disabled?: boolean;
}

function priceForCurrency(item: BillableCatalogItem, currency: string, exchangeRate: number) {
  if (currency !== "USD") return item.basePrice;
  return item.basePriceUSD > 0
    ? item.basePriceUSD
    : Number((item.basePrice / exchangeRate).toFixed(2));
}

export function BillableItemAutocomplete({
  value,
  currency,
  exchangeRate = 83.5,
  inputId,
  placeholder = "Search the catalog",
  onValueChange,
  onSelect,
  onAddCustom,
  onBlur,
  inputRef,
  invalid,
  disabled = false,
}: BillableItemAutocompleteProps) {
  const [focused, setFocused] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [items, setItems] = useState<BillableCatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const requestId = useRef(0);
  const search = value.trim();
  const searchIsCurrent = search === debouncedSearch;
  const isOpen = focused;
  const isSearching = loading || !searchIsCurrent;
  const optionCount = items.length + (onAddCustom ? 1 : 0);
  const selectedIndex = optionCount > 0 ? Math.min(activeIndex, optionCount - 1) : 0;
  const activeOptionId = selectedIndex < items.length
    ? `${inputId}-option-${selectedIndex}`
    : `${inputId}-add-custom`;
  const symbol = currency === "USD" ? "$" : "₹";
  const locale = currency === "USD" ? "en-US" : "en-IN";

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 250);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!focused || !searchIsCurrent) return;

    const currentRequestId = ++requestId.current;
    async function loadItems() {
      setLoading(true);
      setErrorMessage(null);

      try {
        const response = await searchBillableItems(debouncedSearch);
        if (currentRequestId !== requestId.current) return;
        if (!response.success) {
          setItems([]);
          setErrorMessage(response.message || "Could not load catalog items.");
          return;
        }
        setItems(response.data ?? []);
      } catch (error: unknown) {
        if (currentRequestId !== requestId.current) return;
        setItems([]);
        setErrorMessage(error instanceof Error ? error.message : "Could not load catalog items.");
      } finally {
        if (currentRequestId === requestId.current) setLoading(false);
      }
    }

    void loadItems();

    return () => {
      requestId.current += 1;
    };
  }, [debouncedSearch, focused, retryCount, searchIsCurrent]);

  const selectItem = (item: BillableCatalogItem) => {
    onSelect(item);
    setFocused(false);
    setActiveIndex(0);
  };

  return (
    <div className="relative min-w-0">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          id={inputId}
          value={value}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? `${inputId}-options` : undefined}
          aria-activedescendant={isOpen && optionCount > 0 ? activeOptionId : undefined}
          aria-invalid={invalid}
          aria-required="true"
          disabled={disabled}
          placeholder={placeholder}
          className="h-10 bg-background pl-9"
          onFocus={() => setFocused(true)}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onChange={(event) => {
            onValueChange(event.target.value);
            setActiveIndex(0);
            setFocused(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setFocused(false);
              return;
            }
            if (!isOpen || optionCount === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % optionCount);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => (index - 1 + optionCount) % optionCount);
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (selectedIndex < items.length) {
                const selected = items[selectedIndex];
                if (selected) selectItem(selected);
              } else if (onAddCustom) {
                setFocused(false);
                setActiveIndex(0);
                onAddCustom();
              }
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          id={`${inputId}-options`}
          role="listbox"
          aria-label="Catalog items"
          className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-50 max-h-72 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {isSearching ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground" role="status">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Searching catalog…
            </div>
          ) : errorMessage ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-destructive" role="alert">
              <span>{errorMessage}</span>
              <button
                type="button"
                disabled={disabled}
                className="shrink-0 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setRetryCount((count) => count + 1)}
              >
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              {search ? "No catalog items match your search." : "No active catalog items are available."}
            </p>
          ) : (
            items.map((item, index) => {
              const price = priceForCurrency(item, currency, exchangeRate);
              return (
                <button
                  key={`${item.kind}-${item.id}`}
                  id={`${inputId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={selectedIndex === index}
                  className={`flex w-full items-start justify-between gap-3 rounded-sm px-3 py-2 text-left outline-none ${
                    selectedIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectItem(item)}
                >
                  <span className="flex min-w-0 items-start gap-2">
                    {item.kind === "product"
                      ? <Box aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                      : <Package aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate text-sm font-medium">{item.name}</span>
                        <Badge variant="outline" className="px-1.5 py-0 text-[10px] font-normal">
                          {item.kind === "product" ? "Product" : "Service package"}
                        </Badge>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {item.kind === "service-package" ? item.serviceName : item.description || item.unit}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-sm tabular-nums">
                    {symbol}{price.toLocaleString(locale, { maximumFractionDigits: 2 })}
                  </span>
                </button>
              );
            })
          )}
          {onAddCustom && (
            <button
              id={`${inputId}-add-custom`}
              type="button"
              role="option"
              aria-selected={selectedIndex === items.length}
              disabled={disabled}
              className={`flex w-full items-center gap-2 rounded-sm border-t px-3 py-2 text-left outline-none ${
                selectedIndex === items.length ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
              }`}
              onMouseEnter={() => setActiveIndex(items.length)}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setFocused(false);
                setActiveIndex(0);
                onAddCustom();
              }}
            >
              <Plus aria-hidden="true" className="size-4 shrink-0" />
              <span className="text-sm font-medium">Add custom line item</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
