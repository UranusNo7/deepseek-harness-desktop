/** Logical cross-provider model policy plugin for DSH. */
import type { Context } from '@deepseek-ai/cordis';
import type { Agent } from '@deepseek-ai/dsh-agent';
import type { Config } from './config.ts';
/** Provider/model pair used by the Host model-selection bridge. */
export interface ModelPolicySelection {
    provider: string;
    model: string;
}
/** Fast-mode state returned to model-selection clients. */
export interface ModelPolicyFastState {
    active: boolean;
    available: boolean;
}
/** Session-scoped Fast operations exposed to the Host model-selection API. */
export interface ModelPolicySessionController {
    getFast(agent: Agent, selection: ModelPolicySelection): ModelPolicyFastState;
    setFast(agent: Agent, selection: ModelPolicySelection, active: boolean): ModelPolicyFastState;
}
export { ModelPolicyAdapter } from './adapter.ts';
export { Config } from './config.ts';
export type { ModelPolicyModel, ModelPolicyReasoning, ModelPolicyRoute, ResolvedConfig, ResolvedModelPolicy, ResolvedModelPolicyRoute, } from './types.ts';
export { foldFastMode } from './fast.ts';
export declare const name = "codex-model-policy";
export declare const inject: string[];
/**
 * Validate physical candidates and register the logical provider route.
 * @param ctx - Cordis context carrying the LLM and optional attachment/credential services.
 * @param config - schema-resolved logical model policy configuration.
 * @returns a promise that settles after candidate validation and registration.
 */
export declare function apply(ctx: Context, config: Config): Promise<void>;
//# sourceMappingURL=index.d.ts.map