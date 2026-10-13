"use client";

import { useEffect } from "react";
import type { MindItem } from "../lib/items";

/**
 * The full context for one entry.
 *
 * A column beside the face, not a layer over it. It has no entrance
 * animation on purpose: the face keeps its space, the text gets room to
 * breathe, and nothing slides in front of the thing you were reading.
 */

interface ItemDetailProps {
  item: MindItem;
  podcastUrl: string;
  onClose: () => void;
  /** The next entry in the same list, so you can keep going without closing. */
  onNext?: (item: MindItem) => void;
  next?: MindItem | null;
}

export default function ItemDetail({
  item,
  podcastUrl,
  onClose,
  onNext,
  next,
}: ItemDetailProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside
      role="dialog"
      aria-label={item.title}
      className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-surface"
    >
      <header className="shrink-0 border-b border-line px-7 py-6">
        <button
          type="button"
          onClick={onClose}
          className="label-quiet transition-colors duration-200 hover:text-ink"
        >
          ← All entries
        </button>
        <span className="label mt-6 block" style={{ color: "var(--accent)" }}>
          {item.kindLabel}
        </span>
        <h2 className="mt-3 text-[26px] font-medium leading-tight tracking-tight text-ink">
          {item.title}
        </h2>
        {item.subtitle ? (
          <p className="mt-1.5 text-sm leading-relaxed text-ink-2">{item.subtitle}</p>
        ) : null}
      </header>

      <div className="flex-1 px-7 py-6">
        {item.metrics ? (
          <p className="label-quiet leading-relaxed">{item.metrics}</p>
        ) : null}

        <p className="mt-5 text-[15px] leading-relaxed text-ink-2">{item.content}</p>

        {/* How it felt */}
        <div className="glass mt-7 p-5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="label-quiet">How it felt</span>
            <span className="label-quiet">{item.mood.aura}</span>
          </div>
          <p className="mt-3 text-[17px] italic leading-relaxed text-ink">
            “{item.mood.thought}”
          </p>
          <p className="label mt-4" style={{ color: "var(--accent)" }}>
            {item.mood.expressionLabel}
          </p>
        </div>

        {item.mood.notes?.length ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {item.mood.notes.map((n) => (
              <li
                key={n}
                className="rounded-full border border-line px-3 py-1.5 text-[11px] text-ink-2"
              >
                {n}
              </li>
            ))}
          </ul>
        ) : null}

        {/* Strain */}
        <div className="mt-7">
          <div className="flex items-center justify-between">
            <span className="label-quiet">Strain</span>
            <span className="label-quiet tabular-nums">
              {Math.round(item.strain * 100)} · {item.bpm} bpm
            </span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-brand"
              style={{
                width: `${Math.max(item.strain * 100, 3)}%`,
                backgroundColor: "var(--accent)",
              }}
            />
          </div>
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          {item.repo ? (
            <a
              href={item.repo.startsWith("http") ? item.repo : `https://${item.repo}`}
              target="_blank"
              rel="noreferrer noopener"
              className="label rounded-[6px] bg-[var(--accent)] px-4 py-2.5 text-white transition-colors duration-200 hover:opacity-90"
            >
              Source
            </a>
          ) : null}
          {item.kind === "podcast" ? (
            <a
              href={podcastUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="label rounded-[6px] border border-line px-4 py-2.5 text-ink transition-colors duration-200 hover:border-line-strong"
            >
              Watch
            </a>
          ) : null}
        </div>
      </div>

      {next && onNext ? (
        <footer className="shrink-0 border-t border-line px-7 py-5">
          <button
            type="button"
            onClick={() => onNext(next)}
            className="group flex w-full items-center justify-between gap-4 text-left"
          >
            <span className="min-w-0">
              <span className="label-quiet">Next</span>
              <span className="mt-1 block truncate text-[15px] text-ink">
                {next.title}
              </span>
            </span>
            <span
              aria-hidden
              className="shrink-0 text-ink-3 transition-transform duration-200 ease-brand group-hover:translate-x-1 group-hover:text-[var(--accent)]"
            >
              →
            </span>
          </button>
        </footer>
      ) : null}
    </aside>
  );
}