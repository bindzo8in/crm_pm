"use client";

import {
  addOrganizationTeamMember,
  cancelOrganizationMemberInvitation,
  createOrganizationRole,
  createOrganizationTeam,
  deleteOrganizationRole,
  inviteOrganizationMember,
  removeOrganizationMember,
  removeOrganizationTeam,
  removeOrganizationTeamMember,
  updateOrganizationMemberRole,
  updateOrganizationRolePermissions,
  updateOrganizationTeam,
} from "@/actions/organization-management";
import type { OrganizationManagementActionState } from "@/actions/organization-management";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { organizationRoleTemplates } from "@/lib/organization-role-templates";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  MailPlus,
  ShieldCheck,
  UsersRound,
  X,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ReactNode } from "react";
import { useActionState, useState } from "react";

type Member = {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  teams: { id: string; name: string }[];
};

type PermissionOption = {
  resource: string;
  action: string;
  value: string;
};

type Action = (
  state: OrganizationManagementActionState,
  formData: FormData,
) => Promise<OrganizationManagementActionState>;

const builtInRoles = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
];

function ActionMessage({ state }: { state: OrganizationManagementActionState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
        {state.success}
      </p>
    );
  }
  return null;
}

function roleOptions(customRoles: { role: string }[]) {
  return [
    ...builtInRoles,
    ...customRoles.map(({ role }) => ({
      value: role,
      label: role.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    })),
  ];
}

function formatRole(role: string) {
  return role.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase() || "U";
}

