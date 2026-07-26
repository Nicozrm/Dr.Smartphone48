import { grades, type RefurbishedDevice } from "@/lib/data/refurbished";
import { formatEuro } from "@/lib/format";

const gradeStyles: Record<RefurbishedDevice["grade"], string> = {
  premium: "bg-ink-strong text-[var(--surface-page)]",
  "sehr-gut": "bg-accent-subtle text-accent",
  gut: "bg-sunken text-ink",
};

export function RefurbishedCard({ device }: { device: RefurbishedDevice }) {
  const grade = grades.find((g) => g.id === device.grade)!;
  const saving = Math.round(
    ((device.originalPrice - device.price) / device.originalPrice) * 100,
  );

  return (
    <article className="group flex h-full flex-col rounded-[var(--radius-l)] border border-line bg-raised p-6 shadow-raised transition-[box-shadow,transform] duration-[var(--duration-base)] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-floating">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-ink-faint">
            {device.brand}
          </p>
          <h3 className="mt-1.5 text-title">{device.name}</h3>
          <p className="mt-1 text-[0.875rem] text-ink-soft">
            {device.storage} · {device.color}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-[0.75rem] font-medium ${gradeStyles[device.grade]}`}
        >
          {grade.label}
        </span>
      </div>

      <div className="mt-5 flex-1">
        <div className="flex items-center justify-between text-[0.8125rem] text-ink-soft">
          <span>Akkukapazität</span>
          <span className="font-mono text-ink-strong">{device.battery} %</span>
        </div>
        <div
          className="mt-2 h-1 overflow-hidden rounded-full bg-sunken"
          role="img"
          aria-label={`Akkukapazität ${device.battery} Prozent`}
        >
          <div
            className="h-full rounded-full bg-positive"
            style={{ width: `${device.battery}%` }}
          />
        </div>
      </div>

      <div className="mt-6 flex items-baseline justify-between border-t border-line pt-5">
        <div>
          <span className="font-mono text-2xl font-semibold tracking-tight text-ink-strong">
            {formatEuro(device.price)}
          </span>
          <span className="ml-2 text-[0.875rem] text-ink-faint line-through">
            {formatEuro(device.originalPrice)}
          </span>
        </div>
        <span className="rounded-full bg-positive-subtle px-2.5 py-1 font-mono text-[0.75rem] font-medium text-positive">
          −{saving} %
        </span>
      </div>
    </article>
  );
}
