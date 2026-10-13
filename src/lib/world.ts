import * as THREE from "three";

export interface WorldRefs {
  proximity: Record<string, number>;
  appearance: number;
  lookAt: THREE.Vector3;
  activeId: string | null;
  /**
   * Index of the hovered project inside the active lobe, or -1. The brain
   * reads this to move the light from the lobe's region onto the specific
   * sub-region that project occupies.
   */
  activeNodeIndex: number;
}

export const createWorldRefs = (): WorldRefs => ({
  proximity: {},
  appearance: 0,
  lookAt: new THREE.Vector3(0, 1.7, -1),
  activeId: null,
  activeNodeIndex: -1,
});