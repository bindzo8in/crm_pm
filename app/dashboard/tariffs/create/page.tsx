"use client";

import { createTariffGrid } from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";

export default function CreateTariffGridPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await createTariffGrid({ name, description });
      if (!result.success) {
        toast.error(String(result.error));
        return;
      }
      if (result.data) {
        toast.success("Tariff grid created");
        router.push(`/dashboard/tariffs/${result.data.id}`);
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/dashboard/tariffs">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight">Create Tariff Grid</h2>
      </div>

      <div className="border rounded-xl p-6 bg-card shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Grid Name <span className="text-red-500">*</span></Label>
            <Input
              id="name"
              placeholder="e.g. Standard Marketing Packages"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Internal notes about this tariff grouping..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Link href="/dashboard/tariffs">
              <Button type="button" variant="ghost" disabled={isSubmitting}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={!name.trim() || isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Tariff Grid"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
