import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { forwardRef } from "react";

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white border border-accent shadow-[0_2px_8px_-2px_rgba(192,88,122,0.45)] hover:bg-accent-hover",
  secondary: "bg-surface text-ink border border-line-strong hover:border-blush hover:bg-accent-soft/60",
  ghost: "bg-transparent text-ink-soft border border-transparent hover:bg-lavender-soft hover:text-ink",
  danger: "bg-surface text-danger border border-danger/30 hover:bg-danger-soft",
};

export const Button = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md" }
>(function Button({ variant = "secondary", size = "md", className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-all",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100",
        size === "sm" ? "h-8 px-3.5 text-[13px]" : "h-10 px-5 text-sm",
        buttonStyles[variant],
        className,
      )}
      {...props}
    />
  );
});

const control =
  "w-full rounded-xl border border-line-strong bg-surface px-3 py-1.5 text-sm text-ink " +
  "placeholder:text-muted/60 transition-colors focus:border-lavender focus:outline-none focus:ring-4 focus:ring-lavender-mid/50 " +
  "disabled:bg-paper disabled:text-muted";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cx(control, "h-10", invalid && "border-danger/60 focus:border-danger focus:ring-danger-soft", className)}
        aria-invalid={invalid || undefined}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref,
) {
  return <select ref={ref} className={cx(control, "h-10 pr-8", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return <textarea ref={ref} className={cx(control, "min-h-20 py-2 leading-relaxed", className)} {...props} />;
  },
);

export function Field({
  label,
  htmlFor,
  hint,
  error,
  warning,
  required,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  error?: string;
  warning?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cx("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-[13px] font-bold text-ink-soft">
        {label}
        {required && <span className="ml-0.5 text-accent" aria-hidden>*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-[12.5px] font-semibold text-danger">{error}</p>
      ) : warning ? (
        <p className="text-[12.5px] font-semibold text-warn">{warning}</p>
      ) : hint ? (
        <p className="text-[12.5px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export type Tone = "blush" | "lavender" | "mint";

const toneDot: Record<Tone, string> = {
  blush: "bg-[#ee9fb5] ring-accent-soft",
  lavender: "bg-[#b9a8ea] ring-lavender-soft",
  mint: "bg-[#8fd3b6] ring-mint-soft",
};
const toneHeader: Record<Tone, string> = {
  blush: "from-accent-soft/70",
  lavender: "from-lavender-soft/80",
  mint: "from-mint-soft/80",
};

export function Section({
  id,
  title,
  description,
  actions,
  tone = "blush",
  children,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 overflow-hidden rounded-3xl border border-line bg-surface/90 shadow-[0_4px_20px_-12px_rgba(59,50,71,0.18)]"
    >
      <header
        className={cx(
          "flex items-start justify-between gap-4 bg-gradient-to-r to-transparent px-6 py-4",
          toneHeader[tone],
        )}
      >
        <div className="flex items-start gap-3">
          <span className={cx("mt-1.5 h-3 w-3 shrink-0 rounded-full ring-4", toneDot[tone])} aria-hidden />
          <div>
            <h2 className="text-[17px] text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-muted">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className="px-6 pb-6 pt-2">{children}</div>
    </section>
  );
}

export function Badge({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "ok" | "warn" | "accent" | "lavender";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-paper text-ink-soft",
    ok: "bg-mint-soft text-mint",
    warn: "bg-warn-soft text-warn",
    accent: "bg-accent-soft text-accent",
    lavender: "bg-lavender-soft text-lavender",
  };
  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-bold", tones[tone])}>
      {children}
    </span>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "warn" | "ok"; children: ReactNode }) {
  const tones = {
    danger: "bg-danger-soft text-danger",
    warn: "bg-warn-soft text-warn",
    ok: "bg-mint-soft text-mint",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-2xl px-4 py-2.5 text-sm font-semibold", tones[tone])}>
      {children}
    </div>
  );
}

/** Soft rounded card for nested items (a party, a solicitor). */
export function Card({ tone, children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const tones: Record<Tone, string> = {
    blush: "border-accent-soft bg-accent-soft/30",
    lavender: "border-lavender-soft bg-lavender-soft/40",
    mint: "border-mint-soft bg-mint-soft/40",
  };
  return (
    <div className={cx("rounded-2xl border", tone ? tones[tone] : "border-line bg-paper/50", className)}>
      {children}
    </div>
  );
}
