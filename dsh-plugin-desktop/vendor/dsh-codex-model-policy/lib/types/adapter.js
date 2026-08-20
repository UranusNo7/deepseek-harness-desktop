/** Logical-model LLM adapter backed by one or more pi-ai provider routes. */
import { contentHasImage, LlmAdapter, LlmError, ReasoningEffortId, } from '@deepseek-ai/dsh-llm';
import { policyOf } from "./config.js";
function replayRoute(value) {
    if (typeof value !== 'object' || value === null || Array.isArray(value))
        return undefined;
    const state = value;
    if (state.kind !== 'pi-ai' || state.version !== 1)
        return undefined;
    if (typeof state.provider !== 'string' || typeof state.model !== 'string')
        return undefined;
    return { provider: state.provider, model: state.model };
}
function mapMessageForRoute(message, route) {
    if (message.role !== 'assistant' || message.source.kind !== 'model') {
        return message;
    }
    const replay = replayRoute(message.source.replayState);
    return {
        ...message,
        source: replay?.provider === route.provider && replay.model === route.model
            ? { ...message.source, provider: route.provider, model: route.model }
            : { kind: 'model', provider: route.provider, model: route.model },
    };
}
function hasReasoningEffort(info, effort) {
    if (effort === 'off')
        return true;
    return info.reasoning?.efforts.some(candidate => String(candidate.id) === effort) ?? false;
}
function isModelChunk(chunk) {
    switch (chunk.type) {
        case 'block-start':
        case 'text-delta':
        case 'reasoning-delta':
        case 'tool-call-delta':
        case 'block-end':
            return true;
        case 'usage':
        case 'finish':
            return false;
    }
}
function failureCode(error) {
    if (error instanceof LlmError)
        return error.code;
    if (typeof error !== 'object' || error === null)
        return undefined;
    const code = error.code;
    return typeof code === 'string' ? code : undefined;
}
function retryableFailure(failure, serviceTier) {
    return failure.code === 'RATE_LIMIT'
        || failure.code === 'SERVER'
        || failure.code === 'TIMEOUT'
        || failure.code === 'TRANSPORT'
        || (serviceTier !== undefined && failure.code === 'UNSUPPORTED_OPTION');
}
function retryableError(error, serviceTier) {
    const code = failureCode(error);
    return code === 'RATE_LIMIT'
        || code === 'SERVER'
        || code === 'TIMEOUT'
        || code === 'TRANSPORT'
        || (serviceTier !== undefined && code === 'UNSUPPORTED_OPTION');
}
async function candidatesFor(adapter, policy, signal) {
    return Promise.all(policy.routes.map(async (route) => ({
        route,
        info: await adapter.resolveModel(route.provider, route.model, signal),
    })));
}
/**
 * Adapter that exposes logical models while preserving pi-ai's physical request and replay conversion.
 */
export class ModelPolicyAdapter extends LlmAdapter {
    config;
    physicalAdapterForTier;
    constructor(config, physicalAdapterForTier) {
        super();
        this.config = config;
        this.physicalAdapterForTier = physicalAdapterForTier;
    }
    providerInfo(provider) {
        return { id: provider, name: this.config.displayName };
    }
    listModels(provider) {
        return Promise.resolve([...this.config.models.values()].map(policy => ({
            provider,
            id: policy.id,
            name: policy.name,
        })));
    }
    async resolveModel(provider, model, signal) {
        const policy = policyOf(this.config, model);
        const candidates = await candidatesFor(this.physicalAdapterForTier(policy.serviceTier), policy, signal);
        const contexts = candidates
            .map(candidate => candidate.info.context?.contextWindow)
            .filter((value) => value !== undefined);
        const supportedEfforts = policy.reasoning.allowed?.filter(effort => candidates.some(candidate => hasReasoningEffort(candidate.info, effort))) ?? [];
        if (policy.reasoning.default !== undefined && !supportedEfforts.includes(policy.reasoning.default)) {
            throw new LlmError(`model-policy logical model "${model}" has no route supporting default reasoning "${policy.reasoning.default}"`, 'UNSUPPORTED_REASONING_EFFORT');
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
        };
    }
    async *stream(options) {
        const policy = policyOf(this.config, options.model);
        const containsImage = options.messages.some(message => contentHasImage(message.content));
        if (containsImage && !policy.input.includes('image')) {
            throw new LlmError(`model-policy logical model "${policy.id}" does not declare image input`, 'UNSUPPORTED_CONTENT');
        }
        const requestedReasoning = options.reasoningEffort === undefined
            ? policy.reasoning.default
            : String(options.reasoningEffort);
        if (requestedReasoning !== undefined && !policy.reasoning.allowed?.includes(requestedReasoning)) {
            throw new LlmError(`model-policy logical model "${policy.id}" does not allow reasoning "${requestedReasoning}"`, 'UNSUPPORTED_REASONING_EFFORT');
        }
        const serviceTier = options.serviceTier ?? policy.serviceTier;
        const physical = this.physicalAdapterForTier(serviceTier);
        const candidates = await candidatesFor(physical, policy, options.signal);
        const eligible = candidates.filter((candidate) => {
            if (containsImage && !candidate.info.inputModalities?.includes('image'))
                return false;
            if (requestedReasoning !== undefined && !hasReasoningEffort(candidate.info, requestedReasoning))
                return false;
            return true;
        });
        if (eligible.length === 0) {
            if (containsImage) {
                throw new LlmError(`model-policy logical model "${policy.id}" has no image-capable route`, 'UNSUPPORTED_CONTENT');
            }
            if (requestedReasoning !== undefined) {
                throw new LlmError(`model-policy logical model "${policy.id}" has no route supporting reasoning "${requestedReasoning}"`, 'UNSUPPORTED_REASONING_EFFORT');
            }
            throw new LlmError(`model-policy logical model "${policy.id}" has no eligible route`, 'NO_ROUTE');
        }
        let lastError;
        for (let index = 0; index < eligible.length; index++) {
            const candidate = eligible[index];
            if (candidate === undefined)
                continue;
            const pending = [];
            let started = false;
            const request = {
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
            };
            try {
                for await (const chunk of physical.stream(request)) {
                    if (chunk.type === 'finish') {
                        if (chunk.reason.kind === 'error' && !started && index + 1 < eligible.length
                            && retryableFailure(chunk.reason.failure, serviceTier)) {
                            lastError = chunk.reason.failure;
                            pending.length = 0;
                            break;
                        }
                        yield* pending;
                        yield chunk;
                        return;
                    }
                    if (isModelChunk(chunk)) {
                        yield* pending;
                        pending.length = 0;
                        started = true;
                        yield chunk;
                    }
                    else {
                        pending.push(chunk);
                    }
                }
                if (index + 1 >= eligible.length)
                    return;
            }
            catch (error) {
                if (!started && index + 1 < eligible.length && retryableError(error, serviceTier)) {
                    lastError = error;
                    continue;
                }
                throw error;
            }
        }
        if (lastError instanceof Error)
            throw lastError;
        if (lastError !== undefined) {
            const failure = lastError;
            throw new LlmError(failure.message, failure.code, { cause: lastError });
        }
        throw new LlmError(`model-policy logical model "${policy.id}" ended without a response`, 'STREAM_CLOSED');
    }
}
//# sourceMappingURL=adapter.js.map