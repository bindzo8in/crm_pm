"use client";

import * as React from "react";
import {
  CalendarDays,
  CheckCircle2,
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
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { MultiSelectIcon, MultiSelectOption } from "@/components/ui/multi-select";

const optionIcons: Record<MultiSelectIcon, LucideIcon> = {
  calendar: CalendarDays,
  cancelled: CircleX,
  completed: CheckCircle2,
  customer: ContactRound,
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

const emptyOptionValue = "__empty_option__";

export function OptionSelect({
  name,
  value,
  defaultValue,
  onValueChange,
  options,
  label,
  placeholder,
  emptyLabel,
  disabled = false,
  className,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: readonly MultiSelectOption[];
  label: string;
  placeholder?: string;
  emptyLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue ?? "");
  const selectedValue = value ?? uncontrolledValue;

  return (
    <>
      {name && selectedValue && <input type="hidden" name={name} value={selectedValue} />}
      <Select
        value={selectedValue || (emptyLabel ? emptyOptionValue : undefined)}
        onValueChange={(nextValue) => {
          const nextSelection = nextValue === emptyOptionValue ? "" : nextValue;
          if (value === undefined) setUncontrolledValue(nextSelection);
          onValueChange?.(nextSelection);
        }}
        disabled={disabled}
      >
        <SelectTrigger aria-label={label} className={cn("w-full", className)}>
          <SelectValue placeholder={placeholder ?? label} />
        </SelectTrigger>
        <SelectContent position="popper">
          {emptyLabel && (
            <SelectItem value={emptyOptionValue}>{emptyLabel}</SelectItem>
          )}
          {options.map((option) => {
            const OptionIcon = option.icon ? optionIcons[option.icon] : null;
            return (
              <SelectItem key={option.value} value={option.value}>
                {OptionIcon && <OptionIcon aria-hidden="true" className="text-muted-foreground" />}
                {option.label}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </>
  );
}
