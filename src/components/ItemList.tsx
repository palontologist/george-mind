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
    <ul className="divide-y divide-line">
      {items.map((item) => {
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
              className="group flex w-full items-center gap-4 px-5 py-5 text-left transition-colors duration-200 ease-brand hover:bg-white/[0.04]"
              style={active ? { backgroundColor: "var(--accent-soft)" } : undefined}
            >
              {/* Active marker is a square, matching the brand's dot rule. */}
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 transition-colors duration-200"
                style={{ backgroundColor: active ? "var(--accent)" : "transparent" }}
              />
              <span className="min-w-0 flex-1">
                <span
                  className="block truncate text-[17px] leading-snug transition-colors duration-200"
                  style={{ color: active ? "var(--accent)" : "var(--foreground)" }}
                >
                  {item.title}
                </span>
                {item.subtitle ? (
                  <span className="mt-1 block truncate text-[13px] text-ink-3">
                    {item.subtitle}
                  </span>
                ) : null}
                {/* The second press. Say so, or nobody finds it. */}
                {active ? (
                  <span className="label mt-2.5 block" style={{ color: "var(--accent)" }}>
                    Read more →
                  </span>
                ) : null}
              </span>
              <span className="label-quiet shrink-0 tabular-nums">
                {Math.round(item.strain * 100)}
              </span>
              <span
                aria-hidden
                className="shrink-0 text-ink-3 transition-transform duration-200 ease-brand group-hover:translate-x-0.5 group-hover:text-ink"
              >
                →
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
