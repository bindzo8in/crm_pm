"use client"

import { useEffect } from "react"
import { EditorContent, useEditor, EditorContext } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image as ImageExtension } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"
import { Table } from "@tiptap/extension-table"
import TableRow from "@tiptap/extension-table-row"
import TableCell from "@tiptap/extension-table-cell"
import TableHeader from "@tiptap/extension-table-header"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import { PageBreak } from "@/components/tiptap-node/page-break-node/page-break-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"
import "@/components/tiptap-node/table-node/table-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { TableDropdownMenu } from "@/components/tiptap-ui/table-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import { ColorHighlightPopover } from "@/components/tiptap-ui/color-highlight-popover"
import { LinkPopover } from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

// --- UI Primitives ---
import { Toolbar, ToolbarGroup, ToolbarSeparator } from "@/components/tiptap-ui-primitive/toolbar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"
import { cn } from "@/lib/utils"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

export interface RichTextEditorProps {
  value?: Record<string, any>
  onChange?: (value: Record<string, any>) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

export function RichTextEditor({ value, onChange, disabled, className, placeholder }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": placeholder || "Rich text editor",
        class: "focus:outline-none min-h-[150px] p-4 tiptap ProseMirror",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      PageBreak,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      ImageExtension,
      Typography,
      Superscript,
      Subscript,
      Selection,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const json = JSON.parse(JSON.stringify(editor.getJSON()))
      onChange?.(json)
    },
  })

  useEffect(() => {
    if (!editor || value === undefined) return
    const currentJSON = editor.getJSON()
    if (JSON.stringify(value) !== JSON.stringify(currentJSON)) {
      editor.commands.setContent(value)
    }
  }, [editor, value])

  return (
    <div className={cn("flex flex-col border border-input rounded-md overflow-hidden focus-within:ring-1 focus-within:ring-ring focus-within:border-primary bg-background w-full", className)}>
      <EditorContext.Provider value={{ editor }}>
        <ScrollArea className="border-b border-border bg-muted/40 w-full" type="auto">
          <Toolbar className="flex w-max items-center gap-1 p-1 static! border-none! bg-transparent! min-h-10">
            <ToolbarGroup>
              <UndoRedoButton action="undo" />
              <UndoRedoButton action="redo" />
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
              <ListDropdownMenu modal={false} types={["bulletList", "orderedList", "taskList"]} />
              <TableDropdownMenu modal={false} />
              <BlockquoteButton />
              <CodeBlockButton />
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <MarkButton type="bold" />
              <MarkButton type="italic" />
              <MarkButton type="strike" />
              <MarkButton type="code" />
              <MarkButton type="underline" />
              <ColorHighlightPopover />
              <LinkPopover />
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <MarkButton type="superscript" />
              <MarkButton type="subscript" />
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <TextAlignButton align="left" />
              <TextAlignButton align="center" />
              <TextAlignButton align="right" />
              <TextAlignButton align="justify" />
            </ToolbarGroup>
            <ToolbarSeparator />
            <ToolbarGroup>
              <ImageUploadButton text="Add" />
            </ToolbarGroup>
          </Toolbar>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <EditorContent
          editor={editor}
          role="presentation"
          className="flex-1 cursor-text overflow-y-auto max-h-[500px] w-full"
          onClick={() => editor?.commands.focus()}
        />
      </EditorContext.Provider>
    </div>
  )
}
