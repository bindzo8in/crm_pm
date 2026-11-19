"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { MoreHorizontal, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setProductActive } from "@/actions/products";
import { productKeys } from "../util";

export function ProductActions({ product }: { product: { id: string; name: string; isActive: boolean } }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);

  const toggleActive = async () => {
    setSaving(true);
    try {
      const response = await setProductActive(product.id, !product.isActive);
      if (!response.success) {
        toast.error(response.message || "Product status could not be updated");
        return;
      }
      toast.success(response.message);
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Product status could not be updated");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8" aria-label={`Actions for ${product.name}`}>
          <MoreHorizontal aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/products/${product.id}/edit`}>
            <Pencil aria-hidden="true" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={saving} onClick={() => void toggleActive()}>
          {product.isActive ? <ToggleLeft aria-hidden="true" /> : <ToggleRight aria-hidden="true" />}
          {product.isActive ? "Deactivate" : "Activate"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
