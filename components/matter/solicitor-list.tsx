"use client";

import { useFieldArray, useFormContext } from "react-hook-form";
import { Button, Card, Field, Input, Textarea } from "@/components/ui";
import { newId } from "@/lib/validation/matter-defaults";
import type { MatterFormValues } from "@/lib/validation/matter";

export function SolicitorList() {
  const { control, register, formState, getValues, setValue } = useFormContext<MatterFormValues>();
  const { fields, append, remove } = useFieldArray({ control, name: "solicitors", keyName: "_key" });

  function removeAt(i: number) {
    const removedId = getValues(`solicitors.${i}.id`);
    // Unlink any opposing party that pointed at this firm.
    getValues("opposing").forEach((p, pi) => {
      if (p.solicitor_id === removedId) setValue(`opposing.${pi}.solicitor_id`, "", { shouldDirty: true });
    });
    remove(i);
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 && (
        <p className="text-sm text-muted">
          None recorded. If the other side is unrepresented, letters are addressed to the party directly.
        </p>
      )}
      {fields.map((f, i) => {
        const e = formState.errors.solicitors?.[i];
        const fid = (x: string) => `sol-${i}-${x}`;
        return (
          <Card key={f._key} tone="lavender">
            <div className="flex items-center justify-between px-4 pb-1 pt-3">
              <span className="text-[13px] font-bold text-ink">Solicitors {fields.length > 1 ? i + 1 : ""}</span>
              <Button size="sm" variant="ghost" onClick={() => removeAt(i)} className="text-danger hover:text-danger">
                Remove
              </Button>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              <Field label="Firm name" htmlFor={fid("firm")} required error={e?.firm_name?.message}>
                <Input id={fid("firm")} {...register(`solicitors.${i}.firm_name`)} invalid={!!e?.firm_name} />
              </Field>
              <Field label="Solicitor's name" htmlFor={fid("name")}>
                <Input id={fid("name")} {...register(`solicitors.${i}.solicitor_name`)} />
              </Field>
              <Field label="Address" htmlFor={fid("addr")} className="sm:col-span-2">
                <Textarea id={fid("addr")} rows={2} {...register(`solicitors.${i}.address`)} className="min-h-14" />
              </Field>
              <Field label="Their reference" htmlFor={fid("ref")}>
                <Input id={fid("ref")} {...register(`solicitors.${i}.reference`)} className="font-mono" />
              </Field>
              <Field label="Email" htmlFor={fid("email")} error={e?.email?.message}>
                <Input id={fid("email")} type="email" {...register(`solicitors.${i}.email`)} invalid={!!e?.email} />
              </Field>
            </div>
          </Card>
        );
      })}
      <div>
        <Button
          size="sm"
          onClick={() =>
            append({ id: newId(), firm_name: "", address: "", reference: "", solicitor_name: "", email: "" })
          }
        >
          + Opposing solicitors
        </Button>
      </div>
    </div>
  );
}
