"use client";

import { deleteTariffGrid } from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { format } from "date-fns";
import { MoreHorizontal, ExternalLink, Pencil, Trash2, Share2, Copy, Send, Tags, Search, Package } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
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
  const [confirmDeleteGrid, setConfirmDeleteGrid] = useState<TariffGrid | null>(null);
  const [shareGrid, setShareGrid] = useState<TariffGrid | null>(null);
  const [clientName, setClientName] = useState("");
  const [currency, setCurrency] = useState("inr");
  const [shareOrigin, setShareOrigin] = useState("");
  const [search, setSearch] = useState("");
  
  const router = useRouter();
  const filteredGrids = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return grids;

    return grids.filter((grid) =>
      `${grid.name} ${grid.description ?? ""}`.toLocaleLowerCase().includes(query)
    );
  }, [grids, search]);

  const shareUrl = shareGrid && shareOrigin
    ? (() => {
        const path = `/tariffs/${shareGrid.id}${currency === "usd" ? "/usd" : ""}`;
        const url = new URL(path, shareOrigin);
        if (clientName.trim()) url.searchParams.set("client", clientName.trim());
        return url.toString();
      })()
    : "";

  const handleDelete = async (id: string) => {
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
      <div className="flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/10 px-5 py-10 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Tags aria-hidden="true" className="size-5" />
        </div>
        <h3 className="text-lg font-semibold">Create your first tariff grid</h3>
        <p className="mb-5 mt-1 max-w-md text-sm leading-6 text-muted-foreground">
          Choose service packages, arrange them side by side, and share a clear comparison with your client.
        </p>
        <Link href="/dashboard/tariffs/create">
          <Button className="min-h-10">Create tariff grid</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {grids.length} {grids.length === 1 ? "comparison" : "comparisons"}
        </p>
        <div className="relative w-full sm:max-w-xs">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search tariff grids"
            placeholder="Search tariff grids"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 pl-9"
          />
        </div>
      </div>

      {filteredGrids.length === 0 ? (
        <div className="rounded-xl border border-dashed px-5 py-10 text-center">
          <h3 className="font-medium">No matching tariff grids</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Try a different name or description.
          </p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-3 lg:grid-cols-2 xl:grid-cols-3">
          {filteredGrids.map((grid) => (
            <article key={grid.id} className="group relative flex min-w-0 flex-col rounded-xl border bg-card p-4 transition-colors hover:border-primary/30 sm:p-5">
              <div className="flex min-w-0 items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words pr-1 text-base font-semibold leading-6">{grid.name}</h3>
                  {grid.description ? (
                    <p className="mt-1 line-clamp-2 break-words text-sm leading-5 text-muted-foreground">
                      {grid.description}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">No description</p>
                  )}
                </div>
                <div className="shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground hover:text-foreground"
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
                  disabled={isDeleting === grid.id}
                  onSelect={() => setConfirmDeleteGrid(grid)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  {isDeleting === grid.id ? "Deleting..." : "Delete"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Package aria-hidden="true" className="size-3.5" />
                  {grid._count.packages} {grid._count.packages === 1 ? "package" : "packages"}
                </span>
                <span>Updated {format(new Date(grid.updatedAt), "MMM d, yyyy")}</span>
              </div>

              <Button asChild variant="secondary" className="mt-4 min-h-10 w-full">
                <Link href={`/dashboard/tariffs/${grid.id}`}>Manage comparison</Link>
              </Button>
            </article>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(confirmDeleteGrid)}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteGrid(null);
        }}
        title="Delete tariff grid?"
        description={`Delete "${confirmDeleteGrid?.name ?? ""}"? This action cannot be undone.`}
        confirmLabel="Delete grid"
        disabled={Boolean(confirmDeleteGrid && isDeleting === confirmDeleteGrid.id)}
        onConfirm={() => {
          if (confirmDeleteGrid) void handleDelete(confirmDeleteGrid.id);
        }}
      />

      <Dialog open={!!shareGrid} onOpenChange={(open) => !open && setShareGrid(null)}>
        <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
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
              <div className="flex min-w-0 gap-2">
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
          
          <div className="mt-4 flex flex-col-reverse justify-end gap-2 sm:flex-row">
            <Button variant="secondary" onClick={() => setShareGrid(null)}>
              Close
            </Button>
            <Button
              className="min-h-10 bg-[#25D366] text-[#052e16] hover:bg-[#128C7E] hover:text-white"
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
