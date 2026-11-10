"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BankAccountForm } from "./bank-account-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DeleteBankAccount, SetDefaultBankAccount, ToggleBankAccountStatus, GetBankAccounts } from "@/actions/bank-accounts";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Building2, Edit, Plus, Search, Trash } from "lucide-react";
import { CompanyBankAccount } from "@/app/generated/prisma/client";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { PaginationControls } from "@/components/ui/pagination-controls";

interface BankAccountPageInfo {
    page: number;
    pageSize: number;
    search: string;
    totalCount: number;
}

export function BankAccountsClient({
    data: initialData,
    initialPagination,
}: {
    data: CompanyBankAccount[];
    initialPagination: BankAccountPageInfo;
}) {
    const queryClient = useQueryClient();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<CompanyBankAccount | null>(null);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState(initialPagination.search);
    const [page, setPage] = useState(initialPagination.page);
    const [pageSize, setPageSize] = useState(initialPagination.pageSize);

    useEffect(() => {
        const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const accountsQuery = useQuery({
        queryKey: ["bankAccounts", page, pageSize, debouncedSearch],
        queryFn: async () => {
            const result = await GetBankAccounts({ page, pageSize, search: debouncedSearch });
            if (!result.success) throw new Error(result.message || "Could not load bank accounts.");
            return result;
        },
        initialData:
            page === initialPagination.page &&
            pageSize === initialPagination.pageSize &&
            debouncedSearch === initialPagination.search
                ? {
                    success: true as const,
                    data: initialData,
                    pagination: {
                        page: initialPagination.page,
                        pageSize: initialPagination.pageSize,
                        totalCount: initialPagination.totalCount,
                        totalPages: Math.ceil(initialPagination.totalCount / initialPagination.pageSize),
                    },
                }
                : undefined,
        placeholderData: (previousData) => previousData,
    });

    const accounts = accountsQuery.data?.data ?? initialData;
    const totalCount = accountsQuery.data?.pagination.totalCount ?? initialPagination.totalCount;

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

            <ConfirmDialog
                trigger={
                    <Button
                        variant="destructive"
                        size="icon"
                        aria-label={`Delete ${account.accountName}`}
                    >
                        <Trash className="h-4 w-4" />
                    </Button>
                }
                title="Delete bank account?"
                description={`Delete ${account.accountName}?`}
                confirmLabel="Delete account"
                onConfirm={() => deleteAccount(account.id)}
            />
        </div>
    );

    const { mutate: deleteAccount } = useMutation({
        mutationFn: DeleteBankAccount,
        onSuccess: (ctx) => {
            if(ctx.error) {
                toast.error(ctx.message);
            } else {
                toast.success(ctx.message);
                setPage(0);
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
                <div className="min-w-0">
                    <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Bank Accounts</h2>
                    <p className="text-muted-foreground">
                        Manage your company bank accounts. {totalCount} total {totalCount === 1 ? "account" : "accounts"}.
                    </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <div className="relative w-full sm:w-64">
                        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            type="search"
                            value={search}
                            onChange={(event) => {
                                setPage(0);
                                setSearch(event.target.value);
                            }}
                            aria-label="Search bank accounts"
                            placeholder="Search bank accounts"
                            className="h-10 pl-9"
                        />
                    </div>
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="w-full sm:w-auto">
                            <Plus className="size-4" />
                            Add Bank Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add Bank Account</DialogTitle>
                        </DialogHeader>
                        <BankAccountForm onSuccess={() => setIsCreateOpen(false)} />
                    </DialogContent>
                    </Dialog>
                </div>
            </div>

            {accountsQuery.isError ? (
                <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-5 py-6 text-sm text-destructive">
                    {accountsQuery.error.message}
                </div>
            ) : accounts.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-card px-5 py-10 text-center sm:px-8">
                    <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Building2 className="size-5" />
                    </div>
                    <h3 className="font-semibold">{search ? "No matching bank accounts" : "No bank accounts yet"}</h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                        {search
                            ? "Try another account name or bank."
                            : "Add a company account to include payment details on invoices."}
                    </p>
                    {!search && <Button className="mt-5" onClick={() => setIsCreateOpen(true)}>
                        <Plus className="size-4" />
                        Add Bank Account
                    </Button>}
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

                    <div className="hidden rounded-md border lg:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Account Name</TableHead>
                                    <TableHead>Bank</TableHead>
                                    <TableHead>Account Number</TableHead>
                                    <TableHead>IFSC</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Default</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {accounts.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell>{account.accountName}</TableCell>
                                        <TableCell>{account.bankName}</TableCell>
                                        <TableCell className="font-mono">
                                            {account.accountNumber.replace(/.(?=.{4})/g, '*')}
                                        </TableCell>
                                        <TableCell>{account.ifscCode}</TableCell>
                                        <TableCell>
                                            <Switch
                                                aria-label={`${account.isActive ? "Deactivate" : "Activate"} ${account.accountName}`}
                                                checked={account.isActive}
                                                onCheckedChange={(checked) => toggleStatus({ id: account.id, isActive: checked })}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {account.isDefault ? (
                                                <Badge variant="default">Default</Badge>
                                            ) : (
                                                <Button variant="ghost" size="sm" onClick={() => setDefault(account.id)}>
                                                    Set Default
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell>{renderAccountActions(account)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}
            {totalCount > 0 && (
                <div className="mt-4 overflow-hidden rounded-xl border bg-card">
                    <PaginationControls
                        page={page}
                        pageSize={pageSize}
                        total={totalCount}
                        onPageChange={setPage}
                        onPageSizeChange={(nextPageSize) => {
                            setPageSize(nextPageSize);
                            setPage(0);
                        }}
                    />
                </div>
            )}
        </div>
    );
}
