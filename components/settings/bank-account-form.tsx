"use client";

import * as z from "zod";
import { bankAccountSchema, BankAccountFormValues } from "@/lib/schemas/bank-account";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldError,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CreateBankAccount, UpdateBankAccount } from "@/actions/bank-accounts";
import { toast } from "sonner";
import { ImageUpload } from "@/components/ui/image-upload";
import { Switch } from "@/components/ui/switch";

export function BankAccountForm({ defaultValues, onSuccess }: { defaultValues?: any, onSuccess: () => void }) {
    const queryClient = useQueryClient();
    const isEdit = !!defaultValues?.id;

    const form = useForm({
        resolver: zodResolver(bankAccountSchema),
        defaultValues: {
            accountName: defaultValues?.accountName || "",
            bankName: defaultValues?.bankName || "",
            branch: defaultValues?.branch || "",
            accountNumber: defaultValues?.accountNumber || "",
            ifscCode: defaultValues?.ifscCode || "",
            swiftCode: defaultValues?.swiftCode || "",
            accountType: defaultValues?.accountType || "",
            upiId: defaultValues?.upiId || "",
            qrCodeImage: defaultValues?.qrCodeImage || null,
            isDefault: defaultValues?.isDefault || false,
            isActive: defaultValues?.isActive !== undefined ? defaultValues.isActive : true,
            displayOrder: defaultValues?.displayOrder || 0,
        },
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (data: BankAccountFormValues) => isEdit ? UpdateBankAccount(defaultValues.id as string, data) : CreateBankAccount(data),
        onSuccess: (ctx) => {
            if(ctx.error) {
                toast.error(ctx.message)
            } else {
                toast.success(ctx.message)
                queryClient.invalidateQueries({ queryKey: ["bankAccounts"] })
                onSuccess()
            }
        },
        onError: (ctx: any) => {
            toast.error(ctx.message || "An error occurred")
        }
    })

    const handleSubmit = form.handleSubmit((data: any) => {
        mutate(data)
    });

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <FieldGroup className="grid md:grid-cols-2 gap-4">
                <Controller
                    name="accountName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-1">
                            <FieldLabel htmlFor="accountName">Account Name</FieldLabel>
                            <Input {...field} id="accountName" placeholder="e.g. Acme Corp Operations" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="bankName"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-1">
                            <FieldLabel htmlFor="bankName">Bank Name</FieldLabel>
                            <Input {...field} id="bankName" placeholder="e.g. HDFC Bank" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="accountNumber"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-1">
                            <FieldLabel htmlFor="accountNumber">Account Number</FieldLabel>
                            <Input {...field} id="accountNumber" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="ifscCode"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-1">
                            <FieldLabel htmlFor="ifscCode">IFSC Code</FieldLabel>
                            <Input {...field} id="ifscCode" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="branch"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-1">
                            <FieldLabel htmlFor="branch">Branch</FieldLabel>
                            <Input {...field} value={field.value || ""} id="branch" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="swiftCode"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-1">
                            <FieldLabel htmlFor="swiftCode">SWIFT Code</FieldLabel>
                            <Input {...field} value={field.value || ""} id="swiftCode" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="accountType"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-1">
                            <FieldLabel htmlFor="accountType">Account Type</FieldLabel>
                            <Input {...field} value={field.value || ""} id="accountType" placeholder="e.g. Current, Savings" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="upiId"
                    control={form.control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-1 col-span-full md:col-span-1">
                            <FieldLabel htmlFor="upiId">UPI ID</FieldLabel>
                            <Input {...field} value={field.value || ""} id="upiId" />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />

                <Controller
                    name="qrCodeImage"
                    control={form.control}
                    render={({ field }) => (
                        <Field className="gap-1 col-span-full">
                            <FieldLabel>QR Code Image</FieldLabel>
                            <ImageUpload
                                value={field.value || null}
                                onChange={field.onChange}
                                disabled={isPending}
                            />
                        </Field>
                    )}
                />
            </FieldGroup>

            <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
                <Button disabled={isPending}>
                    {isPending ? "Saving..." : isEdit ? "Update Account" : "Create Account"}
                </Button>
            </div>
        </form>
    );
}
