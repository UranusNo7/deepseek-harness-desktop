/** Configuration schema and validation for logical model policies. */
import z from '@deepseek-ai/schemastery';
import type { PiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai';
import type { LlmServiceTier } from '@deepseek-ai/dsh-llm';
import type { ModelPolicyModel, ResolvedConfig, ResolvedModelPolicy } from './types.ts';
/** Configuration for the logical model provider plugin. */
export interface Config {
    /** Registered logical provider id. */
    providerId?: string;
    /** Human-readable logical provider name. */
    displayName?: string;
    /** Physical pi-ai provider profiles keyed by route. */
    providers?: Record<string, PiAiProviderProfile>;
    /** Logical models keyed by stable selector id. */
    models?: Record<string, ModelPolicyModel>;
}
/** Modalities that a logical policy can advertise. */
export declare const POLICY_MODALITIES: readonly ["text", "image"];
/** Runtime schema for the logical model policy plugin. */
export declare const Config: z<Config>;
/**
 * Resolve configuration values into stable policy maps and reject ambiguous routes.
 * @param config - schema-resolved plugin configuration.
 * @returns detached policy configuration used by the adapter.
 */
export declare function resolveConfig(config: Config): ResolvedConfig;
/**
 * Return a provider-profile snapshot with one logical service tier applied.
 * @param providers - Physical provider profiles keyed by route.
 * @param serviceTier - Logical service tier to apply, or undefined to preserve profiles.
 * @returns A shallow provider-profile map with the requested tier applied.
 */
export declare function profilesForServiceTier(providers: Readonly<Record<string, PiAiProviderProfile>>, serviceTier: LlmServiceTier | undefined): Record<string, PiAiProviderProfile>;
/**
 * Find one logical model or throw the stable unknown-model diagnostic.
 * @param config - Resolved logical model policy configuration.
 * @param modelId - Stable logical model selector id.
 * @returns The resolved logical model policy.
 */
export declare function policyOf(config: ResolvedConfig, modelId: string): ResolvedModelPolicy;
//# sourceMappingURL=config.d.ts.map