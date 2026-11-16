"use client";

import {
  checkOrganizationSlugAvailability,
  createOrganization,
} from "@/actions/organization";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useActionState,
  useEffect,
  useState,
  type ChangeEvent,
} from "react";
import {
  organizationSlugFromName,
  organizationSlugSchema,
} from "@/lib/organization-slug";

type SlugStatus =
  | { slug: string; type: "idle" }
  | { slug: string; type: "checking" }
  | { slug: string; type: "available" }
  | { slug: string; type: "taken"; suggestion?: string }
  | { slug: string; type: "invalid"; message: string }
  | { slug: string; type: "error"; message: string };

export function CreateOrganizationForm() {
  const [state, formAction, pending] = useActionState(createOrganization, {});
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [slugStatus, setSlugStatus] = useState<SlugStatus>({
    slug: "",
    type: "idle",
  });
  const parsedSlug = organizationSlugSchema.safeParse(slug);
  const visibleSlugStatus: SlugStatus = !slug
    ? { slug, type: "idle" }
    : !parsedSlug.success
      ? {
          slug,
          type: "invalid",
          message:
            parsedSlug.error.issues[0]?.message ??
            "Enter a valid workspace address.",
        }
      : slugStatus.slug === parsedSlug.data
        ? slugStatus
        : { slug: parsedSlug.data, type: "checking" };

  useEffect(() => {
    const parsedSlug = organizationSlugSchema.safeParse(slug);
    if (!parsedSlug.success) {
      return;
    }

    let active = true;
    const timeout = setTimeout(async () => {
      setSlugStatus({ slug: parsedSlug.data, type: "checking" });
      try {
        const result = await checkOrganizationSlugAvailability(parsedSlug.data);
        if (!active) return;

        if (result.error) {
          setSlugStatus({
            slug: parsedSlug.data,
            type: "error",
            message: result.error,
          });
        } else if (result.available) {
          setSlugStatus({ slug: parsedSlug.data, type: "available" });
        } else if (!manualSlug && result.suggestedSlug) {
          setSlug(result.suggestedSlug);
          setSlugStatus({
            slug: result.suggestedSlug,
            type: "available",
          });
        } else {
          setSlugStatus({
            slug: parsedSlug.data,
            type: "taken",
            ...(result.suggestedSlug
              ? { suggestion: result.suggestedSlug }
              : {}),
          });
        }
      } catch {
        if (active) {
          setSlugStatus({
            slug: parsedSlug.data,
            type: "error",
            message: "Could not check this address. Try again.",
          });
        }
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [manualSlug, slug]);

  function handleNameChange(event: ChangeEvent<HTMLInputElement>) {
    const value = event.currentTarget.value;
    setName(value);
    if (!manualSlug) {
      setSlug(organizationSlugFromName(value));
    }
  }

  function handleSlugChange(event: ChangeEvent<HTMLInputElement>) {
    setManualSlug(true);
    setSlug(event.currentTarget.value);
  }

  function useSuggestedSlug() {
    setManualSlug(false);
    setSlug(organizationSlugFromName(name));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an organization</CardTitle>
        <CardDescription>
          Create a CRM workspace, then invite its owner to complete setup.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="organization-name">Organization name</Label>
            <Input
              id="organization-name"
              name="name"
              value={name}
              onChange={handleNameChange}
              autoComplete="organization"
              maxLength={100}
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="organization-slug">Workspace address</Label>
            <Input
              id="organization-slug"
              name="slug"
              value={slug}
              onChange={handleSlugChange}
              autoComplete="off"
              minLength={1}
              maxLength={48}
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="acme-studio"
              aria-describedby="organization-slug-help"
              aria-invalid={
                visibleSlugStatus.type === "invalid" ||
                visibleSlugStatus.type === "taken"
              }
              required
            />
            <p
              id="organization-slug-help"
              className="text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {visibleSlugStatus.type === "checking"
                ? "Checking availability..."
                : visibleSlugStatus.type === "available"
                  ? "This address is available."
                  : visibleSlugStatus.type === "taken"
                    ? "This address is already in use."
                    : visibleSlugStatus.type === "invalid" ||
                        visibleSlugStatus.type === "error"
                      ? visibleSlugStatus.message
                      : "Generated from the organization name. You can edit it."}
            </p>
            <div className="flex flex-wrap gap-3">
              {visibleSlugStatus.type === "taken" &&
                visibleSlugStatus.suggestion && (
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0"
                    onClick={() =>
                      setSlug(visibleSlugStatus.suggestion ?? "")
                    }
                  >
                    Use {visibleSlugStatus.suggestion}
                  </Button>
                )}
              {manualSlug && (
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0"
                  onClick={useSuggestedSlug}
                >
                  Use generated address
                </Button>
              )}
            </div>
          </div>
          {state.error && (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          )}
          <div>
            <Button type="submit" disabled={pending}>
              {pending ? "Creating..." : "Create organization"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
