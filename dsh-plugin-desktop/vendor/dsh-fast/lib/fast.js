//#region src/fast.ts
/** Canonical event type for Fast mode. New code should use `fast/mode`. */
const FAST_EVENT = "fast/mode";
/** Legacy alias kept for sessions that stored `model-policy/fast` via codex. */
const LEGACY_FAST_EVENT = "model-policy/fast";
/**
* Fold the latest Fast selection from a session log.
* @param events - session events in append order.
* @returns the latest selection, or `undefined` when the session has no selection.
*/
function foldFastMode(events) {
	let active;
	for (const event of events) if (event.type === "fast/mode" || event.type === "model-policy/fast") active = event.data.active;
	return active;
}
//#endregion
export { FAST_EVENT, LEGACY_FAST_EVENT, foldFastMode };
