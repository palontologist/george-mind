"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { Lobe } from "../components/ConnectomeScene";

const ConnectomeScene = dynamic(() => import("../components/ConnectomeScene"), {
  ssr: false,
});
import PersonaAvatar, { MoodData } from "../components/PersonaAvatar";
import connectomeData from "../data/connectome.json";
import { Sparkles, Terminal, X, ExternalLink, Globe, ArrowUpRight, Compass, Brain, Youtube } from "lucide-react";

export default function Home() {
  const [selectedLobe, setSelectedLobe] = useState<Lobe | null>(null);
  const [viewMode, setViewMode] = useState<"connectome" | "editorial">("connectome");

  // Cast lobe mood if available
  const currentMood: MoodData | undefined = selectedLobe
    ? (selectedLobe as any).mood
    : undefined;

  return (
    <main className="w-screen h-screen overflow-hidden flex flex-col bg-[#09090b] text-zinc-100 font-sans select-none">
      {/* Top Navigation HUD */}
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 backdrop-blur-md bg-zinc-950/40">
        <div className="flex items-center space-x-3">
          <Brain className="w-5 h-5 text-sky-400 animate-pulse" />
          <div>
            <h1 className="text-sm font-semibold tracking-wider font-mono uppercase text-zinc-200">
              {connectomeData.subject} <span className="text-zinc-500">•</span> <span className="text-sky-400 font-normal">MIND ATLAS</span>
            </h1>
            <p className="text-[11px] text-zinc-400 font-mono">
              LOC: {connectomeData.coordinates.join(" → ")}
            </p>
          </div>
        </div>

        {/* Links & Mode Switcher */}
        <div className="flex items-center space-x-3">
          <a
            href={connectomeData.podcastUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-400 hover:text-red-300 text-xs font-mono transition-colors"
          >
            <Youtube className="w-3.5 h-3.5" />
            <span>@frontforumfocus</span>
          </a>

          <div className="flex items-center space-x-2 bg-zinc-900/80 p-1 rounded-lg border border-zinc-800 text-xs font-mono">
            <button
              onClick={() => setViewMode("connectome")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === "connectome"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              3D CONNECTOME
            </button>
            <button
              onClick={() => setViewMode("editorial")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === "editorial"
                  ? "bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              EDITORIAL VIEW
            </button>
          </div>
        </div>
      </header>

      {/* Main Canvas / Content Area */}
      <div className="relative w-full h-full flex">
        {viewMode === "connectome" ? (
          <>
            <ConnectomeScene
              onSelectLobe={(lobe) => setSelectedLobe(lobe)}
              activeLobeId={selectedLobe?.id || null}
            />

            {/* Persistent Persona / State Overlay Card at Bottom-Left */}
            <div className="absolute bottom-6 left-6 z-20 max-w-sm w-full pointer-events-auto">
              <PersonaAvatar
                mood={currentMood}
                color={selectedLobe?.color || "#38bdf8"}
                compact={!selectedLobe}
              />
            </div>
          </>
        ) : (
          /* Editorial View (Anushka Thakur inspired minimalist list) */
          <div className="w-full h-full overflow-y-auto px-6 pt-24 pb-16 max-w-3xl mx-auto space-y-16">
            <div className="space-y-3 border-b border-zinc-800 pb-8">
              <h1 className="text-3xl font-serif tracking-tight text-white">George Karani</h1>
              <p className="text-zinc-400 text-sm leading-relaxed max-w-xl">
                Building physical AI and autonomous agent frameworks—from looped-transformer reflexive policies on robotic manipulators to MPC control loops on racing karts and sub-3B on-device models. Host of the <a href={connectomeData.podcastUrl} target="_blank" rel="noopener noreferrer" className="text-red-400 underline hover:text-red-300">frontforumfocus podcast</a> (40+ episodes).
              </p>
            </div>

            {connectomeData.lobes.map((lobe) => (
              <section key={lobe.id} className="space-y-6">
                <div className="space-y-2 border-b border-zinc-800/80 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lobe.color }} />
                    <h2 className="text-xs font-mono tracking-wider uppercase text-zinc-300">{lobe.name}</h2>
                  </div>
                  {(lobe as any).mood && (
                    <p className="text-xs text-zinc-400 italic">
                      "{(lobe as any).mood.thought}"
                    </p>
                  )}
                </div>

                <div className="grid gap-4">
                  {lobe.nodes.map((node, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-medium text-zinc-100">{node.title}</h3>
                          <p className="text-xs text-zinc-400">{node.subtitle}</p>
                        </div>
                        {(node as any).repo && (
                          <a
                            href={(node as any).repo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-sky-400 hover:underline flex items-center space-x-1"
                          >
                            <span>Link</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {(node as any).metrics && (
                        <div className="text-[11px] font-mono text-amber-400/90 bg-amber-400/10 px-2 py-0.5 rounded w-fit">
                          {(node as any).metrics}
                        </div>
                      )}
                      <p className="text-xs text-zinc-400 leading-relaxed">{node.content}</p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {/* Selected Lobe Inspection Drawer (when in 3D Connectome mode) */}
        {selectedLobe && viewMode === "connectome" && (
          <aside className="absolute right-0 top-0 bottom-0 w-full sm:w-[440px] z-30 bg-zinc-950/90 border-l border-zinc-800/80 backdrop-blur-xl p-6 overflow-y-auto space-y-6 pt-20 animate-in slide-in-from-right duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span
                  className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border"
                  style={{
                    color: selectedLobe.color,
                    borderColor: `${selectedLobe.color}40`,
                    backgroundColor: `${selectedLobe.color}15`,
                  }}
                >
                  {selectedLobe.tag}
                </span>
                <h2 className="text-lg font-semibold text-zinc-100 mt-2 font-serif">
                  {selectedLobe.name}
                </h2>
              </div>
              <button
                onClick={() => setSelectedLobe(null)}
                className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {selectedLobe.description}
            </p>

            <div className="space-y-4 pt-2">
              <h3 className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                Active Synapses & Nodes
              </h3>
              {selectedLobe.nodes.map((node, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700 transition-colors space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-zinc-200">{node.title}</h4>
                      <p className="text-xs text-zinc-400">{node.subtitle}</p>
                    </div>
                    {node.repo && (
                      <a
                        href={node.repo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-zinc-400 hover:text-sky-400 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {(node as any).metrics && (
                    <div className="text-[10px] font-mono text-sky-400 bg-sky-950/40 border border-sky-800/40 px-2 py-0.5 rounded w-fit">
                      {(node as any).metrics}
                    </div>
                  )}

                  <p className="text-xs text-zinc-300/90 leading-relaxed">
                    {node.content}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}
