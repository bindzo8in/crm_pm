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

const groupColors: Record<TaskStatusGroup, string> = {
  NOT_STARTED: "#64748b",
  ACTIVE: "#2563eb",
  DONE: "#16a34a",
  CLOSED: "#71717a",
};

const boardCollisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  return pointerCollisions.length > 0 ? pointerCollisions : closestCenter(args);
};

export function TaskStatusBoard<T extends BoardTask>({
  id,
  items,
  statuses,
  statusLabels,
  statusGroups,
  statusColors,
  columnForTask,
  layout = "board",
  canMove,
  onMove,
  renderTask,
}: {
  id: string;
  items: readonly T[];
  statuses: readonly string[];
  statusLabels: Readonly<Record<string, string>>;
  statusGroups: Readonly<Record<string, TaskStatusGroup>>;
  statusColors?: Readonly<Record<string, string>>;
  columnForTask?: (task: T) => string;
  layout?: "board" | "list";
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
      id={id}
      sensors={sensors}
      collisionDetection={boardCollisionDetection}
      onDragEnd={handleDragEnd}
      accessibility={{
        screenReaderInstructions: {
          draggable: "Press Space to pick up a task, use the arrow keys to choose a status group, then press Space to move it. Press Escape to cancel.",
        },
      }}
    >
      {layout === "list" ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          {statuses.map((status) => (
            <TaskStatusListGroup
              key={status}
              status={status}
              label={statusLabels[status]}
              group={statusGroups[status]}
              color={statusColors?.[status] ?? groupColors[statusGroups[status]]}
              items={items.filter((task) => getColumn(task) === status)}
              canMove={canMove}
              renderTask={renderTask}
            />
          ))}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2 2xl:grid-cols-4">
          {statuses.map((status) => (
            <TaskStatusColumn
              key={status}
              status={status}
              label={statusLabels[status]}
              group={statusGroups[status]}
              color={statusColors?.[status] ?? groupColors[statusGroups[status]]}
              items={items.filter((task) => getColumn(task) === status)}
              canMove={canMove}
              renderTask={renderTask}
            />
          ))}
        </div>
      )}
    </DndContext>
  );
}

function TaskStatusListGroup<T extends BoardTask>({
  status,
  label,
  group,
  color,
  items,
  canMove,
  renderTask,
}: {
  status: string;
  label: string;
  group: TaskStatusGroup;
  color: string;
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
      className={`min-h-24 transition-colors ${
        isOver ? "bg-primary/5 ring-2 ring-inset ring-primary/30" : ""
      }`}
    >
      <header className="flex min-h-11 items-center gap-2 border-b bg-muted/70 px-3 py-2 sm:px-4">
        <StatusIcon aria-hidden="true" className="size-4 shrink-0" style={{ color }} />
        <h2 className="font-medium">{label}</h2>
        <span
          className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums"
          style={{ color }}
        >
          {items.length}
        </span>
      </header>
      {items.length > 0 ? (
        <div className="divide-y">
          {items.map((task) => (
            <DraggableTask
              key={task.id}
              task={task}
              canMove={canMove(task)}
              renderTask={renderTask}
            />
          ))}
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Drop tasks here
        </p>
      )}
    </section>
  );
}

function TaskStatusColumn<T extends BoardTask>({
  status,
  label,
  group,
  color,
  items,
  canMove,
  renderTask,
}: {
  status: string;
  label: string;
  group: TaskStatusGroup;
  color: string;
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
      className={`min-w-0 rounded-lg border p-3 transition-colors ${
        isOver ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "bg-muted/30"
      }`}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <StatusIcon aria-hidden="true" className="size-4" style={{ color }} />
          {label}
        </h2>
        <span
          className="rounded-full bg-background px-2 py-0.5 text-xs tabular-nums"
          style={{ color }}
        >
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
      className="size-11 touch-none cursor-grab text-muted-foreground active:cursor-grabbing"
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
