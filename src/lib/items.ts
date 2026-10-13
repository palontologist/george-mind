import connectomeData from "../data/connectome.json";
import { AURAS, EXPRESSIONS } from "./expressions";
import type { EventItem, Kind, Lobe, Mood, ProjectNode, Region } from "../types/connectome";

/**
 * One flat, clickable thing in the mind.
 *
 * The lobes are a spatial layout — they were built for walking between. The
 * portrait stage has no walking, so everything collapses to this: a single
 * list of things George made, each wired to a brain region and a face.
 */

export type KindId = "projects" | "events" | "podcast";

export interface MindItem {
  id: string;
  kind: KindId;
  kindLabel: string;
  title: string;
  subtitle: string;
  metrics?: string;
  repo?: string;
  content: string;
  /** Where this lights up on the brain. */
  region: Region;
  mood: Mood;
  /** Owning topic, kept for grouping and the topic colour. */
  lobeId: string;
  lobeName: string;
  color: string;
  /**
   * Position of this item's sub-region within its topic. -1 lights the topic
   * region only. The brain uses this to move the light off the broad topic
   * and onto the specific thing.
   */
  nodeIndex: number;
  /** 0..1, how much this one costs you. Drawn from the FACS preset. */
  strain: number;
  /** Heart rate the audio engine and the readout use for this mood. */
  bpm: number;
}

/** Tension plus arousal, normalised — what "strain" means here. */
function strainOf(expression: MindItem["mood"]["expression"]): number {
  const e = EXPRESSIONS[expression];
  const bpm = AURAS[expression].bpm;
  return Math.min(1, e.tension * 0.65 + (bpm / 160) * 0.35);
}

export interface KindMeta {
  id: KindId;
  label: string;
  caption: string;
  color: string;
  items: MindItem[];
}

interface Raw {
  subject: string;
  coordinates: string[];
  tagline: string;
  podcastUrl: string;
  lobes: Lobe[];
  kinds: Kind[];
  events: EventItem[];
  contact: { email: string; linkedin: string; github: string; site: string; podcast: string };
}

const data = connectomeData as unknown as Raw;

const kindById = new Map(data.kinds.map((k) => [k.id, k]));

/** Podcast lives in its own lobe but is its own mode, not a project. */
const PODCAST_LOBE = "podcast-dialogues";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

function toItem(
  node: ProjectNode,
  lobe: Lobe,
  kindId: KindId,
  index: number
): MindItem {
  const kind = kindById.get(kindId);
  return {
    id: `${kindId}-${slug(node.title)}-${index}`,
    kind: kindId,
    kindLabel: kind?.label ?? kindId,
    title: node.title,
    subtitle: node.subtitle ?? "",
    metrics: node.metrics,
    repo: node.repo,
    content: node.content,
    region: node.region ?? lobe.region ?? { label: lobe.tag, dir: [0, 1, 0] },
    mood: node.mood ?? lobe.mood,
    lobeId: lobe.id,
    lobeName: lobe.name,
    color: lobe.color,
    nodeIndex: index,
    strain: strainOf(node.mood?.expression ?? lobe.mood.expression),
    bpm: AURAS[node.mood?.expression ?? lobe.mood.expression].bpm,
  };
}

/** Every project, in lobe order so the topics stay legible in the panel. */
function projects(): MindItem[] {
  const out: MindItem[] = [];
  for (const lobe of data.lobes) {
    if (lobe.id === PODCAST_LOBE) continue;
    lobe.nodes.forEach((node, i) => out.push(toItem(node, lobe, "projects", i)));
  }
  return out;
}

/** Podcast episodes and the conversations cut from them. */
function podcast(): MindItem[] {
  const lobe = data.lobes.find((l) => l.id === PODCAST_LOBE);
  if (!lobe) return [];
  return lobe.nodes.map((node, i) => toItem(node, lobe, "podcast", i));
}

/** Events George hosted. */
function events(): MindItem[] {
  return data.events.map((event, i) => {
    const kind = kindById.get("events");
    return {
      id: event.id,
      kind: "events" as const,
      kindLabel: kind?.label ?? "Events",
      title: event.title,
      subtitle: event.subtitle ?? "",
      metrics: event.metrics,
      repo: event.repo,
      content: event.content,
      region: event.region ?? { label: "Frontal association", dir: [0.45, 0.55, 0.72] },
      mood: event.mood ?? data.lobes[0].mood,
      lobeId: "ecosystem",
      lobeName: "Ecosystem & Builder Salons",
      color: kind?.color ?? "#f97316",
      // Events light the social/language topic as a whole; their own region
      // dirs are carried on the item for the panel's benefit.
      nodeIndex: -1,
      strain: strainOf(event.mood?.expression ?? "neutral"),
      bpm: AURAS[event.mood?.expression ?? "neutral"].bpm,
    };
  });
}

export const KIND_ORDER: KindId[] = ["projects", "events", "podcast"];

export const MIND_DATA = {
  subject: data.subject,
  coordinates: data.coordinates,
  tagline: data.tagline,
  podcastUrl: data.podcastUrl,
  contact: data.contact,
};

const BUILDERS: Record<KindId, () => MindItem[]> = {
  projects,
  events,
  podcast,
};

export const KINDS: KindMeta[] = KIND_ORDER.map((id) => {
  const meta = data.kinds.find((k) => k.id === id);
  return {
    id,
    label: meta?.label ?? id,
    caption: meta?.caption ?? "",
    color: meta?.color ?? "#38bdf8",
    items: BUILDERS[id](),
  };
});

export const ALL_ITEMS: MindItem[] = KINDS.flatMap((k) => k.items);

export const findKind = (id: KindId) => KINDS.find((k) => k.id === id)!;
