"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Typewriter that cycles through a list of lines, holding each one long
 * enough to read before moving on.
 */
export default function ThoughtStream({
  lines,
  className,
  interval = 7200,
}: {
  lines: string[];
  className?: string;
  interval?: number;
}) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"typing" | "holding" | "erasing">("typing");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    const current = lines[index % lines.length];
    if (!current) return;
    let i = text.length;
    let cancel = false;

    if (phase === "typing") {
      const step = () => {
        if (cancel) return;
        i += 1;
        setText(current.slice(0, i));
        if (i >= current.length) {
          setPhase("holding");
          timer.current = window.setTimeout(() => setPhase("erasing"), interval);
        } else {
          timer.current = window.setTimeout(step, 18 + Math.random() * 26);
        }
      };
      timer.current = window.setTimeout(step, 60);
    } else if (phase === "erasing") {
      const step = () => {
        if (cancel) return;
        i -= 2;
        setText(current.slice(0, Math.max(i, 0)));
        if (i <= 0) {
          setIndex((v) => (v + 1) % lines.length);
          setPhase("typing");
        } else {
          timer.current = window.setTimeout(step, 12);
        }
      };
      timer.current = window.setTimeout(step, 340);
    }

    return () => {
      cancel = true;
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, phase, interval]);

  return (
    <p className={`${className ?? ""} font-serif italic leading-relaxed`}>
      <span className="opacity-40">&ldquo;</span>
      {text}
      <span className="opacity-40">&rdquo;</span>
      <span
        className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[0.15em] bg-current align-middle"
        style={{ animation: "mind-caret 1s steps(1) infinite" }}
      />
    </p>
  );
}