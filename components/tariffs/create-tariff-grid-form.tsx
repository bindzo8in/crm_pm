"use client";

import { createTariffGrid, type getAvailableServicePackages } from "@/actions/tariffs";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Tags } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";

type AvailablePackage = NonNullable<
  Extract<Awaited<ReturnType<typeof getAvailableServicePackages>>, { success: true }>["data"]
>[number];

export default function CreateTariffGridForm({
  packages,
}: {
  packages: AvailablePackage[];
}) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);

  const filteredPackages = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return packages;

    return packages.filter((pkg) =>
      `${pkg.service?.name ?? ""} ${pkg.name}`.toLocaleLowerCase().includes(query)
    );
  }, [packages, search]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setIsSubmitting(true);
    try {
      const result = await createTariffGrid({
        name: trimmedName,
        description: description.trim(),
        packageIds: selectedPackageIds,
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

  const togglePackage = (packageId: string, checked: boolean) => {
    setSelectedPackageIds((current) =>
      checked
        ? current.includes(packageId) ? current : [...current, packageId]
        : current.filter((id) => id !== packageId)
    );
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-[1280px] min-w-0 flex-col px-4 py-5 sm:px-8 sm:py-8 lg:px-10">
      <header className="mb-6 hidden items-center gap-3 border-b pb-5 sm:mb-8 sm:flex sm:pb-6">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Tags aria-hidden="true" className="size-5" />
        </div>
        <div>
          <h2 className="font-semibold">Build a package comparison</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up the grid and choose which packages to compare.
          </p>
        </div>
      </header>

      <div className="grid min-w-0 gap-8 lg:grid-cols-[minmax(17rem,0.8fr)_minmax(0,1.4fr)] lg:gap-12">
        <section aria-labelledby="grid-details-heading" className="min-w-0">
          <div className="mb-4">
            <h2 id="grid-details-heading" className="text-base font-semibold">Grid details</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Give this comparison a name your team will recognize.
            </p>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">
                Grid name <span aria-hidden="true" className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                autoComplete="off"
                placeholder="e.g. Website packages"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
                required
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Add context for your team or client."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={isSubmitting}
                rows={4}
                className="min-h-28 resize-y"
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="packages-heading" className="min-w-0 border-t pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
          <div className="mb-4 flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 id="packages-heading" className="text-base font-semibold">Choose packages</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {packages.length > 0
                  ? "Select the packages to compare. You can change their order next."
                  : "No active packages are available yet. You can add them to the grid later."}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium tabular-nums">
              {selectedPackageIds.length} selected
            </span>
          </div>

          {packages.length > 0 && (
            <div className="relative mb-3">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search service packages"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by service or package"
                className="h-10 pl-9"
                disabled={isSubmitting}
              />
            </div>
          )}

          {packages.length > 0 && (
            <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              {filteredPackages.map((pkg) => {
                const checked = selectedPackageIds.includes(pkg.id);
                const checkboxId = `package-${pkg.id}`;

                return (
                  <Label
                    key={pkg.id}
                    htmlFor={checkboxId}
                    className={`flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50 ${
                      checked ? "border-primary/50 bg-primary/5" : "bg-background"
                    }`}
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={checked}
                      onCheckedChange={(value) => togglePackage(pkg.id, value === true)}
                      disabled={isSubmitting}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{pkg.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {pkg.service?.name ?? "Service"}
                      </span>
                    </span>
                  </Label>
                );
              })}
            </div>
          )}

          {packages.length > 0 && filteredPackages.length === 0 && (
            <div className="rounded-lg border border-dashed px-4 py-8 text-center">
              <p className="text-sm font-medium">No packages match your search</p>
              <p className="mt-1 text-xs text-muted-foreground">Try a different service or package name.</p>
            </div>
          )}
        </section>
      </div>

      <footer className="mt-8 flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between sm:pt-5">
        <p className="text-xs leading-5 text-muted-foreground">
          <span className="text-destructive">*</span> Required field
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center">
          <Button asChild variant="ghost" className="min-h-11">
            <Link href="/dashboard/tariffs">Cancel</Link>
          </Button>
          <Button
            type="submit"
            className="min-h-11 sm:min-w-48"
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting
              ? "Creating grid..."
              : selectedPackageIds.length > 0
                ? `Create grid with ${selectedPackageIds.length} ${selectedPackageIds.length === 1 ? "package" : "packages"}`
                : "Create tariff grid"}
          </Button>
        </div>
      </footer>
    </form>
  );
}
