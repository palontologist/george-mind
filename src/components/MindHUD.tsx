"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  ExternalLink,
  Volume2,
  VolumeX,
  Gauge,
  BookOpen,
  X,
  Move3d,
  ChevronRight,
} from "lucide-react";
import connectomeData from "../data/connectome.json";
import type { Lobe, ProjectNode } from "../types/connectome";
import { EXPRESSIONS, type ExpressionKey } from "../lib/expressions";
import type { Quality } from "./MindScene";
import type { PlacedLobe } from "../lib/layout";
import ThoughtStream from "./ThoughtStream";

const data = connectomeData as unknown as { lobes: Lobe[]; subject: string; coordinates: string[] };

/* ------------------------------------------------------------------ */
/*  Entry gate                                                         */
/* ------------------------------------------------------------------ */

export function EntryGate({
  onEnter,
  onEditorial,
  loading,
  progress,
}: {
  onEnter: () => void;
  onEditorial: () => void;
  loading: boolean;
  progress: number;
}) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#04070d] px-6">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(56,189,248,0.14), transparent 70%)",
        }}
      />
      <div className="relative z-10 max-w-2xl text-center">
        <p className="mb-6 font-mono text-[10px] uppercase tracking-[0.5em] text-cyan-400/70">
          Nairobi · San Francisco · New York
        </p>

        <h1 className="text-5xl font-light tracking-tight text-white sm:text-7xl">
          {data.subject}
        </h1>

        <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed text-zinc-400">
          This is not a portfolio page. It is the inside of a mind — seven regions, each
          one carrying what the work actually felt like.
        </p>

        <div className="mx-auto mt-10 h-px w-56 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />

        <div className="mt-10 flex flex-col items-center gap-4">
          <button
            onClick={onEnter}
            disabled={loading}
            className="group relative overflow-hidden rounded-full border border-cyan-400/40 bg-cyan-400/10 px-10 py-3.5 font-mono text-xs uppercase tracking-[0.28em] text-cyan-200 transition-all hover:border-cyan-300 hover:bg-cyan-400/20 hover:text-white disabled:opacity-40"
          >
            {loading ? (
              <span className="flex items-center gap-3">
                <span className="h-1 w-32 overflow-hidden rounded-full bg-cyan-400/20">
                  <span
                    className="block h-full rounded-full bg-cyan-300 transition-[width] duration-300"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </span>
                {Math.round(progress * 100)}%
              </span>
            ) : (
              <span className="transition-transform group-hover:scale-105">Enter the mind</span>
            )}
          </button>

          <button
            onClick={onEditorial}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            or read it flat →
          </button>
        </div>

        <p className="mt-12 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
          WASD move · mouse look · click a region · esc release
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Pause / pointer-lock gate                                          */
/* ------------------------------------------------------------------ */

