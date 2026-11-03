"use client";

import * as React from "react";
import {
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  CircleAlert,
  CircleDashed,
  CircleDot,
  CirclePause,
  CircleX,
  CircleUserRound,
  ClipboardList,
  ContactRound,
  Flag,
  FolderKanban,
  Search,
  UsersRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const optionIcons = {
  calendar: CalendarDays,
  completed: CheckCircle2,
  customer: ContactRound,
  cancelled: CircleX,
  flag: Flag,
  inProgress: CircleDot,
  manager: CircleUserRound,
  notStarted: CircleDashed,
  onHold: CirclePause,
  overdue: CircleAlert,
  planning: ClipboardList,
  project: FolderKanban,
  team: UsersRound,
} as const;

export type MultiSelectIcon = keyof typeof optionIcons;

export type MultiSelectOption = {
  value: string;
  label: string;
  icon?: MultiSelectIcon;
  description?: string;
};

export function MultiSelect({
  name,
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  searchPlaceholder = "Search options",
  disabled = false,
  className,
}: {
  name?: string;
  label: string;
  options: readonly MultiSelectOption[];
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? []);
  const selectedValues = value ?? uncontrolledValue;
  const selected = new Set(selectedValues);
  const selectedOptions = options.filter((option) => selected.has(option.value));
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredOptions = options.filter((option) =>
    option.label.toLocaleLowerCase().includes(normalizedSearch) ||
    option.description?.toLocaleLowerCase().includes(normalizedSearch),
  );
  const shownSelection = selectedOptions.slice(0, 2);
  const remainingCount = selectedOptions.length - shownSelection.length;

  function toggleOption(optionValue: string) {
    const nextValue = selected.has(optionValue)
      ? selectedValues.filter((current) => current !== optionValue)
      : [...selectedValues, optionValue];
    if (value === undefined) setUncontrolledValue(nextValue);
    onValueChange?.(nextValue);
  }

  return (
    <div className={cn("min-w-0", className)}>
      {name && selectedValues.map((selectedValue) => (
        <input key={selectedValue} type="hidden" name={name} value={selectedValue} />
      ))}
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setSearch("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-label={label}
            aria-expanded={open}
            disabled={disabled}
            className="h-10 w-full min-w-0 justify-between gap-2 font-normal"
          >
            <span className="flex min-w-0 items-center gap-1.5 overflow-hidden">
              {selectedOptions.length === 0 ? (
                <span className="truncate text-muted-foreground">{placeholder}</span>
              ) : (
                <>
                  {shownSelection.map((option) => {
                    const OptionIcon = option.icon ? optionIcons[option.icon] : null;
                    return (
                      <span
                        key={option.value}
                        className="inline-flex min-w-0 items-center gap-1 rounded-sm bg-secondary px-1.5 py-0.5 text-xs"
                      >
                        {OptionIcon && <OptionIcon aria-hidden="true" className="size-3 shrink-0" />}
                        <span className="truncate">{option.label}</span>
                      </span>
                    );
                  })}
                  {remainingCount > 0 && (
                    <span className="shrink-0 text-xs text-muted-foreground">+{remainingCount}</span>
                  )}
                </>
              )}
            </span>
            <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(24rem,calc(100vw-2rem))] gap-2 p-2"
        >
          <div className="relative">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              className="pl-9"
            />
          </div>
          <div
            role="group"
            aria-label={label}
            className="max-h-60 overflow-y-auto"
          >
            {filteredOptions.length > 0 ? filteredOptions.map((option) => {
              const isSelected = selected.has(option.value);
              const OptionIcon = option.icon ? optionIcons[option.icon] : null;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => toggleOption(option.value)}
                  className="flex min-h-10 w-full items-center gap-2 rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:bg-accent"
                >
                  <span className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-sm border",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input",
                  )}>
                    {isSelected && <Check aria-hidden="true" className="size-3" />}
                  </span>
                  {OptionIcon && (
                    <OptionIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{option.label}</span>
                    {option.description && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    )}
                  </span>
                </button>
              );
            }) : (
              <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                No matching options.
              </p>
            )}
          </div>
          {selectedOptions.length > 0 && (
            <div className="flex items-center justify-between border-t px-1 pt-2">
              <span className="text-xs text-muted-foreground">
                {selectedOptions.length} selected
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => {
                  if (value === undefined) setUncontrolledValue([]);
                  onValueChange?.([]);
                }}
              >
                <X aria-hidden="true" />
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
