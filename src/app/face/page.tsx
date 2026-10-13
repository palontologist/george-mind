"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

/**
 * Client only: the head rig pulls in three/drei, which reach into React
 * internals at module scope and must never be evaluated on the server.
 */
const FaceLab = dynamic(() => import("../../components/FaceLab"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-[#0a0a0c] font-mono text-xs uppercase tracking-[0.25em] text-zinc-600">
      Loading face lab…
    </div>
  ),
});

export default function FacePage() {
  return (
    <>
      <FaceLab />
      <Link
        href="/"
        className="fixed bottom-4 right-4 z-10 rounded-full border border-white/10 bg-black/60 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-400 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
      >
        ← back to the mind
      </Link>
    </>
  );
}