export function PauseGate({ onResume, onEditorial }: { onResume: () => void; onEditorial: () => void }) {
  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#04070d]/80 backdrop-blur-xl">
      <div className="text-center">
        <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-cyan-400/60">
          Link suspended
        </p>
        <h2 className="mt-4 text-3xl font-light text-white">Take a breath.</h2>
        <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-zinc-400">
          {data.subject} is still in here. Click to go back in.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={onResume}
            className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-8 py-3 font-mono text-xs uppercase tracking-[0.25em] text-cyan-200 transition-colors hover:bg-cyan-400/20 hover:text-white"
          >
            Resume
          </button>
          <button
            onClick={onEditorial}
            className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300"
          >
            Read flat instead
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Look hint — shown when pointer lock is unavailable                 */
/* ------------------------------------------------------------------ */

export function LookHint({ onDismiss }: { onDismiss: () => void }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-6">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-black/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 backdrop-blur-xl">
        <Move3d className="h-3.5 w-3.5 text-cyan-400/70" />
        <span className="hidden sm:inline">Drag to look</span>
        <span className="sm:hidden">Drag right side to look · left side to move</span>
        <button
          onClick={() => {
            setDismissed(true);
            onDismiss();
          }}
          className="ml-1 rounded-full border border-white/15 px-2 py-0.5 text-[9px] text-zinc-500 transition-colors hover:border-white/40 hover:text-zinc-200"
        >
          dismiss
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Emotion readout                                                    */
/* ------------------------------------------------------------------ */

/**
 * Live readout of how hard each facial channel is being driven.
 * Levels come straight from the active expression preset.
 */
function ExpressionBars({ emotion, color }: { emotion: ExpressionKey; color: string }) {
  const e = EXPRESSIONS[emotion];
  const channels: [string, number][] = [
    ["brow", Math.min(1, Math.abs(e.browDown) + Math.abs(e.browInnerUp) + Math.abs(e.browOuterUp) * 0.6)],
    ["eyes", Math.min(1, Math.max(0, e.eyeWide) + e.eyeSquint + e.eyeBlink)],
    ["mouth", Math.min(1, e.mouthSmile + e.mouthFrown + e.mouthPress + e.mouthPucker)],
    ["jaw", Math.min(1, e.jawOpen)],
    ["tense", e.tension],
  ];
  return (
    <div className="flex items-end gap-[3px]">
      {channels.map(([label, level]) => (
        <div key={label} className="flex flex-col items-center gap-1">
          <div className="flex h-8 w-[3px] flex-col justify-end overflow-hidden rounded-full bg-white/10">
            <span
              className="w-full rounded-full transition-all duration-700"
              style={{ height: `${Math.max(level * 100, 4)}%`, backgroundColor: color }}
            />
          </div>
          <span className="font-mono text-[6px] uppercase tracking-wider opacity-40">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Minimap                                                            */
/* ------------------------------------------------------------------ */

function Minimap({
  player,
  activeId,
  lobes,
}: {
  player: { x: number; z: number };
  activeId: string | null;
  lobes: PlacedLobe[];
}) {
  const SIZE = 132;
  const R = 58;
  const scale = R / 24;

  return (
    <svg
      width={SIZE}
      height={SIZE}
      className="pointer-events-none opacity-70"
      viewBox={`0 0 ${SIZE} ${SIZE}`}
    >
      <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="rgba(4,8,16,0.6)" stroke="rgba(148,163,184,0.18)" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={R * 0.62} fill="none" stroke="rgba(148,163,184,0.1)" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={R * 0.3} fill="none" stroke="rgba(148,163,184,0.1)" />
      <circle cx={SIZE / 2} cy={SIZE / 2} r={2} fill="rgba(125,211,252,0.6)" />

      {lobes.map((lobe) => {
        const x = SIZE / 2 + lobe.worldPosition.x * scale;
        const y = SIZE / 2 + lobe.worldPosition.z * scale;
        const active = lobe.id === activeId;
        return (
          <circle
            key={lobe.id}
            cx={x}
            cy={y}
            r={active ? 4 : 2.4}
            fill={lobe.color}
            opacity={active ? 1 : 0.55}
          />
        );
      })}

      <g
        transform={`translate(${SIZE / 2 + player.x * scale} ${SIZE / 2 + player.z * scale})`}
      >
        <circle r={9} fill="rgba(125,211,252,0.12)" />
        <path d="M0,-5 L3.5,4 L0,2 L-3.5,4 Z" fill="#7dd3fc" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Project drawer                                                     */
/* ------------------------------------------------------------------ */

function ProjectCard({ node, color }: { node: ProjectNode; color: string }) {
  const mood = node.mood;
  return (
    <article className="group relative rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/20 hover:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium leading-snug text-zinc-100">{node.title}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">{node.subtitle}</p>
        </div>
        {node.repo && (
          <a
            href={node.repo}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-zinc-600 transition-colors hover:text-cyan-300"
            aria-label={`Open ${node.title}`}
          >
            <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
      </div>

      {node.metrics && (
        <div
          className="mt-3 inline-block rounded border px-2 py-0.5 font-mono text-[10px]"
          style={{ color, borderColor: `${color}33`, backgroundColor: `${color}12` }}
        >
          {node.metrics}
        </div>
      )}

      <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">{node.content}</p>

      {mood && (
        <div className="mt-4 border-l-2 pl-3" style={{ borderColor: `${color}55` }}>
          <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color }}>
            Feeling · {mood.emotion}
          </p>
          <p className="mt-1 font-serif text-[13px] italic leading-relaxed text-zinc-300">
            &ldquo;{mood.thought}&rdquo;
          </p>
          <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-zinc-600">
            {mood.expressionLabel} · {mood.aura}
          </p>
        </div>
      )}
    </article>
  );
}

export function LobeDrawer({
  lobe,
  onClose,
  onProjectHover,
}: {
  lobe: Lobe;
  onClose: () => void;
  onProjectHover: (node: ProjectNode | null, index: number) => void;
}) {
  return (
    <aside className="absolute right-0 top-0 bottom-0 z-30 flex w-full flex-col border-l border-white/10 bg-[#04070d]/92 backdrop-blur-2xl sm:w-[460px]">
      <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
        <div className="min-w-0">
          <span
            className="rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.2em]"
            style={{
              color: lobe.color,
              borderColor: `${lobe.color}44`,
              backgroundColor: `${lobe.color}14`,
            }}
          >
            {lobe.tag}
          </span>
          <h2 className="mt-2.5 font-serif text-xl leading-tight text-white">{lobe.name}</h2>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        <p className="text-[13px] leading-relaxed text-zinc-400">{lobe.description}</p>

        <div
          className="mt-5 rounded-xl border p-4"
          style={{ borderColor: `${lobe.color}22`, backgroundColor: `${lobe.color}08` }}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-zinc-500">
              Current state
            </span>
            <span className="font-mono text-[9px]" style={{ color: lobe.color }}>
              {lobe.mood.aura}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium text-zinc-100">{lobe.mood.emotion}</p>
          <ThoughtStream
            lines={lobe.mood.thoughts}
            interval={8000}
            className="mt-2 text-[13px] text-zinc-300"
          />
        </div>

        <div className="mt-8">
          <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-500">
            What lives here
          </h3>
          <div className="space-y-3">
            {lobe.nodes.map((node, index) => (
              <div
                key={node.title}
                onMouseEnter={() => onProjectHover(node, index)}
                onMouseLeave={() => onProjectHover(null, -1)}
              >
                <ProjectCard node={node} color={lobe.color} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/*  Main HUD                                                           */
/* ------------------------------------------------------------------ */

export interface HudProps {
  lobes: PlacedLobe[];
  activeLobe: Lobe | null;
  hoveredLobe: Lobe | null;
  emotion: ExpressionKey;
  muted: boolean;
  quality: Quality;
  onToggleMute: () => void;
  onCycleQuality: () => void;
  onEditorial: () => void;
  onClose: () => void;
  player: { x: number; z: number };
  /** Lifts the brain's light onto the hovered project's sub-region. */
  onProjectFocus?: (node: ProjectNode | null, index: number) => void;
}

export default function MindHUD({
  lobes,
  activeLobe,
  hoveredLobe,
  emotion,
  muted,
  quality,
  onToggleMute,
  onCycleQuality,
  onEditorial,
  onClose,
  player,
  onProjectFocus,
}: HudProps) {
  const [nodeMood, setNodeMood] = useState<ProjectNode | null>(null);

  const focus = activeLobe ?? hoveredLobe;
  const color = focus?.color ?? "#38bdf8";
  const mood = nodeMood?.mood ?? focus?.mood ?? null;
  const lines = nodeMood?.mood?.thoughts ?? focus?.mood?.thoughts ?? [];

  // Hovering a project both swaps the mood card and aims the brain at that
  // project's region, so the two never disagree about what is being read.
  const handleProjectHover = (node: ProjectNode | null, index: number) => {
    setNodeMood(node);
    onProjectFocus?.(node, index);
  };

  return (
    <>
      {/* Crosshair */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
        <div
          className="h-1.5 w-1.5 rounded-full transition-all duration-500"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 12px ${color}, 0 0 4px ${color}`,
            transform: `scale(${focus ? 1.6 : 1})`,
          }}
        />
        <div
          className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border opacity-25 transition-all duration-500"
          style={{ borderColor: color, transform: `scale(${focus ? 1 : 0.7})` }}
        />
      </div>

      {/* Top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 py-4">
        <div className="pointer-events-auto">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500">
            {data.subject}
          </p>
          <p className="font-mono text-[10px] tracking-[0.2em] text-zinc-600">
            {data.coordinates.join(" · ")}
          </p>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={onToggleMute}
            className="rounded-lg border border-white/10 bg-black/40 p-2 text-zinc-400 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
            aria-label={muted ? "Unmute" : "Mute"}
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={onCycleQuality}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-400 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
            title="Rendering quality"
          >
            <Gauge className="mr-1 inline h-3 w-3" />
            {quality === "performance" ? "perf" : quality === "balanced" ? "bal" : "high"}
          </button>
          <button
            onClick={onEditorial}
            className="rounded-lg border border-white/10 bg-black/40 px-2.5 py-2 font-mono text-[9px] uppercase tracking-[0.15em] text-zinc-400 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
          >
            <BookOpen className="mr-1 inline h-3 w-3" />
            flat
          </button>
        </div>
      </header>

      {/* Bottom-left: live emotional state */}
      <div
        className="pointer-events-none absolute bottom-5 left-5 z-20 w-[min(24rem,calc(100vw-2.5rem))] rounded-2xl border border-white/10 bg-black/55 p-4 backdrop-blur-xl transition-all duration-500"
        style={{ borderColor: `${color}2e` }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[9px] uppercase tracking-[0.25em] text-zinc-500">
              {focus ? (nodeMood ? "project · state" : "region · state") : "idle"}
            </p>
            <p className="mt-1 truncate text-sm font-medium" style={{ color }}>
              {nodeMood?.title ?? focus?.name ?? "Wandering"}
            </p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
              {mood?.emotion ?? "Open · Unanchored"}
            </p>
          </div>
          <div className="shrink-0 text-zinc-400">
            <ExpressionBars emotion={emotion} color={color} />
          </div>
        </div>

        <p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-zinc-600">
          {mood?.expressionLabel ?? "Face · neutral"}
        </p>

        <div className="mt-3 min-h-[3.2rem] border-t border-white/10 pt-3">
          {focus || nodeMood ? (
            <ThoughtStream
              lines={lines.length ? lines : ["…"]}
              key={`${focus?.id ?? "none"}-${nodeMood?.title ?? ""}`}
              interval={8200}
              className="text-[13px] text-zinc-200"
            />
          ) : (
            <p className="font-serif text-[13px] italic text-zinc-500">
              Walk toward a light to hear what I thought about it.
            </p>
          )}
        </div>
      </div>

      {/* Bottom-right: minimap + prompt */}
      <div className="pointer-events-none absolute bottom-5 right-5 z-20 hidden flex-col items-end gap-3 md:flex">
        <div className="rounded-full border border-white/10 bg-black/40 p-1.5 backdrop-blur">
          <Minimap player={player} activeId={activeLobe?.id ?? null} lobes={lobes} />
        </div>
        {focus && (
          <div
            className="flex items-center gap-2 rounded-full border bg-black/60 px-3.5 py-2 font-mono text-[10px] uppercase tracking-[0.18em] backdrop-blur"
            style={{ borderColor: `${color}44`, color }}
          >
            <Move3d className="h-3 w-3" />
            {activeLobe?.id === focus.id ? "esc to release" : "click to enter"}
            <ChevronRight className="h-3 w-3" />
          </div>
        )}
      </div>

      {activeLobe && (
        <LobeDrawer lobe={activeLobe} onClose={onClose} onProjectHover={handleProjectHover} />
      )}

      <a
        href={connectomeData.podcastUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="pointer-events-auto absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-red-500/25 bg-black/50 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-red-400/90 backdrop-blur transition-colors hover:border-red-400/60 hover:text-red-300 md:hidden"
      >
        <ExternalLink className="mr-1.5 inline h-3 w-3" />
        Podcast
      </a>
    </>
  );
}