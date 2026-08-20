/**
 * Pluggable Fast augmentations: adds `fast` to the service-tier map and
 * `supportsFast` to model metadata without touching `@deepseek-ai/dsh-llm`.
 * @module @deepseek-ai/dsh-fast/types
 */
export {};
declare module '@deepseek-ai/dsh-llm' {
    interface LlmServiceTierMap {
        fast: 'fast';
    }
    interface LlmModelInfo {
        /** Whether this model may be used with the Fast tier when the session enables it. */
        supportsFast?: boolean;
    }
    interface LlmResolvedModelInfo {
        supportsFast?: boolean;
    }
}
declare module '@deepseek-ai/dsh-llm/types' {
    interface LlmServiceTierMap {
        fast: 'fast';
    }
    interface LlmModelInfo {
        supportsFast?: boolean;
    }
    interface LlmResolvedModelInfo {
        supportsFast?: boolean;
    }
}
//# sourceMappingURL=types.d.ts.map