"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FolderClosed,
  FolderOpen,
  FolderPlus,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  createProjectTaskFolderAction,
  deleteProjectTaskFolderAction,
  updateProjectTaskFolderAction,
} from "@/actions/project";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type TaskFolderOption = {
  id: string;
  name: string;
  parentId: string | null;
};

function getFolderPath(folderId: string, folders: TaskFolderOption[]) {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const path: string[] = [];
  let current = folderById.get(folderId);
  while (current) {
    path.unshift(current.name);
    current = current.parentId ? folderById.get(current.parentId) : undefined;
  }
  return path.join(" / ");
}

function descendantsOf(folderId: string, folders: TaskFolderOption[]) {
  const result = new Set([folderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (folder.parentId && result.has(folder.parentId) && !result.has(folder.id)) {
        result.add(folder.id);
        changed = true;
      }
    }
  }
  return result;
}

export function TaskFolderNavigation({
  projectId,
  folders,
  tasks,
  selectedFolderId,
  onSelect,
  canManage,
}: {
  projectId: string;
  folders: TaskFolderOption[];
  tasks: { id: string; folderId: string }[];
  selectedFolderId: string | null;
  onSelect: (folderId: string | null) => void;
  canManage: boolean;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingFolder, setEditingFolder] = React.useState<TaskFolderOption | null>(null);
  const [name, setName] = React.useState("");
  const [parentId, setParentId] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(
    () => new Set(folders.filter(({ parentId }) => parentId === null).map(({ id }) => id)),
  );
  const folderCounts = new Map<string, number>();
  for (const task of tasks) {
    folderCounts.set(task.folderId, (folderCounts.get(task.folderId) ?? 0) + 1);
  }

  function openCreate(parentFolderId: string | null = selectedFolderId) {
    setEditingFolder(null);
    setName("");
    setParentId(parentFolderId ?? "");
    setDialogOpen(true);
  }

  function openEdit(folder: TaskFolderOption) {
    setEditingFolder(folder);
    setName(folder.name);
    setParentId(folder.parentId ?? "");
    setDialogOpen(true);
  }

  async function saveFolder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const input = {
        projectId,
        name,
        parentId: parentId || null,
      };
      const result = editingFolder
        ? await updateProjectTaskFolderAction({ ...input, folderId: editingFolder.id })
        : await createProjectTaskFolderAction(input);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      setDialogOpen(false);
      if (!editingFolder && result.data) onSelect(result.data.id);
      if (parentId) {
        setExpanded((current) => new Set(current).add(parentId));
      }
      router.refresh();
    } catch (error) {
      console.error("Failed to save project task folder", error);
      toast.error("Unable to save folder.");
    } finally {
      setPending(false);
    }
  }

  async function deleteFolder(folder: TaskFolderOption) {
    setPending(true);
    try {
      const result = await deleteProjectTaskFolderAction({
        projectId,
        folderId: folder.id,
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (selectedFolderId === folder.id) onSelect(folder.parentId);
      router.refresh();
    } catch (error) {
      console.error("Failed to delete project task folder", error);
      toast.error("Unable to delete folder.");
    } finally {
      setPending(false);
    }
  }

  function renderFolders(parentFolderId: string | null, ancestors: Set<string>) {
    return folders
      .filter(({ parentId }) => parentId === parentFolderId)
      .map((folder) => {
        if (ancestors.has(folder.id)) return null;
        const nextAncestors = new Set(ancestors).add(folder.id);
        const children = folders.some(({ parentId }) => parentId === folder.id);
        const isExpanded = expanded.has(folder.id);
        const FolderIcon = isExpanded ? FolderOpen : FolderClosed;
        return (
          <li key={folder.id} className="min-w-0">
            <div className="group flex min-w-0 items-center gap-1">
              <button
                type="button"
                aria-label={`${isExpanded ? "Collapse" : "Expand"} ${folder.name}`}
                aria-expanded={isExpanded}
                onClick={() => setExpanded((current) => {
                  const next = new Set(current);
                  if (next.has(folder.id)) next.delete(folder.id);
                  else next.add(folder.id);
                  return next;
                })}
                className="grid size-7 shrink-0 place-items-center rounded text-muted-foreground outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span aria-hidden="true" className={`text-xs transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                  ›
                </span>
              </button>
              <button
                type="button"
                aria-current={selectedFolderId === folder.id ? "page" : undefined}
                onClick={() => onSelect(folder.id)}
                className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  selectedFolderId === folder.id
                    ? "bg-primary/10 font-medium text-primary"
                    : "hover:bg-muted"
                }`}
              >
                <FolderIcon aria-hidden="true" className="size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {folderCounts.get(folder.id) ?? 0}
                </span>
              </button>
              {canManage && (
                <div className="flex shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Add subfolder under ${folder.name}`}
                    title="Add subfolder"
                    onClick={() => openCreate(folder.id)}
                  >
                    <FolderPlus aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Rename or move ${folder.name}`}
                    title="Rename or move"
                    onClick={() => openEdit(folder)}
                  >
                    <Pencil aria-hidden="true" />
                  </Button>
                  <ConfirmDialog
                    trigger={
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${folder.name}`}
                        title="Delete folder"
                        disabled={pending}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    }
                    title={`Delete “${folder.name}”?`}
                    description="Tasks move into the parent folder. Subfolders move under the parent too. Deleting the only top-level folder creates a fresh General folder so tasks always have a home."
                    confirmLabel="Delete folder"
                    disabled={pending}
                    onConfirm={() => void deleteFolder(folder)}
                  />
                </div>
              )}
            </div>
            {children && isExpanded && (
              <ul className="ml-3 border-l pl-1">
                {renderFolders(folder.id, nextAncestors)}
              </ul>
            )}
          </li>
        );
      });
  }

  const excludedParentIds = editingFolder
    ? descendantsOf(editingFolder.id, folders)
    : new Set<string>();
  const parentOptions = folders
    .filter(({ id }) => !excludedParentIds.has(id))
    .map((folder) => ({
      value: folder.id,
      label: getFolderPath(folder.id, folders),
      icon: "project" as const,
    }));

  return (
    <>
      <nav aria-label="Task folders" className="min-w-0 border-b pb-4 xl:border-b-0 xl:border-r xl:pb-0 xl:pr-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Folders</h3>
          {canManage && (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Create folder"
              title="Create folder"
              onClick={() => openCreate(null)}
            >
              <FolderPlus aria-hidden="true" />
            </Button>
          )}
        </div>
        <ul className="space-y-0.5">
          <li>
            <button
              type="button"
              aria-current={selectedFolderId === null ? "page" : undefined}
              onClick={() => onSelect(null)}
              className={`flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                selectedFolderId === null ? "bg-primary/10 font-medium text-primary" : "hover:bg-muted"
              }`}
            >
              <FolderOpen aria-hidden="true" className="size-4" />
              <span className="flex-1">All folders</span>
              <span className="text-xs tabular-nums text-muted-foreground">{tasks.length}</span>
            </button>
          </li>
          {renderFolders(null, new Set())}
        </ul>
      </nav>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingFolder ? "Edit folder" : "Create folder"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={saveFolder} className="grid gap-4">
            <label className="grid gap-1.5 text-sm font-medium">
              Folder name
              <Input
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Website refresh"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium">
              Parent folder
              <OptionSelect
                label="Parent folder"
                value={parentId}
                onValueChange={setParentId}
                emptyLabel="Top level"
                options={parentOptions}
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={pending || !name.trim()}>
                {pending ? "Saving…" : editingFolder ? "Save folder" : "Create folder"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
