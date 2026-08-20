import { LlmAdapter, LlmError, ReasoningEffortId, assertUsableApiKey, contentHasImage } from "@deepseek-ai/dsh-llm";
import { PiAiAdapter } from "@deepseek-ai/dsh-llm-pi-ai";
import z from "@deepseek-ai/schemastery";
import { foldFastMode } from "@deepseek-ai/dsh-fast/fast";
//#region ../../util/launch-environment/lib/index.js
/**
* Immutable launch-time environment snapshot that records which layer
* supplied each value. Harness consumers resolve through it instead of a flattened
* `process.env`; launchers may still materialize accepted values for config
* expressions and third-party libraries.
* @module @deepseek-ai/dsh-launch-environment
*/
/** Layer order, most trusted first. */
const SOURCE_ORDER = [
	"process",
	"project-env",
	"user-env"
];
/**
* The map key one variable name resolves under. Windows treats environment
* names case-insensitively; every other platform does not.
* @param name - the variable name as written.
* @returns the key to store and look up by.
*/
function lookupKey(name) {
	/* v8 ignore next -- native Windows coverage exercises the folding arm; POSIX covers the exact one */
	return process.platform === "win32" ? name.toUpperCase() : name;
}
/**
* Build the snapshot from each layer's contents.
* @param layers - the layers in any order; the result searches them by canonical trust order.
* @returns the immutable snapshot.
*/
function createLaunchEnvironmentSnapshot(layers) {
	const bySource = /* @__PURE__ */ new Map();
	for (const layer of layers) bySource.set(layer.source, {
		...layer.path === void 0 ? {} : { path: layer.path },
		values: new Map(Object.entries(layer.values).map(([name, value]) => [lookupKey(name), value]))
	});
	const getFrom = (name, sources) => {
		const key = lookupKey(name);
		for (const source of SOURCE_ORDER) {
			if (!sources.includes(source)) continue;
			const layer = bySource.get(source);
			const value = layer?.values.get(key);
			if (value === void 0) continue;
			return {
				value,
				source,
				...layer?.path === void 0 ? {} : { path: layer.path }
			};
		}
	};
	return {
		get: (name) => getFrom(name, SOURCE_ORDER),
		getFrom
	};
}
/**
* Return the launcher's snapshot, or the inherited environment as the sole
* layer when the host provided none.
* @param ctx - the consuming plugin's context.
* @returns the snapshot to resolve user-facing values against.
*/
function launchEnvironmentOf(ctx) {
	return ctx.get("launchEnvironment") ?? createLaunchEnvironmentSnapshot([{
		source: "process",
		values: process.env
	}]);
}
//#endregion
//#region lib/types/config.js
/** Configuration schema and validation for logical model policies. */
/** Modalities that a logical policy can advertise. */
const POLICY_MODALITIES = ["text", "image"];
const route = z.object({
	provider: z.string().required(),
	model: z.string().required(),
	priority: z.number().step(1).default(0)
});
const reasoning = z.object({
	default: z.string(),
	allowed: z.array(z.string()).default([])
});
const model = z.object({
	name: z.string(),
	contextWindow: z.number().step(1).min(1),
	maxTokens: z.number().step(1).min(1),
	input: z.array(z.union(POLICY_MODALITIES)).default(["text"]),
	reasoning,
	serviceTier: z.string(),
	supportsFast: z.boolean().default(false),
	routes: z.array(route).required()
});
/** Runtime schema for the logical model policy plugin. */
const Config = z.object({
	providerId: z.string().default("model-policy"),
	displayName: z.string().default("Model Policy"),
	providers: z.dict(z.any()).default({}),
	models: z.dict(model).default({})
});
/**
* Resolve configuration values into stable policy maps and reject ambiguous routes.
* @param config - schema-resolved plugin configuration.
* @returns detached policy configuration used by the adapter.
*/
function resolveConfig(config) {
	const providerId = config.providerId ?? "model-policy";
	const displayName = config.displayName ?? "Model Policy";
	if (providerId.length === 0) throw new Error("model-policy: providerId must not be empty");
	const models = /* @__PURE__ */ new Map();
	for (const [id, source] of Object.entries(config.models ?? {})) {
		if (id.length === 0) throw new Error("model-policy: logical model ids must not be empty");
		const routes = source.routes.map((candidate, index) => ({
			provider: candidate.provider,
			model: candidate.model,
			priority: candidate.priority ?? index
		})).sort((left, right) => left.priority - right.priority);
		if (routes.length === 0) throw new Error(`model-policy: logical model "${id}" needs at least one route`);
		const routeKeys = /* @__PURE__ */ new Set();
		for (const candidate of routes) {
			const key = `${candidate.provider}\u0000${candidate.model}`;
			if (routeKeys.has(key)) throw new Error(`model-policy: logical model "${id}" repeats route ${candidate.provider}/${candidate.model}`);
			routeKeys.add(key);
		}
		const policyReasoning = source.reasoning ?? {};
		const allowed = [...policyReasoning.allowed ?? []];
		if (policyReasoning.default !== void 0 && !allowed.includes(policyReasoning.default)) throw new Error(`model-policy: logical model "${id}" defaults to reasoning "${policyReasoning.default}" outside allowed`);
		models.set(id, {
			id,
			name: source.name ?? id,
			...source.contextWindow === void 0 ? {} : { contextWindow: source.contextWindow },
			...source.maxTokens === void 0 ? {} : { maxTokens: source.maxTokens },
			input: [...source.input ?? ["text"]],
			reasoning: {
				...policyReasoning.default === void 0 ? {} : { default: policyReasoning.default },
				allowed
			},
			...source.serviceTier === void 0 ? {} : { serviceTier: source.serviceTier },
			supportsFast: source.supportsFast ?? false,
			routes
		});
	}
	return {
		providerId,
		displayName,
		providers: { ...config.providers ?? {} },
		models
	};
}
/**
* Return a provider-profile snapshot with one logical service tier applied.
* @param providers - Physical provider profiles keyed by route.
* @param serviceTier - Logical service tier to apply, or undefined to preserve profiles.
* @returns A shallow provider-profile map with the requested tier applied.
*/
function profilesForServiceTier(providers, serviceTier) {
	if (serviceTier === void 0) return { ...providers };
	return Object.fromEntries(Object.entries(providers).map(([provider, profile]) => [provider, {
		...profile,
		serviceTier
	}]));
}
/**
* Find one logical model or throw the stable unknown-model diagnostic.
* @param config - Resolved logical model policy configuration.
* @param modelId - Stable logical model selector id.
* @returns The resolved logical model policy.
*/
function policyOf(config, modelId) {
	const policy = config.models.get(modelId);
	if (policy === void 0) throw new Error(`model-policy provider has no logical model "${modelId}"`);
	return policy;
}
//#endregion
//#region lib/types/adapter.js
/** Logical-model LLM adapter backed by one or more pi-ai provider routes. */
function replayRoute(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return void 0;
	const state = value;
	if (state.kind !== "pi-ai" || state.version !== 1) return void 0;
	if (typeof state.provider !== "string" || typeof state.model !== "string") return void 0;
	return {
		provider: state.provider,
		model: state.model
	};
}
function mapMessageForRoute(message, route) {
	if (message.role !== "assistant" || message.source.kind !== "model") return message;
	const replay = replayRoute(message.source.replayState);
	return {
		...message,
		source: replay?.provider === route.provider && replay.model === route.model ? {
			...message.source,
			provider: route.provider,
			model: route.model
		} : {
			kind: "model",
			provider: route.provider,
			model: route.model
		}
	};
}
function hasReasoningEffort(info, effort) {
	if (effort === "off") return true;
	return info.reasoning?.efforts.some((candidate) => String(candidate.id) === effort) ?? false;
}
function isModelChunk(chunk) {
	switch (chunk.type) {
		case "block-start":
		case "text-delta":
		case "reasoning-delta":
		case "tool-call-delta":
		case "block-end": return true;
		case "usage":
		case "finish": return false;
	}
}
function failureCode(error) {
	if (error instanceof LlmError) return error.code;
	if (typeof error !== "object" || error === null) return void 0;
	const code = error.code;
	return typeof code === "string" ? code : void 0;
}
function retryableFailure(failure, serviceTier) {
	return failure.code === "RATE_LIMIT" || failure.code === "SERVER" || failure.code === "TIMEOUT" || failure.code === "TRANSPORT" || serviceTier !== void 0 && failure.code === "UNSUPPORTED_OPTION";
}
function retryableError(error, serviceTier) {
	const code = failureCode(error);
	return code === "RATE_LIMIT" || code === "SERVER" || code === "TIMEOUT" || code === "TRANSPORT" || serviceTier !== void 0 && code === "UNSUPPORTED_OPTION";
}
async function candidatesFor(adapter, policy, signal) {
	return Promise.all(policy.routes.map(async (route) => ({
		route,
		info: await adapter.resolveModel(route.provider, route.model, signal)
	})));
}
/**
* Adapter that exposes logical models while preserving pi-ai's physical request and replay conversion.
*/
var ModelPolicyAdapter = class extends LlmAdapter {
	config;
	physicalAdapterForTier;
	constructor(config, physicalAdapterForTier) {
		super();
		this.config = config;
		this.physicalAdapterForTier = physicalAdapterForTier;
	}
	providerInfo(provider) {
		return {
			id: provider,
			name: this.config.displayName
		};
	}
	listModels(provider) {
		return Promise.resolve([...this.config.models.values()].map((policy) => ({
			provider,
			id: policy.id,
			name: policy.name
		})));
	}
	async resolveModel(provider, model, signal) {
		const policy = policyOf(this.config, model);
		const candidates = await candidatesFor(this.physicalAdapterForTier(policy.serviceTier), policy, signal);
		const contexts = candidates.map((candidate) => candidate.info.context?.contextWindow).filter((value) => value !== void 0);
		const supportedEfforts = policy.reasoning.allowed?.filter((effort) => candidates.some((candidate) => hasReasoningEffort(candidate.info, effort))) ?? [];
		if (policy.reasoning.default !== void 0 && !supportedEfforts.includes(policy.reasoning.default)) throw new LlmError(`model-policy logical model "${model}" has no route supporting default reasoning "${policy.reasoning.default}"`, "UNSUPPORTED_REASONING_EFFORT");
		return {
			provider,
			id: model,
			name: policy.name,
			inputModalities: [...policy.input],
			supportsFast: policy.supportsFast,
			...policy.contextWindow !== void 0 || contexts.length > 0 ? { context: { contextWindow: Math.min(policy.contextWindow ?? Infinity, ...contexts) } } : {},
			...policy.maxTokens === void 0 ? {} : { defaultMaxTokens: policy.maxTokens },
			...supportedEfforts.length === 0 ? {} : { reasoning: {
				efforts: supportedEfforts.map((effort) => ({
					id: ReasoningEffortId(effort),
					name: effort
				})),
				...policy.reasoning.default === void 0 ? {} : { defaultEffort: ReasoningEffortId(policy.reasoning.default) }
			} }
		};
	}
	async *stream(options) {
		const policy = policyOf(this.config, options.model);
		const containsImage = options.messages.some((message) => contentHasImage(message.content));
		if (containsImage && !policy.input.includes("image")) throw new LlmError(`model-policy logical model "${policy.id}" does not declare image input`, "UNSUPPORTED_CONTENT");
		const requestedReasoning = options.reasoningEffort === void 0 ? policy.reasoning.default : String(options.reasoningEffort);
		if (requestedReasoning !== void 0 && !policy.reasoning.allowed?.includes(requestedReasoning)) throw new LlmError(`model-policy logical model "${policy.id}" does not allow reasoning "${requestedReasoning}"`, "UNSUPPORTED_REASONING_EFFORT");
		const serviceTier = options.serviceTier ?? policy.serviceTier;
		const physical = this.physicalAdapterForTier(serviceTier);
		const eligible = (await candidatesFor(physical, policy, options.signal)).filter((candidate) => {
			if (containsImage && !candidate.info.inputModalities?.includes("image")) return false;
			if (requestedReasoning !== void 0 && !hasReasoningEffort(candidate.info, requestedReasoning)) return false;
			return true;
		});
		if (eligible.length === 0) {
			if (containsImage) throw new LlmError(`model-policy logical model "${policy.id}" has no image-capable route`, "UNSUPPORTED_CONTENT");
			if (requestedReasoning !== void 0) throw new LlmError(`model-policy logical model "${policy.id}" has no route supporting reasoning "${requestedReasoning}"`, "UNSUPPORTED_REASONING_EFFORT");
			throw new LlmError(`model-policy logical model "${policy.id}" has no eligible route`, "NO_ROUTE");
		}
		let lastError;
		for (let index = 0; index < eligible.length; index++) {
			const candidate = eligible[index];
			if (candidate === void 0) continue;
			const pending = [];
			let started = false;
			const request = {
				...options,
				provider: candidate.route.provider,
				model: candidate.route.model,
				messages: options.messages.map((message) => mapMessageForRoute(message, candidate.route)),
				...options.maxTokens === void 0 && policy.maxTokens !== void 0 ? { maxTokens: policy.maxTokens } : {},
				...options.reasoningEffort === void 0 && policy.reasoning.default !== void 0 ? { reasoningEffort: ReasoningEffortId(policy.reasoning.default) } : {}
			};
			try {
				for await (const chunk of physical.stream(request)) {
					if (chunk.type === "finish") {
						if (chunk.reason.kind === "error" && !started && index + 1 < eligible.length && retryableFailure(chunk.reason.failure, serviceTier)) {
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
					} else pending.push(chunk);
				}
				if (index + 1 >= eligible.length) return;
			} catch (error) {
				if (!started && index + 1 < eligible.length && retryableError(error, serviceTier)) {
					lastError = error;
					continue;
				}
				throw error;
			}
		}
		if (lastError instanceof Error) throw lastError;
		if (lastError !== void 0) {
			const failure = lastError;
			throw new LlmError(failure.message, failure.code, { cause: lastError });
		}
		throw new LlmError(`model-policy logical model "${policy.id}" ended without a response`, "STREAM_CLOSED");
	}
};
//#endregion
//#region lib/types/index.js
/** Logical cross-provider model policy plugin for DSH. */
const name = "codex-model-policy";
const inject = ["llm"];
function physicalAdapterFor(ctx, config) {
	const adapters = /* @__PURE__ */ new Map();
	return (serviceTier) => {
		const key = serviceTier ?? "";
		const existing = adapters.get(key);
		if (existing !== void 0) return existing;
		const providers = profilesForServiceTier(config.providers, serviceTier);
		const profiles = new Map(Object.entries(providers));
		const adapter = new PiAiAdapter({
			profiles: () => profiles,
			resolveApiKey: async (provider, profile) => {
				const ref = profile.apiKeyEnv;
				if (ref === void 0) return void 0;
				const credentials = ctx.get("credentials");
				const hit = credentials !== void 0 ? (await credentials.resolve(ref))?.value : launchEnvironmentOf(ctx).get(ref)?.value;
				if (hit !== void 0 && hit.length > 0) return assertUsableApiKey(hit, "codex-model-policy", ref);
				throw new LlmError(`codex-model-policy: no credential for provider route "${provider}"; its profile resolves ${ref}`, "MISSING_CREDENTIAL");
			},
			resolveAttachments: () => ctx.get("attachments")
		});
		adapters.set(key, adapter);
		return adapter;
	};
}
async function validatePolicy(policy, physical) {
	const infos = await Promise.all(policy.routes.map((route) => physical.resolveModel(route.provider, route.model)));
	for (const modality of policy.input) if (modality === "image" && !infos.some((info) => info.inputModalities?.includes("image"))) throw new LlmError(`model-policy logical model "${policy.id}" declares image input but no route declares image capability`, "UNSUPPORTED_CONTENT");
	for (const effort of policy.reasoning.allowed ?? []) if (effort !== "off" && !infos.some((info) => info.reasoning?.efforts.some((candidate) => String(candidate.id) === effort))) throw new LlmError(`model-policy logical model "${policy.id}" has no route supporting reasoning "${effort}"`, "UNSUPPORTED_REASONING_EFFORT");
}
function policyForSelection(resolved, selection) {
	if (selection.provider === resolved.providerId) return resolved.models.get(selection.model);
	for (const policy of resolved.models.values()) if (policy.routes.some((route) => route.provider === selection.provider && route.model === selection.model)) return policy;
}
function fastState(agent, resolved, selection) {
	return {
		active: foldFastMode(agent.session.events) === true,
		available: policyForSelection(resolved, selection)?.supportsFast === true
	};
}
function setFast(agent, resolved, selection, active) {
	if (active && policyForSelection(resolved, selection)?.supportsFast !== true) throw new LlmError("Fast mode is available only for GPT logical models.", "UNSUPPORTED_OPTION");
	if (foldFastMode(agent.session.events) !== active) agent.session.append("model-policy/fast", { active });
	return fastState(agent, resolved, selection);
}
async function requestWithFastMode(agent, resolved, next) {
	const config = await next();
	const mode = foldFastMode(agent.session.events);
	if (mode === void 0) return config;
	const policy = policyForSelection(resolved, config);
	if (mode && policy?.supportsFast !== true) throw new LlmError("Fast mode is available only for GPT logical models; disable it before selecting another model.", "UNSUPPORTED_OPTION");
	if (mode) return {
		...config,
		serviceTier: "fast"
	};
	if (policy?.serviceTier !== void 0) return {
		...config,
		serviceTier: "default"
	};
	const { serviceTier: _serviceTier, ...withoutTier } = config;
	return withoutTier;
}
function installFastMode(ctx, resolved) {
	ctx.provide("modelPolicy", {
		getFast: (agent, selection) => fastState(agent, resolved, selection),
		setFast: (agent, selection, active) => setFast(agent, resolved, selection, active)
	});
	ctx.effect(() => ctx.on("agent/request", ({ agent }, next) => requestWithFastMode(agent, resolved, next)), "codex-model-policy: Fast mode");
}
/**
* Validate physical candidates and register the logical provider route.
* @param ctx - Cordis context carrying the LLM and optional attachment/credential services.
* @param config - schema-resolved logical model policy configuration.
* @returns a promise that settles after candidate validation and registration.
*/
async function apply(ctx, config) {
	const resolved = resolveConfig(config);
	if (resolved.models.size === 0) throw new Error("model-policy: models must contain at least one logical model");
	const adapterFor = physicalAdapterFor(ctx, resolved);
	const basePhysical = adapterFor(void 0);
	for (const policy of resolved.models.values()) await validatePolicy(policy, basePhysical);
	ctx.llm.registerAdapter([resolved.providerId], new ModelPolicyAdapter(resolved, adapterFor));
	installFastMode(ctx, resolved);
}
//#endregion
export { Config, ModelPolicyAdapter, apply, foldFastMode, inject, name };
