"use client";

import { deleteTariffGrid } from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MoreHorizontal, ExternalLink, Pencil, Trash2, Share2, Copy, Send, Tags } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Prisma } from "@/app/generated/prisma/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TariffGrid = Prisma.TariffGridGetPayload<{
  include: { _count: { select: { packages: true } } };
}>;

export function TariffGridList({ grids }: { grids: TariffGrid[] }) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [shareGrid, setShareGrid] = useState<TariffGrid | null>(null);
  const [clientName, setClientName] = useState("");
  const [currency, setCurrency] = useState("inr");
  const [shareOrigin, setShareOrigin] = useState("");
  
  const router = useRouter();

  const shareUrl = shareGrid && shareOrigin
    ? (() => {
        const path = `/tariffs/${shareGrid.id}${currency === "usd" ? "/usd" : ""}`;
        const url = new URL(path, shareOrigin);
        if (clientName.trim()) url.searchParams.set("client", clientName.trim());
        return url.toString();
      })()
    : "";

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
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleting(null);
    }
  };

  const copyToClipboard = async () => {
    if (!navigator.clipboard || !shareUrl) {
      toast.error("Clipboard access is unavailable. Select the link and copy it.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
    } catch (error) {
      if (error instanceof DOMException) {
        toast.error("Could not copy the link. Select it and copy it manually.");
        return;
      }
      throw error;
    }
  };

  const shareToWhatsApp = () => {
    const text = `Check out our service packages${clientName.trim() ? ` for ${clientName.trim()}` : ''}:\n\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  if (grids.length === 0) {
    return (
      <div className="col-span-full flex flex-col items-center rounded-xl border border-dashed px-4 py-12 text-center">
        <Tags aria-hidden="true" className="mb-3 size-6 text-muted-foreground" />
        <h3 className="text-lg font-medium">No tariff grids yet</h3>
        <p className="mb-4 text-sm text-muted-foreground">Create a grid to compare service packages.</p>
        <Link href="/dashboard/tariffs/create">
          <Button variant="outline">Create Tariff Grid</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {grids.map((grid) => (
        <div key={grid.id} className="group relative flex flex-col rounded-xl border bg-card p-4 shadow-sm sm:p-5">
          
          <div className="absolute top-4 right-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-foreground"
                  aria-label={`More actions for ${grid.name}`}
                  title="More actions"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/tariffs/${grid.id}`} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                    Public view
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => {
                    setShareGrid(grid);
                    setShareOrigin(window.location.origin);
                    setClientName("");
                    setCurrency("inr");
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share tariff
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/tariffs/${grid.id}`}>
                    <Pencil className="mr-2 h-4 w-4" aria-hidden="true" />
                    Manage grid
                  </Link>
                </DropdownMenuItem>
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
          
          <div className="mt-4 flex flex-wrap justify-between gap-x-3 gap-y-1 border-t pt-4 text-sm text-muted-foreground">
            <span>{grid._count.packages} packages</span>
            <span>{format(new Date(grid.updatedAt), "MMM d, yyyy")}</span>
          </div>
          
          <Link href={`/dashboard/tariffs/${grid.id}`} className="mt-4 w-full">
            <Button variant="secondary" className="w-full">Manage Grid</Button>
          </Link>
        </div>
      ))}

      <Dialog open={!!shareGrid} onOpenChange={(open) => !open && setShareGrid(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share Tariff Grid</DialogTitle>
            <DialogDescription>
              Generate a shareable link tailored for your client.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Client Name (Optional)</Label>
              <Input 
                id="clientName" 
                placeholder="e.g. Acme Corp" 
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="currency">Currency and pricing mode</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inr">INR (Indian Rupee)</SelectItem>
                  <SelectItem value="usd">USD (US Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="share-url">Shareable link</Label>
              <div className="flex gap-2">
                <Input id="share-url" value={shareUrl} readOnly className="min-w-0 bg-muted/50" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  aria-label="Copy shareable link"
                  title="Copy link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" onClick={() => setShareGrid(null)}>
              Close
            </Button>
            <Button
              className="bg-[#25D366] text-[#052e16] hover:bg-[#128C7E] hover:text-white"
              onClick={shareToWhatsApp}
            >
              <Send className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
