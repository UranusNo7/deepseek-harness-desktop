/** Logical-model LLM adapter backed by one or more pi-ai provider routes. */
import { LlmAdapter } from '@deepseek-ai/dsh-llm';
import type { GenerateOptions, LlmModelInfo, LlmResolvedModelInfo, StreamChunk } from '@deepseek-ai/dsh-llm';
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai';
import type { LlmServiceTier } from '@deepseek-ai/dsh-llm';
import type { ResolvedConfig } from './types.ts';
/** Factory for immutable physical adapters grouped by logical service tier. */
export type PhysicalAdapterForTier = (serviceTier: LlmServiceTier | undefined) => PiAiAdapter;
/**
 * Adapter that exposes logical models while preserving pi-ai's physical request and replay conversion.
 */
export declare class ModelPolicyAdapter extends LlmAdapter {
    private readonly config;
    private readonly physicalAdapterForTier;
    constructor(config: ResolvedConfig, physicalAdapterForTier: PhysicalAdapterForTier);
    providerInfo(provider: string): {
        id: string;
        name: string;
    };
    listModels(provider: string): Promise<readonly LlmModelInfo[]>;
    resolveModel(provider: string, model: string, signal?: AbortSignal): Promise<LlmResolvedModelInfo>;
    stream(options: GenerateOptions): AsyncIterable<StreamChunk>;
}
//# sourceMappingURL=adapter.d.ts.map