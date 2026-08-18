import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import type { Agent } from '@deepseek-ai/dsh-agent'
import AgentRegistry, { agentEvents } from '@deepseek-ai/dsh-agent'
import { createApiProxy, RpcId } from '@deepseek-ai/dsh-host-apiproxy'
import type { RpcRequest } from '@deepseek-ai/dsh-host-apiproxy/api/rpc'
import LlmRuntime, { BlockAssembler } from '@deepseek-ai/dsh-llm'
import * as LlmPiAi from '@deepseek-ai/dsh-llm-pi-ai'
import * as ModelPolicy from '@deepseek-ai/dsh-llm-model-policy'
import SessionStore, { SessionId } from '@deepseek-ai/dsh-session'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import UserQuestionService from '@deepseek-ai/dsh-user-questions'

const signal = new AbortController().signal
const servers: Server[] = []

function policyConfig(baseURL = 'https://example.test/v1') {
  return {
    providerId: 'model-policy',
    providers: {
      primary: {
        apiKeyEnv: 'POLICY_KEY',
        api: 'openai-completions' as const,
        baseURL,
        models: [{ id: 'gpt', name: 'GPT', contextWindow: 1000, maxTokens: 1000 }],
      },
    },
    models: {
      'gpt-5.6': {
        name: 'GPT-5.6',
        contextWindow: 1000,
        maxTokens: 1000,
        supportsFast: true,
        routes: [{ provider: 'primary', model: 'gpt' }],
      },
      'grok-4.6': {
        name: 'Grok 4.6',
        contextWindow: 1000,
        maxTokens: 1000,
        routes: [{ provider: 'primary', model: 'gpt' }],
      },
    },
  }
}

async function mount(): Promise<{ ctx: Context; agent: Agent }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(ModelPolicy, policyConfig())
  const session = ctx.sessions.create(SessionId('fast-policy'))
  const agent = {
    id: session.id,
    options: { provider: 'model-policy', model: 'gpt-5.6' },
    session,
    ctx,
  } as unknown as Agent
  return { ctx, agent }
}

function request(ctx: Context, agent: Agent) {
  return agentEvents(ctx, agent).waterfall(
    'agent/request',
    { turn: 1, step: 1, signal },
    () => Promise.resolve({ provider: agent.options.provider ?? '', model: agent.options.model ?? '' }),
  )
}

let nextRpc = 1
function rpcRequest<P>(payload: P): RpcRequest<P> {
  return { rpcId: RpcId(`fast-policy-${String(nextRpc++)}`), payload }
}

function rpcValue<T>(response: { result: { ok: true; value: T } | { ok: false } }): T {
  if (!response.result.ok) throw new Error('expected successful Host RPC response')
  return response.result.value
}

async function mountHostApi(
  selection: { provider: string; model: string } = { provider: 'model-policy', model: 'gpt-5.6' },
): Promise<{ ctx: Context; sessionId: SessionId }> {
  const ctx = new Context()
  await ctx.plugin(SessionStore)
  await ctx.plugin(SystemPrompt, { persona: '' })
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(LlmPiAi, { providers: policyConfig().providers })
  await ctx.plugin(UserQuestionService)
  await ctx.plugin(AgentRegistry)
  await ctx.plugin(ModelPolicy, policyConfig())
  const session = ctx.sessions.create(SessionId('fast-policy-api'))
  const agent = {
    id: session.id,
    options: selection,
    status: 'running',
    session,
    ctx,
    inbox: { nextTurn: [], nextStep: [] },
  } as unknown as Agent
  ctx.agents.register(agent)
  return { ctx, sessionId: session.id }
}

async function closeServers(): Promise<void> {
  await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))))
}

afterEach(async () => {
  vi.unstubAllEnvs()
  await closeServers()
})

