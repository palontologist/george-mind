import * as THREE from "three";
import connectomeData from "../data/connectome.json";
import type { Lobe } from "../types/connectome";

export interface PlacedLobe extends Lobe {
  worldPosition: THREE.Vector3;
  /** Where the face materialises when you focus this region. */
  stagePosition: THREE.Vector3;
}

/** Matches the containment radius in FirstPersonRig. */
export const WORLD_RADIUS = 26;

/** Ring the topics sit on — far enough out to walk between, inside the wall. */
const RING_RADIUS = WORLD_RADIUS * 0.66;

/**
 * A lobe's face stages itself *above and slightly outside* its core.
 *
 * Not toward the centre: a visitor approaches the ring from outside, so
 * anything staged inward ends up behind them. Up and out is the only
 * direction that is in front of them when they stop.
 */
const STAGE_OUT = 1.8;
const STAGE_UP = 1.3;

/**
 * Places each topic around a ring inside the cavern.
 *
 * `position` in the data is `[height, radius, ...]` — see below for why the
 * angle is not read from it. Height and radius stay authored; the bearing is
 * distributed evenly by index, which is what the authored numbers were
 * reaching for and what they could not actually express.
 */
export function placeLobes(): PlacedLobe[] {
  const lobes = connectomeData.lobes as unknown as Lobe[];
  const count = Math.max(lobes.length, 1);
  return lobes.map((lobe, index) => {
    // The data's first element is authored as a bearing, but every value
    // lands within +/-15 degrees of zero, so read as degrees it collapses all
    // seven topics into one arc and two of them onto the same point. Spacing
    // by index keeps the authored heights and radii and puts them where a
    // visitor can actually walk between them.
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
    // The authored heights run 2–6.4. Kept, but pulled into a band that
    // reads from a standing eye height: a face staged off a core six units
    // overhead is something you crane at, not something you walk up to.
    const height = THREE.MathUtils.clamp(lobe.position[1], 1.5, 2.3);
    const radius = THREE.MathUtils.clamp(
      Math.abs(lobe.position[2] ?? RING_RADIUS),
      RING_RADIUS * 0.55,
      RING_RADIUS
    );
    const worldPosition = new THREE.Vector3(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius
    );
    const outward = new THREE.Vector3(worldPosition.x, 0, worldPosition.z).normalize();
    const stagePosition = worldPosition.clone().addScaledVector(outward, STAGE_OUT);
    stagePosition.y = height + STAGE_UP;
    return { ...lobe, worldPosition, stagePosition };
  });
}