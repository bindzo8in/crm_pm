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
  Package,
  Plus,
  Copy,
  CopyCheck,
  Trash2,
} from "lucide-react";

import { DeleteService } from "@/actions/services";
import { useQueryClient } from "@tanstack/react-query";

interface ServiceActionsProps {
  service: {
    id: string;
    name: string;
  };
}

export function ServiceActions({
  service,
}: ServiceActionsProps) {
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(service.id);

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const handleDelete = async () => {
    try {
      const response = await DeleteService(service.id);

      if (response.success) {
        toast.success(response.message);
        queryClient.invalidateQueries({
          queryKey: ["services"],
        });
      } else {
        toast.error(response.message);
      }
    } catch (error) {
      toast.error("Something went wrong");
      console.error(error);
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
          <Link href={`/dashboard/services/${service.id}`}>
            <Eye />
            View
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/services/${service.id}/edit`}
          >
            <Pencil />
            Edit
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/services/${service.id}/packages`}
          >
            <Package />
            Manage Packages
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            href={`/dashboard/packages/new?serviceId=${service.id}`}
          >
            <Plus />
            Add Package
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <CopyCheck /> : <Copy />}
          {copied ? "Copied" : "Copy"} ID
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={handleDelete}
        >
          <Trash2 />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}