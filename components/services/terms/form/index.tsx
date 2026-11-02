"use client";

import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, GripVertical, FileText, PackageOpen, Settings2 } from "lucide-react";
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
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// shadcn/ui components
import { Button } from "@/components/ui/button";
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
    FieldLabel,
    FieldError,
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
    activePackages?: { id: string; name: string }[];
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function ProposalTermForm({
    initialData,
    activePackages = [],
    onSuccess,
    onCancel,
}: ProposalTermFormProps) {
    const router = useRouter();
    const form = useForm<TermSchema>({
        resolver: zodResolver(termSchema),
        defaultValues: {
            id: initialData?.id || undefined,
            title: initialData?.title || "",
            packages: activePackages.map((pkg, idx) => {
                const existingPkg = initialData?.packages?.find(p => p.packageId === pkg.id);
                return {
                    packageId: pkg.id,
                    packageName: pkg.name,
                    include: !!existingPkg,
                    isRequired: !!existingPkg?.isRequired,
                    disabled: false,
                    sortOrder: existingPkg?.sortOrder ?? idx
                };
            }).sort((a, b) => a.sortOrder - b.sortOrder),
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
        formState: { isSubmitting },
    } = form;
    const { fields, move } = useFieldArray({
        control,
        name: "packages",
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
                const currentPackages = getValues("packages");
                currentPackages.forEach((_, idx) => {
                    setValue(`packages.${idx}.sortOrder`, idx);
                });
            }, 0);
        }
    };

    const watchedPackages = watch("packages");

    // Handle include checkbox change: disable required if include is false
    const handleIncludeChange = (index: number, checked: boolean) => {
        setValue(`packages.${index}.include`, checked);
        if (!checked) {
            setValue(`packages.${index}.isRequired`, false);
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
        <form onSubmit={onSubmit} className="w-full">
            <header className="mb-8 border-b border-border pb-6">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {initialData?.id ? "Edit proposal term" : "Create proposal term"}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
                    Write reusable terms for your proposals, choose which packages they apply to, and set how they are used.
                </p>
            </header>

            <section aria-labelledby="term-details-heading" className="grid gap-8 border-b border-border pb-8 lg:grid-cols-[minmax(11rem,0.6fr)_minmax(0,2fr)]">
                <div className="flex gap-3">
                    <FileText aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                        <h2 id="term-details-heading" className="text-base font-semibold">Term details</h2>
                        <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                            Give this clause a clear name so your team can find it when preparing a proposal.
                        </p>
                    </div>
                </div>
                <div className="space-y-7">
                    <Controller
                        name="title"
                        control={control}
                        render={({ field, fieldState }) => (
                            <Field data-invalid={fieldState.invalid} className="gap-2">
                                <FieldLabel htmlFor="title">Term name <span className="text-destructive">*</span></FieldLabel>
                                <Input
                                    {...field}
                                    id="title"
                                    type="text"
                                    placeholder="e.g. Payment schedule"
                                    aria-invalid={fieldState.invalid}
                                    aria-describedby={fieldState.invalid ? "term-title-error" : "term-title-hint"}
                                    className="h-11 max-w-2xl"
                                />
                                <p id="term-title-hint" className="text-xs text-muted-foreground">
                                    Use a short label, such as payment terms or ownership.
                                </p>
                                {fieldState.invalid && (
                                    <FieldError id="term-title-error" errors={[fieldState.error]} />
                                )}
                            </Field>
                        )}
                    />

                </div>
            </section>

            <section aria-labelledby="term-packages-heading" className="border-b border-border py-8">
                <div className="mb-4 flex gap-3">
                    <PackageOpen aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                        <h2 id="term-packages-heading" className="text-base font-semibold">Applicable packages</h2>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                            Choose where this term appears. Mark it required when the client must accept it.
                        </p>
                    </div>
                </div>
                {fields.length > 0 ? (
                    <div className="border-y border-border">
                        <DndContext
                            id="proposal-term-packages"
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <Table className="table-fixed">
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-12" aria-label="Reorder" />
                                        <TableHead>Package</TableHead>
                                        <TableHead className="w-28 text-center">Include</TableHead>
                                        <TableHead className="w-28 text-center">Required</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <SortableContext
                                        items={fields.map((item) => item.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {fields.map((field, index) => {
                                            const pkg = watchedPackages[index];
                                            const isDisabled = pkg?.disabled || false;
                                            const isIncluded = pkg?.include || false;

                                            return (
                                                <SortableTableRow key={field.id} id={field.id}>
                                                    <TableCell>
                                                        <span className="block truncate font-medium" title={pkg?.packageName}>
                                                            {pkg?.packageName}
                                                        </span>
                                                        {isDisabled && (
                                                            <span className="text-xs text-muted-foreground">
                                                                Unavailable
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Controller
                                                            name={`packages.${index}.include`}
                                                            control={control}
                                                            render={({ field: checkboxField }) => (
                                                                <Checkbox
                                                                    checked={checkboxField.value}
                                                                    onCheckedChange={(checked) => {
                                                                        checkboxField.onChange(checked);
                                                                        handleIncludeChange(index, !!checked);
                                                                    }}
                                                                    disabled={isDisabled}
                                                                    aria-label={`Include ${pkg?.packageName}`}
                                                                />
                                                            )}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Controller
                                                            name={`packages.${index}.isRequired`}
                                                            control={control}
                                                            render={({ field: checkboxField }) => (
                                                                <Checkbox
                                                                    checked={checkboxField.value}
                                                                    onCheckedChange={checkboxField.onChange}
                                                                    disabled={!isIncluded || isDisabled}
                                                                    aria-label={`Require ${pkg?.packageName}`}
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
                ) : (
                    <div className="flex items-start gap-3 border-y border-border py-5 text-sm">
                        <PackageOpen aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                        <p className="text-muted-foreground">
                            No active packages are available. You can still create this term and apply it to proposals as a default.
                        </p>
                    </div>
                )}
            </section>

            <section aria-labelledby="term-content-heading" className="border-b border-border py-8">
                <div className="mb-4 flex gap-3">
                    <FileText aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                        <h2 id="term-content-heading" className="text-base font-semibold">Term content</h2>
                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                            Write the clause as it should appear to the client. Use the toolbar to format text, add links, or insert a table.
                        </p>
                    </div>
                </div>
                <Controller
                    name="content"
                    control={control}
                    render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid} className="gap-2">
                            <RichTextEditor
                                value={field.value}
                                onChange={field.onChange}
                                uploadScope="terms"
                                className="rounded-lg [&_.tiptap]:min-h-[320px] [&_.tiptap]:p-6"
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                    )}
                />
            </section>

            <section aria-labelledby="term-settings-heading" className="grid gap-8 border-b border-border py-8 lg:grid-cols-[minmax(11rem,0.6fr)_minmax(0,2fr)]">
                <div className="flex gap-3">
                    <Settings2 aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                    <div>
                        <h2 id="term-settings-heading" className="text-base font-semibold">Usage settings</h2>
                        <p className="mt-1 max-w-sm text-sm leading-5 text-muted-foreground">
                            Control whether this term is available and when proposals include it automatically.
                        </p>
                    </div>
                </div>
                <div className="divide-y divide-border">
                    <Controller
                        name="isActive"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center justify-between gap-6 py-4 first:pt-0">
                                <div className="space-y-1">
                                    <FieldLabel htmlFor="isActive">Available for proposals</FieldLabel>
                                    <p className="text-sm text-muted-foreground">
                                        Turn off to keep this term saved without offering it to your team.
                                    </p>
                                </div>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    id="isActive"
                                    aria-label="Available for proposals"
                                />
                            </div>
                        )}
                    />
                    <Controller
                        name="isDefault"
                        control={control}
                        render={({ field }) => (
                            <div className="flex items-center justify-between gap-6 py-4 last:pb-0">
                                <div className="space-y-1">
                                    <FieldLabel htmlFor="isDefault">Include by default</FieldLabel>
                                    <p className="max-w-2xl text-sm text-muted-foreground">
                                        Add this term to every proposal automatically, regardless of the selected packages.
                                    </p>
                                </div>
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    id="isDefault"
                                    aria-label="Include by default"
                                />
                            </div>
                        )}
                    />
                </div>
            </section>

            <footer className="flex flex-col-reverse gap-3 py-6 sm:flex-row sm:justify-end">
                <Button
                    type="button"
                    variant="outline"
                    onClick={onCancel || (() => router.back())}
                    disabled={isSubmitting}
                    className="sm:min-w-28"
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="sm:min-w-36">
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 size-4 animate-spin" />
                            Saving term...
                        </>
                    ) : initialData?.id ? (
                        "Save changes"
                    ) : (
                        "Create term"
                    )}
                </Button>
            </footer>
        </form>
    );
}