/** Logical cross-provider model policy plugin for DSH. */
import { LlmError, assertUsableApiKey, } from '@deepseek-ai/dsh-llm';
import { PiAiAdapter } from '@deepseek-ai/dsh-llm-pi-ai';
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment';
import { profilesForServiceTier, resolveConfig } from "./config.js";
import { ModelPolicyAdapter } from "./adapter.js";
import { foldFastMode } from "./fast.js";
export { ModelPolicyAdapter } from "./adapter.js";
export { Config } from "./config.js";
export { foldFastMode } from "./fast.js";
export const name = 'codex-model-policy';
export const inject = ['llm'];
function physicalAdapterFor(ctx, config) {
    const adapters = new Map();
    return (serviceTier) => {
        const key = serviceTier ?? '';
        const existing = adapters.get(key);
        if (existing !== undefined)
            return existing;
        const providers = profilesForServiceTier(config.providers, serviceTier);
        const profiles = new Map(Object.entries(providers));
        const adapter = new PiAiAdapter({
            profiles: () => profiles,
            resolveApiKey: async (provider, profile) => {
                const ref = profile.apiKeyEnv;
                if (ref === undefined)
                    return undefined;
                const credentials = ctx.get('credentials');
                const hit = credentials !== undefined
                    ? (await credentials.resolve(ref))?.value
                    : launchEnvironmentOf(ctx).get(ref)?.value;
                if (hit !== undefined && hit.length > 0)
                    return assertUsableApiKey(hit, 'codex-model-policy', ref);
                throw new LlmError(`codex-model-policy: no credential for provider route "${provider}"; its profile resolves ${ref}`, 'MISSING_CREDENTIAL');
            },
            resolveAttachments: () => ctx.get('attachments'),
        });
        adapters.set(key, adapter);
        return adapter;
    };
}
async function validatePolicy(policy, physical) {
    const infos = await Promise.all(policy.routes.map(route => physical.resolveModel(route.provider, route.model)));
    for (const modality of policy.input) {
        if (modality === 'image' && !infos.some(info => info.inputModalities?.includes('image'))) {
            throw new LlmError(`model-policy logical model "${policy.id}" declares image input but no route declares image capability`, 'UNSUPPORTED_CONTENT');
        }
    }
    for (const effort of policy.reasoning.allowed ?? []) {
        if (effort !== 'off' && !infos.some(info => info.reasoning?.efforts.some(candidate => String(candidate.id) === effort))) {
            throw new LlmError(`model-policy logical model "${policy.id}" has no route supporting reasoning "${effort}"`, 'UNSUPPORTED_REASONING_EFFORT');
        }
    }
}
function policyForSelection(resolved, selection) {
    if (selection.provider === resolved.providerId) {
        return resolved.models.get(selection.model);
    }
    for (const policy of resolved.models.values()) {
        if (policy.routes.some(route => route.provider === selection.provider && route.model === selection.model)) {
            return policy;
        }
    }
    return undefined;
}
function fastState(agent, resolved, selection) {
    return {
        active: foldFastMode(agent.session.events) === true,
        available: policyForSelection(resolved, selection)?.supportsFast === true,
    };
}
function setFast(agent, resolved, selection, active) {
    if (active && policyForSelection(resolved, selection)?.supportsFast !== true) {
        throw new LlmError('Fast mode is available only for GPT logical models.', 'UNSUPPORTED_OPTION');
    }
    if (foldFastMode(agent.session.events) !== active) {
        agent.session.append('model-policy/fast', { active });
    }
    return fastState(agent, resolved, selection);
}
async function requestWithFastMode(agent, resolved, next) {
    const config = await next();
    const mode = foldFastMode(agent.session.events);
    if (mode === undefined)
        return config;
    const policy = policyForSelection(resolved, config);
    if (mode && policy?.supportsFast !== true) {
        throw new LlmError('Fast mode is available only for GPT logical models; disable it before selecting another model.', 'UNSUPPORTED_OPTION');
    }
    if (mode)
        return { ...config, serviceTier: 'fast' };
    if (policy?.serviceTier !== undefined)
        return { ...config, serviceTier: 'default' };
    const { serviceTier: _serviceTier, ...withoutTier } = config;
    return withoutTier;
}
function installFastMode(ctx, resolved) {
    const controller = {
        getFast: (agent, selection) => fastState(agent, resolved, selection),
        setFast: (agent, selection, active) => setFast(agent, resolved, selection, active),
    };
    ctx.provide('modelPolicy', controller);
    ctx.effect(() => ctx.on('agent/request', ({ agent }, next) => requestWithFastMode(agent, resolved, next)), 'codex-model-policy: Fast mode');
}
/**
 * Validate physical candidates and register the logical provider route.
 * @param ctx - Cordis context carrying the LLM and optional attachment/credential services.
 * @param config - schema-resolved logical model policy configuration.
 * @returns a promise that settles after candidate validation and registration.
 */
export async function apply(ctx, config) {
    const resolved = resolveConfig(config);
    if (resolved.models.size === 0) {
        throw new Error('model-policy: models must contain at least one logical model');
    }
    const adapterFor = physicalAdapterFor(ctx, resolved);
    const basePhysical = adapterFor(undefined);
    for (const policy of resolved.models.values())
        await validatePolicy(policy, basePhysical);
    ctx.llm.registerAdapter([resolved.providerId], new ModelPolicyAdapter(resolved, adapterFor));
    installFastMode(ctx, resolved);
}
//# sourceMappingURL=index.js.map