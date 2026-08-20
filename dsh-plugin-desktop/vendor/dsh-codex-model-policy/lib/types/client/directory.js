import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client';
/** One session's shared directory controller; disposed with the session scope. */
export class ModelDirectory {
    sessions;
    sessionId;
    available;
    /** The shared snapshot both entries render from (uSES-safe store). */
    store = createSnapshotStore({
        current: null, routable: null, fast: null, groups: [], failures: [], status: 'idle', error: null,
    });
    /** Latest operation wins; an older response never overwrites a newer one. */
    generation = 0;
    disposed = false;
    /**
     * @param sessions - the session wire face (captured from the plugin's root connection).
     * @param sessionId - the owning session.
     * @param available - whether this session may use Agent-bound model RPCs.
     */
    constructor(sessions, sessionId, available) {
        this.sessions = sessions;
        this.sessionId = sessionId;
        this.available = available;
    }
    /**
     * Refresh the advisory directory (both entries call this on open).
     * Failure preserves the last good groups and current selection.
     * @returns the fresh directory value.
     */
    async load() {
        this.assertAvailable();
        const generation = ++this.generation;
        this.store.update((s) => { s.status = 'loading'; s.error = null; });
        const { result } = await this.sessions.models({ sessionId: this.sessionId });
        if (this.disposed || generation !== this.generation) {
            if (!result.ok)
                throw new Error(`${result.error.code}: ${result.error.message}`);
            return result.value;
        }
        if (!result.ok) {
            this.store.update((s) => { s.status = 'error'; s.error = `${result.error.code}: ${result.error.message}`; });
            throw new Error(`session.models failed: ${result.error.code}: ${result.error.message}`);
        }
        const { current, routable, groups, failures } = result.value;
        const fast = result.value.fast;
        this.store.update((s) => {
            s.current = current;
            s.fast = fast ?? null;
            s.routable = routable;
            s.groups = groups;
            s.failures = failures;
            s.status = 'ready';
            s.error = null;
        });
        return result.value;
    }
    /**
     * Select the complete provider/model/reasoning selection (both entries submit through here). Success
     * updates the shared current; failure surfaces on the store and throws so
     * each entry's own retry surface engages.
     * @param selection - provider, provider-owned model id, and optional adapter-owned effort.
   */
    async select(selection) {
        this.assertAvailable();
        const generation = ++this.generation;
        this.store.update((s) => { s.status = 'selecting'; s.error = null; });
        const { result } = await this.sessions.selectModel({
            sessionId: this.sessionId,
            provider: selection.provider,
            model: selection.model,
            ...selection.reasoningEffort === undefined
                ? {}
                : { reasoningEffort: selection.reasoningEffort },
        });
        if (this.disposed || generation !== this.generation) {
            if (!result.ok)
                throw new Error(`${result.error.code}: ${result.error.message}`);
            return;
        }
        if (!result.ok) {
            this.store.update((s) => { s.status = 'error'; s.error = `${result.error.code}: ${result.error.message}`; });
            throw new Error(`session.selectModel failed: ${result.error.code}: ${result.error.message}`);
        }
        // The Host validated the route before accepting it, so a selection that
        // landed is by construction one it can serve.
        this.store.update((s) => {
            s.current = result.value.selected;
            s.fast = result.value.fast ?? null;
            s.routable = true;
            s.status = 'ready';
            s.error = null;
        });
    }
    /**
     * Set the session-local Fast mode through the Host's model-selection RPC.
     * @param active - whether the durable Fast mode should be active.
     * @returns when the Host accepts the mode change.
     */
    async setFast(active) {
        this.assertAvailable();
        const current = this.store.getSnapshot().current;
        if (current === null)
            throw new Error('cannot set Fast before the model directory loads');
        const generation = ++this.generation;
        this.store.update((s) => { s.status = 'selecting'; s.error = null; });
        const { result } = await this.sessions.selectModel({
            sessionId: this.sessionId,
            provider: current.provider,
            model: current.model,
            ...current.reasoningEffort === undefined ? {} : { reasoningEffort: current.reasoningEffort },
            fast: active,
        });
        if (this.disposed || generation !== this.generation) {
            if (!result.ok)
                throw new Error(`${result.error.code}: ${result.error.message}`);
            return;
        }
        if (!result.ok) {
            this.store.update((s) => { s.status = 'error'; s.error = `${result.error.code}: ${result.error.message}`; });
            throw new Error(`session.selectModel failed: ${result.error.code}: ${result.error.message}`);
        }
        this.store.update((s) => {
            s.current = result.value.selected;
            s.fast = result.value.fast ?? null;
            s.routable = true;
            s.status = 'ready';
            s.error = null;
        });
    }
    /**
     * Drop the previous Host generation's projection and repull it. Clearing
     * first prevents an unconsumed process-local selection from being displayed
     * while the restarted Host has restored the last logged model selection.
     */
    resetConnected() {
        if (this.disposed)
            return;
        ++this.generation;
        this.store.update((s) => {
            s.current = null;
            s.fast = null;
            s.routable = null;
            s.groups = [];
            s.failures = [];
            s.status = 'idle';
            s.error = null;
        });
        if (!this.available())
            return;
        void this.load().catch(() => { });
    }
    /** Scope teardown: late settlements lose write access to the store. */
    dispose() {
        this.disposed = true;
    }
    assertAvailable() {
        if (!this.available()) {
            throw new Error('model selection is unavailable for addressed subagent sessions');
        }
    }
}
//# sourceMappingURL=directory.js.map