"use client";

import { useEffect, useState, type FocusEventHandler } from "react";
import { useQuery } from "@tanstack/react-query";
import { LoaderCircleIcon, SearchIcon } from "lucide-react";
import { searchServicePackages } from "@/actions/invoice";
import type { ServicePackageSearchResult } from "@/components/invoice/service-package-search";
import { Input } from "@/components/ui/input";

type ServiceOption = {
  package: ServicePackageSearchResult;
  item: ServicePackageSearchResult["items"][number];
};

interface InvoiceServiceAutocompleteProps {
  value: string;
  currency: string;
  exchangeRate: number;
  onValueChange: (value: string) => void;
  onSelect: (
    servicePackage: ServicePackageSearchResult,
    item: ServicePackageSearchResult["items"][number],
  ) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  inputRef?: (element: HTMLInputElement | null) => void;
  inputId: string;
  invalid?: boolean;
}

export function InvoiceServiceAutocomplete({
  value,
  currency,
  exchangeRate,
  onValueChange,
  onSelect,
  onBlur,
  inputRef,
  inputId,
  invalid,
}: InvoiceServiceAutocompleteProps) {
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const normalizedSearch = value.trim();
  const searchIsCurrent = normalizedSearch === debouncedSearch;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(normalizedSearch);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [normalizedSearch]);

  const {
    data: packages = [],
    error,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["invoice-service-suggestions", debouncedSearch],
    queryFn: async () => {
      const response = await searchServicePackages(debouncedSearch);
      if (!response.success) {
        throw new Error(response.message || "Could not load service suggestions.");
      }
      return response.data ?? [];
    },
    enabled: focused && debouncedSearch.length >= 2,
  });

  const suggestions: ServiceOption[] = packages.flatMap((servicePackage) => {
    const items: ServicePackageSearchResult["items"] = servicePackage.items.length
      ? servicePackage.items
      : [{
          id: servicePackage.id,
          name: servicePackage.name,
          description: servicePackage.description,
          quantity: 1,
          unitPrice: servicePackage.totalPrice,
          unitPriceUSD: servicePackage.totalPriceUSD,
          sacCode: servicePackage.sacCode,
          unit: "item",
          billingCycle: "ONE_TIME",
        }];

    return items.map((item) => ({ package: servicePackage, item }));
  }).slice(0, 8);

  const isOpen = focused && normalizedSearch.length >= 2;
  const isSearching = isFetching || !searchIsCurrent;
  const symbol = currency === "USD" ? "$" : "₹";

  const selectSuggestion = (suggestion: ServiceOption) => {
    onSelect(suggestion.package, suggestion.item);
    setFocused(false);
    setActiveIndex(0);
  };

  return (
    <div className="relative min-w-0">
      <div className="relative">
        <SearchIcon
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
          aria-controls={isOpen ? `${inputId}-suggestions` : undefined}
          aria-activedescendant={isOpen && suggestions.length > 0 ? `${inputId}-option-${activeIndex}` : undefined}
          aria-invalid={invalid}
          aria-required="true"
          placeholder="Search services or enter a custom item"
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
            if (!isOpen) return;
            if (event.key === "ArrowDown") {
              if (suggestions.length === 0) return;
              event.preventDefault();
              setActiveIndex((index) => (index + 1) % suggestions.length);
            } else if (event.key === "ArrowUp") {
              if (suggestions.length === 0) return;
              event.preventDefault();
              setActiveIndex((index) => (index - 1 + suggestions.length) % suggestions.length);
            } else if (event.key === "Enter") {
              event.preventDefault();
              const suggestion = suggestions[activeIndex];
              if (suggestion) selectSuggestion(suggestion);
            }
          }}
        />
      </div>

      {isOpen && (
        <div
          id={`${inputId}-suggestions`}
          role="listbox"
          aria-label="Service suggestions"
          className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-50 max-h-72 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {isSearching ? (
            <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground" role="status">
              <LoaderCircleIcon className="size-4 animate-spin" />
              Searching services…
            </div>
          ) : isError ? (
            <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm text-destructive">
              <span>{error instanceof Error ? error.message : "Could not load service suggestions."}</span>
              <button
                type="button"
                className="shrink-0 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => void refetch()}
              >
                Try again
              </button>
            </div>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              No matching services. Keep typing to add a custom item.
            </p>
          ) : (
            suggestions.map((suggestion, index) => {
              const { package: servicePackage, item } = suggestion;
              const price = currency === "USD" && item.unitPriceUSD > 0
                ? item.unitPriceUSD
                : currency === "USD"
                  ? Number((item.unitPrice / (exchangeRate || 83.5)).toFixed(2))
                  : item.unitPrice;

              return (
                <button
                  key={`${servicePackage.id}-${item.id}`}
                  id={`${inputId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`flex w-full items-start justify-between gap-3 rounded-sm px-3 py-2 text-left outline-none ${
                    activeIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent/60"
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSuggestion(suggestion)}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{item.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {servicePackage.serviceName} · {servicePackage.name}
                    </span>
                  </span>
                  <span className="shrink-0 pt-0.5 text-sm tabular-nums">
                    {symbol}{price.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
