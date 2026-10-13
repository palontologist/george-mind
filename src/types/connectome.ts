import type { ExpressionKey } from "../lib/expressions";

/**
 * The emotional layer.
 *
 * Every topic and every project carries how it actually felt to build it —
 * not marketing copy. `expression` picks a FACS-tuned face preset, and
 * `thought` is the line that surfaces as you walk up to it.
 */

export interface Mood {
  emotion: string;
  expression: ExpressionKey;
  expressionLabel: string;
  aura: string;
  thought: string;
  /** Streamed while the visitor stands in the space. */
  thoughts: string[];
  /** Short in-the-moment fragments that float over the head. */
  notes?: string[];
}

/**
 * A hotspot on the brain mesh. `dir` is a unit vector in the brain's own
 * object space, so it turns with the brain as the brain rotates.
 */
export interface Region {
  label: string;
  dir: [number, number, number];
}

export interface ProjectNode {
  title: string;
  subtitle: string;
  metrics?: string;
  repo?: string;
  content: string;
  mood?: Mood;
  /** Where this project lights up on the brain. Falls back to the lobe's. */
  region?: Region;
}

export interface Lobe {
  id: string;
  name: string;
  tag: string;
  color: string;
  /** Ring angle + height, used to lay the topic out around the cavern. */
  position: [number, number, number];
  mood: Mood;
  description: string;
  /** Where this topic lights up on the brain. */
  region?: Region;
  nodes: ProjectNode[];
}

/** One of the three wires into the face and the brain. */
export interface Kind {
  id: string;
  label: string;
  caption: string;
  color: string;
}

/** An event George has hosted. Same shape as a project node. */
export interface EventItem extends ProjectNode {
  id: string;
}

export interface Connectome {
  subject: string;
  coordinates: string[];
  tagline: string;
  podcastUrl: string;
  lobes: Lobe[];
  kinds: Kind[];
  events: EventItem[];
  contact: {
    email: string;
    linkedin: string;
    github: string;
    site: string;
    podcast: string;
  };
}
