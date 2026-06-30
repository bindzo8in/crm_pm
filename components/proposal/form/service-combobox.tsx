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

import { useServiceOptions } from "./utils";

export type ServiceOption = {
    id: string;
    name: string;
    description: string | null;
};

type Props = {
    value: ServiceOption | null;
    onValueChange: (service: ServiceOption | null) => void;
};

export function ServiceCombobox({
    value,
    onValueChange,
}: Props) {
    const [search, setSearch] = React.useState("");

    const { data, isLoading } = useServiceOptions(search);

    const services = data?.data ?? [];

    return (
        <Combobox
            items={services}
            value={value}
            onValueChange={onValueChange}
            inputValue={search}
            onInputValueChange={setSearch}
            itemToStringLabel={(item) => item?.name ?? ""}
        >
            <ComboboxTrigger
                render={
                    <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                    >
                        <ComboboxValue placeholder="Select service" />
                    </Button>
                }
            />

            <ComboboxContent>
                <ComboboxInput
                    placeholder="Search service..."
                    showTrigger={false}
                />

                <ComboboxEmpty>
                    {isLoading
                        ? "Searching..."
                        : "No services found."}
                </ComboboxEmpty>

                <ComboboxList>
                    {(service) => (
                        <ComboboxItem
                            key={service.id}
                            value={service}
                        >
                            <div className="flex flex-col">
                                <span className="font-medium">
                                    {service.name}
                                </span>

                                {service.description && (
                                    <span className="text-muted-foreground text-xs">
                                        {service.description}
                                    </span>
                                )}
                            </div>
                        </ComboboxItem>
                    )}
                </ComboboxList>
            </ComboboxContent>
        </Combobox>
    );
}