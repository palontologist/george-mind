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
      className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-[#181b2199]"
    >
      <header className="shrink-0 border-b border-line px-6 py-6 sm:px-7">
        <button
          type="button"
          onClick={onClose}
          className="label-quiet inline-flex items-center gap-2 transition-colors duration-200 hover:text-ink"
        >
          <span aria-hidden>←</span> All entries
        </button>
        <div className="mt-7 flex items-center gap-3">
          <span className="label text-accent">{item.kindLabel}</span>
          <span aria-hidden className="h-px w-8 bg-line-strong" />
          <span className="label-quiet text-ink-muted">{item.region.label}</span>
        </div>
        <h2 className="mt-4 text-[clamp(1.6rem,2.6vw,2.2rem)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">
          {item.title}
        </h2>
        {item.subtitle ? (
          <p className="mt-3 text-sm leading-relaxed text-ink-2">{item.subtitle}</p>
        ) : null}
      </header>

      <div className="flex-1 px-6 py-7 sm:px-7">
        {item.metrics ? (
          <p className="label-quiet leading-relaxed text-ink-3">{item.metrics}</p>
        ) : null}

        <p className="mt-5 max-w-[42rem] text-[15px] leading-[1.75] text-ink-2">{item.content}</p>

        {item.media?.type === "video" ? (
          <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-black/30 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <span className="label-quiet">{item.media.label ?? "Proof of work"}</span>
              <span className="label-quiet text-ink-muted">Video</span>
            </div>
            <video
              className="aspect-video w-full bg-black"
              controls
              preload="metadata"
              playsInline
              src={item.media.src}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : null}

        {/* How it felt */}
        <div className="glass mt-8 p-5 sm:p-6">
          <div className="flex items-baseline justify-between gap-3">
            <span className="label-quiet">How it felt</span>
            <span className="label-quiet text-ink-muted">{item.mood.aura}</span>
          </div>
          <p className="mt-4 text-[1.1rem] leading-[1.6] text-ink">
            <span className="text-[#d4522fcc]">“</span>
            {item.mood.thought}
            <span className="text-[#d4522fcc]">”</span>
          </p>
          <p className="label mt-5 text-accent">{item.mood.expressionLabel}</p>
        </div>

        {item.mood.notes?.length ? (
          <ul className="mt-6 flex flex-wrap gap-2">
            {item.mood.notes.map((n) => (
              <li
                key={n}
                className="rounded-full border border-line bg-white/[0.02] px-3 py-1.5 text-[11px] tracking-[0.01em] text-ink-2"
              >
                {n}
              </li>
            ))}
          </ul>
        ) : null}

        {/* Strain */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <span className="label-quiet">Strain</span>
            <span className="label-quiet tabular-nums text-ink-muted">
              {Math.round(item.strain * 100)} · {item.bpm} bpm
            </span>
          </div>
          <div className="mt-3 h-[3px] overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-brand"
              style={{
                width: `${Math.max(item.strain * 100, 3)}%`,
                background: "linear-gradient(90deg, var(--accent), var(--accent-bright))",
              }}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          {item.luma ? (
            <a
              href={item.luma}
              target="_blank"
              rel="noreferrer noopener"
              className="label inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-white transition-all duration-300 hover:bg-accent-bright"
            >
              Luma <span aria-hidden>↗</span>
            </a>
          ) : null}
          {item.repo ? (
            <a
              href={item.repo.startsWith("http") ? item.repo : `https://${item.repo}`}
              target="_blank"
              rel="noreferrer noopener"
              className={`label inline-flex items-center gap-2 rounded-full px-5 py-3 transition-all duration-300 ${
                item.luma
                  ? "border border-line text-ink-2 hover:border-line-strong hover:text-ink"
                  : "bg-accent text-white hover:bg-accent-bright"
              }`}
            >
              Source <span aria-hidden>↗</span>
            </a>
          ) : null}
          {item.kind === "podcast" ? (
            <a
              href={podcastUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="label inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-ink-2 transition-all duration-300 hover:border-line-strong hover:text-ink"
            >
              Watch <span aria-hidden>↗</span>
            </a>
          ) : null}
        </div>
      </div>

      {next && onNext ? (
        <footer className="shrink-0 border-t border-line px-6 py-5 sm:px-7">
          <button
            type="button"
            onClick={() => onNext(next)}
            className="group flex w-full items-center justify-between gap-4 text-left"
          >
            <span className="min-w-0">
              <span className="label-quiet text-ink-muted">Next</span>
              <span className="mt-1.5 block truncate text-[15px] font-medium text-ink transition-colors duration-200 group-hover:text-accent">
                {next.title}
              </span>
            </span>
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-ink-3 transition-all duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:border-[var(--line-accent)] group-hover:text-accent"
            >
              →
            </span>
          </button>
        </footer>
      ) : null}
    </aside>
  );
}