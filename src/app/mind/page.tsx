"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import Contact from "../../components/Contact";
import ItemDetail from "../../components/ItemDetail";
import ItemList from "../../components/ItemList";
import { KINDS, MIND_DATA, findKind, type KindId, type MindItem } from "../../lib/items";
import { AURAS, type ExpressionKey } from "../../lib/expressions";

const MindAtlas = dynamic(() => import("../../components/MindAtlas"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

/**
 * The mind.
 *
 * Same shape as the face: a still subject on one side, a scrollable index on
 * the other. No essay, no ranked table — the brain is the only explanation and
 * it reacts to whatever you are pointing at.
 */
export default function MindPage() {
  const [kindId, setKindId] = useState<KindId>("projects");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);

  const kind = findKind(kindId);

  const selected = useMemo(
    () => kind.items.find((i) => i.id === selectedId) ?? null,
    [kind, selectedId]
  );

  // Hover previews a region; selection commits it. Hovering wins so sweeping
  // the cursor across the list walks the brain before you commit to anything.
  const active: MindItem | null = useMemo(() => {
    const hovered = kind.items.find((i) => i.id === hoverId) ?? null;
    return hovered ?? selected ?? kind.items[0] ?? null;
  }, [hoverId, kind.items, selected]);

  const emotion: ExpressionKey = active?.mood.expression ?? "neutral";

  // Switching wires drops the selection, so the brain never lights a project
  // while you are looking at events.
  useEffect(() => {
    setSelectedId(null);
    setHoverId(null);
    setOpen(false);
  }, [kindId]);

  // Two presses, two jobs: the first lights the region, the second opens the
  // column. Hover still previews without committing.
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
    <main className="relative flex min-h-screen w-full flex-col overflow-x-hidden bg-ground text-ink lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* ---------------- Connectome ---------------- */}
      <section className="relative flex h-[58vh] min-h-[420px] min-w-0 shrink-0 flex-col overflow-hidden lg:h-auto lg:min-h-0 lg:flex-1">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 transition-colors duration-700 ease-brand"
          style={{
            color: AURAS[emotion]?.rimColor ?? "var(--accent)",
            background:
              "radial-gradient(60% 55% at 50% 46%, color-mix(in srgb, currentColor 18%, transparent) 0%, transparent 72%)",
          }}
        />
        <div aria-hidden className="stage-vignette pointer-events-none absolute inset-0 z-[1]" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-40 bg-gradient-to-b from-[#111318b3] to-transparent" />

        <header className="pointer-events-none relative z-20 flex items-start justify-between gap-6 px-6 pt-6 sm:px-10 lg:px-12 lg:pt-8">
          <div className="min-w-0">
            <p className="label mb-3 text-accent">Neural Atlas</p>
            <h1 className="display-title max-w-[12ch] text-[clamp(2rem,5vw,4.5rem)] text-ink">
              {MIND_DATA.subject}
            </h1>
            <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium uppercase tracking-[0.24em] text-ink-3">
              {MIND_DATA.coordinates.map((c, i) => (
                <span key={c} className="flex items-center gap-3">
                  {i > 0 ? <span aria-hidden className="h-px w-3 bg-line-strong" /> : null}
                  <span>{c}</span>
                </span>
              ))}
            </p>
          </div>
          <Link
            href="/"
            className="label pointer-events-auto mt-1 inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-white/[0.03] px-4 py-2.5 text-ink-2 backdrop-blur-sm transition-all duration-300 ease-out-expo hover:border-line-strong hover:bg-white/[0.06] hover:text-ink"
          >
            <span>The face</span>
            <span aria-hidden className="text-accent">→</span>
          </Link>
        </header>

        <div className="relative z-[2] min-h-0 min-w-0 flex-1">
          <MindAtlas
            lobeId={active?.lobeId ?? null}
            nodeIndex={active?.nodeIndex ?? -1}
            expression={emotion}
          />
        </div>

        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-44 bg-gradient-to-t from-ground via-[#11131899] to-transparent" />

        <footer className="pointer-events-none relative z-20 px-6 pb-7 pt-2 sm:px-10 lg:px-12 lg:pb-10">
          <div className="flex items-end justify-between gap-6">
            <div className="min-w-0">
              <p className="label text-accent">{active ? active.region.label : "—"}</p>
              <p className="mt-3 max-w-[34rem] text-[clamp(1rem,1.8vw,1.35rem)] leading-[1.45] text-ink-2">
                <span className="text-[#f3f1eee6]">
                  {active
                    ? `“${active.mood.thought}”`
                    : "Pick something. I'll light the part of you it came from."}
                </span>
              </p>
            </div>
            {active ? (
              <div className="hidden shrink-0 pb-1 sm:block">
                <p className="label-quiet text-right">Active region</p>
                <p className="mt-2 max-w-[16rem] text-right text-sm text-ink-3">{active.title}</p>
              </div>
            ) : null}
          </div>
        </footer>
      </section>

      {/* ---------------- Index ---------------- */}
      <aside
        className={`relative flex min-h-0 w-full shrink-0 flex-col border-t border-line bg-[#181b21d1] backdrop-blur-xl lg:h-full lg:border-l lg:border-t-0 ${
          open && selected ? "lg:w-[32rem] xl:w-[36rem]" : "lg:w-[26rem] xl:w-[30rem]"
        }`}
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#d4522f66] to-transparent lg:hidden" />

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
            <nav className="flex shrink-0 border-b border-line px-2 sm:px-3">
              {KINDS.map((k) => {
                const on = k.id === kindId;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setKindId(k.id)}
                    aria-pressed={on}
                    className="label relative flex-1 px-3 py-5 transition-colors duration-300 ease-out-expo"
                    style={{ color: on ? "var(--foreground)" : "var(--ink-tertiary)" }}
                  >
                    <span className="relative z-10">{k.label}</span>
                    <span
                      aria-hidden
                      className="absolute inset-x-4 bottom-0 h-[2px] rounded-full transition-all duration-300 ease-out-expo"
                      style={{ backgroundColor: on ? "var(--accent)" : "transparent", opacity: on ? 1 : 0 }}
                    />
                  </button>
                );
              })}
            </nav>

            <div className="flex items-baseline justify-between px-6 py-5">
              <span className="label-quiet">{kind.caption}</span>
              <span className="label-quiet tabular-nums text-ink-muted">
                {String(kind.items.length).padStart(2, "0")}
              </span>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto px-2 pb-2"
              onMouseLeave={() => setHoverId(null)}
            >
              <ItemList
                items={kind.items}
                selectedId={selectedId}
                onSelect={select}
                onHover={setHoverId}
              />
            </div>

            <Contact />
          </>
        )}
      </aside>
    </main>
  );
}