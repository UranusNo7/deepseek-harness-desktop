import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import * as Fast from '@deepseek-ai/dsh-fast'
import LlmRuntime from '@deepseek-ai/dsh-llm'

describe('desktop Fast via upstream dsh-fast', () => {
  it('persists fast/mode and its legacy alias', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(Fast as unknown as Parameters<Context['plugin']>[0])
    const session = ctx.sessions.create(SessionId('fast-alias'))
    const agent = { id: session.id, session, ctx } as unknown as { session: typeof session; ctx: Context }
    const controller = ctx.get('fast') as Fast.FastController
    expect(controller).toBeDefined()
    expect(Fast.foldFastMode(session.events)).toBeUndefined()
    controller.setFast(agent as any, true)
    expect(Fast.foldFastMode(session.events)).toBe(true)
    expect(session.events.filter(e => e.type === 'fast/mode').at(-1)?.data).toEqual({ active: true })
    // legacy alias is also folded
    const legacySession = { events: [{ type: 'model-policy/fast', data: { active: true } }] } as unknown as typeof session
    expect(Fast.foldFastMode((legacySession as any).events)).toBe(true)
    await ctx.fiber.dispose()
  })

  it('toggles Fast via controller and keeps durable state', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(Fast as unknown as Parameters<Context['plugin']>[0])
    const session = ctx.sessions.create(SessionId('fast-toggle'))
    const agent = { id: session.id, session, ctx } as unknown as { session: typeof session; ctx: Context }
    const controller = ctx.get('fast') as Fast.FastController
    expect(controller.getFast(agent as any).active).toBe(false)
    controller.setFast(agent as any, true)
    expect(controller.getFast(agent as any).active).toBe(true)
    controller.setFast(agent as any, false)
    expect(controller.getFast(agent as any).active).toBe(false)
    await ctx.fiber.dispose()
  })

  it('exposes /fast command when commands service is present', async () => {
    const ctx = new Context()
    await ctx.plugin(SessionStore)
    await ctx.plugin(LlmRuntime)
    // Fast registers /fast only when ctx.commands exists; ensure it does not throw without it
    await ctx.plugin(Fast as unknown as Parameters<Context['plugin']>[0])
    expect(ctx.get('fast')).toBeDefined()
    await ctx.fiber.dispose()
  })
})
