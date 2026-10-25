import { Flame } from "lucide-react";
import type { Glance, GlanceBar } from "@/lib/glance";

const TRENDING_LABELS = ["Quiet", "Warming up", "Gaining", "Popular", "Hot", "On fire"];

function Row({
  title,
  hint,
  children,
  value,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
  value: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
          {title}
          {hint && <span className="ml-2 font-normal normal-case tracking-normal text-gray-400">{hint}</span>}
        </p>
        <p className="text-sm font-semibold text-[#1a1a1a]">{value}</p>
      </div>
      {children}
    </div>
  );
}

function Bar({ bar, color }: { bar: GlanceBar; color: string }) {
  const pct = bar.score == null ? 0 : Math.max(4, Math.round(bar.score * 100));
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={bar.score == null ? undefined : pct}
      aria-label={bar.label}
      className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100"
    >
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function AtAGlance({ glance, accords }: { glance: Glance; accords: string[] }) {
  const { dna, performance, price, trendFlames } = glance;
  return (
    <section
      aria-label="At a glance"
      className="space-y-5 rounded-2xl border border-black/5 bg-white p-5 sm:p-6"
    >
      <Row
        title="DNA"
        hint={accords.slice(0, 3).join(" · ")}
        value={dna.label}
      >
        <Bar bar={dna} color="#d4af37" />
      </Row>

      <Row title="Performance" value={performance.label}>
        <Bar bar={performance} color="#f59e0b" />
      </Row>

      <Row
        title="Price"
        hint={price.lowPrice != null ? `from Tk ${Math.round(price.lowPrice).toLocaleString("en-US")}` : undefined}
        value={price.label}
      >
        <Bar bar={price} color="#10b981" />
      </Row>

      <Row title="Trending" value={TRENDING_LABELS[trendFlames]}>
        <div className="flex justify-between" role="img" aria-label={`${trendFlames} of 5 flames`}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Flame
              key={n}
              size={26}
              className={n <= trendFlames ? "fill-orange-500 text-orange-500" : "text-gray-200"}
            />
          ))}
        </div>
      </Row>
    </section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-full border border-[#d4af37]/40 bg-[#fbf6e3] px-3 py-1 text-sm text-[#1a1a1a]">
      {children}
    </li>
  );
}

/** Season, setting and who it suits: the quick read before the notes and full polls. */
export function BestFor({ glance }: { glance: Glance }) {
  const groups: { title: string; items: string[] }[] = [
    { title: "Suits", items: [glance.gender?.label, glance.timeOfDay?.label].filter((s): s is string => !!s) },
    { title: "Season", items: glance.climate },
    { title: "Where", items: glance.places },
  ].filter((g) => g.items.length > 0);

  if (groups.length === 0) return null;
  return (
    <section aria-label="Best for" className="mb-8 rounded-2xl border border-black/5 bg-white p-5 sm:p-6">
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-500">{g.title}</p>
            <ul className="flex flex-wrap gap-2">
              {g.items.map((i) => (
                <Chip key={i}>{i}</Chip>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
