"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * The inner monologue, floating.
 *
 * `thoughts` are the long reflective lines; these are the short fragments
 * that sit over your head while you read — "working on this", "this is
 * interesting", "for an event I made some dope connections". They rotate, so
 * the head is never quite still and never repeats itself in one sitting.
 */

const VISIBLE = 3;
const DWELL = 4600;

interface CommentStreamProps {
  notes: string[];
  /** Changing this resets the rotation — pass the selected item's id. */
  resetKey: string;
  className?: string;
}

export default function CommentStream({
  notes,
  resetKey,
  className = "",
}: CommentStreamProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    setOffset(0);
  }, [resetKey]);

  useEffect(() => {
    if (notes.length <= VISIBLE) return;
    const id = window.setInterval(() => setOffset((o) => o + 1), DWELL);
    return () => window.clearInterval(id);
  }, [notes.length]);

  if (!notes.length) return null;

  const shown = Array.from({ length: Math.min(VISIBLE, notes.length) }, (_, i) =>
    notes[(offset + i) % notes.length]
  );

  return (
    <div className={`pointer-events-none flex flex-col items-center gap-2 ${className}`}>
      <AnimatePresence initial={false}>
        {shown.map((note, i) => (
          <motion.p
            key={`${resetKey}-${offset}-${i}`}
            data-note
            initial={{ opacity: 0, y: 14, scale: 0.96, filter: "blur(4px)" }}
            animate={{ opacity: 1 - i * 0.28, y: 0, scale: 1 - i * 0.03, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, scale: 0.97, filter: "blur(4px)" }}
            transition={{ duration: 0.55, ease: [0.2, 0.7, 0.2, 1] }}
            className="max-w-[min(28rem,88vw)] rounded-full border border-white/10 px-4 py-2 text-center text-[12px] leading-snug text-ink-2 shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:text-[13px]"
            style={{
              backgroundColor: "rgba(17,19,24,0.62)",
            }}
          >
            {note}
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}
