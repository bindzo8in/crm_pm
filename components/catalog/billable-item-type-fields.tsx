"use client";

import { BillableItemType } from "@/app/generated/prisma/enums";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BillableItemTypeFieldsProps {
  itemType: BillableItemType;
  sacCode: string;
  idPrefix: string;
  className?: string;
  onItemTypeChange: (itemType: BillableItemType) => void;
  onSacCodeChange: (sacCode: string) => void;
}

export function getDefaultHsnSacCode(itemType: BillableItemType) {
  return itemType === "SERVICE" ? "9983" : "";
}

export function BillableItemTypeFields({
  itemType,
  sacCode,
  idPrefix,
  className,
  onItemTypeChange,
  onSacCodeChange,
}: BillableItemTypeFieldsProps) {
  const codeLabel = itemType === "GOODS" ? "HSN code" : "SAC code";

  return (
    <FieldGroup className={cn("grid min-w-0 gap-3 sm:grid-cols-2", className)}>
      <Field className="min-w-0">
        <FieldLabel htmlFor={`${idPrefix}-type`}>Item type</FieldLabel>
        <Select
          value={itemType}
          onValueChange={(value) => {
            if (value === BillableItemType.GOODS || value === BillableItemType.SERVICE) {
              onItemTypeChange(value);
            }
          }}
        >
          <SelectTrigger id={`${idPrefix}-type`} className="h-10 bg-background">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={BillableItemType.SERVICE}>Service</SelectItem>
              <SelectItem value={BillableItemType.GOODS}>Goods</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Field>
      <Field className="min-w-0">
        <FieldLabel htmlFor={`${idPrefix}-hsn-sac`}>
          {codeLabel} <span className="font-normal text-muted-foreground">(optional)</span>
        </FieldLabel>
        <Input
          id={`${idPrefix}-hsn-sac`}
          value={sacCode}
          maxLength={20}
          placeholder={`Enter ${codeLabel}`}
          className="h-10 bg-background"
          onChange={(event) => onSacCodeChange(event.target.value)}
        />
      </Field>
    </FieldGroup>
  );
}
