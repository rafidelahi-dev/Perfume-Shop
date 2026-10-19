"use client";

import { Check, X } from "lucide-react";
import {
  MIN_VOTERS_FOR_RESULTS,
  POLLS,
  type PollCounts,
  type PollDimension,
  type UserVote,
} from "@/lib/polls";

type Props = {
  polls: PollCounts;
  voterCounts: Record<string, number>;
  /** null = logged out: results only, no voting controls rendered at all. */
  myVotes: UserVote[] | null;
  onVote: (dimension: string, option: string, value: -1 | 0 | 1) => void;
};

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function SinglePoll({
  poll,
  counts,
  voters,
  mine,
  onVote,
}: {
  poll: PollDimension;
  counts: PollCounts[string] | undefined;
  voters: number;
  mine: string | null | undefined;
  onVote: Props["onVote"];
}) {
  const showBars = voters >= MIN_VOTERS_FOR_RESULTS;
  return (
    <div className="space-y-1.5">
      {poll.options.map((o) => {
        const yes = counts?.[o.value]?.yes ?? 0;
        const selected = mine === o.value;
        const body = (
          <>
            <span className="w-24 shrink-0 text-left text-gray-700">{o.label}</span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              {showBars && (
                <div className="h-full bg-[#d4af37]" style={{ width: `${pct(yes, voters)}%` }} />
              )}
            </div>
            <span className="w-9 shrink-0 text-right text-gray-400">
              {showBars ? `${pct(yes, voters)}%` : ""}
            </span>
          </>
        );
        if (mine === undefined) {
          return (
            <div key={o.value} className="flex items-center gap-3 text-xs px-2 py-1">
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
            className={`w-full flex items-center gap-3 text-xs rounded-lg px-2 py-1.5 border transition-colors ${
              selected
                ? "border-[#d4af37] bg-[#d4af37]/10"
                : "border-transparent hover:bg-gray-50"
            }`}
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
}: {
  poll: PollDimension;
  counts: PollCounts[string] | undefined;
  mine: Map<string, 1 | -1> | null;
  onVote: Props["onVote"];
}) {
  return (
    <ul className="space-y-1.5">
      {poll.options.map((o) => {
        const yes = counts?.[o.value]?.yes ?? 0;
        const no = counts?.[o.value]?.no ?? 0;
        const total = yes + no;
        const show = total >= MIN_VOTERS_FOR_RESULTS;
        const my = mine?.get(o.value);
        return (
          <li key={o.value} className="flex items-center gap-3 text-xs px-2 py-1">
            <span className="w-40 shrink-0 text-gray-700">
              {o.emoji} {o.label}
            </span>
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              {show && <div className="h-full bg-green-500/80" style={{ width: `${pct(yes, total)}%` }} />}
            </div>
            <span className="w-16 shrink-0 text-right text-gray-400">
              {show ? `${pct(yes, total)}% yes` : "—"}
            </span>
            {mine && (
              <span className="flex gap-1 shrink-0">
                <button
                  type="button"
                  aria-label={`Yes, ${o.label}`}
                  aria-pressed={my === 1}
                  onClick={() => onVote(poll.key, o.value, my === 1 ? 0 : 1)}
                  className={`h-7 w-7 grid place-items-center rounded-full border transition-colors ${
                    my === 1
                      ? "bg-green-600 border-green-600 text-white"
                      : "border-gray-200 text-gray-400 hover:border-green-500 hover:text-green-600"
                  }`}
                >
                  <Check size={14} />
                </button>
                <button
                  type="button"
                  aria-label={`No, ${o.label}`}
                  aria-pressed={my === -1}
                  onClick={() => onVote(poll.key, o.value, my === -1 ? 0 : -1)}
                  className={`h-7 w-7 grid place-items-center rounded-full border transition-colors ${
                    my === -1
                      ? "bg-red-600 border-red-600 text-white"
                      : "border-gray-200 text-gray-400 hover:border-red-500 hover:text-red-600"
                  }`}
                >
                  <X size={14} />
                </button>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default function PollsPanel({ polls, voterCounts, myVotes, onVote }: Props) {
  const loggedIn = myVotes !== null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
      {POLLS.map((poll) => {
        const counts = polls[poll.key];
        const voters = voterCounts[poll.key] ?? 0;
        const mineForDim = (myVotes ?? []).filter((v) => v.dimension === poll.key);

        return (
          <div key={poll.key} className={poll.kind === "yes_no" ? "md:col-span-2" : ""}>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs uppercase tracking-widest text-gray-400">{poll.title}</p>
              <p className="text-xs text-gray-400">
                {voters > 0 ? `${voters} vote${voters > 1 ? "s" : ""}` : loggedIn ? "Be the first to vote" : "No votes yet"}
              </p>
            </div>
            {poll.kind === "single" ? (
              <SinglePoll
                poll={poll}
                counts={counts}
                voters={voters}
                mine={loggedIn ? (mineForDim[0]?.option ?? null) : undefined}
                onVote={onVote}
              />
            ) : (
              <YesNoPoll
                poll={poll}
                counts={counts}
                mine={loggedIn ? new Map(mineForDim.map((v) => [v.option, v.value])) : null}
                onVote={onVote}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
