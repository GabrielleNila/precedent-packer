"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFieldArray, useFormContext } from "react-hook-form";
import { Button, Input, Textarea, cx } from "@/components/ui";
import { newId } from "@/lib/validation/matter-defaults";
import type { MatterFormValues } from "@/lib/validation/matter";

export function ChronologyTable() {
  const { control, getValues } = useFormContext<MatterFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name: "chronology", keyName: "_key" });
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const from = fields.findIndex((f) => f._key === e.active.id);
    const to = fields.findIndex((f) => f._key === e.over!.id);
    if (from >= 0 && to >= 0) move(from, to);
  }

  function sortByDate() {
    const rows = getValues("chronology");
    const order = rows
      .map((r, i) => ({ i, d: r.event_date || "9999-12-31" }))
      .sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : a.i - b.i))
      .map((x) => x.i);
    // Apply the permutation with moves, tracking current positions.
    const current = rows.map((_, i) => i);
    order.forEach((orig, target) => {
      const from = current.indexOf(orig);
      if (from !== target) {
        move(from, target);
        current.splice(target, 0, current.splice(from, 1)[0]);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {fields.length === 0 ? (
        <p className="text-sm text-muted">
          No events yet. The chronology becomes the background facts in letters and the Statement of Claim.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-mint-soft bg-mint-soft/20">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-mint-soft/70 text-left text-[12px] font-bold uppercase tracking-wider text-mint">
              <tr>
                <th className="w-10 px-2 py-2" aria-label="Reorder" />
                <th className="w-8 px-1 py-2 font-medium">#</th>
                <th className="w-40 px-2 py-2 font-medium">Date</th>
                <th className="px-2 py-2 font-medium">Event</th>
                <th className="w-52 px-2 py-2 font-medium">Supporting document</th>
                <th className="w-24 px-2 py-2" aria-label="Actions" />
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={fields.map((f) => f._key)} strategy={verticalListSortingStrategy}>
                <tbody className="divide-y divide-mint-soft">
                  {fields.map((f, i) => (
                    <ChronologyRow
                      key={f._key}
                      sortId={f._key}
                      index={i}
                      count={fields.length}
                      onRemove={() => remove(i)}
                      onUp={() => move(i, i - 1)}
                      onDown={() => move(i, i + 1)}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => append({ id: newId(), event_date: "", description: "", supporting_document: "" })}
        >
          + Event
        </Button>
        {fields.length > 1 && (
          <Button size="sm" variant="ghost" onClick={sortByDate}>
            Sort by date
          </Button>
        )}
      </div>
    </div>
  );
}

function ChronologyRow({
  sortId,
  index,
  count,
  onRemove,
  onUp,
  onDown,
}: {
  sortId: string;
  index: number;
  count: number;
  onRemove: () => void;
  onUp: () => void;
  onDown: () => void;
}) {
  const { register, formState } = useFormContext<MatterFormValues>();
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: sortId });
  const err = formState.errors.chronology?.[index];

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cx("bg-surface/80 align-top", isDragging && "relative z-10 shadow-lg")}
    >
      <td className="px-2 py-2">
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="flex h-9 w-6 cursor-grab items-center justify-center rounded-lg text-muted hover:bg-mint-soft hover:text-ink active:cursor-grabbing"
          aria-label={`Drag to reorder event ${index + 1}`}
        >
          ⋮⋮
        </button>
      </td>
      <td className="px-1 py-2 pt-4 text-[13px] text-muted">{index + 1}</td>
      <td className="px-2 py-2">
        <Input type="date" aria-label="Date" {...register(`chronology.${index}.event_date`)} />
      </td>
      <td className="px-2 py-2">
        <Textarea
          rows={2}
          aria-label="Event"
          placeholder="What happened, in plain terms"
          {...register(`chronology.${index}.description`)}
          className={cx("min-h-9", err?.description && "border-danger")}
        />
        {err?.description && <p className="mt-1 text-[12.5px] text-danger">{err.description.message}</p>}
      </td>
      <td className="px-2 py-2">
        <Input aria-label="Supporting document" placeholder="e.g. Invoice No. 1234" {...register(`chronology.${index}.supporting_document`)} />
      </td>
      <td className="px-2 py-2">
        <div className="flex items-center gap-0.5">
          <Button size="sm" variant="ghost" onClick={onUp} disabled={index === 0} aria-label="Move up">↑</Button>
          <Button size="sm" variant="ghost" onClick={onDown} disabled={index === count - 1} aria-label="Move down">↓</Button>
          <Button size="sm" variant="ghost" onClick={onRemove} aria-label={`Remove event ${index + 1}`} className="text-danger hover:text-danger">
            ×
          </Button>
        </div>
      </td>
    </tr>
  );
}
