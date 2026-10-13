"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import CommentStream from "../components/CommentStream";
import Contact from "../components/Contact";
import ItemDetail from "../components/ItemDetail";
import ItemList from "../components/ItemList";
import { KINDS, MIND_DATA, findKind, type KindId, type MindItem } from "../lib/items";
import { AURAS, type ExpressionKey } from "../lib/expressions";

const MindStage = dynamic(() => import("../components/MindStage"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export default function Home() {
  const [kindId, setKindId] = useState<KindId>("projects");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const kind = findKind(kindId);

  const selected = useMemo(
    () => kind.items.find((i) => i.id === selectedId) ?? null,
    [kind, selectedId]
  );

  // Before anything is chosen the face still has to be doing something — the
  // first entry stands in until you pick.
  const active: MindItem | null = selected ?? kind.items[0] ?? null;

  const emotion: ExpressionKey = active?.mood.expression ?? "neutral";

  // Switching wires drops the selection, so the face never shows a project
  // while you are looking at events.
  useEffect(() => {
    setSelectedId(null);
    setOpen(false);
  }, [kindId]);

  // Two presses, two jobs. The first puts the face into that project's
  // expression; the second is the "read more" step that opens the column.
  // Doing both on one click buries the face under a panel the moment you
  // touch the list.
  const select = useCallback(
    (item: MindItem) => {
      if (selectedId === item.id) {
        setOpen(true);
        return;
      }
      setSelectedId(item.id);
      setOpen(false);
    },
    [selectedId]
  );

  /** Stepping with "Next" stays inside the column. */
  const step = useCallback((item: MindItem) => {
    setSelectedId(item.id);
    setOpen(true);
  }, []);

  const next = useMemo(() => {
    if (!selected) return null;
    const i = kind.items.findIndex((x) => x.id === selected.id);
    return kind.items[(i + 1) % kind.items.length] ?? null;
  }, [kind, selected]);

  return (
    <main className="flex min-h-screen w-full flex-col overflow-x-hidden bg-ground text-ink lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* ---------------- Portrait ---------------- */}
      <section className="relative flex h-[54vh] min-h-[380px] min-w-0 shrink-0 flex-col lg:h-auto lg:min-h-0 lg:flex-1">
        {/* A wall behind the head, in the colour of whatever it is currently
            feeling. A face on an empty ground reads as an object in a void no
            matter how big you make it. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.17] transition-colors duration-700 ease-brand"
          style={{
            color: AURAS[emotion]?.rimColor ?? "var(--accent)",
            background:
              "radial-gradient(56% 50% at 50% 48%, currentColor 0%, transparent 72%)",
          }}
        />

        <header className="pointer-events-none relative z-20 flex items-start justify-between gap-4 px-6 pt-6 sm:px-10 lg:px-12 lg:pt-8">
          <div>
            <h1 className="label text-ink">{MIND_DATA.subject}</h1>
            <p className="mt-2 text-[11px] tracking-[0.2em] text-ink-3">
              {MIND_DATA.coordinates.join(" · ")}
            </p>
          </div>
          <Link
            href="/mind"
            className="label pointer-events-auto shrink-0 rounded-[6px] border border-line px-3.5 py-2.5 text-ink-2 transition-colors duration-200 ease-brand hover:border-line-strong hover:text-ink"
          >
            The mind →
          </Link>
        </header>

        {/* Notes float over the head. */}
        <div className="pointer-events-none relative z-20 flex shrink-0 items-end justify-center px-6">
          <CommentStream
            notes={active?.mood.notes ?? []}
            resetKey={active?.id ?? "none"}
          />
        </div>

        <div className="relative min-h-0 min-w-0 flex-1">
          <MindStage emotion={emotion} emphasis={open ? 0 : 1} />
        </div>

        <footer className="pointer-events-none relative z-20 px-6 pb-6 pt-2 sm:px-10 lg:px-12 lg:pb-8">
          <p className="label" style={{ color: "var(--accent)" }}>
            {active ? active.mood.expressionLabel : "—"}
          </p>
          <p className="mt-2 max-w-[36rem] text-[15px] italic leading-relaxed text-ink-2">
            {active
              ? `“${active.mood.thought}”`
              : "Pick something. I'll tell you how it went."}
          </p>
        </footer>
      </section>

      {/* ---------------- Index ---------------- */}
      <aside
        className={`flex min-h-0 w-full shrink-0 flex-col border-t border-line bg-surface lg:h-full lg:border-l lg:border-t-0 ${
          open && selected ? "lg:w-[32rem] xl:w-[36rem]" : "lg:w-[26rem] xl:w-[30rem]"
        }`}
      >
        {open && selected ? (
          <ItemDetail
            item={selected}
            podcastUrl={MIND_DATA.podcastUrl}
            onClose={() => setOpen(false)}
            next={next}
            onNext={step}
          />
        ) : (
          <>
            <nav className="flex shrink-0 border-b border-line">
              {KINDS.map((k) => {
                const on = k.id === kindId;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKindId(k.id)}
                    aria-pressed={on}
                    className="label relative flex-1 px-3 py-5 transition-colors duration-200 ease-brand"
                    style={{ color: on ? "var(--foreground)" : "var(--ink-tertiary)" }}
                  >
                    {k.label}
                    <span
                      aria-hidden
                      className="absolute inset-x-3 bottom-0 h-px transition-colors duration-200 ease-brand"
                      style={{ backgroundColor: on ? "var(--accent)" : "transparent" }}
                    />
                  </button>
                );
              })}
            </nav>

            <div className="flex items-baseline justify-between px-5 py-4">
              <span className="label-quiet">{kind.caption}</span>
              <span className="label-quiet tabular-nums">
                {kind.items.length} {kind.items.length === 1 ? "entry" : "entries"}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <ItemList items={kind.items} selectedId={selectedId} onSelect={select} />
            </div>

            <Contact />
          </>
        )}
      </aside>
    </main>
  );
}
