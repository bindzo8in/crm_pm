"use client";

import { deleteTariffGrid } from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { MoreHorizontal, ExternalLink, Pencil, Trash2, Share2, Copy, Send } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function TariffGridList({ grids }: { grids: any[] }) {
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [shareGrid, setShareGrid] = useState<any | null>(null);
  const [clientName, setClientName] = useState("");
  const [currency, setCurrency] = useState("inr");
  const [shareUrl, setShareUrl] = useState("");
  
  const router = useRouter();

  useEffect(() => {
    if (shareGrid) {
      const baseUrl = window.location.origin;
      let path = `/tariffs/${shareGrid.id}`;
      if (currency === "usd") {
        path += "/usd";
      }
      
      const url = new URL(path, baseUrl);
      if (clientName.trim()) {
        url.searchParams.set("client", clientName.trim());
      }
      setShareUrl(url.toString());
    }
  }, [shareGrid, clientName, currency]);

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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    toast.success("Link copied to clipboard");
  };

  const shareToWhatsApp = () => {
    const text = `Check out our service packages${clientName.trim() ? ` for ${clientName.trim()}` : ''}:\n\n${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
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
                <DropdownMenuItem 
                  className="cursor-pointer"
                  onClick={() => {
                    setShareGrid(grid);
                    setClientName("");
                    setCurrency("inr");
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Tariff
                </DropdownMenuItem>
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
              <Label htmlFor="currency">Currency / Pricing Mode</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="inr">INR (Indian Rupee)</SelectItem>
                  <SelectItem value="usd">USD (US Dollar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Shareable Link</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="bg-muted/50" />
                <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy Link">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 justify-end mt-4">
            <Button variant="secondary" onClick={() => setShareGrid(null)}>
              Close
            </Button>
            <Button className="bg-[#25D366] hover:bg-[#128C7E] text-white" onClick={shareToWhatsApp}>
              <Send className="mr-2 h-4 w-4" />
              WhatsApp
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
