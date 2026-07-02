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
import { Trash, Edit, Star } from "lucide-react";
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
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Bank Accounts</h2>
                    <p className="text-muted-foreground">Manage your company bank accounts.</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button>Add Bank Account</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add Bank Account</DialogTitle>
                        </DialogHeader>
                        <BankAccountForm onSuccess={() => setIsCreateOpen(false)} />
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md">
                <table className="w-full text-sm text-left">
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
                                        checked={account.isActive}
                                        onCheckedChange={(checked) => toggleStatus({ id: account.id, isActive: checked })}
                                    />
                                </td>
                                <td className="p-3">
                                    {account.isDefault ? (
                                        <Badge variant="default">Default</Badge>
                                    ) : (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setDefault(account.id)}
                                        >
                                            Set Default
                                        </Button>
                                    )}
                                </td>
                                <td className="p-3 text-right">
                                    <div className="flex justify-end gap-2">
                                        <Dialog 
                                            open={editingAccount?.id === account.id} 
                                            onOpenChange={(open) => !open && setEditingAccount(null)}
                                        >
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onClick={() => setEditingAccount(account)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
                                            onClick={() => {
                                                if (confirm("Are you sure you want to delete this bank account?")) {
                                                    deleteAccount(account.id);
                                                }
                                            }}
                                        >
                                            <Trash className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {accounts.length === 0 && (
                            <tr>
                                <td colSpan={7} className="p-6 text-center text-muted-foreground">
                                    No bank accounts found. Add one to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