function RoleSelect({
  customRoles,
  defaultValue,
  name = "role",
  id,
  ariaLabel = "Organization role",
}: {
  customRoles: { role: string }[];
  defaultValue: string;
  name?: string;
  id?: string;
  ariaLabel?: string;
}) {
  return (
    <Select key={`${id ?? name}-${defaultValue}`} name={name} defaultValue={defaultValue}>
      <SelectTrigger id={id} className="w-full" aria-label={ariaLabel}>
        <SelectValue placeholder="Select a role" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {roleOptions(customRoles).map((role) => (
            <SelectItem key={role.value} value={role.value}>
              {role.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function ActionForm({
  action,
  children,
  className,
}: {
  action: Action;
  children: (state: OrganizationManagementActionState, pending: boolean) => ReactNode;
  className?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className}>
      {children(state, pending)}
    </form>
  );
}

function PermissionCheckboxes({
  options,
  selected,
  onSelectedChange,
  idPrefix,
}: {
  options: PermissionOption[];
  selected: string[];
  onSelectedChange: (permissions: string[]) => void;
  idPrefix: string;
}) {
  const [search, setSearch] = useState("");
  const grouped = new Map<string, PermissionOption[]>();
  for (const option of options) {
    grouped.set(option.resource, [...(grouped.get(option.resource) ?? []), option]);
  }
  const normalizedSearch = search.trim().toLowerCase();
  const filteredGroups = [...grouped].flatMap(([resource, permissions]) => {
    const resourceLabel = formatResource(resource);
    const matches = permissions.filter((permission) =>
      `${resourceLabel} ${permission.action} ${
        getOwnScopeDescription(resource, permission.action) ?? ""
      }`
        .toLowerCase()
        .includes(normalizedSearch),
    );
    return matches.length ? [{ resource, resourceLabel, permissions: matches }] : [];
  });
  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Find a permission or area"
          aria-label="Find a permission or area"
          className="sm:max-w-sm"
        />
        <Badge variant="outline" className="w-fit">
          {selected.length} selected
        </Badge>
      </div>
      {filteredGroups.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredGroups.map(({ resource, resourceLabel, permissions }) => {
            const selectedInGroup = permissions.filter(({ value }) =>
              selectedSet.has(value),
            ).length;

            return (
              <FieldSet
                key={resource}
                className="min-w-0 gap-2 rounded-lg border bg-background p-3"
              >
                <FieldLegend
                  variant="label"
                  className="flex w-full items-center justify-between gap-2 px-1"
                >
                  <span>{resourceLabel}</span>
                  <Badge variant={selectedInGroup ? "secondary" : "outline"}>
                    {selectedInGroup}/{permissions.length}
                  </Badge>
                </FieldLegend>
                <div className="flex flex-col gap-1">
                  {permissions.map((permission) => {
                    const checked = selectedSet.has(permission.value);
                    const ownScopeDescription = getOwnScopeDescription(
                      resource,
                      permission.action,
                    );

                    return (
                      <Field
                        key={permission.value}
                        orientation="horizontal"
                        className="group min-h-11 items-start gap-2 rounded-md px-2 py-2 transition-colors hover:bg-muted/60"
                      >
                        <Checkbox
                          id={`permission-${idPrefix}-${resource}-${permission.action}`}
                          name="permissions"
                          value={permission.value}
                          checked={checked}
                          onCheckedChange={(nextChecked) => {
                            onSelectedChange(
                              nextChecked === true
                                ? [...selected, permission.value]
                                : selected.filter(
                                    (value) => value !== permission.value,
                                  ),
                            );
                          }}
                        />
                        <FieldLabel
                          htmlFor={`permission-${idPrefix}-${resource}-${permission.action}`}
                          className="flex cursor-pointer flex-col gap-0.5 text-sm leading-5 text-foreground"
                        >
                          <span className="capitalize">
                            {permission.action.replace(/-/g, " ")}
                          </span>
                          {ownScopeDescription ? (
                            <span className="text-xs font-normal text-muted-foreground">
                              {ownScopeDescription}
                            </span>
                          ) : null}
                        </FieldLabel>
                      </Field>
                    );
                  })}
                </div>
              </FieldSet>
            );
          })}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          No permissions match “{search}”.
        </p>
      )}
    </div>
  );
}

function formatResource(resource: string) {
  return resource
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getOwnScopeDescription(resource: string, action: string) {
  if (!action.endsWith("-own")) return null;
  if (resource === "projects") return "Projects you manage or belong to.";
  if (["customers", "proposals", "invoices", "tasks"].includes(resource)) {
    return "Records you created or are assigned to.";
  }
  if (resource === "leave") return "Your own leave requests.";
  if (resource === "salary") return "Your own salary records.";
  return "Your own records.";
}

function CreateOrganizationRoleForm({
  permissionOptions,
}: {
  permissionOptions: PermissionOption[];
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState("custom");
  const [roleName, setRoleName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  function applyTemplate(templateId: string) {
    const template = organizationRoleTemplates.find(({ id }) => id === templateId);
    setSelectedTemplateId(templateId);
    setRoleName(template?.role ?? "");
    setSelectedPermissions(template ? [...template.permissions] : []);
  }

  const activeTemplate = organizationRoleTemplates.find(
    ({ id }) => id === selectedTemplateId,
  );

  return (
    <ActionForm
      action={createOrganizationRole}
      className="flex flex-col gap-5 rounded-xl border bg-card p-5 shadow-sm"
    >
      {(state, pending) => (
        <>
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold">Create a role</h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Start with a job-based preset or build a custom permission set.
              Review access before assigning the role to members.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Button
              type="button"
              variant={selectedTemplateId === "custom" ? "secondary" : "outline"}
              className="h-full min-h-24 justify-start whitespace-normal px-3 py-3 text-left"
              aria-pressed={selectedTemplateId === "custom"}
              onClick={() => applyTemplate("custom")}
            >
              <span className="flex flex-col items-start gap-1">
                <span className="font-medium">Custom role</span>
                <span className="text-xs font-normal text-muted-foreground">
                  Choose every permission yourself.
                </span>
              </span>
            </Button>
            {organizationRoleTemplates.map((template) => (
              <Button
                key={template.id}
                type="button"
                variant={selectedTemplateId === template.id ? "secondary" : "outline"}
                className="h-full min-h-24 justify-start whitespace-normal px-3 py-3 text-left"
                aria-pressed={selectedTemplateId === template.id}
                onClick={() => applyTemplate(template.id)}
              >
                <span className="flex flex-col items-start gap-1">
                  <span className="font-medium">{template.label}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {template.permissions.length} starting permissions
                  </span>
                </span>
              </Button>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)] md:items-end">
            <Field className="gap-2">
              <FieldLabel htmlFor="new-role-name">Role name</FieldLabel>
              <Input
                id="new-role-name"
                name="role"
                value={roleName}
                onChange={(event) => setRoleName(event.target.value)}
                maxLength={63}
                pattern="[a-z][a-z0-9_-]*"
                placeholder="e.g. sales-lead"
                required
              />
            </Field>
            <p className="text-sm text-muted-foreground">
              {activeTemplate?.description ??
                "Use lowercase letters, numbers, hyphens, or underscores. You can rename the role and change any selected permissions."}
            </p>
          </div>
          <div className="flex flex-col gap-3 border-t pt-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h4 className="font-medium">Permissions</h4>
              <p className="text-sm text-muted-foreground">
                {selectedPermissions.length} selected
              </p>
            </div>
            <PermissionCheckboxes
              options={permissionOptions}
              selected={selectedPermissions}
              onSelectedChange={setSelectedPermissions}
              idPrefix="new-role"
            />
          </div>
          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center">
            <Button type="submit" disabled={pending}>
              {pending ? "Creating role…" : "Create role"}
            </Button>
            <ActionMessage state={state} />
          </div>
        </>
      )}
    </ActionForm>
  );
}

function OrganizationRoleEditor({
  role,
  permissionOptions,
}: {
  role: { role: string; permissions: string[] };
  permissionOptions: PermissionOption[];
}) {
  const [selectedPermissions, setSelectedPermissions] = useState(role.permissions);
  const permissionAreas = new Set(
    selectedPermissions.map((permission) => permission.split(":")[0]),
  ).size;

  return (
    <details className="group rounded-xl border bg-card">
      <summary
        className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 [&::-webkit-details-marker]:hidden sm:px-5"
        aria-label={`Edit ${formatRole(role.role)} permissions`}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{formatRole(role.role)}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {selectedPermissions.length} permissions across {permissionAreas} areas
          </p>
        </div>
        <Badge variant="secondary">{selectedPermissions.length}</Badge>
        <ChevronDown
          aria-hidden="true"
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="flex flex-col gap-4 border-t px-4 py-5 sm:px-5">
        <ActionForm
          action={updateOrganizationRolePermissions}
          className="flex flex-col gap-4"
        >
          {(state, pending) => (
            <>
              <input type="hidden" name="role" value={role.role} />
              <PermissionCheckboxes
                options={permissionOptions}
                selected={selectedPermissions}
                onSelectedChange={setSelectedPermissions}
                idPrefix={`role-${role.role}`}
              />
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center">
                <Button type="submit" variant="outline" disabled={pending}>
                  {pending ? "Saving…" : "Save changes"}
                </Button>
                <ActionMessage state={state} />
              </div>
            </>
          )}
        </ActionForm>
        <ActionForm action={deleteOrganizationRole}>
          {(state, pending) => (
            <div className="flex flex-wrap items-center gap-3 border-t pt-4">
              <input type="hidden" name="role" value={role.role} />
              <Button type="submit" variant="destructive" size="sm" disabled={pending}>
                {pending ? "Deleting…" : "Delete role"}
              </Button>
              <ActionMessage state={state} />
            </div>
          )}
        </ActionForm>
      </div>
    </details>
  );
}

export function OrganizationManagement({
  organizationName,
  workspaceSlug,
  members,
  invitations,
  teams,
  roles,
  permissionOptions,
}: {
  organizationName: string;
  workspaceSlug: string;
  members: Member[];
  invitations: {
    id: string;
    email: string;
    role: string;
    teamName: string | null;
    expiresAt: Date;
  }[];
  teams: {
    id: string;
    name: string;
    members: { userId: string; name: string; email: string }[];
  }[];
  roles: { role: string; permissions: string[] }[];
  permissionOptions: PermissionOption[];
}) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-8">
      <header className="flex flex-col gap-5 border-b pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Workspace settings</span>
            <span aria-hidden="true">/</span>
            <Badge variant="outline" className="font-normal">{workspaceSlug}</Badge>
          </div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            People & access
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Manage members, teams, and permissions for {organizationName}.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:gap-6">
          <div className="flex items-center gap-2">
            <UsersRound aria-hidden="true" className="text-muted-foreground" />
            <div>
              <p className="font-semibold tabular-nums">{members.length}</p>
              <p className="text-xs text-muted-foreground">Members</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <MailPlus aria-hidden="true" className="text-muted-foreground" />
            <div>
              <p className="font-semibold tabular-nums">{invitations.length}</p>
              <p className="text-xs text-muted-foreground">Invitations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Building2 aria-hidden="true" className="text-muted-foreground" />
            <div>
              <p className="font-semibold tabular-nums">{teams.length}</p>
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="text-muted-foreground" />
            <div>
              <p className="font-semibold tabular-nums">{roles.length + builtInRoles.length + 1}</p>
              <p className="text-xs text-muted-foreground">Roles</p>
            </div>
          </div>
        </div>
      </header>

      <Tabs defaultValue="members" className="gap-5">
        <TabsList aria-label="People and access sections" className="h-auto w-full justify-start">
          <TabsTrigger value="members" className="flex-none gap-2 px-2 py-2 sm:px-4">
            Members
            <Badge variant="secondary">{members.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex-none gap-2 px-2 py-2 sm:px-4">
            Teams
            <Badge variant="secondary">{teams.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex-none gap-2 px-2 py-2 sm:px-4">
            Roles
            <Badge variant="secondary">
              {roles.length + builtInRoles.length + 1}
            </Badge>
          </TabsTrigger>
        </TabsList>

      <TabsContent value="members" className="min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Members</CardTitle>
            <CardDescription>
              Assign organization roles to control CRM access. Teams are for
              organizing people and do not change permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <ActionForm action={inviteOrganizationMember} className="rounded-lg border bg-muted/30 p-4">
              {(state, pending) => (
                <FieldGroup className="gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto] sm:items-end">
                  <Field className="gap-2">
                    <FieldLabel htmlFor="member-invite-email">Invite by email</FieldLabel>
                    <Input
                      id="member-invite-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      placeholder="teammate@company.com"
                      maxLength={254}
                      required
                    />
                  </Field>
                  <Field className="gap-2">
                    <FieldLabel htmlFor="invite-role">Role · CRM access</FieldLabel>
                    <RoleSelect
                      id="invite-role"
                      customRoles={roles}
                      defaultValue="member"
                      ariaLabel="Invitee organization role"
                    />
                  </Field>
                  <Field className="gap-2">
                    <FieldLabel htmlFor="invite-team">Team · optional</FieldLabel>
                    <Select
                      name="teamId"
                      defaultValue="none"
                      disabled={teams.length === 0}
                    >
                      <SelectTrigger id="invite-team" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectItem value="none">No team yet</SelectItem>
                          {teams.map((team) => (
                            <SelectItem key={team.id} value={team.id}>
                              {team.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Button type="submit" disabled={pending} className="sm:mb-px">
                    <MailPlus data-icon="inline-start" />
                    {pending ? "Sending…" : "Send invite"}
                  </Button>
                  <div className="sm:col-span-4">
                    <ActionMessage state={state} />
                  </div>
                  <p className="text-sm text-muted-foreground sm:col-span-4">
                    The role controls CRM access. Team membership is for grouping only.
                  </p>
                </FieldGroup>
              )}
            </ActionForm>

            {members.length ? (
              <Table layout="cards" className="border-separate border-spacing-0">
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Organization role</TableHead>
                    <TableHead>Teams</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => {
                    const currentRole = member.role.split(",")[0]?.trim() ?? "member";
                    const isOwner = member.role.split(",").includes("owner");
                    const availableTeams = teams.filter(
                      (team) => !member.teams.some(({ id }) => id === team.id),
                    );
                    return (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-3">
                            <Avatar>
                              <AvatarFallback>{initials(member.name)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{member.name}</p>
                              <p className="truncate text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isOwner ? (
                            <Badge variant="secondary">
                              <BadgeCheck data-icon="inline-start" />
                              Owner
                            </Badge>
                          ) : (
                            <ActionForm action={updateOrganizationMemberRole}>
                              {(state, pending) => (
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <input type="hidden" name="memberId" value={member.id} />
                                  <RoleSelect
                                    id={`member-role-${member.id}`}
                                    customRoles={roles}
                                    defaultValue={currentRole}
                                    ariaLabel={`Organization role for ${member.name}`}
                                  />
                                  <Button type="submit" variant="outline" size="sm" disabled={pending}>
                                    {pending ? "Saving…" : "Save"}
                                  </Button>
                                  <span className="basis-full">
                                    <ActionMessage state={state} />
                                  </span>
                                </div>
                              )}
                            </ActionForm>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-0 flex-col gap-2">
                            {member.teams.length ? (
                              <div className="flex flex-wrap gap-2">
                                {member.teams.map((team) => (
                                  <div key={team.id} className="flex items-center gap-1">
                                    <Badge variant="outline">{team.name}</Badge>
                                    <ActionForm action={removeOrganizationTeamMember}>
                                      {(state, pending) => (
                                        <div className="flex items-center gap-1">
                                          <input type="hidden" name="teamId" value={team.id} />
                                          <input type="hidden" name="userId" value={member.userId} />
                                          <Button
                                            type="submit"
                                            variant="ghost"
                                            size="icon-xs"
                                            disabled={pending}
                                            aria-label={`Remove ${member.name} from ${team.name}`}
                                          >
                                            <X aria-hidden="true" />
                                          </Button>
                                          <ActionMessage state={state} />
                                        </div>
                                      )}
                                    </ActionForm>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No team</p>
                            )}

                            {availableTeams.length ? (
                              <ActionForm action={addOrganizationTeamMember}>
                                {(state, pending) => (
                                  <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
                                    <input type="hidden" name="userId" value={member.userId} />
                                    <Select
                                      key={availableTeams.map(({ id }) => id).join(":")}
                                      name="teamId"
                                      defaultValue=""
                                      required
                                    >
                                      <SelectTrigger
                                        id={`member-team-${member.id}`}
                                        className="min-w-0 flex-1"
                                        aria-label={`Add ${member.name} to a team`}
                                      >
                                        <SelectValue placeholder="Add to a team" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectGroup>
                                          {availableTeams.map((team) => (
                                            <SelectItem key={team.id} value={team.id}>
                                              {team.name}
                                            </SelectItem>
                                          ))}
                                        </SelectGroup>
                                      </SelectContent>
                                    </Select>
                                    <Button type="submit" variant="outline" size="sm" disabled={pending}>
                                      {pending ? "Adding…" : "Add"}
                                    </Button>
                                    <span className="basis-full">
                                      <ActionMessage state={state} />
                                    </span>
                                  </div>
                                )}
                              </ActionForm>
                            ) : teams.length ? (
                              <p className="text-xs text-muted-foreground">Already in all teams</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Create a team in the Teams tab.</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {!isOwner ? (
                            <ActionForm action={removeOrganizationMember}>
                              {(state, pending) => (
                                <div className="flex items-center justify-end gap-2">
                                  <input type="hidden" name="memberId" value={member.id} />
                                  <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                                    {pending ? "Removing…" : "Remove"}
                                  </Button>
                                  <ActionMessage state={state} />
                                </div>
                              )}
                            </ActionForm>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No active members to show.
              </p>
            )}

            <div className="flex flex-col gap-3 border-t pt-5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Pending invitations</h3>
                  <Badge variant="secondary">{invitations.length}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Invitations expire automatically if they are not accepted.
                </p>
              </div>
              {invitations.length ? (
                <div className="flex flex-col rounded-lg border px-4">
                  {invitations.map((invitation, index) => (
                    <div key={invitation.id}>
                      {index > 0 && <Separator />}
                      <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{invitation.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRole(invitation.role)} · {invitation.teamName ?? "No team"} · expires{" "}
                            {invitation.expiresAt.toLocaleDateString()}
                          </p>
                        </div>
                        <ActionForm action={cancelOrganizationMemberInvitation}>
                          {(state, pending) => (
                            <div className="flex items-center gap-2">
                              <input type="hidden" name="invitationId" value={invitation.id} />
                              <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                                {pending ? "Canceling…" : "Cancel"}
                              </Button>
                              <ActionMessage state={state} />
                            </div>
                          )}
                        </ActionForm>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  No pending invitations.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="teams" className="min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            <CardDescription>
              Group members for easier organization. Team membership does not
              grant or change CRM permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <ActionForm action={createOrganizationTeam} className="rounded-lg border bg-muted/30 p-4">
              {(state, pending) => (
                <>
                  <FieldGroup className="gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                    <Field className="gap-2">
                      <FieldLabel htmlFor="new-team-name">New team</FieldLabel>
                      <Input id="new-team-name" name="name" maxLength={80} required placeholder="e.g. Sales" />
                    </Field>
                    <Button type="submit" disabled={pending}>
                      {pending ? "Creating…" : "Create team"}
                    </Button>
                    <div className="sm:col-span-2">
                      <ActionMessage state={state} />
                    </div>
                  </FieldGroup>
                </>
              )}
            </ActionForm>
            {teams.length ? (
              <div className="grid gap-4 lg:grid-cols-2">
                {teams.map((team) => (
                  <Card key={team.id} className="shadow-none">
                    <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base">{team.name}</CardTitle>
                        <CardDescription>
                          {team.members.length} {team.members.length === 1 ? "member" : "members"}
                        </CardDescription>
                      </div>
                      <ActionForm action={removeOrganizationTeam}>
                        {(state, pending) => (
                          <div className="flex flex-col items-end gap-1">
                            <input type="hidden" name="teamId" value={team.id} />
                            <Button type="submit" variant="ghost" size="sm" disabled={pending}>
                              {pending ? "Removing…" : "Delete"}
                            </Button>
                            <ActionMessage state={state} />
                          </div>
                        )}
                      </ActionForm>
                    </CardHeader>
                    <CardContent className="flex flex-col gap-4">
                      <ActionForm action={updateOrganizationTeam} className="flex items-end gap-2">
                        {(state, pending) => (
                          <>
                            <input type="hidden" name="teamId" value={team.id} />
                            <FieldGroup className="flex-1 gap-2">
                              <Field className="gap-2">
                                <FieldLabel htmlFor={`team-name-${team.id}`}>Team name</FieldLabel>
                                <Input
                                  id={`team-name-${team.id}`}
                                  name="name"
                                  defaultValue={team.name}
                                  maxLength={80}
                                  required
                                />
                              </Field>
                            </FieldGroup>
                            <Button type="submit" variant="outline" size="sm" disabled={pending}>
                              {pending ? "Saving…" : "Save"}
                            </Button>
                            <ActionMessage state={state} />
                          </>
                        )}
                      </ActionForm>
                      {team.members.length ? (
                        <div className="flex flex-wrap gap-2">
                          {team.members.slice(0, 5).map((member) => (
                            <Badge key={member.userId} variant="outline">{member.name}</Badge>
                          ))}
                          {team.members.length > 5 ? (
                            <Badge variant="secondary">+{team.members.length - 5}</Badge>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No members in this team yet.</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No teams yet. Create a team above, then assign members from the Members tab.
              </p>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="roles" className="min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Roles & permissions</CardTitle>
            <CardDescription>
              Give each job the access it needs. Members without a specific
              role stay on the basic Member permissions.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-8">
            <CreateOrganizationRoleForm permissionOptions={permissionOptions} />

            <section className="flex flex-col gap-4" aria-labelledby="custom-roles-heading">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 id="custom-roles-heading" className="font-semibold">
                    Custom roles
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Open a role to review or change its permissions.
                  </p>
                </div>
                <Badge variant="outline">
                  {roles.length} {roles.length === 1 ? "role" : "roles"}
                </Badge>
              </div>
              {roles.length ? (
                <div className="flex flex-col gap-3">
                {roles.map((role) => (
                    <OrganizationRoleEditor
                      key={role.role}
                      role={role}
                      permissionOptions={permissionOptions}
                    />
                ))}
              </div>
              ) : (
                <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  No custom roles yet. Start with a preset above or create one
                  from scratch.
                </p>
              )}
            </section>

            <section className="flex flex-col gap-4" aria-labelledby="built-in-roles-heading">
              <div>
                <h3 id="built-in-roles-heading" className="font-semibold">
                  Built-in roles
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  These roles are managed by the workspace and can’t be edited here.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border bg-muted/20 p-4">
                  <Badge variant="secondary">Owner</Badge>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Full workspace control, including organization ownership.
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <Badge variant="secondary">Admin</Badge>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Manages members, teams, roles, and workspace operations.
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-4">
                  <Badge variant="secondary">Member · default</Badge>
                  <p className="mt-3 text-sm text-muted-foreground">
                    Basic access for personal attendance, leave, salary, and
                    assigned work. Dashboard access stays with Owner and Admin.
                  </p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>
      </TabsContent>
      </Tabs>
    </main>
  );
}
