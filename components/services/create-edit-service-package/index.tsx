"use client";
import * as z from "zod";
import { servicePackageSchema } from "@/lib/schemas/service-package";
import { BillingCycle } from "@/app/generated/prisma/enums";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    useForm,
    Controller,
    useFieldArray,
    FormProvider,
    useFormContext,
    useWatch
} from "react-hook-form";
import { motion } from "motion/react";
import { Check, Plus, Trash2, GripVertical, Calculator } from "lucide-react";

import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    KeyboardSensor,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
    useSortable,
    sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
    Field,
    FieldGroup,
    FieldLabel,
    FieldError,
    FieldSeparator,
} from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { createServicePackage, editServicePackage, getServicePackage } from "@/actions/services";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

const SortableItem = dynamic(
    () => import("@/components/sortable-items"),
    {
        ssr: false,
    }
);
type ServicePackageSchema = z.infer<typeof servicePackageSchema>;

/* ------------------------------------------------------------------ */
/* Sortable Item Wrapper - Flex layout for cleaner drag handle        */
/* ------------------------------------------------------------------ */
// function SortableItem({
//     id,
//     children,
// }: {
//     id: string;
//     children: React.ReactNode;
// }) {
//     const {
//         attributes,
//         listeners,
//         setNodeRef,
//         transform,
//         transition,
//         isDragging,
//     } = useSortable({ id });

//     const style = {
//         transform: CSS.Transform.toString(transform),
//         transition,
//     };

//     return (
//         <div
//             ref={setNodeRef}
//             style={style}
//             className={`flex items-stretch border rounded-lg bg-card shadow-sm overflow-hidden group ${isDragging ? "ring-2 ring-primary opacity-60 z-50 relative" : ""
//                 }`}
//         >
//             {/* Dedicated Drag Handle Sidebar */}
//             <div
//                 className="flex items-center justify-center w-12 bg-muted/30 border-r cursor-grab touch-none hover:bg-muted/60 transition-colors"
//                 {...attributes}
//                 {...listeners}
//                 aria-label="Drag to reorder"
//             >
//                 <GripVertical className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
//             </div>

//             {/* Content Area */}
//             <div className="flex-1 p-4 md:p-6 bg-background">
//                 {children}
//             </div>
//         </div>
//     );
// }

