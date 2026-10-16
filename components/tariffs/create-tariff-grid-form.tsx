"use client";

import { createTariffGrid } from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export default function CreateTariffGridForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    try {
      const result = await createTariffGrid({
        name: trimmedName,
        description: description.trim(),
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      if (!result.data) {
        toast.error("The tariff grid was created, but could not be opened.");
        return;
      }

      toast.success("Tariff grid created");
      router.push(`/dashboard/tariffs/${result.data.id}`);
    } catch {
      toast.error("We could not create the tariff grid. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Grid name <span aria-hidden="true" className="text-destructive">*</span></Label>
        <Input
          id="name"
          name="name"
          autoComplete="off"
          placeholder="e.g. Standard marketing packages"
          value={name}
          onChange={(event) => setName(event.target.value)}
          disabled={isSubmitting}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description <span className="font-normal text-muted-foreground">(optional)</span></Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Notes about this tariff comparison"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={isSubmitting}
          rows={4}
        />
      </div>

      <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:justify-end">
        <Button asChild variant="ghost">
          <Link href="/dashboard/tariffs">Cancel</Link>
        </Button>
        <Button type="submit" className="min-h-11" disabled={!name.trim() || isSubmitting}>
          {isSubmitting ? "Creating..." : "Create tariff grid"}
        </Button>
      </div>
    </form>
  );
}
