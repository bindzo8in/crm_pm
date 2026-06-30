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

import { useCustomerOptions } from "./customer-query";

type CustomerOption = {
    id: string;
    customerNumber: number;
    displayName: string;
    companyName: string | null;
    primaryContactName: string | null;
};

type Props = {
    value?: string; // customerId
    onValueChange: (customer: CustomerOption) => void;
};

export function CustomerCombobox({
    value,
    onValueChange,
}: Props) {
    const [search, setSearch] = React.useState("");

    const { data, isLoading } = useCustomerOptions(search);

    const customers = data?.data ?? [];

    const selectedCustomer =
    customers.find((customer) => customer.id === value) ?? null;

    return (
        <Combobox
            items={customers}
            value={selectedCustomer}
            onValueChange={(customer) => {
                if (!customer) return;
                onValueChange(customer);
            }}
            inputValue={search}
            onInputValueChange={setSearch}
            itemToStringLabel={(customer) => customer?.displayName}
        >
            <ComboboxTrigger
                render={
                    <Button
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
                    {(customer) => (
                        <ComboboxItem
                            key={customer.id}
                            value={customer}
                        >
                            <div className="flex flex-col">
                                <span className="font-medium">
                                    {customer.displayName}
                                </span>

                                <span className="text-muted-foreground text-xs">
                                    #{customer.customerNumber}
                                    {customer.companyName &&
                                        ` • ${customer.companyName}`}
                                </span>
                            </div>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}