/* ------------------------------------------------------------------ */
/* Live Preview Sidebar Component                                     */
/* ------------------------------------------------------------------ */
function LivePreviewSidebar() {
    const { control } = useFormContext<ServicePackageSchema>();

    // useWatch efficiently subscribes to the items array without re-rendering the whole parent form
    const items = useWatch({
        control,
        name: "items",
        defaultValue: [],
    });

    const totalPrice = items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unitPrice) || 0;
        return sum + qty * price;
    }, 0);

    return (
        <div className="sticky top-6 border rounded-lg bg-card shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold tracking-tight">Live Preview</h2>
            </div>
            <FieldSeparator />

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {items.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No items added.</p>
                ) : (
                    items.map((item, index) => {
                        const qty = Number(item.quantity) || 0;
                        const price = Number(item.unitPrice) || 0;
                        const itemTotal = qty * price;

                        return (
                            <div key={index} className="flex flex-col gap-1 text-sm">
                                <div className="flex justify-between items-start">
                                    <span className="font-medium line-clamp-1 pr-2">
                                        {item.name || "Unnamed Item"}
                                    </span>
                                    <span className="font-medium whitespace-nowrap">
                                        ${itemTotal.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-muted-foreground text-xs">
                                    <span>
                                        {qty} {item.unit || "unit(s)"} × ${price.toFixed(2)}
                                    </span>
                                    <span>{item.billingCycle}</span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <FieldSeparator />

            <div className="flex items-center justify-between pt-2">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-2xl font-bold text-primary">
                    ${totalPrice.toFixed(2)}
                </span>
            </div>
            <p className="text-xs text-muted-foreground text-right">
                *Excludes applicable taxes
            </p>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Main Form                                                          */
/* ------------------------------------------------------------------ */
export function CreateEditServicePackageForm({ serviceId, defaultValues }: { serviceId: string, defaultValues?: Extract<Awaited<ReturnType<typeof getServicePackage>>, { success: true }>['data'] }) {
    const router = useRouter();
    const form = useForm<ServicePackageSchema>({
        resolver: zodResolver(servicePackageSchema),
        defaultValues: {
            id: defaultValues?.id ?? undefined,
            serviceId,

            name: defaultValues?.name ?? "",
            description: defaultValues?.description ?? "",

            isActive: defaultValues?.isActive ?? true,
            isPopular: defaultValues?.isPopular ?? false,

            items:
                defaultValues?.items
                    ?.sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                    .map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        description: item.description ?? "",
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        unit: item.unit,
                        billingCycle: item.billingCycle,
                        sortOrder: item.sortOrder
                    })) ?? [],

            features:
                defaultValues?.features
                    ?.sort((a: any, b: any) => a.sortOrder - b.sortOrder)
                    .map((feature: any) => ({
                        id: feature.id,
                        name: feature.content,
                        sortOrder: feature.sortOrder,
                    })) ?? [],
        },
    });

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        control,
        setValue,
        getValues,
        watch,
        reset
    } = form;

    const {
        fields: itemFields,
        append: appendItem,
        remove: removeItem,
        move: moveItem,
    } = useFieldArray({
        control,
        name: "items",
    });

    const {
        fields: featureFields,
        append: appendFeature,
        remove: removeFeature,
        move: moveFeature,
    } = useFieldArray({
        control,
        name: "features",
    });

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEndItems = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const activeIndex = itemFields.findIndex((item) => item.id === active.id);
            const overIndex = itemFields.findIndex((item) => item.id === over.id);
            moveItem(activeIndex, overIndex);
            const updatedItems = getValues("items");
            updatedItems.forEach((_, idx) => setValue(`items.${idx}.sortOrder`, idx));
        }
    };

    const handleDragEndFeatures = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const activeFeatureIndex = featureFields.findIndex((feature) => feature.id === active.id);
            const overFeatureIndex = featureFields.findIndex((feature) => feature.id === over.id);
            moveFeature(activeFeatureIndex, overFeatureIndex);
            const updatedFeatures = getValues("features");
            updatedFeatures.forEach((_, idx) => setValue(`features.${idx}.sortOrder`, idx));
        }
    };

    const onSubmit = async (data: ServicePackageSchema) => {
        try {
            const res = data.id ? await editServicePackage(data.id, data) : await createServicePackage(data)

            if (!res.success) {
                if ('error' in res && res.error) {
                    throw res.error
                } else {
                    toast.error(res.message || "Something went wrong", {
                        id: "submit-error",
                    });
                }
            } else {
                toast.success(res.message || "Package created successfully", {
                    id: "submit-success",
                });
            }

            !data.id && reset();
            router.push(`/dashboard/services/packages?serviceId=${serviceId}`)
        } catch (error) {
            // handle error
            if (error instanceof z.ZodError) {
                const fieldErrors: Record<string, string[]> = {};

                error.issues.forEach((issue) => {
                    const fieldPath = issue.path.join(".");

                    if (!fieldErrors[fieldPath]) {
                        fieldErrors[fieldPath] = [];
                    }

                    fieldErrors[fieldPath]?.push(issue.message);
                });
                Object.entries(fieldErrors).forEach(([path, messages]) => {
                    messages.forEach((message) => {
                        toast.error(`${path}: ${message}`, {
                            id: `${path}-${message}`,
                        });
                    });
                });
            } else {
                toast.error(error instanceof Error ? error.message : typeof error === "string" ? error : "Something went wrong", {
                    id: "submit-error",
                });
            }
        }
    };


    return (
        <FormProvider {...form}>
            <form
                onSubmit={handleSubmit(onSubmit)}
                className="w-full max-w-6xl mx-auto pb-12"
            >
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Form Area (Left Column) */}
                    <div className="lg:col-span-2 space-y-8">
                        <Controller
                            name="serviceId"
                            control={control}
                            render={({ field }) => <input type="hidden" {...field} />}
                        />

                        {/* ========== General Information Section ========== */}
                        <div className="border rounded-lg bg-card shadow-sm p-6 space-y-6">
                            <div>
                                <h2 className="text-xl font-semibold tracking-tight">General Information</h2>
                                <p className="text-sm text-muted-foreground mt-1">Configure the basic details of this service package.</p>
                            </div>
                            <FieldSeparator />

                            <div className="space-y-4">
                                <Controller
                                    name="name"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                            <FieldLabel htmlFor="name">Package Name</FieldLabel>
                                            <Input {...field} id="name" placeholder="e.g. Pro Tier, Enterprise, Basic" className="max-w-md" />
                                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                        </Field>
                                    )}
                                />

                                <Controller
                                    name="description"
                                    control={control}
                                    render={({ field, fieldState }) => (
                                        <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                            <FieldLabel htmlFor="description">Description</FieldLabel>
                                            <Textarea {...field} id="description" placeholder="Briefly describe what this package includes..." className="min-h-[100px]" />
                                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                        </Field>
                                    )}
                                />

                                <div className="flex flex-col sm:flex-row sm:items-center gap-6 pt-2">
                                    <Controller
                                        name="isPopular"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox id="isPopular" checked={!!field.value} onCheckedChange={(checked) =>
                                                        field.onChange(checked === true)
                                                    } />
                                                    <FieldLabel htmlFor="isPopular" className="cursor-pointer">Highlight as Popular</FieldLabel>
                                                </div>
                                            </Field>
                                        )}
                                    />

                                    <Controller
                                        name="isActive"
                                        control={control}
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox id="isActive" checked={!!field.value} onCheckedChange={(checked) =>
                                                        field.onChange(checked === true)
                                                    } />
                                                    <FieldLabel htmlFor="isActive" className="cursor-pointer">Active / Visible</FieldLabel>
                                                </div>
                                            </Field>
                                        )}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* ========== Package Items Section ========== */}
                        <div className="border rounded-lg bg-card shadow-sm p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold tracking-tight">Included Items</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Add and reorder the specific line items for this package.</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        appendItem({
                                            name: "",
                                            description: "",
                                            quantity: 1,
                                            unitPrice: 0,
                                            unit: "",
                                            billingCycle: "MONTHLY",
                                            sortOrder: itemFields.length,
                                        })
                                    }
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add Item
                                </Button>
                            </div>
                            <FieldSeparator />

                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndItems}>
                                <SortableContext items={itemFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-4">
                                        {itemFields.length === 0 && (
                                            <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                                No items added yet. Click "Add Item" to start.
                                            </div>
                                        )}
                                        {itemFields.map((item, index) => (
                                            <SortableItem key={item.id} id={item.id}>
                                                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

                                                    {/* Row 1: Name & Billing Cycle */}
                                                    <div className="md:col-span-8">
                                                        <Controller
                                                            name={`items.${index}.name`}
                                                            control={control}
                                                            render={({ field, fieldState }) => (
                                                                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                                                    <FieldLabel>Item Name</FieldLabel>
                                                                    <Input {...field} placeholder="e.g. Cloud Storage, User Seats" />
                                                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                                                </Field>
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="md:col-span-4">
                                                        <Controller
                                                            name={`items.${index}.billingCycle`}
                                                            control={control}
                                                            render={({ field, fieldState }) => {
                                                                const options = Object.values(BillingCycle).map((c) => ({
                                                                    label: c.charAt(0) + c.slice(1).toLowerCase(),
                                                                    value: c,
                                                                }));
                                                                return (
                                                                    <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                                                        <FieldLabel>Billing Cycle</FieldLabel>
                                                                        <Select value={field.value} onValueChange={field.onChange}>
                                                                            <SelectTrigger>
                                                                                <SelectValue placeholder="Select cycle" />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                {options.map((o) => (
                                                                                    <SelectItem key={o.value} value={o.value}>
                                                                                        {o.label}
                                                                                    </SelectItem>
                                                                                ))}
                                                                            </SelectContent>
                                                                        </Select>
                                                                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                                                    </Field>
                                                                );
                                                            }}
                                                        />
                                                    </div>

                                                    {/* Row 2: Description */}
                                                    <div className="md:col-span-12">
                                                        <Controller
                                                            name={`items.${index}.description`}
                                                            control={control}
                                                            render={({ field, fieldState }) => (
                                                                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                                                    <FieldLabel>Description</FieldLabel>
                                                                    <Textarea {...field} placeholder="Details about this item..." className="h-20" />
                                                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                                                </Field>
                                                            )}
                                                        />
                                                    </div>

                                                    {/* Row 3: Numbers & Units */}
                                                    <div className="md:col-span-4">
                                                        <Controller
                                                            name={`items.${index}.quantity`}
                                                            control={control}
                                                            render={({ field, fieldState }) => (
                                                                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                                                    <FieldLabel>Quantity</FieldLabel>
                                                                    <Input
                                                                        {...field}
                                                                        type="number"
                                                                        min={1}
                                                                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                                                        placeholder="1"
                                                                    />
                                                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                                                </Field>
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="md:col-span-4">
                                                        <Controller
                                                            name={`items.${index}.unitPrice`}
                                                            control={control}
                                                            render={({ field, fieldState }) => (
                                                                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                                                    <FieldLabel>Unit Price ($)</FieldLabel>
                                                                    <Input
                                                                        {...field}
                                                                        type="number"
                                                                        step="0.01"
                                                                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                                                                        placeholder="0.00"
                                                                    />
                                                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                                                </Field>
                                                            )}
                                                        />
                                                    </div>

                                                    <div className="md:col-span-4">
                                                        <Controller
                                                            name={`items.${index}.unit`}
                                                            control={control}
                                                            render={({ field, fieldState }) => (
                                                                <Field data-invalid={fieldState.invalid} className="gap-1.5">
                                                                    <FieldLabel>Unit Type</FieldLabel>
                                                                    <Input {...field} placeholder="e.g. users, GB, hrs" />
                                                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                                                </Field>
                                                            )}
                                                        />
                                                    </div>

                                                    {/* Footer / Remove Action */}
                                                    {itemFields.length > 1 && (
                                                        <div className="md:col-span-12 flex justify-end mt-2 pt-4 border-t border-dashed">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                                size="sm"
                                                                onClick={() => removeItem(index)}
                                                            >
                                                                <Trash2 className="h-4 w-4 mr-2" /> Remove Item
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </SortableItem>
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>

                        {/* ========== Package Features Section ========== */}
                        <div className="border rounded-lg bg-card shadow-sm p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold tracking-tight">Marketing Features</h2>
                                    <p className="text-sm text-muted-foreground mt-1">Short bullet points to display on the pricing card.</p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        appendFeature({
                                            name: "",
                                            sortOrder: featureFields.length,
                                        })
                                    }
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Add Feature
                                </Button>
                            </div>
                            <FieldSeparator />

                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndFeatures}>
                                <SortableContext items={featureFields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-3">
                                        {featureFields.length === 0 && (
                                            <div className="text-center py-6 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                                No features added. Click "Add Feature" to create a bullet point.
                                            </div>
                                        )}
                                        {featureFields.map((feature, index) => (
                                            <SortableItem key={feature.id} id={feature.id}>
                                                <div className="flex items-start sm:items-center flex-col sm:flex-row gap-4">
                                                    <div className="flex-1 w-full">
                                                        <Controller
                                                            name={`features.${index}.name`}
                                                            control={control}
                                                            render={({ field, fieldState }) => (
                                                                <Field data-invalid={fieldState.invalid} className="w-full">
                                                                    <Input {...field} placeholder="e.g. 24/7 Priority Support" className="bg-background" />
                                                                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                                                                </Field>
                                                            )}
                                                        />
                                                    </div>
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="icon"
                                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                                                        onClick={() => removeFeature(index)}
                                                        aria-label="Remove feature"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </SortableItem>
                                        ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        </div>

                        {/* ========== Submit Action ========== */}
                        <div className="flex items-center justify-end border-t pt-6">
                            <Button disabled={isSubmitting} size="lg" className="w-full sm:w-auto min-w-[200px]">
                                {isSubmitting ? defaultValues?.id ? "Updating Package..." : "Saving Package..." : defaultValues?.id ? "Update Service Package" : "Save Service Package"}
                            </Button>
                        </div>

                    </div>

                    {/* Right Sidebar Area */}
                    <div className="lg:col-span-1">
                        <LivePreviewSidebar />
                    </div>

                </div>
            </form>
        </FormProvider>
    );
}   