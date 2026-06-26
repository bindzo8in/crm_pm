"use client";

import { useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// shadcn/ui components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

// Custom Field components (as per your sample)
import {
    Field,
    FieldGroup,
    FieldContent,
    FieldLabel,
    FieldError,
    FieldSeparator,
} from "@/components/ui/field";
import { RichTextEditor } from "@/components/ui/rich-text-editor";

// =============================================================================
// 1. Zod Schema
// =============================================================================
const serviceSchema = z.object({
    serviceId: z.string(),
    serviceName: z.string(),
    include: z.boolean(),
    isRequired: z.boolean(),
    disabled: z.boolean(),
});

const formSchema = z.object({
    title: z.string().min(1, "Proposal term title is required"),
    services: z.array(serviceSchema),
    content: z.any(),
    isActive: z.boolean(),
    isDefault: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;


// =============================================================================
// 3. Tiptap Toolbar Button
// =============================================================================
interface ToolbarButtonProps {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    label?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    onClick,
    active,
    disabled,
    children,
    label,
}) => (
    <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={`
      p-1.5 rounded text-sm transition-colors
      ${active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }
      ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}
    `}
        aria-label={label}
        title={label}
    >
        {children}
    </button>
);

// =============================================================================
// 4. Tiptap Editor Component (controlled via react-hook-form)
// =============================================================================
// interface RichTextEditorProps {
//   value: string;
//   onChange: (value: string) => void;
// }

// const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange }) => {
//   const editor = useEditor({
//     extensions: [
//       StarterKit,
//       Underline,
//       Link.configure({ openOnClick: false }),
//       TableExtension.configure({ resizable: true }),
//       TableRowExtension,
//       TableCellExtension,
//       TableHeaderExtension,
//     ],
//     content: value,
//     onUpdate: ({ editor }) => {
//       onChange(editor.getHTML());
//     },
//   });

//   // Update editor content when external value changes (e.g., reset)
//   useEffect(() => {
//     if (editor && value !== editor.getHTML()) {
//       editor.commands.setContent(value);
//     }
//   }, [value, editor]);

//   if (!editor) return <div className="border rounded-md p-4">Loading editor...</div>;

//   const toggleHeading = (level: 1 | 2) => {
//     editor.chain().focus().toggleHeading({ level }).run();
//   };

//   const toggleList = (type: "bullet" | "ordered") => {
//     if (type === "bullet") {
//       editor.chain().focus().toggleBulletList().run();
//     } else {
//       editor.chain().focus().toggleOrderedList().run();
//     }
//   };

//   const setLink = () => {
//     const url = window.prompt("Enter URL:");
//     if (url) {
//       editor.chain().focus().setLink({ href: url }).run();
//     }
//   };

//   const insertTable = () => {
//     editor
//       .chain()
//       .focus()
//       .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
//       .run();
//   };

//   return (
//     <div className="border rounded-md overflow-hidden">
//       {/* Toolbar */}
//       <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b bg-muted/30">
//         <ToolbarButton
//           onClick={() => editor.chain().focus().toggleBold().run()}
//           active={editor.isActive("bold")}
//           label="Bold"
//         >
//           <Bold className="h-4 w-4" />
//         </ToolbarButton>

//         <ToolbarButton
//           onClick={() => editor.chain().focus().toggleItalic().run()}
//           active={editor.isActive("italic")}
//           label="Italic"
//         >
//           <Italic className="h-4 w-4" />
//         </ToolbarButton>

//         <ToolbarButton
//           onClick={() => editor.chain().focus().toggleUnderline().run()}
//           active={editor.isActive("underline")}
//           label="Underline"
//         >
//           <UnderlineIcon className="h-4 w-4" />
//         </ToolbarButton>

//         <span className="w-px h-6 bg-border mx-1" />

//         <ToolbarButton
//           onClick={() => toggleHeading(1)}
//           active={editor.isActive("heading", { level: 1 })}
//           label="Heading 1"
//         >
//           <Heading1 className="h-4 w-4" />
//         </ToolbarButton>

//         <ToolbarButton
//           onClick={() => toggleHeading(2)}
//           active={editor.isActive("heading", { level: 2 })}
//           label="Heading 2"
//         >
//           <Heading2 className="h-4 w-4" />
//         </ToolbarButton>

//         <span className="w-px h-6 bg-border mx-1" />

//         <ToolbarButton
//           onClick={() => toggleList("bullet")}
//           active={editor.isActive("bulletList")}
//           label="Bullet List"
//         >
//           <List className="h-4 w-4" />
//         </ToolbarButton>

//         <ToolbarButton
//           onClick={() => toggleList("ordered")}
//           active={editor.isActive("orderedList")}
//           label="Ordered List"
//         >
//           <ListOrdered className="h-4 w-4" />
//         </ToolbarButton>

//         <span className="w-px h-6 bg-border mx-1" />

//         <ToolbarButton onClick={insertTable} label="Insert Table">
//           <TableIcon className="h-4 w-4" />
//         </ToolbarButton>

//         <ToolbarButton onClick={setLink} label="Add Link">
//           <LinkIcon className="h-4 w-4" />
//         </ToolbarButton>

//         <span className="w-px h-6 bg-border mx-1" />

//         <ToolbarButton
//           onClick={() => editor.chain().focus().undo().run()}
//           disabled={!editor.can().undo()}
//           label="Undo"
//         >
//           <Undo className="h-4 w-4" />
//         </ToolbarButton>

//         <ToolbarButton
//           onClick={() => editor.chain().focus().redo().run()}
//           disabled={!editor.can().redo()}
//           label="Redo"
//         >
//           <Redo className="h-4 w-4" />
//         </ToolbarButton>
//       </div>

//       {/* Editor Content */}
//       <div className="prose prose-sm max-w-none p-4 min-h-[280px] focus:outline-none">
//         <EditorContent editor={editor} />
//       </div>
//     </div>
//   );
// };

// =============================================================================
// 5. Main Form Component
// =============================================================================
interface ProposalTermFormProps {
    initialData?: Partial<FormValues> & { id?: string };
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

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: initialData?.title || "",
            services: initialData?.services || activeServices.map(svc => ({
                serviceId: svc.id,
                serviceName: svc.name,
                include: false,
                isRequired: false,
                disabled: false
            })),
            content: initialData?.content ? initialData.content : {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                    },
                ],
            },
            isActive: initialData?.isActive,
            isDefault: initialData?.isDefault,
        },
    });

    const {
        control,
        handleSubmit,
        watch,
        setValue,
        formState: { isSubmitting, errors },
    } = form;

    const { fields } = useFieldArray({
        control,
        name: "services",
    });

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
            // Simulate API call - replace with your actual mutation
            console.log("Submitting proposal term:", data);
            await new Promise((resolve) => setTimeout(resolve, 1000));

            toast.success(
                initialData?.id ? "Proposal term updated successfully" : "Proposal term created successfully"
            );

            if (onSuccess) onSuccess();
            router.push("/dashboard/proposal-terms");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Something went wrong"
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
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="min-w-[180px]">Service</TableHead>
                                        <TableHead className="text-center">Include</TableHead>
                                        <TableHead className="text-center">Required</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => {
                                        const service = watchedServices[index];
                                        const isDisabled = service?.disabled || false;
                                        const isIncluded = service?.include || false;

                                        return (
                                            <TableRow key={field.id}>
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
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
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