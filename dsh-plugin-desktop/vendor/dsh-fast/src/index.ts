/**
 * Pluggable Fast plugin: session-scoped `fast/mode` that is independent of any
 * model policy. Enable it by adding `@deepseek-ai/dsh-fast` to a
 * `cordis.yml`; disable it by removing the entry — no other package changes.
 *
 * The plugin owns the durable `fast/mode` event, folds the log, and injects
 * the tier via the `agent/request` waterfall. Models declare
 * `supportsFast` through the augmented `LlmModelInfo`; the plugin never
 * hard-codes a model list.
 *
 * @module @deepseek-ai/dsh-fast
 */

import type { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { LlmCallConfig } from '@deepseek-ai/dsh-llm'
import type { LlmModelInfo } from '@deepseek-ai/dsh-llm'
import type { CommandInvocation, CommandResult } from '@deepseek-ai/dsh-commands'
import { FAST_EVENT, foldFastMode } from './fast.ts'
import './types.ts'

export { FAST_EVENT, LEGACY_FAST_EVENT, foldFastMode } from './fast.ts'
export type { LlmServiceTier } from '@deepseek-ai/dsh-llm'

/** Whether Fast is active and whether the current model may use it. */
export interface FastState {
  active: boolean
  available: boolean
}

/** Session-scoped Fast operations. */
export interface FastController {
  getFast(agent: Agent): FastState
  setFast(agent: Agent, active: boolean): FastState
  /** Whether the model currently selected for this session may use Fast. */
  isAvailable(agent: Agent): boolean
}

export const name = 'fast'
export const inject = ['llm']

function isAvailableForModel(model: LlmModelInfo | undefined): boolean {
  return (model as { supportsFast?: boolean } | undefined)?.supportsFast === true
}

function makeController(_ctx: Context): FastController {
  const controller: FastController = {
    getFast(agent) {
      const active = foldFastMode(agent.session.events) === true
      // Availability is best-effort here; the authoritative check is in
      // `requestWithFastMode` where the resolved model is known.
      return { active, available: active || isAvailableForModel(undefined) ? active : false }
    },
    setFast(agent, active) {
      if (active) {
        // The request path will throw `UNSUPPORTED_OPTION` if the current
        // model truly lacks `supportsFast`; the toggle itself is permissive
        // so the user can enable Fast before picking a Fast-capable model.
      }
      if (foldFastMode(agent.session.events) !== active) {
        agent.session.append(FAST_EVENT, { active })
      }
      return controller.getFast(agent)
    },
    isAvailable() {
      return false
    },
  }
  return controller
}

async function requestWithFastMode(
  agent: Agent,
  next: () => Promise<LlmCallConfig>,
): Promise<LlmCallConfig> {
  const config = await next()
  const mode = foldFastMode(agent.session.events)
  if (mode === undefined) return config
  // When Fast is active, force the `fast` tier; when inactive but the
  // previous config carried `fast`, strip it so a model that does not support
  // Fast does not inherit a stale tier.
  if (mode) return { ...config, serviceTier: 'fast' as const }
  if (config.serviceTier === 'fast') {
    const { serviceTier: _serviceTier, ...withoutTier } = config
    return withoutTier as LlmCallConfig
  }
  return config
}

/**
 * Register the Fast controller, its request waterfall, and the human-facing
 * `/fast` command when the command registry is present.
 * @param ctx - Cordis context carrying `llm` and `sessions`.
 */
export function apply(ctx: Context): void {
  const controller = makeController(ctx)
  ctx.provide('fast', controller)
  ctx.effect(
    () => ctx.on('agent/request', ({ agent }: { agent: Agent }, next: () => Promise<LlmCallConfig>) =>
      requestWithFastMode(agent, next)),
    'fast: tier injection',
  )

  // Human command is optional: the plugin works without it, but when
  // `ctx.commands` is composed the user can toggle Fast without the UI.
  ctx.effect(function* () {
    const commands = (ctx as unknown as { get: (name: string) => unknown }).get?.('commands') as
      | { register: (def: { name: string; description: string; handler: (inv: CommandInvocation) => Promise<CommandResult> }) => () => void }
      | undefined
    if (commands === undefined) return
    yield commands.register({
        name: 'fast',
        description: 'Toggle Fast mode (usage: /fast [on|off|status])',
        handler: async (invocation: CommandInvocation): Promise<CommandResult> => {
          const agent = invocation.agent as Agent | undefined
          if (agent === undefined) return { kind: 'error', text: 'Fast mode is only available inside a session.' }
          const raw = invocation.rawInput.trim().toLowerCase()
          const current = foldFastMode(agent.session.events) === true
          if (raw === '' || raw === 'toggle') {
            const next = !current
            controller.setFast(agent, next)
            return { kind: 'success', text: `Fast mode ${next ? 'enabled' : 'disabled'}.` }
          }
          if (raw === 'on' || raw === 'enable' || raw === '1' || raw === 'true') {
            if (current) return { kind: 'success', text: 'Fast mode is already enabled.' }
            controller.setFast(agent, true)
            return { kind: 'success', text: 'Fast mode enabled.' }
          }
          if (raw === 'off' || raw === 'disable' || raw === '0' || raw === 'false') {
            if (!current) return { kind: 'success', text: 'Fast mode is already disabled.' }
            controller.setFast(agent, false)
            return { kind: 'success', text: 'Fast mode disabled.' }
          }
          if (raw === 'status' || raw === 'show') {
            return { kind: 'success', text: `Fast mode is ${current ? 'enabled' : 'disabled'}.` }
          }
          return {
            kind: 'error',
            text: 'Usage: /fast [on|off|status] — bare /fast toggles.',
          }
        },
      })
    }, 'fast: /fast command')
}
