/** Package-owned invariant companion for `@deepseek-ai/dsh-codex-model-policy`. */

/* jscpd:ignore-start */
import type { Context } from '@deepseek-ai/cordis'
import type { Session, SessionEvent } from '@deepseek-ai/dsh-session'
import type { InvariantFailure, InvariantInstaller } from '@deepseek-ai/dsh-invariants'

const PACKAGE_NAME = '@deepseek-ai/dsh-codex-model-policy'

/** Cordis companion plugin name. */
export const name = 'codex-model-policy-invariant'
/** Service required before the companion can reserve package ownership. */
export const inject = ['invariants']

/** Validate one durable Fast-mode event at the session log boundary. */
function validateFast(event: SessionEvent<'model-policy/fast'>, fail: InvariantFailure): void {
  if (typeof event.data.active !== 'boolean') fail('model-policy/fast active must be boolean')
}

/** Validate every Fast-mode event already present in one loaded session. */
function validateSession(session: Session, fail: InvariantFailure): void {
  for (const event of session.events) {
    if (event.type === 'model-policy/fast') validateFast(event, fail)
  }
}

/** Install validation for loaded and newly appended Fast-mode records. */
const install: InvariantInstaller = Object.assign((ctx: Context, fail: InvariantFailure) => {
  const sessions = ctx.get('sessions') as { list?: () => Iterable<Session> }
  if (typeof sessions.list === 'function') {
    for (const session of sessions.list()) validateSession(session, fail)
  }
  ctx.on('session/created', (session) => { validateSession(session, fail) }, { global: true })
  ctx.on('internal/dispatch', (_mode, eventName, args) => {
    if (eventName !== 'session/event') return
    const [, event] = args as [Session, SessionEvent]
    if (event.type === 'model-policy/fast') validateFast(event, fail)
  }, { global: true })
}, { inject: ['sessions'] })

/**
 * Register this package's invariant companion.
 * @param ctx - Cordis context carrying the invariant service.
 * @returns the installed registration's disposer after setup succeeds.
 */
export const apply = (ctx: Context): Promise<() => void> =>
  Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install))
/* jscpd:ignore-end */
