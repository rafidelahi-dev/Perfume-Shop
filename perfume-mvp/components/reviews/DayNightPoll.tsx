"use client";

import { Check, CloudMoon, Moon, Sun, SunMoon, Sunset, type LucideIcon } from "lucide-react";
import { MIN_VOTERS_FOR_RESULTS, type PollDimension } from "@/lib/polls";
import type { PollCounts } from "@/lib/polls";

type Props = {
  poll: PollDimension;
  counts: PollCounts[string] | undefined;
  voters: number;
  /** undefined = logged out (read only); null = logged in, no pick yet. */
  mine: string | null | undefined;
  onVote: (dimension: string, option: string, value: -1 | 0 | 1) => void;
  seen: boolean;
  pulse: string | null;
};

const ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  sunset: Sunset,
  sunmoon: SunMoon,
  cloudmoon: CloudMoon,
  moon: Moon,
};

// Dawn gold, dusk rose, then deep night.
const SKY =
  "linear-gradient(90deg, #fde68a 0%, #fdba74 22%, #f0a3a0 42%, #a78bfa 62%, #4338ca 82%, #1e1b4b 100%)";

// Fixed positions so server and client render the same stars.
const STARS = [
  [58, 14, 2], [64, 38, 1.5], [70, 10, 2], [75, 30, 1.5], [80, 18, 2.5], [84, 44, 1.5],
  [88, 12, 2], [92, 34, 2], [95, 20, 1.5], [67, 24, 1.5], [78, 8, 1.5], [90, 48, 2],
] as const;

function verdict(t: number) {
  if (t < 0.2) return "A daytime scent";
  if (t < 0.4) return "Leans daytime";
  if (t < 0.6) return "Works day or night";
  if (t < 0.8) return "Leans nighttime";
  return "A nighttime scent";
}

/** Blend the sun's gold into the moon's pale blue as the verdict moves right. */
function orbColor(t: number) {
  return `color-mix(in srgb, #fbbf24 ${Math.round((1 - t) * 100)}%, #e0e7ff)`;
}

export default function DayNightPoll({ poll, counts, voters, mine, onVote, seen, pulse }: Props) {
  const showResults = voters >= MIN_VOTERS_FOR_RESULTS;
  const yesOf = (v: string) => counts?.[v]?.yes ?? 0;
  const total = poll.options.reduce((n, o) => n + yesOf(o.value), 0);
  const top = Math.max(...poll.options.map((o) => yesOf(o.value)));
  const last = poll.options.length - 1;
  const t = total > 0 ? poll.options.reduce((n, o, i) => n + yesOf(o.value) * i, 0) / (total * last) : 0.5;
  const OrbIcon = t < 0.4 ? Sun : t > 0.6 ? Moon : SunMoon;
  const interactive = mine !== undefined;
  const cols = poll.options.length;

  return (
    <div>
      <div className="relative">
        {/* Sky */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[176px] overflow-hidden rounded-2xl"
          style={{ background: SKY }}
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 0% 0%, rgba(255,255,255,0.75), transparent 42%), radial-gradient(circle at 100% 0%, rgba(199,210,254,0.35), transparent 38%)",
            }}
          />
          {STARS.map(([x, y, s], i) => (
            <span
              key={i}
              className="anim-twinkle absolute rounded-full bg-white"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: s,
                height: s,
                animationDelay: `${(i % 5) * 0.6}s`,
              }}
            />
          ))}
          {/* Horizon glow */}
          <div
            className="absolute inset-x-0 bottom-0 h-10"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.18), transparent)" }}
          />
        </div>

        {/* Community verdict: a sun that slides into a moon */}
        {showResults && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-3 z-10 grid h-9 w-9 place-items-center rounded-full shadow-[0_0_24px_6px_rgba(255,255,255,0.35)]"
            style={{
              left: `${seen ? ((t * last + 0.5) / cols) * 100 : 50}%`,
              marginLeft: -18,
              background: orbColor(t),
              color: t > 0.6 ? "#3730a3" : "#92400e",
              transition: "left 1.1s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          >
            <OrbIcon size={20} />
          </span>
        )}

        <div className="relative grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {poll.options.map((o, i) => {
            const yes = yesOf(o.value);
            const share = total > 0 ? Math.round((yes / total) * 100) : 0;
            const selected = mine === o.value;
            const leader = showResults && top > 0 && yes === top;
            const Icon = o.icon ? ICONS[o.icon] : undefined;
            const base = "flex min-w-0 flex-col items-center";

            const strip = (
              <span className="flex h-[176px] w-full flex-col items-center justify-end gap-1.5 pb-3">
                {showResults && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
                      leader ? "bg-[#1a1a1a] text-white" : "bg-white/90 text-[#1a1a1a]"
                    }`}
                  >
                    {share}%
                  </span>
                )}
                <span className="flex h-14 w-2.5 items-end overflow-hidden rounded-full bg-black/10">
                  <span
                    className="block h-full w-full origin-bottom rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.25)]"
                    style={{
                      transform: `scaleY(${seen && showResults ? Math.max(share, 4) / 100 : 0})`,
                      transition: "transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
                      transitionDelay: `${i * 80}ms`,
                    }}
                  />
                </span>
                {interactive ? (
                  <span
                    aria-hidden
                    className={`grid h-6 w-6 place-items-center rounded-full border-2 transition-colors ${
                      selected ? "border-white bg-white text-indigo-700" : "border-white/70 bg-white/10"
                    }`}
                  >
                    {selected && <Check size={14} strokeWidth={3} className="anim-check-pop" />}
                  </span>
                ) : (
                  <span className="h-6" aria-hidden />
                )}
              </span>
            );

            const label = (
              <span
                className={`mt-2 flex flex-col items-center gap-1 px-0.5 text-center text-[11px] leading-tight sm:text-xs ${
                  selected ? "font-semibold text-[#1a1a1a]" : "font-medium text-gray-600"
                }`}
              >
                {Icon && (
                  <Icon
                    size={18}
                    aria-hidden
                    style={{ color: selected ? poll.accent : "#9ca3af" }}
                  />
                )}
                {o.label}
              </span>
            );

            if (!interactive) {
              return (
                <div key={o.value} className={base}>
                  {strip}
                  {label}
                </div>
              );
            }
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={selected}
                aria-label={o.label}
                onClick={() => onVote(poll.key, o.value, selected ? 0 : 1)}
                className={`${base} group rounded-2xl pb-1 outline-offset-2 transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-600 active:scale-[0.97] ${
                  pulse === `${poll.key}:${o.value}` ? "anim-tile-pulse" : ""
                }`}
                style={{ "--pulse": `${poll.accent}80` } as React.CSSProperties}
              >
                {strip}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="mt-3 text-center font-serif text-base font-semibold text-[#1a1a1a]" aria-live="polite">
        {showResults ? verdict(t) : "Tell us when this one shines"}
      </p>
    </div>
  );
}
