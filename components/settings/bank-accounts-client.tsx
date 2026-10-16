"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BankAccountForm } from "./bank-account-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeleteBankAccount, SetDefaultBankAccount, ToggleBankAccountStatus, GetBankAccounts } from "@/actions/bank-accounts";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Building2, Edit, Plus, Trash } from "lucide-react";
import { CompanyBankAccount } from "@/app/generated/prisma/client";

export function BankAccountsClient({ data: initialData }: { data: CompanyBankAccount[] }) {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<CompanyBankAccount | null>(null);

    const { data: response } = useQuery({
        queryKey: ["bankAccounts"],
        queryFn: () => GetBankAccounts(),
        initialData: { success: true, data: initialData }
    });

    const accounts = response?.success && response.data ? response.data : initialData;

    const renderAccountActions = (account: CompanyBankAccount) => (
        <div className="flex items-center justify-end gap-2">
            <Dialog
                open={editingAccount?.id === account.id}
                onOpenChange={(open) => !open && setEditingAccount(null)}
            >
                <DialogTrigger asChild>
                    <Button
                        variant="outline"
                        size="icon"
                        aria-label={`Edit ${account.accountName}`}
                        onClick={() => setEditingAccount(account)}
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Bank Account</DialogTitle>
                    </DialogHeader>
                    {editingAccount?.id === account.id && (
                        <BankAccountForm
                            defaultValues={account}
                            onSuccess={() => setEditingAccount(null)}
                        />
                    )}
                </DialogContent>
            </Dialog>

            <Button
                variant="destructive"
                size="icon"
                aria-label={`Delete ${account.accountName}`}
                onClick={() => {
                    if (confirm("Are you sure you want to delete this bank account?")) {
                        deleteAccount(account.id);
                    }
                }}
            >
                <Trash className="h-4 w-4" />
            </Button>
        </div>
    );

    const { mutate: deleteAccount } = useMutation({
        mutationFn: DeleteBankAccount,
        onSuccess: (ctx) => {
            if(ctx.error) {
                toast.error(ctx.message);
            } else {
                toast.success(ctx.message);
                queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
            }
        },
        onError: () => toast.error("An error occurred")
    });

    const { mutate: setDefault } = useMutation({
        mutationFn: SetDefaultBankAccount,
        onSuccess: (ctx) => {
            if(ctx.error) {
                toast.error(ctx.message);
            } else {
                toast.success(ctx.message);
                queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
            }
        },
        onError: () => toast.error("An error occurred")
    });

    const { mutate: toggleStatus } = useMutation({
        mutationFn: ({ id, isActive }: { id: string, isActive: boolean }) => ToggleBankAccountStatus(id, isActive),
        onSuccess: (ctx) => {
            if(ctx.error) {
                toast.error(ctx.message);
            } else {
                toast.success(ctx.message);
                queryClient.invalidateQueries({ queryKey: ["bankAccounts"] });
            }
        },
        onError: () => toast.error("An error occurred")
    });

    return (
        <div className="w-full">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Bank Accounts</h2>
                    <p className="text-muted-foreground">Manage your company bank accounts.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    {accounts.length > 0 && (
                        <DialogTrigger asChild>
                            <Button className="w-full sm:w-auto">
                                <Plus className="size-4" />
                                Add Bank Account
                            </Button>
                        </DialogTrigger>
                    )}
                    <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add Bank Account</DialogTitle>
                        </DialogHeader>
                        <BankAccountForm onSuccess={() => setIsCreateOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>

            {accounts.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-card px-5 py-10 text-center sm:px-8">
                    <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Building2 className="size-5" />
                    </div>
                    <h3 className="font-semibold">No bank accounts yet</h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                        Add a company account to include payment details on invoices.
                    </p>
                    <Button className="mt-5" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="size-4" />
                        Add Bank Account
                    </Button>
                </div>
            ) : (
                <>
                    <div className="grid gap-3 lg:hidden">
                        {accounts.map((account) => (
                            <article key={account.id} className="rounded-xl border bg-card p-4 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="break-words font-semibold">{account.accountName}</h3>
                                        <p className="mt-0.5 text-sm text-muted-foreground">{account.bankName}</p>
                                    </div>
                                    {account.isDefault && <Badge className="shrink-0">Default</Badge>}
                                </div>
                                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                                    <div className="min-w-0">
                                        <dt className="text-xs text-muted-foreground">Account number</dt>
                                        <dd className="mt-1 break-all font-mono">
                                            {account.accountNumber.replace(/.(?=.{4})/g, '*')}
                                        </dd>
                                    </div>
                                    <div className="min-w-0">
                                        <dt className="text-xs text-muted-foreground">IFSC</dt>
                                        <dd className="mt-1 break-all">{account.ifscCode}</dd>
                                    </div>
                                </dl>
                                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                                    <label className="flex items-center gap-2 text-sm">
                                        <Switch
                                            aria-label={`${account.isActive ? "Deactivate" : "Activate"} ${account.accountName}`}
                                            checked={account.isActive}
                                            onCheckedChange={(checked) => toggleStatus({ id: account.id, isActive: checked })}
                                        />
                                        {account.isActive ? "Active" : "Inactive"}
                                    </label>
                                    <div className="flex items-center gap-2">
                                        {!account.isDefault && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setDefault(account.id)}
                                            >
                                                Set default
                                            </Button>
                                        )}
                                        {renderAccountActions(account)}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>

                    <div className="hidden overflow-x-auto rounded-md border lg:block">
                        <table className="w-full min-w-[780px] text-left text-sm">
                            <thead className="bg-muted text-muted-foreground">
                                <tr>
                                    <th className="p-3 font-medium">Account Name</th>
                                    <th className="p-3 font-medium">Bank</th>
                                    <th className="p-3 font-medium">Account Number</th>
                                    <th className="p-3 font-medium">IFSC</th>
                                    <th className="p-3 font-medium">Status</th>
                                    <th className="p-3 font-medium">Default</th>
                                    <th className="p-3 font-medium text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {accounts.map((account) => (
                                    <tr key={account.id} className="border-t">
                                        <td className="p-3">{account.accountName}</td>
                                        <td className="p-3">{account.bankName}</td>
                                        <td className="p-3 font-mono">
                                            {account.accountNumber.replace(/.(?=.{4})/g, '*')}
                                        </td>
                                        <td className="p-3">{account.ifscCode}</td>
                                        <td className="p-3">
                                            <Switch
                                                aria-label={`${account.isActive ? "Deactivate" : "Activate"} ${account.accountName}`}
                                                checked={account.isActive}
                                                onCheckedChange={(checked) => toggleStatus({ id: account.id, isActive: checked })}
                                            />
                                        </td>
                                        <td className="p-3">
                                            {account.isDefault ? (
                                                <Badge variant="default">Default</Badge>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => setDefault(account.id)}>
                                                    Set Default
                                                </Button>
                                            )}
                                        </td>
                                        <td className="p-3">{renderAccountActions(account)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
