"use client";

import { deleteTariffGrid } from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MoreHorizontal, ExternalLink, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function TariffGridList({ grids }: { grids: any[] }) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this Tariff Grid?")) return;
    
    setIsDeleting(id);
    try {
      const result = await deleteTariffGrid(id);
      if (result.success) {
        toast.success("Grid deleted successfully");
        router.refresh();
      } else {
        toast.error(String(result.error));
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(null);
    }
  };

  if (grids.length === 0) {
    return (
      <div className="col-span-full py-12 text-center border rounded-xl border-dashed">
        <h3 className="text-lg font-medium text-muted-foreground">No Tariff Grids created yet</h3>
        <p className="text-sm text-muted-foreground mb-4">Create your first tariff module to compare packages.</p>
        <Link href="/dashboard/tariffs/create">
          <Button variant="outline">Create Tariff Grid</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {grids.map((grid) => (
        <div key={grid.id} className="border rounded-xl p-5 bg-card shadow-sm flex flex-col group relative">
          
          <div className="absolute top-4 right-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <Link href={`/tariffs/${grid.id}`} target="_blank">
                  <DropdownMenuItem className="cursor-pointer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Public View
                  </DropdownMenuItem>
                </Link>
                <Link href={`/dashboard/tariffs/${grid.id}`}>
                  <DropdownMenuItem className="cursor-pointer">
                    <Pencil className="mr-2 h-4 w-4" />
                    Manage Grid
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuItem 
                  className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => handleDelete(grid.id)}
                  disabled={isDeleting === grid.id}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting === grid.id ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <h3 className="font-semibold text-lg pr-8">{grid.name}</h3>
          {grid.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{grid.description}</p>
          )}
          
          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground flex justify-between">
            <span>{grid._count.packages} Packages</span>
            <span>{format(new Date(grid.updatedAt), "MMM d, yyyy")}</span>
          </div>
          
          <Link href={`/dashboard/tariffs/${grid.id}`} className="mt-4 w-full">
            <Button variant="secondary" className="w-full">Manage Grid</Button>
          </Link>
        </div>
      ))}
    </>
  );
}
