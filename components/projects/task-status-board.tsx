"use client";

import * as React from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  CircleCheck,
  CircleDashed,
  CircleX,
  Clock3,
  GripVertical,
  type LucideIcon,
} from "lucide-react";
import type { TaskStatusGroup } from "@/lib/task-status";
import { Button } from "@/components/ui/button";

type BoardTask = {
  id: string;
  title: string;
  status: string;
};

const groupIcons: Record<TaskStatusGroup, LucideIcon> = {
  NOT_STARTED: CircleDashed,
  ACTIVE: Clock3,
  DONE: CircleCheck,
  CLOSED: CircleX,
};

const boardCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
};

export function TaskStatusBoard<T extends BoardTask>({
  items,
  statuses,
  statusLabels,
  statusGroups,
  columnForTask,
  canMove,
  onMove,
  renderTask,
}: {
  items: readonly T[];
  statuses: readonly string[];
  statusLabels: Readonly<Record<string, string>>;
  statusGroups: Readonly<Record<string, TaskStatusGroup>>;
  columnForTask?: (task: T) => string;
  canMove: (task: T) => boolean;
  onMove: (taskId: string, status: string) => void;
  renderTask: (task: T, dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const getColumn = columnForTask ?? ((task: T) => task.status);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    if (!event.over || typeof event.over.id !== "string") return;
    const task = items.find(({ id }) => id === event.active.id);
    const nextStatus = statuses.find((status) => status === event.over?.id);
    if (!task || !canMove(task) || !nextStatus || nextStatus === getColumn(task)) return;
    onMove(task.id, nextStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={boardCollisionDetection}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Press Space to pick up a task, use the arrow keys to choose a status, then press Space to move it. Press Escape to cancel.",
        },
      }}
    >
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-3">
        {statuses.map((status) => (
          <TaskStatusColumn
            key={status}
            status={status}
            label={statusLabels[status]}
            group={statusGroups[status]}
            items={items.filter((task) => getColumn(task) === status)}
            canMove={canMove}
            renderTask={renderTask}
          />
        ))}
      </div>
    </DndContext>
  );
}

function TaskStatusColumn<T extends BoardTask>({
  status,
  label,
  group,
  items,
  canMove,
  renderTask,
}: {
  status: string;
  label: string;
  group: TaskStatusGroup;
  items: readonly T[];
  canMove: (task: T) => boolean;
  renderTask: (task: T, dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: status });
  const StatusIcon = groupIcons[group];

  return (
    <section
      ref={setNodeRef}
      aria-label={`${label} tasks`}
      className={`w-[min(84vw,21rem)] shrink-0 snap-start rounded-lg border p-3 transition-colors sm:w-80 ${
        isOver ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-muted/30"
      }`}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <StatusIcon aria-hidden="true" className="size-4 text-muted-foreground" />
          {label}
        </h2>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums text-muted-foreground">
          {items.length}
        </span>
      </header>
      <div className="min-h-24 space-y-2">
        {items.length > 0 ? (
          items.map((task) => (
            <DraggableTask
              key={task.id}
              task={task}
              canMove={canMove(task)}
              renderTask={renderTask}
            />
          ))
        ) : (
          <p className="rounded-md border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">
            No tasks
          </p>
        )}
      </div>
    </section>
  );
}

function DraggableTask<T extends BoardTask>({
  task,
  canMove,
  renderTask,
}: {
  task: T;
  canMove: boolean;
  renderTask: (task: T, dragHandle: React.ReactNode) => React.ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: task.id, disabled: !canMove });

  const dragHandle = canMove ? (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="touch-none cursor-grab text-muted-foreground active:cursor-grabbing"
      aria-label={`Move ${task.title} to another status`}
      title="Drag to change status"
      {...attributes}
      {...listeners}
    >
      <GripVertical aria-hidden="true" />
    </Button>
  ) : null;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
      }}
      className={isDragging ? "relative z-10 opacity-60" : undefined}
    >
      {renderTask(task, dragHandle)}
    </div>
  );
}
