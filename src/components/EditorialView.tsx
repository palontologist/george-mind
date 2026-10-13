"use client";

import { ArrowUpRight } from "lucide-react";
import connectomeData from "../data/connectome.json";
import type { Lobe } from "../types/connectome";
import { EXPRESSIONS, type ExpressionKey } from "../lib/expressions";
import ThoughtStream from "./ThoughtStream";

const data = connectomeData as unknown as {
  subject: string;
  coordinates: string[];
  tagline: string;
  podcastUrl: string;
  lobes: Lobe[];
};

/** Small inline face preview so each region carries its feeling in text too. */
function MoodGlyph({ expression, color }: { expression: ExpressionKey; color: string }) {
  const e = EXPRESSIONS[expression];
  const browY = -6 - e.browInnerUp * 3 + e.browDown * 2.5;
  const browTilt = e.browOuterUp * 3 - e.browDown * 2;
  const lid = e.eyeBlink * 3 + e.eyeSquint * 1.6;
  const mouthCurve = e.mouthSmile * 4 - e.mouthFrown * 3.5;
  const open = e.jawOpen * 4;

  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
      <circle cx="20" cy="20" r="18" fill="none" stroke={color} strokeOpacity="0.28" />
      <circle cx="20" cy="20" r="18" fill={color} fillOpacity="0.06" />
      {/* brows */}
      <path
        d={`M12 ${browY + browTilt} Q14.5 ${browY - 1.5} 17 ${browY}`}
        stroke={color}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d={`M23 ${browY} Q25.5 ${browY - 1.5} 28 ${browY + browTilt}`}
        stroke={color}
        strokeWidth="1.3"
        fill="none"
        strokeLinecap="round"
      />
      {/* eyes */}
      <ellipse cx="14.5" cy="19" rx="2.3" ry={Math.max(0.5, 2.1 - lid * 0.5)} fill={color} fillOpacity="0.85" />
      <ellipse cx="25.5" cy="19" rx="2.3" ry={Math.max(0.5, 2.1 - lid * 0.5)} fill={color} fillOpacity="0.85" />
      {/* mouth */}
      {open > 0.6 ? (
        <ellipse cx="20" cy="28" rx={2.4 + e.mouthPucker * 1.2} ry={open} fill={color} fillOpacity="0.8" />
      ) : (
        <path
          d={`M15.5 28 Q20 ${28 + mouthCurve} 24.5 28`}
          stroke={color}
          strokeWidth="1.4"
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

export default function EditorialView({ onBack }: { onBack: () => void }) {
  return (
    <div className="h-screen w-full overflow-y-auto bg-[#04070d] text-zinc-100">
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-8">
        <button
          onClick={onBack}
          className="mb-12 rounded-full border border-white/15 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-400 transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
        >
          ← back inside
        </button>

        <header className="border-b border-white/10 pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.4em] text-cyan-400/70">
            {data.tagline}
          </p>
          <h1 className="mt-4 text-4xl font-light tracking-tight sm:text-5xl">{data.subject}</h1>
          <p className="mt-3 font-mono text-[11px] tracking-[0.2em] text-zinc-500">
            {data.coordinates.join(" · ")}
          </p>
          <p className="mt-6 max-w-xl text-sm leading-relaxed text-zinc-400">
            Seven regions of one mind. Each holds a body of work and, just as importantly, what
            that work felt like to build. The feelings are not decoration — they are the other
            half of the engineering.
          </p>
          <a
            href={data.podcastUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-red-500/25 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-red-400 transition-colors hover:border-red-400/60"
          >
            <ArrowUpRight className="h-3 w-3" />
            @frontforumfocus — 40+ episodes
          </a>
        </header>

        <div className="mt-14 space-y-20">
          {data.lobes.map((lobe) => (
            <section key={lobe.id}>
              <div className="flex items-start gap-4 border-b border-white/10 pb-5">
                <MoodGlyph expression={lobe.mood.expression} color={lobe.color} />
                <div className="min-w-0 flex-1">
                  <p
                    className="font-mono text-[10px] uppercase tracking-[0.25em]"
                    style={{ color: lobe.color }}
                  >
                    {lobe.tag}
                  </p>
                  <h2 className="mt-1.5 font-serif text-2xl leading-tight text-white">
                    {lobe.name}
                  </h2>
                  <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                    {lobe.mood.emotion} · {lobe.mood.aura}
                  </p>
                  <p className="mt-2 text-xs italic text-zinc-500">{lobe.mood.expressionLabel}</p>
                </div>
              </div>

              <p className="mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400">
                {lobe.description}
              </p>

              <div className="mt-5 max-w-2xl rounded-xl border-l-2 bg-white/[0.02] py-3 pl-4"
                style={{ borderColor: `${lobe.color}55` }}
              >
                <ThoughtStream
                  lines={lobe.mood.thoughts}
                  interval={8200}
                  className="text-sm text-zinc-300"
                />
              </div>

              <div className="mt-7 space-y-4">
                {lobe.nodes.map((node) => (
                  <article
                    key={node.title}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-5 transition-colors hover:border-white/20"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="text-[15px] font-medium text-zinc-100">{node.title}</h3>
                        <p className="mt-0.5 text-xs text-zinc-500">{node.subtitle}</p>
                      </div>
                      {node.repo && (
                        <a
                          href={node.repo}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-zinc-600 transition-colors hover:text-cyan-300"
                        >
                          <ArrowUpRight className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {node.metrics && (
                      <div
                        className="mt-3 inline-block rounded border px-2 py-0.5 font-mono text-[10px]"
                        style={{
                          color: lobe.color,
                          borderColor: `${lobe.color}33`,
                          backgroundColor: `${lobe.color}12`,
                        }}
                      >
                        {node.metrics}
                      </div>
                    )}
                    <p className="mt-3 text-[13px] leading-relaxed text-zinc-400">{node.content}</p>

                    {node.mood && (
                      <div className="mt-4 border-l-2 border-white/10 pl-3">
                        <p
                          className="font-mono text-[9px] uppercase tracking-[0.2em]"
                          style={{ color: lobe.color }}
                        >
                          Feeling · {node.mood.emotion}
                        </p>
                        <p className="mt-1 font-serif text-[13px] italic leading-relaxed text-zinc-300">
                          &ldquo;{node.mood.thought}&rdquo;
                        </p>
                        <p className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-zinc-600">
                          {node.mood.expressionLabel} · {node.mood.aura}
                        </p>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <footer className="mt-24 border-t border-white/10 pt-8 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
            Built with Next.js · Three.js · WebGL
          </p>
        </footer>
      </div>
    </div>
  );
}