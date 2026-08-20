/** Configuration schema and validation for logical model policies. */

import z from '@deepseek-ai/schemastery'
import type { PiAiProviderProfile } from '@deepseek-ai/dsh-llm-pi-ai'
import type { LlmServiceTier } from '@deepseek-ai/dsh-llm'
import type {
  ModelPolicyModel,
  ResolvedConfig,
  ResolvedModelPolicy,
  ResolvedModelPolicyRoute,
} from './types.ts'

/** Configuration for the logical model provider plugin. */
export interface Config {
  /** Registered logical provider id. */
  providerId?: string
  /** Human-readable logical provider name. */
  displayName?: string
  /** Physical pi-ai provider profiles keyed by route. */
  providers?: Record<string, PiAiProviderProfile>
  /** Logical models keyed by stable selector id. */
  models?: Record<string, ModelPolicyModel>
}

/** Modalities that a logical policy can advertise. */
export const POLICY_MODALITIES = ['text', 'image'] as const

const route = z.object({
  provider: z.string().required(),
  model: z.string().required(),
  priority: z.number().step(1).default(0),
})

const reasoning = z.object({
  default: z.string(),
  allowed: z.array(z.string()).default([]),
})

const model = z.object({
  name: z.string(),
  contextWindow: z.number().step(1).min(1),
  maxTokens: z.number().step(1).min(1),
  input: z.array(z.union(POLICY_MODALITIES)).default(['text']),
  reasoning,
  serviceTier: z.string() as unknown as z<LlmServiceTier>,
  supportsFast: z.boolean().default(false),
  routes: z.array(route).required(),
})

/** Runtime schema for the logical model policy plugin. */
export const Config: z<Config> = z.object({
  providerId: z.string().default('model-policy'),
  displayName: z.string().default('Model Policy'),
  providers: z.dict(z.any()).default({}) as unknown as z<Record<string, PiAiProviderProfile>>,
  models: z.dict(model).default({}),
})

/**
 * Resolve configuration values into stable policy maps and reject ambiguous routes.
 * @param config - schema-resolved plugin configuration.
 * @returns detached policy configuration used by the adapter.
 */
export function resolveConfig(config: Config): ResolvedConfig {
  const providerId = config.providerId ?? 'model-policy'
  const displayName = config.displayName ?? 'Model Policy'
  if (providerId.length === 0) throw new Error('model-policy: providerId must not be empty')
  const models = new Map<string, ResolvedModelPolicy>()
  for (const [id, source] of Object.entries(config.models ?? {})) {
    if (id.length === 0) throw new Error('model-policy: logical model ids must not be empty')
    const routes = source.routes
      .map((candidate, index): ResolvedModelPolicyRoute => ({
        provider: candidate.provider,
        model: candidate.model,
        priority: candidate.priority ?? index,
      }))
      .sort((left, right) => left.priority - right.priority)
    if (routes.length === 0) throw new Error(`model-policy: logical model "${id}" needs at least one route`)
    const routeKeys = new Set<string>()
    for (const candidate of routes) {
      const key = `${candidate.provider}\u0000${candidate.model}`
      if (routeKeys.has(key)) {
        throw new Error(`model-policy: logical model "${id}" repeats route ${candidate.provider}/${candidate.model}`)
      }
      routeKeys.add(key)
    }
    const policyReasoning = source.reasoning ?? {}
    const allowed = [...policyReasoning.allowed ?? []]
    if (policyReasoning.default !== undefined && !allowed.includes(policyReasoning.default)) {
      throw new Error(`model-policy: logical model "${id}" defaults to reasoning "${policyReasoning.default}" outside allowed`)
    }
    models.set(id, {
      id,
      name: source.name ?? id,
      ...source.contextWindow === undefined ? {} : { contextWindow: source.contextWindow },
      ...source.maxTokens === undefined ? {} : { maxTokens: source.maxTokens },
      input: [...source.input ?? ['text']],
      reasoning: {
        ...policyReasoning.default === undefined ? {} : { default: policyReasoning.default },
        allowed,
      },
      ...source.serviceTier === undefined ? {} : { serviceTier: source.serviceTier },
      supportsFast: source.supportsFast ?? false,
      routes,
    })
  }
  return {
    providerId,
    displayName,
    providers: { ...config.providers ?? {} },
    models,
  }
}

/**
 * Return a provider-profile snapshot with one logical service tier applied.
 * @param providers - Physical provider profiles keyed by route.
 * @param serviceTier - Logical service tier to apply, or undefined to preserve profiles.
 * @returns A shallow provider-profile map with the requested tier applied.
 */
export function profilesForServiceTier(
  providers: Readonly<Record<string, PiAiProviderProfile>>,
  serviceTier: LlmServiceTier | undefined,
): Record<string, PiAiProviderProfile> {
  if (serviceTier === undefined) return { ...providers }
  return Object.fromEntries(Object.entries(providers).map(([provider, profile]) => [
    provider,
    { ...profile, serviceTier } as PiAiProviderProfile,
  ]))
}

/**
 * Find one logical model or throw the stable unknown-model diagnostic.
 * @param config - Resolved logical model policy configuration.
 * @param modelId - Stable logical model selector id.
 * @returns The resolved logical model policy.
 */
export function policyOf(config: ResolvedConfig, modelId: string): ResolvedModelPolicy {
  const policy = config.models.get(modelId)
  if (policy === undefined) throw new Error(`model-policy provider has no logical model "${modelId}"`)
  return policy
}