describe('desktop Fast logical model policy runtime', () => {
  it('persists the Fast event, exposes GPT-only catalog capability, and maps the next request', async () => {
    const { ctx, agent } = await mount()
    try {
      const controller = ctx.get('modelPolicy') as ModelPolicy.ModelPolicySessionController
      const gpt = await ctx.llm.resolveModelInfo('model-policy', 'gpt-5.6')
      const grok = await ctx.llm.resolveModelInfo('model-policy', 'grok-4.6')
      expect(gpt).toMatchObject({ supportsFast: true })
      expect(grok).toMatchObject({ supportsFast: false })

      const selection = { provider: 'model-policy', model: 'gpt-5.6' }
      expect(controller.setFast(agent, selection, true)).toEqual({ active: true, available: true })
      expect(agent.session.events.filter(event => event.type === 'model-policy/fast').at(-1)?.data)
        .toEqual({ active: true })
      expect(ModelPolicy.foldFastMode(agent.session.events)).toBe(true)
      await expect(request(ctx, agent)).resolves.toMatchObject({
        provider: 'model-policy',
        model: 'gpt-5.6',
        serviceTier: 'fast',
      })

      expect(controller.setFast(agent, selection, false)).toEqual({ active: false, available: true })
      expect(ModelPolicy.foldFastMode(agent.session.events)).toBe(false)
      await expect(request(ctx, agent)).resolves.toMatchObject({
        provider: 'model-policy',
        model: 'gpt-5.6',
      })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('keeps Fast available for legacy physical GPT route selections', async () => {
    const { ctx, agent } = await mount()
    const legacyAgent = { ...agent, options: { provider: 'primary', model: 'gpt' } } as Agent
    try {
      const controller = ctx.get('modelPolicy') as ModelPolicy.ModelPolicySessionController
      const selection = { provider: 'primary', model: 'gpt' }
      expect(controller.getFast(legacyAgent, selection)).toEqual({ active: false, available: true })
      expect(controller.setFast(legacyAgent, selection, true)).toEqual({ active: true, available: true })
      await expect(request(ctx, legacyAgent)).resolves.toMatchObject({
        provider: 'primary',
        model: 'gpt',
        serviceTier: 'fast',
      })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('round-trips Fast through the Host session.models and session.selectModel RPCs', async () => {
    const { ctx, sessionId } = await mountHostApi()
    try {
      const api = createApiProxy(ctx, {
        defaultModelSelection: () => ({ provider: 'model-policy', model: 'gpt-5.6' }),
        cwd: process.cwd(),
      })
      expect(rpcValue(await api.sessions.models(rpcRequest({ sessionId }))).fast)
        .toEqual({ active: false, available: true })
      expect(rpcValue(await api.sessions.selectModel(rpcRequest({
        sessionId,
        provider: 'model-policy',
        model: 'gpt-5.6',
        fast: true,
      }))).fast).toEqual({ active: true, available: true })
      expect(rpcValue(await api.sessions.models(rpcRequest({ sessionId }))).fast)
        .toEqual({ active: true, available: true })

      const rejected = await api.sessions.selectModel(rpcRequest({
        sessionId,
        provider: 'model-policy',
        model: 'grok-4.6',
        fast: true,
      }))
      expect(rejected.result).toMatchObject({ ok: false })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('exposes Fast through Host RPCs for a resumed physical GPT route', async () => {
    const selection = { provider: 'primary', model: 'gpt' }
    const { ctx, sessionId } = await mountHostApi(selection)
    try {
      const api = createApiProxy(ctx, {
        defaultModelSelection: () => selection,
        cwd: process.cwd(),
      })
      expect(rpcValue(await api.sessions.models(rpcRequest({ sessionId }))).fast)
        .toEqual({ active: false, available: true })
      expect(rpcValue(await api.sessions.selectModel(rpcRequest({
        sessionId,
        ...selection,
        fast: true,
      }))).fast).toEqual({ active: true, available: true })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('rejects enabling Fast for a non-GPT logical model and rejects stale active state', async () => {
    const { ctx } = await mount()
    const session = ctx.sessions.create(SessionId('fast-policy-non-gpt'))
    const agent = {
      id: session.id,
      options: { provider: 'model-policy', model: 'grok-4.6' },
      session,
      ctx,
    } as unknown as Agent
    try {
      const controller = ctx.get('modelPolicy') as ModelPolicy.ModelPolicySessionController
      const selection = { provider: 'model-policy', model: 'grok-4.6' }
      expect(controller.getFast(agent, selection)).toEqual({ active: false, available: false })
      expect(() => controller.setFast(agent, selection, true))
        .toThrow('Fast mode is available only for GPT logical models.')

      agent.session.append('model-policy/fast', { active: true })
      await expect(request(ctx, agent)).rejects.toMatchObject({
        code: 'UNSUPPORTED_OPTION',
        message: 'Fast mode is available only for GPT logical models; disable it before selecting another model.',
      })
    } finally {
      await ctx.fiber.dispose()
    }
  })

  it('maps pi-ai OpenAI Responses Fast requests to service_tier priority', async () => {
    vi.stubEnv('PI_TEST_KEY', 'test-key')
    const requests: unknown[] = []
    const server = createServer((request: IncomingMessage, response: ServerResponse) => {
      let body = ''
      request.on('data', chunk => { body += chunk.toString('utf8') })
      request.on('end', () => {
        requests.push(body.length === 0 ? undefined : JSON.parse(body))
        response.writeHead(500, { 'content-type': 'application/json' })
        response.end('{}')
      })
    })
    servers.push(server)
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    const address = server.address()
    if (address === null || typeof address === 'string') throw new Error('mock server has no port')

    const ctx = new Context()
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(LlmPiAi, {
      providers: {
        openai: {
          apiKeyEnv: 'PI_TEST_KEY',
          api: 'openai-responses',
          baseURL: `http://127.0.0.1:${String(address.port)}/v1`,
          models: [{ id: 'gpt', name: 'GPT', contextWindow: 1000, maxTokens: 1000 }],
          serviceTier: 'fast',
        },
      },
    })
    try {
      const assembler = new BlockAssembler()
      try {
        for await (const chunk of ctx.llm.stream({ provider: 'openai', model: 'gpt', messages: [] })) {
          assembler.push(chunk)
        }
      } catch {
        // The 500 response is intentional; the request payload is the assertion.
      }
      expect(requests[0]).toMatchObject({ service_tier: 'priority' })
    } finally {
      await ctx.fiber.dispose()
    }
  })
})
