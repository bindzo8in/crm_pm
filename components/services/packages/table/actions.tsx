"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  MoreHorizontal,
  Eye,
  Pencil,
  Copy,
  CopyCheck,
  Files,
  Trash2,
} from "lucide-react";

import { useQueryClient } from "@tanstack/react-query";
import {
  DeleteServicePackage,
  DuplicateServicePackage,
} from "@/actions/services";
import { servicePackageKeys } from "../../util";

interface ServicePackageActionsProps {
  servicePackage: {
    id: string;
    name: string;
    service: {
        id: string,
        name: string
    }
  };
}

export function ServicePackageActions({
  servicePackage,
}: ServicePackageActionsProps) {
  const queryClient = useQueryClient();

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(servicePackage.id);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleDuplicate = async () => {
    try {
      const response = await DuplicateServicePackage(
        servicePackage.id
      );

      if (response.success) {
        toast.success(response.message);

        queryClient.invalidateQueries({
          queryKey: servicePackageKeys.all,
        });
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  const handleDelete = async () => {
    try {
      const response = await DeleteServicePackage(
        servicePackage.id
      );

      if (response.success) {
        toast.success(response.message);

        queryClient.invalidateQueries({
          queryKey: servicePackageKeys.all,
        });
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
        >
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/packages/${servicePackage.id}`}
          >
            <Eye />
            View
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/services/${servicePackage.service.id}/edit-package?packageId=${servicePackage.id}`}
          >
            <Pencil />
            Edit
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleDuplicate}>
          <Files />
          Duplicate
        </DropdownMenuItem>

        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <CopyCheck /> : <Copy />}
          {copied ? "Copied" : "Copy"} ID
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}