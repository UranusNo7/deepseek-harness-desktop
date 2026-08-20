/**
 * Pluggable Fast plugin: session-scoped `fast/mode` that is independent of any
 * model policy. Enable it by adding `@deepseek-ai/dsh-fast` to a
 * `cordis.yml`; disable it by removing the entry — no other package changes.
 *
 * The plugin owns the durable `fast/mode` event, folds the log, and injects
 * the tier via the `agent/request` waterfall. Models declare
 * `supportsFast` through the augmented `LlmModelInfo`; the plugin never
 * hard-codes a model list.
 *
 * @module @deepseek-ai/dsh-fast
 */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import './types.ts';
export { FAST_EVENT, LEGACY_FAST_EVENT, foldFastMode } from './fast.ts';
export type { LlmServiceTier } from '@deepseek-ai/dsh-llm';
/** Whether Fast is active and whether the current model may use it. */
export interface FastState {
    active: boolean;
    available: boolean;
}
/** Session-scoped Fast operations. */
export interface FastController {
    getFast(agent: Agent): FastState;
    setFast(agent: Agent, active: boolean): FastState;
    /** Whether the model currently selected for this session may use Fast. */
    isAvailable(agent: Agent): boolean;
}
export declare const name = "fast";
export declare const inject: string[];
/**
 * Register the Fast controller, its request waterfall, and the human-facing
 * `/fast` command when the command registry is present.
 * @param ctx - Cordis context carrying `llm` and `sessions`.
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map