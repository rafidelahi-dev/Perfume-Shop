"use client";

import { useState } from "react";
import {
  Bike,
  Building2,
  Check,
  CloudRain,
  Gem,
  Landmark,
  Leaf,
  Snowflake,
  Sparkles,
  Sun,
  Bus,
  Utensils,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  MIN_VOTERS_FOR_RESULTS,
  POLLS,
  type PollCounts,
  type PollDimension,
  type UserVote,
} from "@/lib/polls";
import { useInView } from "@/lib/hooks/useInView";
import DayNightPoll from "./DayNightPoll";

type Props = {
  polls: PollCounts;
  voterCounts: Record<string, number>;
  /** null = logged out: results only, no voting controls rendered at all. */
  myVotes: UserVote[] | null;
  onVote: (dimension: string, option: string, value: -1 | 0 | 1) => void;
  /** Logged out: sends the visitor to join, then back to vote. */
  onJoin?: () => void;
};

const ICONS: Record<string, LucideIcon> = {
  sun: Sun,
  rain: CloudRain,
  snow: Snowflake,
  leaf: Leaf,
  bus: Bus,
  building: Building2,
  dining: Utensils,
  bike: Bike,
  gem: Gem,
  mosque: Landmark,
};

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

/** Shown when a poll has too few voters for honest percentages. */
function Unlock({ voters, accent }: { voters: number; accent: string }) {
  const need = Math.max(MIN_VOTERS_FOR_RESULTS - voters, 0);
  return (
    <div className="mb-3 flex items-center gap-2 text-xs text-gray-600">
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: MIN_VOTERS_FOR_RESULTS }, (_, i) => (
          <span
            key={i}
            className="h-1.5 w-6 rounded-full"
            style={{ background: i < voters ? accent : "#e5e7eb" }}
          />
        ))}
      </span>
      {need} more {need === 1 ? "vote" : "votes"} to show results
    </div>
  );
}

