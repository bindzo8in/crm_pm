"use client"

import { forwardRef, useCallback, useState, type ForwardedRef } from "react"
import { type Editor } from "@tiptap/react"

// --- Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"

// --- Icons ---
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon"
import { TableIcon } from "@/components/tiptap-icons/table-icon"
import {
  Table as TableIconLucide,
  ArrowLeftToLine,
  ArrowRightToLine,
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  Combine,
  Split,
  PanelTop,
  PanelLeft,
} from "lucide-react"

// --- UI Primitives ---
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuGroup,
  DropdownMenuSeparator,
} from "@/components/tiptap-ui-primitive/dropdown-menu"

export interface TableDropdownMenuProps extends Omit<ButtonProps, "type"> {
  editor?: Editor
  modal?: boolean
  onOpenChange?: (isOpen: boolean) => void
}

function TableDropdownMenuImpl(
  {
    editor: providedEditor,
    modal = true,
    onOpenChange,
    ...props
  }: TableDropdownMenuProps,
  ref: ForwardedRef<HTMLButtonElement>
) {
  const { editor } = useTiptapEditor(providedEditor)
  const [isOpen, setIsOpen] = useState(false)

  const handleOnOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open)
      onOpenChange?.(open)
    },
    [onOpenChange]
  )

  if (!editor) {
    return null
  }

  const isActive = editor.isActive("table")
  const canInsertTable = editor.can().insertTable()

  return (
    <DropdownMenu modal={modal} open={isOpen} onOpenChange={handleOnOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          data-active-state={isActive ? "on" : "off"}
          role="button"
          tabIndex={-1}
          disabled={!canInsertTable && !isActive}
          aria-label="Table options"
          tooltip="Table"
          {...props}
          ref={ref}
        >
          <TableIcon className="tiptap-button-icon" />
          <ChevronDownIcon className="tiptap-button-dropdown-small" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          {!isActive && (
            <DropdownMenuItem
              className="flex items-center"
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                  .run()
              }
            >
              <TableIconLucide className="mr-2 h-4 w-4" />
              Insert Table
            </DropdownMenuItem>
          )}
          {isActive && (
            <>
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => editor.chain().focus().addColumnBefore().run()}
              >
                <ArrowLeftToLine className="mr-2 h-4 w-4" />
                Add Column Before
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
              >
                <ArrowRightToLine className="mr-2 h-4 w-4" />
                Add Column After
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => editor.chain().focus().deleteColumn().run()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => editor.chain().focus().addRowBefore().run()}
              >
                <ArrowUpToLine className="mr-2 h-4 w-4" />
                Add Row Before
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => editor.chain().focus().addRowAfter().run()}
              >
                <ArrowDownToLine className="mr-2 h-4 w-4" />
                Add Row After
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => editor.chain().focus().deleteRow().run()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Row
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => editor.chain().focus().mergeCells().run()}
              >
                <Combine className="mr-2 h-4 w-4" />
                Merge Cells
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => editor.chain().focus().splitCell().run()}
              >
                <Split className="mr-2 h-4 w-4" />
                Split Cell
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => editor.chain().focus().toggleHeaderRow().run()}
              >
                <PanelTop className="mr-2 h-4 w-4" />
                Toggle Header Row
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center"
                onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
              >
                <PanelLeft className="mr-2 h-4 w-4" />
                Toggle Header Column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="flex items-center text-red-500 focus:text-red-500"
                onClick={() => editor.chain().focus().deleteTable().run()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Table
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export const TableDropdownMenu = forwardRef(TableDropdownMenuImpl)

TableDropdownMenu.displayName = "TableDropdownMenu"
