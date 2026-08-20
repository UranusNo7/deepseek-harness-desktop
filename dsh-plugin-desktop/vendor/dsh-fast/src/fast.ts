/**
 * Durable session state for Fast mode. The plugin is the single writer of
 * `fast/mode` (and its legacy alias `model-policy/fast`); every other
 * consumer folds the log.
 * @module @deepseek-ai/dsh-fast/fast
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session'

/** Canonical event type for Fast mode. New code should use `fast/mode`. */
export const FAST_EVENT = 'fast/mode' as const
/** Legacy alias kept for sessions that stored `model-policy/fast` via codex. */
export const LEGACY_FAST_EVENT = 'model-policy/fast' as const

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** Durable session selection for Fast mode. */
    'fast/mode': { active: boolean }
    /** Legacy alias – folded identically to `fast/mode`. */
    'model-policy/fast': { active: boolean }
  }
}

/**
 * Fold the latest Fast selection from a session log.
 * @param events - session events in append order.
 * @returns the latest selection, or `undefined` when the session has no selection.
 */
export function foldFastMode(events: readonly SessionEvent[]): boolean | undefined {
  let active: boolean | undefined
  for (const event of events) {
    if (event.type === FAST_EVENT || event.type === LEGACY_FAST_EVENT) active = event.data.active
  }
  return active
}
