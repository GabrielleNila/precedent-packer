"use client";

import { Controller, useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button, Card, Field, Input, Select, Textarea, cx } from "@/components/ui";
import { IdNumberInput } from "./id-number-input";
import { checkNricFin } from "@/lib/format/nric";
import { emptyParty } from "@/lib/validation/matter-defaults";
import type { MatterFormValues } from "@/lib/validation/matter";

type ListName = "clients" | "opposing";

export function PartyList({ name }: { name: ListName }) {
  const { control } = useFormContext<MatterFormValues>();
  const { fields, append, remove, move } = useFieldArray({ control, name, keyName: "_key" });
  const noun = name === "clients" ? "client" : "opposing party";

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 && (
        <p className="text-sm text-muted">No {noun}s yet.</p>
      )}
      {fields.map((f, i) => (
        <PartyCard
          key={f._key}
          name={name}
          index={i}
          count={fields.length}
          onRemove={() => remove(i)}
          onMoveUp={() => move(i, i - 1)}
          onMoveDown={() => move(i, i + 1)}
        />
      ))}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => append(emptyParty("individual"))}>+ Individual</Button>
        <Button size="sm" onClick={() => append(emptyParty("company"))}>+ Company</Button>
      </div>
    </div>
  );
}

function PartyCard({
  name,
  index,
  count,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  name: ListName;
  index: number;
  count: number;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { register, control, setValue, formState } = useFormContext<MatterFormValues>();
  const base = `${name}.${index}` as const;
  const kind = useWatch({ control, name: `${base}.kind` });
  const idNumber = useWatch({ control, name: `${base}.id_number` }) ?? "";
  const solicitors = useWatch({ control, name: "solicitors" }) ?? [];
  const errors = formState.errors[name]?.[index];
  const isIndividual = kind === "individual";
  const nricCheck = isIndividual ? checkNricFin(idNumber) : { ok: true };
  const label = name === "clients" ? "Client" : "Opposing party";
  const fid = (f: string) => `${name}-${index}-${f}`;

  return (
    <Card tone={name === "clients" ? "blush" : "lavender"}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-1 pt-3">
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold text-ink">
            {label} {count > 1 ? index + 1 : ""}
          </span>
          <div className="flex gap-0.5 rounded-full bg-surface p-0.5 text-[12.5px] font-semibold shadow-[inset_0_0_0_1px_var(--color-line-strong)]" role="radiogroup" aria-label="Party type">
            {(["individual", "company"] as const).map((k) => (
              <button
                key={k}
                type="button"
                role="radio"
                aria-checked={kind === k}
                onClick={() => setValue(`${base}.kind`, k, { shouldDirty: true })}
                className={cx(
                  "rounded-full px-3 py-1 transition-colors",
                  kind === k ? "bg-ink text-white" : "text-ink-soft hover:bg-paper",
                )}
              >
                {k === "individual" ? "Individual" : "Company"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={onMoveUp} disabled={index === 0} aria-label="Move up">↑</Button>
          <Button size="sm" variant="ghost" onClick={onMoveDown} disabled={index === count - 1} aria-label="Move down">↓</Button>
          <Button size="sm" variant="ghost" onClick={onRemove} className="text-danger hover:text-danger">Remove</Button>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2">
        <Field
          label={isIndividual ? "Full name" : "Registered name"}
          htmlFor={fid("name")}
          required
          error={errors?.name?.message}
          hint={isIndividual ? "As in NRIC/passport" : "As registered with ACRA, e.g. Sample Pte. Ltd."}
        >
          <Input id={fid("name")} {...register(`${base}.name`)} invalid={!!errors?.name} />
        </Field>

        <Field
          label={isIndividual ? "NRIC / FIN" : "UEN"}
          htmlFor={fid("id")}
          error={errors?.id_number?.message}
          warning={!nricCheck.ok ? nricCheck.reason : undefined}
          hint={isIndividual ? "Hidden on screen until you reveal it" : undefined}
        >
          {isIndividual ? (
            <Controller
              control={control}
              name={`${base}.id_number`}
              render={({ field }) => (
                <IdNumberInput
                  id={fid("id")}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  placeholder="S1234567D"
                />
              )}
            />
          ) : (
            <Input
              id={fid("id")}
              {...register(`${base}.id_number`)}
              className="font-mono tracking-wide"
              placeholder="201900000X"
            />
          )}
        </Field>

        <Field
          label={isIndividual ? "Address" : "Registered address"}
          htmlFor={fid("address")}
          className="sm:col-span-2"
        >
          <Textarea id={fid("address")} rows={2} {...register(`${base}.address`)} className="min-h-14" />
        </Field>

        {isIndividual ? (
          <Field label="Email" htmlFor={fid("email")} error={errors?.email?.message}>
            <Input id={fid("email")} type="email" {...register(`${base}.email`)} invalid={!!errors?.email} />
          </Field>
        ) : (
          <Field label="Contact person" htmlFor={fid("contact")}>
            <Input id={fid("contact")} {...register(`${base}.contact_person`)} />
          </Field>
        )}

        {name === "opposing" && (
          <Field
            label="Represented by"
            htmlFor={fid("sol")}
            hint={solicitors.length ? "Letters go to their solicitors when set" : "Add opposing solicitors below to link them"}
          >
            <Select id={fid("sol")} {...register(`${base}.solicitor_id`)} disabled={!solicitors.length}>
              <option value="">Not represented / unknown</option>
              {solicitors.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.firm_name || "(unnamed firm)"}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Card>
  );
}
