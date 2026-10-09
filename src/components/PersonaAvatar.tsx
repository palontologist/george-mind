"use client";

import React from "react";
import { Smile, Brain, Flame, Sparkles, Compass, HeartHandshake, Eye } from "lucide-react";

export interface MoodData {
  emotion: string;
  expression: string;
  aura: string;
  thought: string;
}

interface PersonaAvatarProps {
  mood?: MoodData;
  color?: string;
  compact?: boolean;
}

export default function PersonaAvatar({
  mood,
  color = "#38bdf8",
  compact = false,
}: PersonaAvatarProps) {
  const defaultMood: MoodData = {
    emotion: "Active Neutral • Exploring",
    expression: "Calm baseline, observing the neural connectome topology",
    aura: "Cyan Drift • Resting State",
    thought: "Click on any neural cluster to shift perspective.",
  };

  const activeMood = mood || defaultMood;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-500 ${
        compact
          ? "p-3 bg-zinc-950/70 border-zinc-800"
          : "p-4 bg-zinc-950/90 border-zinc-800 shadow-2xl"
      }`}
    >
      {/* Dynamic ambient backlight matching mood color */}
      <div
        className="absolute -top-12 -left-12 w-36 h-36 rounded-full blur-3xl opacity-30 transition-all duration-700 pointer-events-none"
        style={{ backgroundColor: color }}
      />

      <div className="relative flex items-start space-x-3.5">
        {/* Avatar Visual Orb */}
        <div className="relative flex-shrink-0">
          <div
            className="w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-500 shadow-lg"
            style={{
              borderColor: color,
              backgroundColor: `${color}15`,
              boxShadow: `0 0 20px ${color}30`,
            }}
          >
            <Eye className="w-5 h-5 transition-transform duration-300" style={{ color }} />
          </div>

          {/* Pulse ring indicator */}
          <span
            className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-zinc-950 animate-pulse"
            style={{ backgroundColor: color }}
          />
        </div>

        {/* State & Quote */}
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              STATE: <span className="text-zinc-100 font-semibold">{activeMood.emotion}</span>
            </span>
            <span
              className="text-[9px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                color,
                borderColor: `${color}40`,
                backgroundColor: `${color}10`,
              }}
            >
              {activeMood.aura}
            </span>
          </div>

          <p className="text-xs text-zinc-300 italic leading-snug">
            "{activeMood.thought}"
          </p>

          {!compact && (
            <p className="text-[11px] text-zinc-400 font-mono tracking-tight pt-1">
              [VISUAL]: {activeMood.expression}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
