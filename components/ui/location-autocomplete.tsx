"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { getCountries, getStates, LocationItem } from "@/actions/locations";
import { Loader2Icon, MapPinIcon } from "lucide-react";

interface LocationAutocompleteProps {
  type: "country" | "state";
  value: string;
  onChange: (value: string) => void;
  countryCode?: string;
  placeholder?: string;
  id?: string;
  className?: string;
}

export function LocationAutocomplete({
  type,
  value,
  onChange,
  countryCode,
  placeholder,
  id,
  className,
}: LocationAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<LocationItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const fetchSuggestions = React.useCallback(
    async (searchTerm: string) => {
      setLoading(true);
      try {
        if (type === "country") {
          const res = await getCountries(searchTerm);
          if (res.success && res.data) {
            setSuggestions(res.data);
          }
        } else {
          const res = await getStates(searchTerm, countryCode);
          if (res.success && res.data) {
            setSuggestions(res.data);
          }
        }
      } catch (err) {
        console.error("Failed to load location suggestions:", err);
      } finally {
        setLoading(false);
      }
    },
    [type, countryCode]
  );

  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        fetchSuggestions(value);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [value, open, fetchSuggestions]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full ${open ? "z-50" : ""}`}>
      <Input
        id={id}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          fetchSuggestions(e.target.value);
        }}
        onFocus={() => {
          setOpen(true);
          fetchSuggestions(value);
        }}
        placeholder={placeholder || (type === "country" ? "e.g. India" : "e.g. Tamil Nadu")}
        className={className}
        autoComplete="off"
      />

      {open && (
        <div className="absolute left-0 top-full z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 p-1 text-gray-900 dark:text-gray-100 shadow-xl font-sans">
          {loading && suggestions.length === 0 ? (
            <div className="flex items-center justify-center p-2.5 text-xs text-muted-foreground">
              <Loader2Icon className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : suggestions.length > 0 ? (
            suggestions.map((item) => (
              <div
                key={item.id}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(item.name);
                  setOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2 rounded-sm px-2.5 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground"
              >
                <MapPinIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium text-foreground">{item.name}</span>
                {item.code && type === "country" && (
                  <span className="ml-auto font-mono text-[10px] text-muted-foreground">{item.code}</span>
                )}
              </div>
            ))
          ) : (
            <div className="p-2 text-center text-xs text-muted-foreground">
              No matching {type === "country" ? "country" : "state"} found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
