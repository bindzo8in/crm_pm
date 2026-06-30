"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
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

import { useServicePackages } from "./utils";

export type ServicePackageOption = {
    id: string;
    name: string;
    description: string | null;
    totalPrice: number;
    isPopular: boolean;
};

type Props = {
    serviceId?: string;

    value: ServicePackageOption | null;

    onValueChange: (
        pkg: ServicePackageOption | null,
    ) => void;
};

export function ServicePackageCombobox({
    serviceId,
    value,
    onValueChange,
}: Props) {
    const [search, setSearch] = React.useState("");

    const { data, isLoading } =
        useServicePackages(
            serviceId,
            search,
        );

    const packages = data?.data ?? [];

    return (
        <Combobox
            items={packages}
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
                        disabled={!serviceId}
                        className="w-full justify-between font-normal"
                    >
                        <ComboboxValue
                            placeholder={
                                serviceId
                                    ? "Select package"
                                    : "Select service first"
                            }
                        />
                    </Button>
                }
            />

            <ComboboxContent>
                <ComboboxInput
                    placeholder="Search package..."
                    showTrigger={false}
                />

                <ComboboxEmpty>
                    {isLoading
                        ? "Searching..."
                        : "No packages found."}
                </ComboboxEmpty>

                <ComboboxList>
                    {(pkg) => (
                        <ComboboxItem
                            key={pkg.id}
                            value={pkg}
                        >
                            <div className="flex w-full flex-col gap-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                        {pkg.name}
                                    </span>

                                    {pkg.isPopular && (
                                        <Badge
                                            variant="secondary"
                                        >
                                            Popular
                                        </Badge>
                                    )}
                                </div>

                                <span className="text-muted-foreground text-xs">
                                    ₹
                                    {Number(
                                        pkg.totalPrice,
                                    ).toLocaleString()}
                                </span>

                                {pkg.description && (
                                    <span className="text-muted-foreground text-xs">
                                        {pkg.description}
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