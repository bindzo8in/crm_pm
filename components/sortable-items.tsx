import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
export default function SortableItem({
    id,
    children,
}: {
    id: string;
    children: React.ReactNode;
}) {
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
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={`flex items-stretch border rounded-lg bg-card shadow-sm overflow-hidden group ${isDragging ? "ring-2 ring-primary opacity-60 z-50 relative" : ""
                }`}
        >
            {/* Dedicated Drag Handle Sidebar */}
            <div
                className="flex items-center justify-center w-12 bg-muted/30 border-r cursor-grab touch-none hover:bg-muted/60 transition-colors"
                {...attributes}
                {...listeners}
                aria-label="Drag to reorder"
            >
                <GripVertical className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>

            {/* Content Area */}
            <div className="flex-1 p-4 md:p-6 bg-background">
                {children}
            </div>
        </div>
    );
}