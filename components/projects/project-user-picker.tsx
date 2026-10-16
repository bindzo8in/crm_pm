"use client";

import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, LoaderCircle, Search, X } from "lucide-react";
import { searchProjectUsers } from "@/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ProjectUserOption = {
  id: string;
  name: string;
  designation: string | null;
  department: string | null;
};

type Props = {
  label: string;
  initialUsers: ProjectUserOption[];
  selectedUsers: ProjectUserOption[];
  onSelectionChange: (users: ProjectUserOption[]) => void;
  multiple?: boolean;
  excludedUserId?: string | null;
};

function displayName(user: ProjectUserOption) {
  return [
    user.name,
    user.designation ?? user.department,
  ].filter(Boolean).join(" · ");
}

export function ProjectUserPicker({
  label,
  initialUsers,
  selectedUsers,
  onSelectionChange,
  multiple = false,
  excludedUserId,
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [options, setOptions] = useState<ProjectUserOption[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    let active = true;
    void searchProjectUsers({ search: debouncedSearch, page })
      .then((result) => {
        if (!active) return;
        if (!result.success) {
          setError(result.message);
          setOptions((current) => page === 0 ? [] : current);
          setHasMore(false);
          return;
        }
        const data = result.data;
        if (!data) {
          setError("No user results were returned.");
          setOptions((current) => page === 0 ? [] : current);
          setHasMore(false);
          return;
        }
        setOptions((current) => {
          if (page === 0) return data.users;
          const knownIds = new Set(current.map(({ id }) => id));
          return [
            ...current,
            ...data.users.filter(({ id }) => !knownIds.has(id)),
          ];
        });
        setHasMore(data.hasMore);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        console.error("Failed to search project users", cause);
        setError("Unable to load users. Try again.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [debouncedSearch, page]);

  const seenIds = new Set<string>();
  const selectableOptions = [...initialUsers, ...options].filter((user) => {
    if (user.id === excludedUserId || seenIds.has(user.id)) return false;
    seenIds.add(user.id);
    return true;
  });
  const selectedIds = new Set(selectedUsers.map(({ id }) => id));
  const selected = multiple
    ? selectedUsers.length
      ? `${selectedUsers.length} team member${selectedUsers.length === 1 ? "" : "s"} selected`
      : "Select team members"
    : selectedUsers[0]
      ? displayName(selectedUsers[0])
      : "Not assigned";

  function toggleUser(user: ProjectUserOption) {
    if (!multiple) {
      onSelectionChange(selectedIds.has(user.id) ? [] : [user]);
      setOpen(false);
      return;
    }
    onSelectionChange(
      selectedIds.has(user.id)
        ? selectedUsers.filter(({ id }) => id !== user.id)
        : [...selectedUsers, user],
    );
  }

  return (
    <div className="grid min-w-0 gap-1.5 text-sm font-medium">
      <span>{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full min-w-0 justify-between gap-2 font-normal"
          >
            <span className="truncate text-left">{selected}</span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[min(24rem,calc(100vw-2rem))] gap-2 p-2"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
                setLoading(true);
                setError(null);
              }}
              placeholder="Search by name, email, or title"
              aria-label={`Search ${label.toLowerCase()}`}
              className="pl-9"
            />
          </div>

          <div
            role="listbox"
            aria-label={label}
            aria-multiselectable={multiple}
            className="max-h-56 overflow-y-auto"
          >
            {!multiple && (
              <button
                type="button"
                role="option"
                aria-selected={selectedUsers.length === 0}
                onClick={() => {
                  onSelectionChange([]);
                  setOpen(false);
                }}
                className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:bg-accent"
              >
                <span className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${selectedUsers.length === 0 ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                  {selectedUsers.length === 0 && <Check className="size-3" />}
                </span>
                <span className="text-sm text-muted-foreground">Not assigned</span>
              </button>
            )}
            {selectableOptions.map((user) => {
              const isSelected = selectedIds.has(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggleUser(user)}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:bg-accent"
                >
                  <span className={`flex size-4 shrink-0 items-center justify-center rounded-sm border ${isSelected ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                    {isSelected && <Check className="size-3" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{user.name}</span>
                    {(user.designation || user.department) && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.designation ?? user.department}
                        {user.designation && user.department ? ` · ${user.department}` : ""}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
            {loading && options.length === 0 && (
              <p className="flex items-center justify-center gap-2 px-3 py-5 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Loading users…
              </p>
            )}
            {!loading && !error && selectableOptions.length === 0 && (
              <p className="px-3 py-5 text-center text-sm text-muted-foreground">
                No users match that search.
              </p>
            )}
            {error && (
              <p role="alert" className="px-3 py-4 text-center text-sm text-destructive">
                {error}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t px-1 pt-2 text-xs text-muted-foreground">
            <span>
              {selectableOptions.length ? `Showing ${selectableOptions.length} users` : "Search the user directory"}
            </span>
            {hasMore && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={() => {
                  setLoading(true);
                  setError(null);
                  setPage((current) => current + 1);
                }}
                className="h-8"
              >
                {loading ? <LoaderCircle className="size-4 animate-spin" /> : "Load more"}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>

      {multiple && selectedUsers.length > 0 && (
        <ul aria-label="Selected team members" className="flex flex-wrap gap-2 pt-1">
          {selectedUsers.map((user) => (
            <li key={user.id}>
              <span className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted/50 py-1 pl-2 pr-1 text-xs">
                <span className="max-w-52 truncate">{displayName(user)}</span>
                <button
                  type="button"
                  aria-label={`Remove ${user.name} from team`}
                  onClick={() => toggleUser(user)}
                  className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
