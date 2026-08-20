/**
 * Package-owned invariant for Fast: a loop-built request's serviceTier must
 * match the folded header when Fast is involved.
 * @module @deepseek-ai/dsh-fast/invariant
 */
import { isAgentLoopRequest } from '@deepseek-ai/dsh-llm';
import { foldRequestHeader } from '@deepseek-ai/dsh-session';
const PACKAGE_NAME = '@deepseek-ai/dsh-fast';
export const name = 'fast-invariant';
export const inject = ['invariants'];
const install = Object.assign((ctx, fail) => {
    ctx.on('llm/stream', (options, next) => {
        if (!isAgentLoopRequest(options))
            return next();
        const session = options.sessionId === undefined ? undefined : ctx.sessions.get(options.sessionId);
        if (session === undefined)
            return next();
        const header = foldRequestHeader(session.events);
        if (header === undefined)
            return next();
        if (options.serviceTier !== header.config.serviceTier) {
            fail(`fast invariant: llm request serviceTier "${String(options.serviceTier)}" diverges from header "${String(header.config.serviceTier)}" for session "${String(session.id)}"`);
        }
        return next();
    }, { global: true, prepend: true });
}, { inject: ['sessions'] });
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//# sourceMappingURL=invariant.js.map