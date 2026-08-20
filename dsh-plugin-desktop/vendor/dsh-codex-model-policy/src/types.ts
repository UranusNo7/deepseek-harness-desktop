/** Types for logical model policies and their physical pi-ai routes. */

import type { PiAiModality, PiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'
import type { LlmServiceTier } from '@deepseek-ai/dsh-llm'

/** One physical provider/model candidate for a logical model. */
export interface ModelPolicyRoute {
  /** Physical provider route key. */
  provider: string
  /** Physical model id on the provider route. */
  model: string
  /** Lower values are attempted first. */
  priority?: number
}

/** Unified reasoning choices exposed by one logical model. */
export interface ModelPolicyReasoning {
  /** Default reasoning level sent when the caller omits one. */
  default?: string
  /** Reasoning levels the logical model exposes. */
  allowed?: string[]
}

/** One logical model and its ordered physical candidates. */
export interface ModelPolicyModel {
  /** Human-readable selector name. */
  name?: string
  /** Conservative logical context capacity. */
  contextWindow?: number
  /** Logical default output cap. */
  maxTokens?: number
  /** Logical input modalities. */
  input?: PiAiModality[]
  /** Logical reasoning policy. */
  reasoning?: ModelPolicyReasoning
  /** Logical OpenAI-compatible service tier used when no session override exists. */
  serviceTier?: LlmServiceTier
  /** Whether the session Fast control may select Fast for this logical model. */
  supportsFast?: boolean
  /** Physical candidates for this logical model. */
  routes: ModelPolicyRoute[]
}

/** Route with a stable priority order and its owning logical model. */
export interface ResolvedModelPolicyRoute {
  provider: string
  model: string
  priority: number
}

/** Immutable logical model policy used by the adapter. */
export interface ResolvedModelPolicy {
  id: string
  name: string
  contextWindow?: number
  maxTokens?: number
  input: readonly PiAiModality[]
  reasoning: ModelPolicyReasoning
  serviceTier?: LlmServiceTier
  supportsFast: boolean
  routes: readonly ResolvedModelPolicyRoute[]
}

/** Fully materialized plugin configuration. */
export interface ResolvedConfig {
  providerId: string
  displayName: string
  providers: Readonly<Record<string, PiAiProviderProfile>>
  models: ReadonlyMap<string, ResolvedModelPolicy>
}
