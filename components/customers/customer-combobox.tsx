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
import { Plus } from "lucide-react";

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
    "aria-invalid"?: boolean;
    value?: string; // customerId
    selectedCustomer?: CustomerOption | null;
    onValueChange: (customer: CustomerOption) => void;
    onCreateCustomer?: () => void;
};

type CustomerComboboxOption = CustomerOption | { id: "__create_customer__"; action: "create" };
const createCustomerOption: CustomerComboboxOption = { id: "__create_customer__", action: "create" };

export function CustomerCombobox({
    id,
    "aria-invalid": ariaInvalid,
    value,
    selectedCustomer: selectedCustomerFallback,
    onValueChange,
    onCreateCustomer,
}: Props) {
    const [search, setSearch] = React.useState("");

    const { data, isLoading } = useCustomerOptions(search);

    const customers = data?.data ?? [];
    const options: CustomerComboboxOption[] = [...customers, createCustomerOption];

    const selectedCustomer =
    customers.find((customer) => customer.id === value)
        ?? (selectedCustomerFallback?.id === value ? selectedCustomerFallback : null);

    return (
        <Combobox
            items={options}
            value={selectedCustomer}
            onValueChange={(customer: CustomerComboboxOption | null) => {
                if (!customer) return;
                if ("action" in customer) {
                    onCreateCustomer?.();
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
                        aria-invalid={ariaInvalid}
                        variant="outline"
                        className="w-full justify-between font-normal"
                    >
                        <ComboboxValue placeholder="Select customer" />
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
                        <ComboboxItem
                            key={option.id}
                            value={option}
                            className="mt-1 border-t border-border pt-2 font-medium text-primary"
                        >
                            <Plus className="size-4" />
                            <span>Add new customer</span>
                        </ComboboxItem>
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