function SinglePoll({
  poll,
  counts,
  voters,
  mine,
  onVote,
  seen,
  pulse,
}: {
  poll: PollDimension;
  counts: PollCounts[string] | undefined;
  voters: number;
  mine: string | null | undefined;
  onVote: Props["onVote"];
  seen: boolean;
  pulse: string | null;
}) {
  const showBars = voters >= MIN_VOTERS_FOR_RESULTS;
  const top = showBars
    ? Math.max(...poll.options.map((o) => counts?.[o.value]?.yes ?? 0))
    : 0;

  if (poll.variant === "spectrum") {
    return (
      <DayNightPoll
        poll={poll}
        counts={counts}
        voters={voters}
        mine={mine}
        onVote={onVote}
        seen={seen}
        pulse={pulse}
      />
    );
  }

  return (
    <div className="space-y-2">
      {poll.options.map((o, i) => {
        const yes = counts?.[o.value]?.yes ?? 0;
        const share = pct(yes, voters);
        const selected = mine === o.value;
        const leader = showBars && top > 0 && yes === top;
        const fill = (
          <span
            aria-hidden
            className="bar-grow absolute inset-y-0 left-0 w-full rounded-xl"
            style={{
              background: poll.accent,
              opacity: leader ? 0.28 : 0.14,
              transform: `scaleX(${seen && showBars ? share / 100 : 0})`,
              transitionDelay: `${i * 70}ms`,
            }}
          />
        );
        const body = (
          <>
            {fill}
            <span className="relative flex flex-1 items-center gap-2 text-left text-sm font-medium text-gray-800">
              {o.label}
              {leader && (
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-semibold text-white"
                  style={{ background: poll.accent }}
                >
                  Top pick
                </span>
              )}
            </span>
            <span className="relative w-10 text-right text-sm font-semibold tabular-nums text-gray-700">
              {showBars ? `${share}%` : ""}
            </span>
            {mine !== undefined && (
              <span
                aria-hidden
                className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-colors ${
                  selected ? "border-transparent text-white" : "border-gray-300"
                }`}
                style={selected ? { background: poll.accent } : undefined}
              >
                {selected && <Check size={14} strokeWidth={3} className="anim-check-pop" />}
              </span>
            )}
          </>
        );
        const base =
          "relative flex min-h-[44px] w-full items-center gap-3 overflow-hidden rounded-xl border bg-white px-3 py-2";

        if (mine === undefined) {
          return (
            <div key={o.value} className={`${base} border-gray-200`}>
              {body}
            </div>
          );
        }
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onVote(poll.key, o.value, selected ? 0 : 1)}
            aria-pressed={selected}
            className={`${base} transition-[border-color,transform] duration-200 active:scale-[0.98] ${
              pulse === `${poll.key}:${o.value}` ? "anim-tile-pulse" : ""
            } ${selected ? "" : "border-gray-200 hover:border-gray-400"}`}
            style={
              selected
                ? ({ borderColor: poll.accent, "--pulse": `${poll.accent}80` } as React.CSSProperties)
                : ({ "--pulse": `${poll.accent}80` } as React.CSSProperties)
            }
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}

function YesNoPoll({
  poll,
  counts,
  mine,
  onVote,
  seen,
  pulse,
}: {
  poll: PollDimension;
  counts: PollCounts[string] | undefined;
  mine: Map<string, 1 | -1> | null;
  onVote: Props["onVote"];
  seen: boolean;
  pulse: string | null;
}) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {poll.options.map((o, i) => {
        const yes = counts?.[o.value]?.yes ?? 0;
        const no = counts?.[o.value]?.no ?? 0;
        const total = yes + no;
        const show = total >= MIN_VOTERS_FOR_RESULTS;
        const share = pct(yes, total);
        const my = mine?.get(o.value);
        const Icon = o.icon ? ICONS[o.icon] : undefined;
        return (
          <li
            key={o.value}
            className={`rounded-2xl border bg-white p-3 transition-colors ${
              pulse === `${poll.key}:${o.value}` ? "anim-tile-pulse" : ""
            } ${my ? "" : "border-gray-200"}`}
            style={
              {
                "--pulse": `${poll.accent}80`,
                ...(my ? { borderColor: poll.accent } : {}),
              } as React.CSSProperties
            }
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                style={{ background: `${poll.accent}1f`, color: poll.accent }}
              >
                {Icon && <Icon size={20} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{o.label}</p>
                <p className="text-xs tabular-nums text-gray-500">
                  {show ? `${share}% say yes` : total > 0 ? `${total} so far` : "No votes yet"}
                </p>
              </div>
              {mine && (
                <span className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    aria-label={`Yes, ${o.label}`}
                    aria-pressed={my === 1}
                    onClick={() => onVote(poll.key, o.value, my === 1 ? 0 : 1)}
                    className={`grid h-11 w-11 place-items-center rounded-full border-2 transition-[background-color,border-color,transform] active:scale-90 ${
                      my === 1
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-gray-200 text-gray-400 hover:border-emerald-500 hover:text-emerald-600"
                    }`}
                  >
                    <Check size={18} strokeWidth={2.5} className={my === 1 ? "anim-check-pop" : ""} />
                  </button>
                  <button
                    type="button"
                    aria-label={`No, ${o.label}`}
                    aria-pressed={my === -1}
                    onClick={() => onVote(poll.key, o.value, my === -1 ? 0 : -1)}
                    className={`grid h-11 w-11 place-items-center rounded-full border-2 transition-[background-color,border-color,transform] active:scale-90 ${
                      my === -1
                        ? "border-rose-600 bg-rose-600 text-white"
                        : "border-gray-200 text-gray-400 hover:border-rose-500 hover:text-rose-600"
                    }`}
                  >
                    <X size={18} strokeWidth={2.5} className={my === -1 ? "anim-check-pop" : ""} />
                  </button>
                </span>
              )}
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="bar-grow h-full w-full rounded-full"
                style={{
                  background: poll.accent,
                  transform: `scaleX(${seen && show ? share / 100 : 0})`,
                  transitionDelay: `${i * 70}ms`,
                }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PollCard({
  poll,
  counts,
  voters,
  myVotes,
  onVote,
}: {
  poll: PollDimension;
  counts: PollCounts[string] | undefined;
  voters: number;
  myVotes: UserVote[] | null;
  onVote: Props["onVote"];
}) {
  const [ref, seen] = useInView<HTMLDivElement>(0.2);
  const [pulse, setPulse] = useState<string | null>(null);
  const loggedIn = myVotes !== null;
  const mineForDim = (myVotes ?? []).filter((v) => v.dimension === poll.key);

  function vote(dimension: string, option: string, value: -1 | 0 | 1) {
    if (value !== 0) {
      setPulse(`${dimension}:${option}`);
      window.setTimeout(() => setPulse(null), 700);
    }
    onVote(dimension, option, value);
  }

  return (
    <div
      ref={ref}
      className={`rounded-3xl border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_28px_-14px_rgba(0,0,0,0.12)] sm:p-5 ${
        poll.kind === "yes_no" || poll.variant === "spectrum" ? "md:col-span-2" : ""
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-serif text-lg font-semibold text-[#1a1a1a]">
          <span className="h-5 w-1.5 rounded-full" style={{ background: poll.accent }} aria-hidden />
          {poll.title}
        </h3>
        <span
          className="rounded-full px-2.5 py-1 text-xs font-medium tabular-nums"
          style={{ background: `${poll.accent}1a`, color: "#1a1a1a" }}
        >
          {voters > 0 ? `${voters} vote${voters > 1 ? "s" : ""}` : loggedIn ? "Be the first" : "No votes yet"}
        </span>
      </div>

      {voters < MIN_VOTERS_FOR_RESULTS && poll.kind === "single" && (
        <Unlock voters={voters} accent={poll.accent} />
      )}

      {poll.kind === "single" ? (
        <SinglePoll
          poll={poll}
          counts={counts}
          voters={voters}
          mine={loggedIn ? (mineForDim[0]?.option ?? null) : undefined}
          onVote={vote}
          seen={seen}
          pulse={pulse}
        />
      ) : (
        <YesNoPoll
          poll={poll}
          counts={counts}
          mine={loggedIn ? new Map(mineForDim.map((v) => [v.option, v.value])) : null}
          onVote={vote}
          seen={seen}
          pulse={pulse}
        />
      )}
    </div>
  );
}

export default function PollsPanel({ polls, voterCounts, myVotes, onVote, onJoin }: Props) {
  const loggedIn = myVotes !== null;
  const answered = loggedIn ? new Set(myVotes.map((v) => v.dimension)).size : 0;
  const total = POLLS.length;
  const done = loggedIn && answered === total;

  return (
    <div className="space-y-5">
      {loggedIn ? (
        <div
          className={`flex items-center gap-4 rounded-2xl p-4 ${
            done ? "gold-sweep text-[#1a1a1a]" : "bg-[#1a1a1a] text-white"
          }`}
        >
          <Sparkles size={22} className={done ? "" : "text-[#d4af37]"} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {done
                ? "You have covered every poll. Thank you."
                : answered === 0
                  ? "Add your read. Each tap helps the next buyer."
                  : `${answered} of ${total} polls answered`}
            </p>
            <div
              className="mt-2 flex gap-1.5"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={answered}
              aria-label="Polls answered"
            >
              {POLLS.map((p, i) => (
                <span
                  key={p.key}
                  className="h-1.5 flex-1 rounded-full transition-colors duration-500"
                  style={{
                    background: i < answered ? (done ? "#1a1a1a" : "#d4af37") : "rgba(255,255,255,0.22)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        onJoin && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#1a1a1a] p-4 text-white">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Sparkles size={18} className="text-[#d4af37]" aria-hidden />
              See what members think. Add your own read in 10 seconds.
            </p>
            <button
              type="button"
              onClick={onJoin}
              className="min-h-[44px] rounded-full bg-[#d4af37] px-5 text-sm font-semibold text-[#1a1a1a] transition-transform hover:scale-[1.03] active:scale-95"
            >
              Join and vote
            </button>
          </div>
        )
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {POLLS.map((poll) => (
          <PollCard
            key={poll.key}
            poll={poll}
            counts={polls[poll.key]}
            voters={voterCounts[poll.key] ?? 0}
            myVotes={myVotes}
            onVote={onVote}
          />
        ))}
      </div>
    </div>
  );
}
