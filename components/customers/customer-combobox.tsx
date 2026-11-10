"use client";

import * as React from "react";
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
import { CircleMinus, Plus } from "lucide-react";

import { useCustomerOptions } from "./customer-query";

export type CustomerOption = {
    id: string;
    customerNumber: number;
    displayName: string;
    companyName: string | null;
    primaryContactName: string | null;
};

type Props = {
    id?: string;
    "aria-label"?: string;
    "aria-invalid"?: boolean;
    value?: string; // customerId
    selectedCustomer?: CustomerOption | null;
    onValueChange: (customer: CustomerOption) => void;
    onCreateCustomer?: () => void;
    allowNoCustomer?: boolean;
    onClear?: () => void;
    disabled?: boolean;
    placeholder?: string;
};

type CustomerComboboxOption =
    | CustomerOption
    | { id: "__create_customer__"; action: "create" }
    | { id: "__no_customer__"; action: "clear" };
const createCustomerOption: CustomerComboboxOption = { id: "__create_customer__", action: "create" };
const noCustomerOption: CustomerComboboxOption = { id: "__no_customer__", action: "clear" };

export function CustomerCombobox({
    id,
    "aria-label": ariaLabel,
    "aria-invalid": ariaInvalid,
    value,
    selectedCustomer: selectedCustomerFallback,
    onValueChange,
    onCreateCustomer,
    allowNoCustomer = false,
    onClear,
    disabled = false,
    placeholder = "Select customer",
}: Props) {
    const [search, setSearch] = React.useState("");

    const { data, isLoading } = useCustomerOptions(search);

    const customers = data?.data ?? [];
    const options: CustomerComboboxOption[] = [
        ...(allowNoCustomer ? [noCustomerOption] : []),
        ...customers,
        ...(onCreateCustomer ? [createCustomerOption] : []),
    ];

    const selectedCustomer =
    customers.find((customer) => customer.id === value)
        ?? (selectedCustomerFallback?.id === value ? selectedCustomerFallback : null);

    return (
        <Combobox
            items={options}
            filter={null}
            value={selectedCustomer}
            onValueChange={(customer: CustomerComboboxOption | null) => {
                if (!customer) return;
                if ("action" in customer) {
                    if (customer.action === "create") onCreateCustomer?.();
                    else onClear?.();
                    return;
                }
                onValueChange(customer);
            }}
            inputValue={search}
            onInputValueChange={setSearch}
            itemToStringLabel={(customer) => customer && "action" in customer ? "" : customer?.displayName ?? ""}
        >
            <ComboboxTrigger
                render={
                    <Button
                        id={id}
                        aria-label={ariaLabel}
                        aria-invalid={ariaInvalid}
                        disabled={disabled}
                        variant="outline"
                        className="w-full justify-between font-normal"
                    >
                        <ComboboxValue placeholder={placeholder} />
                    </Button>
                }
            />

            <ComboboxContent>
                <ComboboxInput
                    placeholder="Search customer..."
                    showTrigger={false}
                />

                <ComboboxEmpty>
                    {isLoading
                        ? "Searching..."
                        : "No customers found."}
                </ComboboxEmpty>

                <ComboboxList>
                    {(option) => "action" in option ? (
                        option.action === "create" ? (
                            <ComboboxItem
                                key={option.id}
                                value={option}
                                className="sticky bottom-0 z-10 mt-1 border-t border-border bg-popover pt-2 font-medium text-primary"
                            >
                                <Plus className="size-4" />
                                <span>Create customer</span>
                            </ComboboxItem>
                        ) : (
                            <ComboboxItem key={option.id} value={option}>
                                <CircleMinus className="size-4 text-muted-foreground" />
                                <span>No customer (standalone project)</span>
                            </ComboboxItem>
                        )
                    ) : (
                        <ComboboxItem key={option.id} value={option}>
                            <div className="flex flex-col">
                                <span className="font-medium">{option.displayName}</span>
                                <span className="text-muted-foreground text-xs">
                                    #{option.customerNumber}
                                    {option.companyName && ` • ${option.companyName}`}
                                </span>
                            </div>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}