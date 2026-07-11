"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Layers, CheckCircle2, XCircle } from "lucide-react";

interface PackageItem {
    id: string;
    name: string;
    isActive: boolean;
}

interface PackagesCellProps {
    serviceName: string;
    packages: PackageItem[];
    totalCount: number;
}

export function PackagesCell({
    serviceName,
    packages,
    totalCount,
}: PackagesCellProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const count = totalCount ?? packages.length;

    if (count === 0) {
        return (
            <span className="text-xs text-muted-foreground italic">
                No packages
            </span>
        );
    }

    const displayPackages = isExpanded ? packages : packages.slice(0, 3);
    const remainingCount = count - displayPackages.length;

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <div className="flex flex-wrap items-center gap-1.5 max-w-[360px] p-2">
                {/* Count badge opens Dialog modal showing full details */}
                <DialogTrigger asChild>
                    <Badge
                        variant="secondary"
                        className="font-semibold text-xs px-1.5 py-0 cursor-pointer hover:bg-secondary/80 transition-colors flex items-center gap-1"
                        title="Click to view all packages"
                    >
                        <Layers className="size-3" />
                        {count} {count === 1 ? "pkg" : "pkgs"}
                    </Badge>
                </DialogTrigger>

                {/* Package badges inline */}
                {displayPackages.map((pkg) => (
                    <Badge
                        key={pkg.id}
                        variant="outline"
                        onClick={() => setIsDialogOpen(true)}
                        className="font-normal text-xs bg-muted/40 max-w-[140px] truncate cursor-pointer hover:bg-muted transition-colors"
                        title={`${pkg.name} (Click to view all)`}
                    >
                        {pkg.name}
                    </Badge>
                ))}

                {/* +N more badge toggles inline expansion OR opens dialog */}
                {remainingCount > 0 && (
                    <Badge
                        variant="outline"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(true);
                        }}
                        className="text-xs text-primary font-medium cursor-pointer hover:bg-primary/10 transition-colors border-primary/30"
                        title="Click to show all inline"
                    >
                        +{remainingCount} more
                    </Badge>
                )}

                {/* Collapse button when expanded inline */}
                {isExpanded && packages.length > 3 && (
                    <Badge
                        variant="ghost"
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsExpanded(false);
                        }}
                        className="text-xs text-muted-foreground cursor-pointer hover:text-foreground"
                    >
                        Show less
                    </Badge>
                )}
            </div>

            {/* Dialog modal with complete list of packages */}
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-lg">
                        <Layers className="size-5 text-primary" />
                        Packages for {serviceName}
                        <Badge variant="secondary" className="ml-auto text-xs">
                            {count} Total
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-4 max-h-[380px] overflow-y-auto pr-1 space-y-2">
                    {packages.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                            No packages found for this service.
                        </p>
                    ) : (
                        packages.map((pkg, index) => (
                            <div
                                key={pkg.id}
                                className="flex items-center justify-between p-2.5 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xs font-mono text-muted-foreground w-5">
                                        #{index + 1}
                                    </span>
                                    <span className="text-sm font-medium truncate">
                                        {pkg.name}
                                    </span>
                                </div>
                                <Badge
                                    variant={pkg.isActive ? "default" : "secondary"}
                                    className="text-[10px] shrink-0 gap-1"
                                >
                                    {pkg.isActive ? (
                                        <CheckCircle2 className="size-3" />
                                    ) : (
                                        <XCircle className="size-3" />
                                    )}
                                    {pkg.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        ))
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
