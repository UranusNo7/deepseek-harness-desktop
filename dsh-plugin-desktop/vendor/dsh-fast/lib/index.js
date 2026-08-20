import { FAST_EVENT, LEGACY_FAST_EVENT, foldFastMode } from "./fast.js";
//#region src/index.ts
const name = "fast";
const inject = ["llm", "commands"];
function isAvailableForModel(model) {
	return model?.supportsFast === true;
}
function makeController(_ctx) {
	const controller = {
		getFast(agent) {
			const active = foldFastMode(agent.session.events) === true;
			return {
				active,
				available: active || isAvailableForModel(void 0) ? active : false
			};
		},
		setFast(agent, active) {
			if (active) {}
			if (foldFastMode(agent.session.events) !== active) agent.session.append(FAST_EVENT, { active });
			return controller.getFast(agent);
		},
		isAvailable() {
			return false;
		}
	};
	return controller;
}
async function requestWithFastMode(agent, next) {
	const config = await next();
	const mode = foldFastMode(agent.session.events);
	if (mode === void 0) return config;
	if (mode) return {
		...config,
		serviceTier: "fast"
	};
	if (config.serviceTier === "fast") {
		const { serviceTier: _serviceTier, ...withoutTier } = config;
		return withoutTier;
	}
	return config;
}
/**
* Register the Fast controller, its request waterfall, and the human-facing
* `/fast` command when the command registry is present.
* @param ctx - Cordis context carrying `llm` and `sessions`.
*/
function apply(ctx) {
	console.log("[dsh-fast] apply, has commands", !!(ctx.get?.("commands")));
	const controller = makeController(ctx);
	ctx.provide("fast", controller);
	ctx.effect(() => ctx.on("agent/request", ({ agent }, next) => requestWithFastMode(agent, next)), "fast: tier injection");
	ctx.effect(function* () {
		const commands = ctx.get?.("commands");
		if (commands === void 0) return;
		yield commands.register({
			name: "fast",
			description: "Toggle Fast mode (usage: /fast [on|off|status])",
			handler: async (invocation) => {
				const agent = invocation.agent;
				if (agent === void 0) return {
					kind: "error",
					text: "Fast mode is only available inside a session."
				};
				const raw = invocation.rawInput.trim().toLowerCase();
				const current = foldFastMode(agent.session.events) === true;
				if (raw === "" || raw === "toggle") {
					const next = !current;
					controller.setFast(agent, next);
					return {
						kind: "success",
						text: `Fast mode ${next ? "enabled" : "disabled"}.`
					};
				}
				if (raw === "on" || raw === "enable" || raw === "1" || raw === "true") {
					if (current) return {
						kind: "success",
						text: "Fast mode is already enabled."
					};
					controller.setFast(agent, true);
					return {
						kind: "success",
						text: "Fast mode enabled."
					};
				}
				if (raw === "off" || raw === "disable" || raw === "0" || raw === "false") {
					if (!current) return {
						kind: "success",
						text: "Fast mode is already disabled."
					};
					controller.setFast(agent, false);
					return {
						kind: "success",
						text: "Fast mode disabled."
					};
				}
				if (raw === "status" || raw === "show") return {
					kind: "success",
					text: `Fast mode is ${current ? "enabled" : "disabled"}.`
				};
				return {
					kind: "error",
					text: "Usage: /fast [on|off|status] — bare /fast toggles."
				};
			}
		});
	}, "fast: /fast command");
}
//#endregion
export { FAST_EVENT, LEGACY_FAST_EVENT, apply, foldFastMode, inject, name };
