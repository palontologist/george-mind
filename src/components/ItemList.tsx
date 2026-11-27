"use client";

import type { MindItem } from "../lib/items";

/**
 * The index.
 *
 * A scrolled column of names, not a picker widget. Every entry is readable
 * without hovering, the current one is obvious, and the list is the same
 * length as the content — which is the point of a list.
 */

interface ItemListProps {
  items: MindItem[];
  selectedId: string | null;
  onSelect: (item: MindItem) => void;
  /** Drives the brain on /mind without committing the selection. */
  onHover?: (id: string | null) => void;
}

export default function ItemList({
  items,
  selectedId,
  onSelect,
  onHover,
}: ItemListProps) {
  if (!items.length) {
    return (
      <p className="px-5 py-8 text-sm text-ink-3">Nothing here yet.</p>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((item, index) => {
        const active = item.id === selectedId;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect(item)}
              onMouseEnter={() => onHover?.(item.id)}
              onFocus={() => onHover?.(item.id)}
              onMouseLeave={() => onHover?.(null)}
              onBlur={() => onHover?.(null)}
              aria-pressed={active}
              className={`group relative flex w-full items-center gap-4 rounded-xl px-4 py-4 text-left transition-all duration-300 ease-out-expo ${
                active
                  ? "bg-white/[0.06]"
                  : "hover:bg-white/[0.035]"
              }`}
            >
              <span
                aria-hidden
                className="absolute left-0 top-3 bottom-3 w-[2px] rounded-full transition-all duration-300"
                style={{
                  backgroundColor: active ? "var(--accent)" : "transparent",
                  opacity: active ? 1 : 0,
                }}
              />
              <span className="label-quiet w-6 shrink-0 tabular-nums text-ink-muted">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-[15px] font-medium leading-snug tracking-[-0.01em] transition-colors duration-200"
                  style={{ color: active ? "var(--foreground)" : "var(--ink-secondary)" }}
                >
                  {item.title}
                </span>
                {item.subtitle ? (
                  <span className="mt-1 block truncate text-[12px] leading-relaxed text-ink-3">
                    {item.subtitle}
                  </span>
                ) : null}
                {active ? (
                  <span className="label mt-2.5 inline-flex items-center gap-1.5 text-accent">
                    Read more <span aria-hidden>→</span>
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <span className="label-quiet tabular-nums text-ink-muted">
                  {Math.round(item.strain * 100)}
                </span>
                <span
                  aria-hidden
                  className="text-ink-muted transition-all duration-300 ease-out-expo group-hover:translate-x-0.5 group-hover:text-accent"
                >
                  →
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
