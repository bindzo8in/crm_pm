"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, GripVertical } from "lucide-react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from "@dnd-kit/core";
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { termSchema, TermSchema } from "@/lib/schemas/term-schema";

// Custom Field components (as per your sample)
import {
    Field,
    FieldContent,
    FieldLabel,
    FieldError,
    FieldSeparator,
} from "@/components/ui/field";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { CreateTerm, EditTerm, GetTerm } from "@/actions/terms";

// =============================================================================
// 1. Sortable Table Row
// =============================================================================
interface SortableTableRowProps {
    id: string;
    children: React.ReactNode;
}

function SortableTableRow({ id, children }: SortableTableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        ...(isDragging ? { position: "relative" as const, zIndex: 50, opacity: 0.8, backgroundColor: "var(--background)" } : {}),
    };

    return (
        <TableRow ref={setNodeRef} style={style}>
            <TableCell className="w-[40px] pr-0 text-center align-middle">
                <button
                    type="button"
                    {...attributes}
                    {...listeners}
                    className="cursor-grab hover:bg-muted p-1 rounded inline-flex items-center justify-center"
                >
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                </button>
            </TableCell>
            {children}
        </TableRow>
    );
}

// =============================================================================
// 2. Main Form Component
// =============================================================================
interface ProposalTermFormProps {
    initialData?: Extract<Awaited<ReturnType<typeof GetTerm>>, { success: true }>['data'];
    activeServices?: { id: string; name: string }[];
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ProposalTermForm({
    initialData,
    activeServices = [],
    onSuccess,
    onCancel,
}: ProposalTermFormProps) {
    const router = useRouter();
    const form = useForm<TermSchema>({
        resolver: zodResolver(termSchema),
        defaultValues: {
            id: initialData?.id || undefined,
            title: initialData?.title || "",
            services: initialData?.services || activeServices.map((svc, idx) => ({
                serviceId: svc.id,
                serviceName: svc.name,
                include: false,
                isRequired: false,
                disabled: false,
                sortOrder: idx
            })),
            content: initialData?.content ? initialData.content : {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                    },
                ],
            },
            isActive: initialData?.isActive ?? true,
            isDefault: initialData?.isDefault ?? false,
        },
    });

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        getValues,
        formState: { isSubmitting, errors },
    } = form;
    console.log(errors)
    const { fields, move } = useFieldArray({
        control,
        name: "services",
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = fields.findIndex((f) => f.id === active.id);
            const newIndex = fields.findIndex((f) => f.id === over.id);
            move(oldIndex, newIndex);

            setTimeout(() => {
                const currentServices = getValues("services");
                currentServices.forEach((_, idx) => {
                    setValue(`services.${idx}.sortOrder`, idx);
                });
            }, 0);
        }
    };

    const watchedServices = watch("services");

    // Handle include checkbox change: disable required if include is false
    const handleIncludeChange = (index: number, checked: boolean) => {
        setValue(`services.${index}.include`, checked);
        if (!checked) {
            setValue(`services.${index}.isRequired`, false);
        }
    };

    const onSubmit = handleSubmit(async (data) => {
        try {
            const res = initialData?.id ?
                await EditTerm(data) :
                await CreateTerm(data);
            if (!res.success) {
                if (Array.isArray(res.error)) {
                    res.error.forEach((issue) => {
                        form.setError(
                            issue.path[0] as keyof TermSchema,
                            {
                                type: "server",
                                message: issue.message,
                            }
                        );
                    });
                } else {
                    toast.error(
                        String(res.error ?? res.message)
                    );
                }

                return;
            }

            toast.success(res.message);

            form.reset();
            router.push("/dashboard/terms");
        } catch (error) {
            console.error(error)
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Something went wrong"
            );
        }
    });

    return (
        <form onSubmit={onSubmit} className="max-w-[900px] mx-auto p-2 sm:p-5 md:p-8 w-full rounded-md border">
            {/* Header */}
            <h1 className="mt-6 mb-1 font-extrabold text-3xl tracking-tight">
                {initialData?.id ? "Edit Proposal Term" : "Create Proposal Term"}
            </h1>
            <FieldSeparator className="my-4 w-full" />

            {/* ============================================================
          CARD 1 — Basic Information
          ============================================================ */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Title */}
                    <Controller
                        name="title"
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="gap-1">
                                <FieldLabel htmlFor="title">Proposal Term Title *</FieldLabel>
                                <Input
                                    {...field}
                                    id="title"
                                    type="text"
                                    placeholder="e.g., Payment Terms, Source Code Ownership, SEO Disclaimer"
                                    aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                        )}
                    />

                    {/* Services Table */}
                    <div>
                        <FieldLabel className="mb-2 block">Applicable Services</FieldLabel>
                        <div className="border rounded-md overflow-x-auto">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40px]"></TableHead>
                                            <TableHead className="min-w-[180px]">Service</TableHead>
                                            <TableHead className="text-center">Include</TableHead>
                                            <TableHead className="text-center">Required</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <SortableContext
                                            items={fields.map((f) => f.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {fields.map((field, index) => {
                                                const service = watchedServices[index];
                                                const isDisabled = service?.disabled || false;
                                                const isIncluded = service?.include || false;

                                                return (
                                                    <SortableTableRow key={field.id} id={field.id}>
                                                        <TableCell className="font-medium">
                                                            {service?.serviceName}
                                                            {isDisabled && (
                                                                <span className="ml-2 text-xs text-muted-foreground">
                                                                    (disabled)
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Controller
                                                                name={`services.${index}.include`}
                                                                control={control}
                                                                render={({ field: checkboxField }) => (
                                                                    <Checkbox
                                                                        checked={checkboxField.value}
                                                                        onCheckedChange={(checked) => {
                                                                            checkboxField.onChange(checked);
                                                                            handleIncludeChange(index, !!checked);
                                                                        }}
                                                                        disabled={isDisabled}
                                                                        aria-label={`Include ${service?.serviceName}`}
                                                                    />
                                                                )}
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-center">
                                                            <Controller
                                                                name={`services.${index}.isRequired`}
                                                                control={control}
                                                                render={({ field: checkboxField }) => (
                                                                    <Checkbox
                                                                        checked={checkboxField.value}
                                                                        onCheckedChange={checkboxField.onChange}
                                                                        disabled={!isIncluded || isDisabled}
                                                                        aria-label={`Required for ${service?.serviceName}`}
                                                                    />
                                                                )}
                                                            />
                                                        </TableCell>
                                                    </SortableTableRow>
                                                );
                                            })}
                                        </SortableContext>
                                    </TableBody>
                                </Table>
                            </DndContext>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Select which services this term applies to. Required is only available when Include is checked.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {/* ============================================================
          CARD 2 — Content
          ============================================================ */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Content</CardTitle>
                </CardHeader>
                <CardContent>
                    <Controller
                        name="content"
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="gap-1">
                                <RichTextEditor value={field.value} onChange={field.onChange} />
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                            </Field>
                        )}
                    />
                </CardContent>
            </Card>

            {/* ============================================================
          CARD 3 — Settings
          ============================================================ */}
            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Active Switch */}
                    <Controller
                        name="isActive"
                        control={control}
                        render={({ field }) => (
                            <Field orientation="horizontal" className="items-center">
                                <FieldContent className="flex flex-row items-center gap-3">
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id="isActive"
                                    />
                                    <div>
                                        <FieldLabel htmlFor="isActive" className="text-base">
                                            Active
                                        </FieldLabel>
                                        <p className="text-sm text-muted-foreground">
                                            This term can be selected while creating proposals.
                                        </p>
                                    </div>
                                </FieldContent>
                            </Field>
                        )}
                    />

                    {/* Default Switch */}
                    <Controller
                        name="isDefault"
                        control={control}
                        render={({ field }) => (
                            <Field orientation="horizontal" className="items-center">
                                <FieldContent className="flex flex-row items-center gap-3">
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        id="isDefault"
                                    />
                                    <div>
                                        <FieldLabel htmlFor="isDefault" className="text-base">
                                            Default Term
                                        </FieldLabel>
                                        <p className="text-sm text-muted-foreground">
                                            Automatically include this term in every proposal regardless of the selected services.
                                        </p>
                                    </div>
                                </FieldContent>
                            </Field>
                        )}
                    />
                </CardContent>
            </Card>

            {/* ============================================================
          Footer
          ============================================================ */}
            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel || (() => router.back())}
                    disabled={isSubmitting}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                        </>
                    ) : initialData?.id ? (
                        "Update Term"
                    ) : (
                        "Save Term"
                    )}
                </Button>
            </div>
        </form>
    );
}