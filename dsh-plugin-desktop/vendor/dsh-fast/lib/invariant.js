import { isAgentLoopRequest } from "@deepseek-ai/dsh-llm";
import { foldRequestHeader } from "@deepseek-ai/dsh-session";
//#region src/invariant.ts
const PACKAGE_NAME = "@deepseek-ai/dsh-fast";
const name = "fast-invariant";
const inject = ["invariants"];
const install = Object.assign((ctx, fail) => {
	ctx.on("llm/stream", (options, next) => {
		if (!isAgentLoopRequest(options)) return next();
		const session = options.sessionId === void 0 ? void 0 : ctx.sessions.get(options.sessionId);
		if (session === void 0) return next();
		const header = foldRequestHeader(session.events);
		if (header === void 0) return next();
		if (options.serviceTier !== header.config.serviceTier) fail(`fast invariant: llm request serviceTier "${String(options.serviceTier)}" diverges from header "${String(header.config.serviceTier)}" for session "${String(session.id)}"`);
		return next();
	}, {
		global: true,
		prepend: true
	});
}, { inject: ["sessions"] });
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
