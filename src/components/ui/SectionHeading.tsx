import type { ReactNode } from "react";

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && (
          <p className="mb-1.5 text-xs font-semibold tracking-[0.18em] text-brand uppercase">
            {eyebrow}
          </p>
        )}
        <h2 className="text-2xl font-semibold text-ink sm:text-3xl">{title}</h2>
        {description && <p className="mt-2 text-ink-soft">{description}</p>}
      </div>
      {action}
    </div>
  );
}
