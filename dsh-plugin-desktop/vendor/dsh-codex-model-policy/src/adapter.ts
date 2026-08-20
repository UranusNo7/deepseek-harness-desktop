/** Logical-model LLM adapter backed by one or more pi-ai provider routes. */

import {
  contentHasImage,
  LlmAdapter,
  LlmError,
  ReasoningEffortId,
} from '@deepseek-ai/dsh-llm'
import type {
  GenerateOptions,
  LlmFailure,
  LlmModelInfo,
  LlmResolvedModelInfo,
  Message,
  StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai'
import type { LlmServiceTier } from '@deepseek-ai/dsh-llm'
import { policyOf } from './config.ts'
import type { ResolvedConfig, ResolvedModelPolicy, ResolvedModelPolicyRoute } from './types.ts'

/** Factory for immutable physical adapters grouped by logical service tier. */
export type PhysicalAdapterForTier = (serviceTier: LlmServiceTier | undefined) => PiAiAdapter

interface Candidate {
  route: ResolvedModelPolicyRoute
  info: LlmResolvedModelInfo
}

interface PiAiReplayRoute {
  provider: string
  model: string
}

function replayRoute(value: unknown): PiAiReplayRoute | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const state = value as Record<string, unknown>
  if (state.kind !== 'pi-ai' || state.version !== 1) return undefined
  if (typeof state.provider !== 'string' || typeof state.model !== 'string') return undefined
  return { provider: state.provider, model: state.model }
}

function mapMessageForRoute(message: Message, route: ResolvedModelPolicyRoute): Message {
  if (message.role !== 'assistant' || message.source.kind !== 'model') {
    return message
  }
  const replay = replayRoute(message.source.replayState)
  return {
    ...message,
    source: replay?.provider === route.provider && replay.model === route.model
      ? { ...message.source, provider: route.provider, model: route.model }
      : { kind: 'model', provider: route.provider, model: route.model },
  }
}

function hasReasoningEffort(info: LlmResolvedModelInfo, effort: string): boolean {
  if (effort === 'off') return true
  return info.reasoning?.efforts.some(candidate => String(candidate.id) === effort) ?? false
}

function isModelChunk(chunk: StreamChunk): boolean {
  switch (chunk.type) {
    case 'block-start':
    case 'text-delta':
    case 'reasoning-delta':
    case 'tool-call-delta':
    case 'block-end':
      return true
    case 'usage':
    case 'finish':
      return false
  }
}

