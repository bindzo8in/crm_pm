"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateProjectTeamAction } from "@/actions/project";
import { ProjectUserPicker, type ProjectUserOption } from "@/components/projects/project-user-picker";
import { Button } from "@/components/ui/button";
import { UsersRound } from "lucide-react";

export function ProjectTeamManager({
  projectId,
  projectCode,
  projectName,
  initialManager,
  initialMembers,
}: {
  projectId: string;
  projectCode: string;
  projectName: string;
  initialManager: ProjectUserOption | null;
  initialMembers: ProjectUserOption[];
}) {
  const router = useRouter();
  const [manager, setManager] = useState(initialManager);
  const [members, setMembers] = useState(initialMembers);
  const [saving, setSaving] = useState(false);

  async function saveTeam() {
    setSaving(true);
    try {
      const result = await updateProjectTeamAction({
        projectId,
        projectManagerId: manager?.id ?? null,
        teamMemberIds: members.map(({ id }) => id),
      });
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      router.refresh();
    } catch (error) {
      console.error("Failed to update project team", error);
      toast.error("Unable to update project team. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <section className="rounded-xl border bg-card p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <UsersRound aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{projectCode}</p>
            <h2 className="mt-1 text-lg font-semibold">People on {projectName}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Assign a project manager and contributors. Project details are managed separately.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <ProjectUserPicker
            label="Project manager"
            initialUsers={initialManager ? [initialManager, ...initialMembers] : initialMembers}
            selectedUsers={manager ? [manager] : []}
            onSelectionChange={(selection) => {
              const nextManager = selection[0] ?? null;
              setManager(nextManager);
              if (nextManager) {
                setMembers((current) => current.filter(({ id }) => id !== nextManager.id));
              }
            }}
          />
          <ProjectUserPicker
            label="Team members"
            initialUsers={initialManager ? [initialManager, ...initialMembers] : initialMembers}
            selectedUsers={members}
            onSelectionChange={setMembers}
            multiple
            excludedUserId={manager?.id}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="button" onClick={saveTeam} disabled={saving}>
          {saving ? "Saving team…" : "Save team"}
        </Button>
      </div>
    </div>
  );
}
