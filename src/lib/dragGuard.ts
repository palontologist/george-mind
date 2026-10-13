/**
 * Bridges the navigator's drag-to-look gesture and R3F's raycast clicks.
 *
 * When pointer lock is unavailable the same mouse button both sweeps the
 * camera and selects synapse cores. This flag lets the click handler tell
 * a deliberate click apart from the tail of a look-drag.
 */
export const dragGuard = {
  /** True when the click that just fired should be ignored. */
  suppressClick: false,
  /** Distance in px the pointer travelled during the current press. */
  moved: 0,
  /** Pixels of travel before a press stops counting as a click. */
  threshold: 6,
};

export const consumeSuppressedClick = () => {
  const suppressed = dragGuard.suppressClick;
  dragGuard.suppressClick = false;
  return suppressed;
};