function failureCode(error: unknown): string | undefined {
  if (error instanceof LlmError) return error.code
  if (typeof error !== 'object' || error === null) return undefined
  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

function retryableFailure(failure: LlmFailure, serviceTier: LlmServiceTier | undefined): boolean {
  return failure.code === 'RATE_LIMIT'
    || failure.code === 'SERVER'
    || failure.code === 'TIMEOUT'
    || failure.code === 'TRANSPORT'
    || (serviceTier !== undefined && failure.code === 'UNSUPPORTED_OPTION')
}

function retryableError(error: unknown, serviceTier: LlmServiceTier | undefined): boolean {
  const code = failureCode(error)
  return code === 'RATE_LIMIT'
    || code === 'SERVER'
    || code === 'TIMEOUT'
    || code === 'TRANSPORT'
    || (serviceTier !== undefined && code === 'UNSUPPORTED_OPTION')
}

async function candidatesFor(
  adapter: PiAiAdapter,
  policy: ResolvedModelPolicy,
  signal?: AbortSignal,
): Promise<Candidate[]> {
  return Promise.all(policy.routes.map(async route => ({
    route,
    info: await adapter.resolveModel(route.provider, route.model, signal),
  })))
}

/**
 * Adapter that exposes logical models while preserving pi-ai's physical request and replay conversion.
 */
export class ModelPolicyAdapter extends LlmAdapter {
  constructor(
    private readonly config: ResolvedConfig,
    private readonly physicalAdapterForTier: PhysicalAdapterForTier,
  ) {
    super()
  }

  override providerInfo(provider: string): { id: string; name: string } {
    return { id: provider, name: this.config.displayName }
  }

  override listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    return Promise.resolve([...this.config.models.values()].map(policy => ({
      provider,
      id: policy.id,
      name: policy.name,
    })))
  }

  override async resolveModel(
    provider: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo> {
    const policy = policyOf(this.config, model)
    const candidates = await candidatesFor(
      this.physicalAdapterForTier(policy.serviceTier),
      policy,
      signal,
    )
    const contexts = candidates
      .map(candidate => candidate.info.context?.contextWindow)
      .filter((value): value is number => value !== undefined)
    const supportedEfforts = policy.reasoning.allowed?.filter(effort =>
      candidates.some(candidate => hasReasoningEffort(candidate.info, effort)),
    ) ?? []
    if (policy.reasoning.default !== undefined && !supportedEfforts.includes(policy.reasoning.default)) {
      throw new LlmError(
        `model-policy logical model "${model}" has no route supporting default reasoning "${policy.reasoning.default}"`,
        'UNSUPPORTED_REASONING_EFFORT',
      )
    }
    return {
      provider,
      id: model,
      name: policy.name,
      inputModalities: [...policy.input],
      supportsFast: policy.supportsFast,
      ...policy.contextWindow !== undefined || contexts.length > 0
        ? { context: { contextWindow: Math.min(policy.contextWindow ?? Infinity, ...contexts) } }
        : {},
      ...policy.maxTokens === undefined ? {} : { defaultMaxTokens: policy.maxTokens },
      ...supportedEfforts.length === 0 ? {} : {
        reasoning: {
          efforts: supportedEfforts.map(effort => ({ id: ReasoningEffortId(effort), name: effort })),
          ...policy.reasoning.default === undefined
            ? {}
            : { defaultEffort: ReasoningEffortId(policy.reasoning.default) },
        },
      },
    }
  }

  override async * stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const policy = policyOf(this.config, options.model)
    const containsImage = options.messages.some(message => contentHasImage(message.content))
    if (containsImage && !policy.input.includes('image')) {
      throw new LlmError(
        `model-policy logical model "${policy.id}" does not declare image input`,
        'UNSUPPORTED_CONTENT',
      )
    }

    const requestedReasoning = options.reasoningEffort === undefined
      ? policy.reasoning.default
      : String(options.reasoningEffort)
    if (requestedReasoning !== undefined && !policy.reasoning.allowed?.includes(requestedReasoning)) {
      throw new LlmError(
        `model-policy logical model "${policy.id}" does not allow reasoning "${requestedReasoning}"`,
        'UNSUPPORTED_REASONING_EFFORT',
      )
    }
    const serviceTier = options.serviceTier ?? policy.serviceTier
    const physical = this.physicalAdapterForTier(serviceTier)
    const candidates = await candidatesFor(physical, policy, options.signal)
    const eligible = candidates.filter((candidate) => {
      if (containsImage && !candidate.info.inputModalities?.includes('image')) return false
      if (requestedReasoning !== undefined && !hasReasoningEffort(candidate.info, requestedReasoning)) return false
      return true
    })
    if (eligible.length === 0) {
      if (containsImage) {
        throw new LlmError(
          `model-policy logical model "${policy.id}" has no image-capable route`,
          'UNSUPPORTED_CONTENT',
        )
      }
      if (requestedReasoning !== undefined) {
        throw new LlmError(
          `model-policy logical model "${policy.id}" has no route supporting reasoning "${requestedReasoning}"`,
          'UNSUPPORTED_REASONING_EFFORT',
        )
      }
      throw new LlmError(`model-policy logical model "${policy.id}" has no eligible route`, 'NO_ROUTE')
    }

    let lastError: unknown
    for (let index = 0; index < eligible.length; index++) {
      const candidate = eligible[index]
      if (candidate === undefined) continue
      const pending: StreamChunk[] = []
      let started = false
      const request: GenerateOptions = {
        ...options,
        provider: candidate.route.provider,
        model: candidate.route.model,
        messages: options.messages.map(message => mapMessageForRoute(message, candidate.route)),
        ...options.maxTokens === undefined && policy.maxTokens !== undefined
          ? { maxTokens: policy.maxTokens }
          : {},
        ...options.reasoningEffort === undefined && policy.reasoning.default !== undefined
          ? { reasoningEffort: ReasoningEffortId(policy.reasoning.default) }
          : {},
      }
      try {
        for await (const chunk of physical.stream(request)) {
          if (chunk.type === 'finish') {
            if (chunk.reason.kind === 'error' && !started && index + 1 < eligible.length
              && retryableFailure(chunk.reason.failure, serviceTier)) {
              lastError = chunk.reason.failure
              pending.length = 0
              break
            }
            yield* pending
            yield chunk
            return
          }
          if (isModelChunk(chunk)) {
            yield* pending
            pending.length = 0
            started = true
            yield chunk
          } else {
            pending.push(chunk)
          }
        }
        if (index + 1 >= eligible.length) return
      } catch (error: unknown) {
        if (!started && index + 1 < eligible.length && retryableError(error, serviceTier)) {
          lastError = error
          continue
        }
        throw error
      }
    }
    if (lastError instanceof Error) throw lastError
    if (lastError !== undefined) {
      const failure = lastError as LlmFailure
      throw new LlmError(failure.message, failure.code, { cause: lastError })
    }
    throw new LlmError(`model-policy logical model "${policy.id}" ended without a response`, 'STREAM_CLOSED')
  }
}
