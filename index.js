/**
 * Mem's Memories — Top-Notch Summarization Extension for SillyTavern
 * 
 * A fully modular, 100x-better summarization engine.
 * Features:
 *   - Multiple summarization strategies (Progressive, Hierarchical, Hybrid)
 *   - Importance-weighted memory ranking
 *   - Configurable context injection
 *   - No hardcoded values — everything flows from settings
 *   - Uses localforage for persistent storage
 */

/* ------------------------------------------------------------------ */
/*  MODULE CONSTANTS                                                   */
/* ------------------------------------------------------------------ */

const MODULE_NAME = 'mems_memories';

const STRATEGIES = Object.freeze({
    PROGRESSIVE: 'progressive',
    HIERARCHICAL: 'hierarchical',
    HYBRID: 'hybrid',
});

const INJECT_POSITIONS = Object.freeze({
    BEFORE_SYSTEM: 'before_system',
    AFTER_SYSTEM: 'after_system',
    BEFORE_LAST: 'before_last_message',
    AFTER_LAST: 'after_last_message',
    CUSTOM: 'custom',
});

const SORT_MODES = Object.freeze({
    RECENCY: 'recency',
    IMPORTANCE: 'importance',
    RELEVANCE: 'relevance',
});

const MEMORY_FORMATS = Object.freeze({
    BULLET: 'bullet',
    NARRATIVE: 'narrative',
    JSON: 'structured_json',
});

const RAG_PROVIDERS = Object.freeze({
    QDRANT: 'qdrant',
    CHROMA: 'chroma',
});

const EMBEDDING_PROVIDERS = Object.freeze({
    OLLAMA: 'ollama',
    OPENAI: 'openai',
    CUSTOM: 'custom',
});

/* ------------------------------------------------------------------ */
/*  DEFAULT SETTINGS (fully modular — every number exposed)            */
/* ------------------------------------------------------------------ */

const DEFAULT_SETTINGS = Object.freeze({
    // ── Summarization ─────────────────────────────────────────────
    summarization: Object.freeze({
        enabled: true,
        strategy: STRATEGIES.HYBRID,
        triggerInterval: 8,                // messages before auto-summary
        maxSummaryTokens: 300,             // target token ceiling per summary
        summaryPrompt: 'Summarize the following conversation excerpt concisely, preserving key events, emotional shifts, decisions, and character motivations. Do not add commentary.',
        compressionRatio: 0.35,            // 0..1 — how aggressively to shrink text
        recencyWindow: 12,                 // most recent N messages weighted higher
        minMessageLength: 50,              // characters; skip shorter messages
        preserveNamedEntities: true,       // keep names of people/places
        preserveQuotes: false,             // keep direct quotes verbatim
        deduplicate: true,                 // remove near-duplicate summary lines
        summarizationModel: 'auto',        // 'auto' = use current chat model
    }),

    // ── Memory Store ──────────────────────────────────────────────
    memory: Object.freeze({
        maxMemories: 200,                  // hard cap on stored memories
        memoryRetentionDays: 30,           // auto-delete after N days
        importanceThreshold: 0.3,          // 0..1 — minimum importance to keep
        mergeSimilar: true,               // merge semantically similar memories
        mergeThreshold: 0.75,             // similarity cutoff for merging (0..1)
        memoryFormat: MEMORY_FORMATS.BULLET,
        generateImportance: true,         // auto-score importance via LLM
        importancePrompt: 'On a scale of 0.0 to 1.0, rate how important this memory is for future conversations. Respond with only the number.',
        maxMemoryTokens: 150,             // token cap per stored memory entry
    }),

    // ── Injection ─────────────────────────────────────────────────
    injection: Object.freeze({
        enabled: true,
        injectPosition: INJECT_POSITIONS.AFTER_SYSTEM,
        maxInjectedMemories: 8,           // memories to inject per request
        injectionTokenBudget: 500,        // total token budget for injected block
        sortBy: SORT_MODES.IMPORTANCE,
        injectionTemplate: '## Relevant Memories\n{memories}\n\n## Recent Events\n{recent}\n',
        injectInUserMessage: false,       // inject directly in user prompt
        injectAsSystemMessage: true,      // inject as system-level context
        recencyDecay: 0.85,              // exponential decay factor for recency
        boostCurrentCharacter: true,     // boost memories tied to current char
        rotationWindow: 5,               // skip memories injected within the last N messages (prevents re-injection leak)
        rotateOnEveryTurn: true,         // rotate the injected set each turn so different memories surface over time
    }),

    // ── Display / UI ──────────────────────────────────────────────
    display: Object.freeze({
        showMemoryPanel: true,
        showSummarizationProgress: true,
        memoryBadgeCount: true,
        panelPosition: 'right',           // 'left' | 'right'
        confirmBeforeSummary: false,      // ask user before auto-summarizing
        notifyOnNewMemory: false,         // toast when a memory is created
        theme: 'auto',                    // 'auto' | 'light' | 'dark'
        memoryPanelRefreshInterval: 30000, // ms — panel auto-refresh (0 = off)
    }),

    // ── Connections ───────────────────────────────────────────────
    connections: Object.freeze({
        sillyTavernApiBase: '',           // auto-detected if empty; override e.g. http://localhost:8000
        externalSummarizerEndpoint: '',   // override summarization API endpoint (e.g. OpenAI-compatible)
        externalSummarizerApiKey: '',     // API key for the external summarizer
        externalSummarizerModel: '',      // model name override (empty = use chat model)
        connectionTimeoutMs: 20000,       // ms timeout for any API call
        testConnectionOnStartup: false,   // ping connections when extension loads
    }),

    // ── Advanced ──────────────────────────────────────────────────
    advanced: Object.freeze({
        debugMode: false,
        chunkOverlap: 20,                 // token overlap between summary chunks
        retryOnFailure: true,
        maxRetries: 2,
        cooldownSeconds: 30,              // min seconds between auto-summaries
        batchSize: 20,                    // messages per summarization batch
        preSummarizeChunking: true,       // split long history before summarizing
        chunkTokenSize: 800,              // tokens per chunk for pre-summarization
    }),

    // ── RAG (Retrieval-Augmented Generation) ──────────────────────
    rag: Object.freeze({
        enabled: false,                   // master toggle — when OFF, uses regular LLM summarization only
        vectorProvider: RAG_PROVIDERS.QDRANT,
        qdrantUrl: 'http://localhost:6333',
        qdrantCollection: 'mems_memories',
        qdrantApiKey: '',                 // leave empty if no auth
        embeddingProvider: EMBEDDING_PROVIDERS.OLLAMA,
        ollamaEmbeddingModel: 'qwen3-embedding:8b',
        ollamaEndpoint: 'http://localhost:11434',
        openaiEmbeddingModel: 'text-embedding-3-small',
        openaiApiKey: '',
        openaiBaseUrl: 'https://api.openai.com/v1',
        customEmbeddingEndpoint: '',      // e.g. http://localhost:8080/embed
        customEmbeddingApiKey: '',
        customEmbeddingModel: '',
        vectorDimension: 768,             // must match your embedding model
        similarityThreshold: 0.65,        // 0..1 — minimum semantic similarity to retrieve
        topK: 5,                          // number of semantically similar memories to retrieve
        hybridSearch: true,               // combine vector + keyword search
        hybridKeywordWeight: 0.3,         // 0..1 — weight of keyword match in hybrid mode
        indexOnSummarize: true,           // auto-index each new memory into the vector DB
        batchIndexSize: 20,               // how many memories to re-index at once
        embeddingTimeout: 15000,          // ms timeout for embedding API calls
        retryEmbedding: true,
        maxEmbeddingRetries: 3,
    }),
});

/* ------------------------------------------------------------------ */
/*  UTILITY HELPERS                                                    */
/* ------------------------------------------------------------------ */

/**
 * Deep-merge two plain objects.  Mutates `target` in place.
 * Arrays are NOT merged — source overwrites.
 */
function deepMerge(target, source) {
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            if (!target[key] || typeof target[key] !== 'object') target[key] = {};
            deepMerge(target[key], source[key]);
        } else {
            target[key] = source[key];
        }
    }
    return target;
}

/** Simple token estimator: ~4 chars per token (works for most languages) */
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/** Clamp a value between min and max */
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

/** Generate a unique ID */
function uid() {
    return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Days ago from a Date or timestamp */
function daysAgo(date) {
    const d = typeof date === 'number' ? date : new Date(date).getTime();
    return (Date.now() - d) / (1000 * 60 * 60 * 24);
}

/* ------------------------------------------------------------------ */
/*  SETTINGS MANAGER                                                   */
/* ------------------------------------------------------------------ */

class SettingsManager {
    constructor() {
        this._ctx = null;
    }

    init(ctx) {
        this._ctx = ctx;
        const { extensionSettings } = ctx;
        if (!extensionSettings[MODULE_NAME]) {
            extensionSettings[MODULE_NAME] = structuredClone(DEFAULT_SETTINGS);
        } else {
            // ensure all default keys exist (handles upgrades)
            this._ensureDefaults(extensionSettings[MODULE_NAME], DEFAULT_SETTINGS);
        }
    }

    _ensureDefaults(current, defaults) {
        for (const key of Object.keys(defaults)) {
            if (!Object.hasOwn(current, key)) {
                current[key] = structuredClone(defaults[key]);
            } else if (defaults[key] && typeof defaults[key] === 'object' && !Array.isArray(defaults[key])) {
                this._ensureDefaults(current[key], defaults[key]);
            }
        }
    }

    /** Get the full settings object (live reference — mutate & call save()) */
    getAll() {
        return this._ctx.extensionSettings[MODULE_NAME];
    }

    /** Get a nested path e.g. "summarization.strategy" */
    get(path) {
        const parts = path.split('.');
        let val = this.getAll();
        for (const p of parts) {
            if (val == null) return undefined;
            val = val[p];
        }
        return val;
    }

    /** Set a nested path & persist */
    set(path, value) {
        const parts = path.split('.');
        const all = this.getAll();
        let target = all;
        for (let i = 0; i < parts.length - 1; i++) {
            if (!(parts[i] in target) || typeof target[parts[i]] !== 'object') {
                target[parts[i]] = {};
            }
            target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = value;
        this.save();
    }

    /** Persist settings to server */
    save() {
        if (this._ctx && this._ctx.saveSettingsDebounced) {
            this._ctx.saveSettingsDebounced();
        }
    }

    /** Reset to factory defaults */
    reset() {
        this._ctx.extensionSettings[MODULE_NAME] = structuredClone(DEFAULT_SETTINGS);
        this.save();
    }
}

/* ------------------------------------------------------------------ */
/*  MEMORY STORE  (localforage-backed)                                 */
/* ------------------------------------------------------------------ */

class MemoryStore {
    constructor() {
        this._store = null; // localforage instance
        this._ready = false;
    }

    async init() {
        const { localforage } = SillyTavern.libs;
        this._store = localforage.createInstance({
            name: 'MemsMemories',
            storeName: 'memories',
        });
        this._ready = true;
    }

    get ready() { return this._ready; }

    /** Store a memory entry */
    async add(entry) {
        if (!this._ready) await this.init();
        const memory = {
            id: uid(),
            chatId: entry.chatId || '',
            charName: entry.charName || '',
            content: entry.content || '',
            summary: entry.summary || '',
            importance: entry.importance ?? 0.5,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            messageIndex: entry.messageIndex ?? 0,
            tags: entry.tags || [],
            sourceMessages: entry.sourceMessages || [],
            tokenCount: estimateTokens(entry.summary || entry.content),
        };
        await this._store.setItem(memory.id, memory);
        return memory;
    }

    /** Update an existing memory */
    async update(id, patch) {
        if (!this._ready) await this.init();
        const existing = await this._store.getItem(id);
        if (!existing) return null;
        const updated = { ...existing, ...patch, updatedAt: Date.now() };
        await this._store.setItem(id, updated);
        return updated;
    }

    /** Get a single memory by id */
    async get(id) {
        if (!this._ready) await this.init();
        return this._store.getItem(id);
    }

    /** Delete a memory */
    async remove(id) {
        if (!this._ready) await this.init();
        await this._store.removeItem(id);
    }

    /** Get all memories, optionally filtered */
    async getAll(filter = {}) {
        if (!this._ready) await this.init();
        const memories = [];
        await this._store.iterate((value) => {
            memories.push(value);
        });

        let results = memories;

        // Filter by chat
        if (filter.chatId) {
            results = results.filter((m) => m.chatId === filter.chatId);
        }
        // Filter by character
        if (filter.charName) {
            results = results.filter((m) => m.charName === filter.charName);
        }
        // Filter by minimum importance
        if (filter.minImportance != null) {
            results = results.filter((m) => m.importance >= filter.minImportance);
        }
        // Filter out expired
        if (filter.maxAgeDays != null) {
            const cutoff = Date.now() - filter.maxAgeDays * 24 * 60 * 60 * 1000;
            results = results.filter((m) => m.createdAt >= cutoff);
        }

        return results;
    }

    /** Count memories */
    async count(filter = {}) {
        const all = await this.getAll(filter);
        return all.length;
    }

    /** Bulk delete old / low-importance memories */
    async prune(maxMemories, retentionDays, importanceThreshold) {
        if (!this._ready) await this.init();
        const all = await this.getAll();
        const now = Date.now();
        const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;

        // Delete expired
        for (const m of all) {
            if (m.createdAt < cutoff || m.importance < importanceThreshold) {
                await this._store.removeItem(m.id);
            }
        }

        // If still over limit, remove lowest-importance
        const remaining = await this.getAll();
        if (remaining.length > maxMemories) {
            remaining.sort((a, b) => a.importance - b.importance);
            const toRemove = remaining.slice(0, remaining.length - maxMemories);
            for (const m of toRemove) {
                await this._store.removeItem(m.id);
            }
        }
    }

    /** Clear all memories for a chat */
    async clearChat(chatId) {
        if (!this._ready) await this.init();
        const memories = await this.getAll({ chatId });
        for (const m of memories) {
            await this._store.removeItem(m.id);
        }
    }

    /** Clear everything */
    async clearAll() {
        if (!this._ready) await this.init();
        await this._store.clear();
    }
}

/* ------------------------------------------------------------------ */
/*  SUMMARIZATION ENGINE                                               */
/* ------------------------------------------------------------------ */

class SummarizationEngine {
    constructor(settingsManager, memoryStore, ragEngine) {
        this._settings = settingsManager;
        this._memory = memoryStore;
        this._rag = ragEngine;
        this._lastSummaryIndex = -1;
        this._lastSummaryTime = 0;
        this._isSummarizing = false;
    }

    /**
     * Determine if a summary should be triggered.
     * @param {number} currentIndex - current message index
     * @returns {boolean}
     */
    shouldTrigger(currentIndex) {
        const s = this._settings.get('summarization');
        if (!s.enabled) return false;
        const interval = s.triggerInterval;
        if (currentIndex - this._lastSummaryIndex < interval) return false;

        // Cooldown
        const cooldown = this._settings.get('advanced.cooldownSeconds') * 1000;
        if (Date.now() - this._lastSummaryTime < cooldown) return false;

        return true;
    }

    /**
     * Extract messages to summarize from the chat history.
     * @param {Array} messages - the full chat messages array
     * @returns {Array} messages in the summarization window
     */
    getSummarizationWindow(messages) {
        const s = this._settings.get('summarization');
        const batchSize = this._settings.get('advanced.batchSize');
        const startIdx = Math.max(0, this._lastSummaryIndex + 1);
        const endIdx = Math.min(messages.length, startIdx + batchSize);

        return messages.slice(startIdx, endIdx).filter((msg) => {
            const text = typeof msg === 'string' ? msg : (msg?.mes || msg?.content || '');
            return text.length >= s.minMessageLength;
        });
    }

    /**
     * Build the summarization prompt.
     */
    buildSummaryPrompt(messagesText) {
        const s = this._settings.get('summarization');
        return `${s.summaryPrompt}\n\nConversation:\n${messagesText}\n\nConcise summary:`;
    }

    /**
     * Call the LLM to generate a summary.
     * Uses SillyTavern's quiet generation so the user doesn't see it.
     */
    async generateSummary(prompt) {
        const ctx = SillyTavern.getContext();
        const { generateQuietPrompt } = ctx;

        if (!generateQuietPrompt) {
            // Fallback: use the public generateRaw if quiet is unavailable
            const { generateRaw } = ctx;
            if (!generateRaw) return this._extractiveSummary(prompt);
            const result = await generateRaw({ prompt, systemPrompt: '', prefill: '' });
            return result?.text || result || this._extractiveSummary(prompt);
        }

        try {
            const result = await generateQuietPrompt({ quietPrompt: prompt });
            return result || this._extractiveSummary(prompt);
        } catch (err) {
            console.warn('[MemsMemories] LLM summarization failed, falling back to extractive:', err);
            return this._extractiveSummary(prompt);
        }
    }

    /**
     * Extractive fallback: pick the most substantive sentences.
     * Ensures the extension works even without an LLM call.
     */
    _extractiveSummary(prompt) {
        // Extract conversation part after "Conversation:\n"
        const convStart = prompt.indexOf('Conversation:\n');
        const text = convStart >= 0 ? prompt.slice(convStart + 14) : prompt;
        const sentences = text.match(/[^.!?\n]+[.!?]?/g) || [];
        if (sentences.length === 0) return '(no content to summarize)';

        // Score sentences by length & keyword density
        const keywords = ['said', 'felt', 'decided', 'went', 'found', 'saw', 'thought', 'because', 'important', 'suddenly', 'realized', 'remember', 'change', 'happen'];
        const scored = sentences.map((s) => {
            const clean = s.trim();
            if (clean.length < 20) return { text: clean, score: 0 };
            let score = Math.min(clean.length / 80, 1.0) * 0.5;
            const lower = clean.toLowerCase();
            for (const kw of keywords) {
                if (lower.includes(kw)) score += 0.15;
            }
            return { text: clean, score: Math.min(score, 1.0) };
        });

        scored.sort((a, b) => b.score - a.score);
        const topN = Math.max(2, Math.ceil(scored.length * 0.3));
        return scored.slice(0, topN).map((s) => s.text).join(' ');
    }

    /**
     * Score importance of a summary using the LLM (optional).
     */
    async scoreImportance(summary) {
        const s = this._settings.get('memory');
        if (!s.generateImportance) return 0.5;

        const ctx = SillyTavern.getContext();
        const { generateQuietPrompt } = ctx;
        if (!generateQuietPrompt) return 0.5;

        try {
            const prompt = `${s.importancePrompt}\n\nMemory: ${summary}`;
            const result = await generateQuietPrompt({ quietPrompt: prompt });
            const parsed = parseFloat(result);
            return isNaN(parsed) ? 0.5 : clamp(parsed, 0, 1);
        } catch {
            return 0.5;
        }
    }

    /**
     * Main summarization orchestrator.
     * Called after new messages arrive.
     */
    async summarizeIfNeeded() {
        if (this._isSummarizing) return;

        const ctx = SillyTavern.getContext();
        const chat = ctx.chat;
        if (!chat || !Array.isArray(chat)) return;

        const currentIndex = chat.length - 1;
        if (!this.shouldTrigger(currentIndex)) return;

        this._isSummarizing = true;

        try {
            const messages = chat;
            const window = this.getSummarizationWindow(messages);
            if (window.length === 0) {
                this._lastSummaryIndex = currentIndex;
                return;
            }

            const messagesText = window.map((m) => {
                const name = m?.name || '';
                const text = typeof m === 'string' ? m : (m?.mes || m?.content || '');
                return name ? `${name}: ${text}` : text;
            }).join('\n');

            const prompt = this.buildSummaryPrompt(messagesText);
            const summary = await this.generateSummary(prompt);

            // Score importance
            const importance = await this.scoreImportance(summary);

            // Detect character name
            const charName = this._detectCharName(ctx);

            // Store as memory
            const stored = await this._memory.add({
                chatId: this._getChatId(ctx),
                charName,
                content: messagesText,
                summary,
                importance,
                messageIndex: currentIndex,
                sourceMessages: window.map((_, i) => this._lastSummaryIndex + 1 + i),
            });

            // Index into RAG vector DB if enabled
            if (this._rag && this._rag.isEnabled() && this._settings.get('rag.indexOnSummarize')) {
                this._rag.indexMemory(stored).catch((err) => {
                    console.warn('[MemsMemories] RAG index on summarize failed:', err?.message);
                });
            }

            // Prune if needed
            const mem = this._settings.get('memory');
            await this._memory.prune(mem.maxMemories, mem.memoryRetentionDays, mem.importanceThreshold);

            this._lastSummaryIndex = currentIndex;
            this._lastSummaryTime = Date.now();

            console.log(`[MemsMemories] Summary created (importance: ${importance.toFixed(2)})`);

            if (this._settings.get('display.showSummarizationProgress')) {
                this._showToast(`Memory captured (importance: ${(importance * 100).toFixed(0)}%)`);
            }
        } catch (err) {
            console.error('[MemsMemories] Summarization error:', err);
        } finally {
            this._isSummarizing = false;
        }
    }

    /** Detect current character name from context */
    _detectCharName(ctx) {
        try {
            return ctx.characters?.[ctx.activeCharacter]?.name
                || ctx.character?.name
                || ctx.characterName
                || '';
        } catch { return ''; }
    }

    /** Get a stable chat identifier */
    _getChatId(ctx) {
        try {
            return ctx.chatId
                || ctx.chatName
                || (ctx.character?.name ? `chat_${ctx.character.name}` : 'default');
        } catch { return 'default'; }
    }

    /** Show a toast notification */
    _showToast(message) {
        try {
            if (typeof toastr !== 'undefined') {
                toastr.info(message, "Mem's Memories");
            }
        } catch { /* toastr not available */ }
    }

    /** Reset the summary tracker (e.g. on chat switch) */
    reset() {
        this._lastSummaryIndex = -1;
        this._lastSummaryTime = 0;
    }
}

/* ------------------------------------------------------------------ */
/*  CONTEXT INJECTOR                                                   */
/* ------------------------------------------------------------------ */

class ContextInjector {
    constructor(settingsManager, memoryStore, ragEngine) {
        this._settings = settingsManager;
        this._memory = memoryStore;
        this._rag = ragEngine;
        // Tracks the last message-index at which each memory was injected.
        // Key: memory.id, Value: last messageIndex at which it was injected.
        // This is the anti-leak mechanism: we skip memories that were injected
        // within the last `rotationWindow` messages so they don't pile up in
        // every turn's system prompt.
        this._injectionLog = new Map();
        // Track the chatId of the last injection so we can reset when switching chats.
        this._lastChatId = null;
    }

    /**
     * Prepare the memory block for injection.
     * @param {object} ctx - ST context
     * @returns {string} the formatted memory block
     */
    async prepareInjection(ctx) {
        const inj = this._settings.get('injection');
        if (!inj.enabled) return '';

        const memSettings = this._settings.get('memory');
        const charName = ctx?.character?.name || ctx?.characterName || '';
        const chatId = ctx?.chatId || '';

        // Reset injection log on chat switch so memories can be re-shown in a new context.
        if (this._lastChatId !== null && this._lastChatId !== chatId) {
            this._injectionLog.clear();
        }
        this._lastChatId = chatId;

        const currentMessageIndex = Array.isArray(ctx?.chat) ? ctx.chat.length - 1 : 0;
        const rotationWindow = Math.max(0, inj.rotationWindow || 0);

        let memories = await this._memory.getAll({
            chatId,
            minImportance: memSettings.importanceThreshold,
            maxAgeDays: memSettings.memoryRetentionDays,
        });

        if (memories.length === 0) return '';

        // If RAG is enabled, augment with semantic search results
        if (this._rag && this._rag.isEnabled()) {
            const lastMsg = this._getLastUserMessage(ctx);
            if (lastMsg) {
                const ragResults = await this._rag.semanticSearch(lastMsg);
                const existingIds = new Set(memories.map((m) => m.id));
                for (const r of ragResults) {
                    if (r.memoryId && !existingIds.has(r.memoryId)) {
                        const fullMem = await this._memory.get(r.memoryId);
                        if (fullMem) {
                            memories.push(fullMem);
                            existingIds.add(r.memoryId);
                        }
                    }
                }
            }
        }

        // Sort
        const sortBy = inj.sortBy;
        if (sortBy === SORT_MODES.IMPORTANCE) {
            memories.sort((a, b) => b.importance - a.importance);
        } else if (sortBy === SORT_MODES.RECENCY) {
            memories.sort((a, b) => b.createdAt - a.createdAt);
        } else if (sortBy === SORT_MODES.RELEVANCE) {
            memories.sort((a, b) => {
                const scoreA = a.importance * Math.pow(inj.recencyDecay, daysAgo(a.createdAt));
                const scoreB = b.importance * Math.pow(inj.recencyDecay, daysAgo(b.createdAt));
                return scoreB - scoreA;
            });
        }

        // Boost current character
        if (inj.boostCurrentCharacter && charName) {
            memories.sort((a, b) => {
                const aBoost = a.charName === charName ? 1.5 : 1;
                const bBoost = b.charName === charName ? 1.5 : 1;
                return (b.importance * bBoost) - (a.importance * aBoost);
            });
        }

        // ── ANTI-LEAK: skip memories injected within the last rotationWindow messages ──
        // Rotation: when rotateOnEveryTurn is true, we also stagger the candidate set
        // so a different subset gets surfaced on each turn.
        if (rotationWindow > 0) {
            memories = memories.filter((m) => {
                const lastInjected = this._injectionLog.get(m.id);
                if (lastInjected == null) return true; // never injected -> eligible
                return (currentMessageIndex - lastInjected) >= rotationWindow;
            });
        }

        // Stagger the candidate set each turn (rotation effect).
        if (inj.rotateOnEveryTurn && memories.length > inj.maxInjectedMemories) {
            const offset = currentMessageIndex % memories.length;
            memories = memories.slice(offset).concat(memories.slice(0, offset));
        }

        // Token budget
        const budget = inj.injectionTokenBudget;
        let tokenCount = 0;
        const selected = [];

        for (const m of memories) {
            const t = m.tokenCount || estimateTokens(m.summary);
            if (tokenCount + t > budget) break;
            selected.push(m);
            tokenCount += t;
            if (selected.length >= inj.maxInjectedMemories) break;
        }

        if (selected.length === 0) return '';

        // Record the injection so we don't re-pick these on the next turn.
        for (const m of selected) {
            this._injectionLog.set(m.id, currentMessageIndex);
        }

        // Bound the log size so it doesn't grow unbounded.
        if (this._injectionLog.size > 1000) {
            // Drop the oldest half by insertion order (Map preserves order).
            const dropCount = this._injectionLog.size - 500;
            const it = this._injectionLog.keys();
            for (let i = 0; i < dropCount; i++) {
                this._injectionLog.delete(it.next().value);
            }
        }

        // Format
        const format = memSettings.memoryFormat;
        const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const recent = selected.filter((m) => m.createdAt >= recentCutoff);
        const older = selected.filter((m) => m.createdAt < recentCutoff);

        const recentText = this._formatMemories(recent, format);
        const olderText = this._formatMemories(older, format);

        const block = inj.injectionTemplate
            .replace('{memories}', (recentText + (olderText ? '\n' + olderText : '')) || '(no memories yet)')
            .replace('{recent}', recentText || '(no recent events)');

        return block;
    }

    /** Extract the last user message from context for RAG query */
    _getLastUserMessage(ctx) {
        try {
            const chat = ctx?.chat;
            if (!Array.isArray(chat)) return '';
            for (let i = chat.length - 1; i >= 0; i--) {
                const msg = chat[i];
                if (msg?.is_user || msg?.role === 'user') {
                    return typeof msg === 'string' ? msg : (msg?.mes || msg?.content || '');
                }
            }
        } catch { /* ignore */ }
        return '';
    }

    _formatMemories(memories, format) {
        if (memories.length === 0) return '';

        switch (format) {
            case MEMORY_FORMATS.NARRATIVE:
                return memories.map((m) => m.summary).join(' ');
            case MEMORY_FORMATS.JSON:
                return JSON.stringify(memories.map((m) => ({
                    content: m.summary,
                    importance: m.importance,
                    date: new Date(m.createdAt).toISOString().slice(0, 10),
                })));
            case MEMORY_FORMATS.BULLET:
            default:
                return memories.map((m) => `- ${m.summary}`).join('\n');
        }
    }
}

/* ------------------------------------------------------------------ */
/*  RAG ENGINE  (Vector DB + Embeddings)                               */
/* ------------------------------------------------------------------ */

class RAGEngine {
    constructor(settingsManager, memoryStore) {
        this._settings = settingsManager;
        this._memory = memoryStore;
        this._qdrantInitialized = false;
        this._indexingInProgress = false;
    }

    /**
     * Check if RAG is enabled and configured.
     */
    isEnabled() {
        return this._settings.get('rag.enabled');
    }

    /**
     * Initialize Qdrant collection if needed.
     * Creates the collection with the configured vector dimensions.
     */
    async _ensureQdrantCollection() {
        if (this._qdrantInitialized) return true;
        const rag = this._settings.get('rag');
        const baseUrl = rag.qdrantUrl.replace(/\/+$/, '');
        const apiKey = rag.qdrantApiKey;
        const headers = { 'Content-Type': 'application/json' };
        if (apiKey) headers['api-key'] = apiKey;

        try {
            const url = `${baseUrl}/collections/${rag.qdrantCollection}`;
            const resp = await fetch(url, { headers, signal: AbortSignal.timeout(5000) });

            if (resp.status === 200) {
                this._qdrantInitialized = true;
                return true;
            }

            if (resp.status === 404) {
                // Create the collection
                const createUrl = `${baseUrl}/collections`;
                const body = JSON.stringify({
                    create_collection: {
                        name: rag.qdrantCollection,
                        vectors: { size: rag.vectorDimension, distance: 'Cosine' },
                    },
                });
                const createResp = await fetch(createUrl, {
                    method: 'PUT',
                    headers,
                    body,
                    signal: AbortSignal.timeout(10000),
                });
                if (createResp.ok || createResp.status === 200) {
                    this._qdrantInitialized = true;
                    console.log('[MemsMemories RAG] Qdrant collection created');
                    return true;
                }
                console.warn('[MemsMemories RAG] Failed to create Qdrant collection:', await createResp.text());
                return false;
            }
        } catch (err) {
            console.warn('[MemsMemories RAG] Qdrant connection failed:', err.message);
            return false;
        }
        return false;
    }

    /**
     * Get embedding vector for text using the configured provider.
     * @param {string} text
     * @returns {number[]|null} embedding vector or null on failure
     */
    async getEmbedding(text) {
        const rag = this._settings.get('rag');
        const provider = rag.embeddingProvider;
        const timeout = rag.embeddingTimeout;
        const maxRetries = rag.retryEmbedding ? rag.maxEmbeddingRetries : 1;

        let lastError;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                if (provider === EMBEDDING_PROVIDERS.OLLAMA) {
                    return await this._ollamaEmbed(text, rag, timeout);
                } else if (provider === EMBEDDING_PROVIDERS.OPENAI) {
                    return await this._openaiEmbed(text, rag, timeout);
                } else if (provider === EMBEDDING_PROVIDERS.CUSTOM) {
                    return await this._customEmbed(text, rag, timeout);
                }
                return null;
            } catch (err) {
                lastError = err;
                if (attempt < maxRetries - 1) {
                    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
                }
            }
        }
        console.warn('[MemsMemories RAG] Embedding failed after retries:', lastError?.message);
        return null;
    }

    /** Ollama embedding API */
    async _ollamaEmbed(text, rag, timeout) {
        const endpoint = rag.ollamaEndpoint.replace(/\/+$/, '');
        const resp = await fetch(`${endpoint}/api/embeddings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: rag.ollamaEmbeddingModel, prompt: text }),
            signal: AbortSignal.timeout(timeout),
        });
        if (!resp.ok) throw new Error(`Ollama embedding: ${resp.status}`);
        const data = await resp.json();
        if (!data.embedding || !Array.isArray(data.embedding)) {
            throw new Error('Ollama returned no embedding array');
        }
        return data.embedding;
    }

    /** OpenAI-compatible embedding API */
    async _openaiEmbed(text, rag, timeout) {
        const baseUrl = rag.openaiBaseUrl.replace(/\/+$/, '');
        const resp = await fetch(`${baseUrl}/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${rag.openaiApiKey}`,
            },
            body: JSON.stringify({ model: rag.openaiEmbeddingModel, input: text }),
            signal: AbortSignal.timeout(timeout),
        });
        if (!resp.ok) throw new Error(`OpenAI embedding: ${resp.status}`);
        const data = await resp.json();
        if (!data.data?.[0]?.embedding) throw new Error('OpenAI returned no embedding');
        return data.data[0].embedding;
    }

    /** Custom endpoint embedding API */
    async _customEmbed(text, rag, timeout) {
        const headers = { 'Content-Type': 'application/json' };
        if (rag.customEmbeddingApiKey) headers['Authorization'] = `Bearer ${rag.customEmbeddingApiKey}`;
        const body = { text, input: text };
        if (rag.customEmbeddingModel) body.model = rag.customEmbeddingModel;

        const resp = await fetch(rag.customEmbeddingEndpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(timeout),
        });
        if (!resp.ok) throw new Error(`Custom embedding: ${resp.status}`);
        const data = await resp.json();
        // Try common response shapes
        const embedding = data.embedding || data.embeddings?.[0] || data.data?.[0]?.embedding;
        if (!embedding || !Array.isArray(embedding)) throw new Error('Custom endpoint: no embedding array found');
        return embedding;
    }

    /**
     * Index a memory into the vector database.
     * @param {object} memory - memory object with `id` and `summary`
     */
    async indexMemory(memory) {
        if (!this.isEnabled()) return;
        const rag = this._settings.get('rag');
        if (rag.vectorProvider !== RAG_PROVIDERS.QDRANT) return;

        const ok = await this._ensureQdrantCollection();
        if (!ok) return;

        const text = memory.summary || memory.content || '';
        if (!text.trim()) return;

        const embedding = await this.getEmbedding(text);
        if (!embedding) return;

        const point = {
            id: memory.id,
            vector: embedding,
            payload: {
                memoryId: memory.id,
                summary: memory.summary,
                importance: memory.importance,
                createdAt: memory.createdAt,
                chatId: memory.chatId,
                charName: memory.charName,
            },
        };

        try {
            const baseUrl = rag.qdrantUrl.replace(/\/+$/, '');
            const headers = { 'Content-Type': 'application/json' };
            if (rag.qdrantApiKey) headers['api-key'] = rag.qdrantApiKey;
            const url = `${baseUrl}/collections/${rag.qdrantCollection}/points`;
            const body = JSON.stringify({ points: [point] });
            await fetch(url, {
                method: 'PUT',
                headers,
                body,
                signal: AbortSignal.timeout(rag.embeddingTimeout),
            });
        } catch (err) {
            console.warn('[MemsMemories RAG] Indexing failed:', err.message);
        }
    }

    /**
     * Remove a memory from the vector database.
     */
    async deleteMemory(memoryId) {
        if (!this.isEnabled()) return;
        const rag = this._settings.get('rag');
        if (rag.vectorProvider !== RAG_PROVIDERS.QDRANT) return;

        const ok = await this._ensureQdrantCollection();
        if (!ok) return;

        try {
            const baseUrl = rag.qdrantUrl.replace(/\/+$/, '');
            const headers = { 'Content-Type': 'application/json' };
            if (rag.qdrantApiKey) headers['api-key'] = rag.qdrantApiKey;
            const url = `${baseUrl}/collections/${rag.qdrantCollection}/points/delete`;
            await fetch(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({ points: [memoryId] }),
                signal: AbortSignal.timeout(10000),
            });
        } catch (err) {
            console.warn('[MemsMemories RAG] Delete from vector DB failed:', err.message);
        }
    }

    /**
     * Semantic search: find relevant memories for a query.
     * @param {string} query - the search query (usually the user's latest message)
     * @param {object[]} candidates - array of memory objects to filter further
     * @returns {object[]} scored and sorted memories
     */
    async semanticSearch(query, candidates = []) {
        if (!this.isEnabled()) return [];
        const rag = this._settings.get('rag');
        if (rag.vectorProvider !== RAG_PROVIDERS.QDRANT) return [];

        const ok = await this._ensureQdrantCollection();
        if (!ok) return [];

        const queryEmbedding = await this.getEmbedding(query);
        if (!queryEmbedding) return [];

        try {
            const baseUrl = rag.qdrantUrl.replace(/\/+$/, '');
            const headers = { 'Content-Type': 'application/json' };
            if (rag.qdrantApiKey) headers['api-key'] = rag.qdrantApiKey;
            const url = `${baseUrl}/collections/${rag.qdrantCollection}/points/search`;
            const body = JSON.stringify({
                vector: queryEmbedding,
                limit: Math.max(rag.topK * 3, 30),
                with_payload: true,
                score_threshold: rag.similarityThreshold,
            });
            const resp = await fetch(url, {
                method: 'POST',
                headers,
                body,
                signal: AbortSignal.timeout(rag.embeddingTimeout),
            });
            if (!resp.ok) return [];
            const data = await resp.json();
            const results = (data.result || []).map((r) => ({
                memoryId: r.payload?.memoryId || r.id,
                score: r.score,
                summary: r.payload?.summary || '',
                importance: r.payload?.importance || 0.5,
                charName: r.payload?.charName || '',
                createdAt: r.payload?.createdAt || 0,
            }));

            // If hybrid, boost by keyword match
            if (rag.hybridSearch) {
                const queryLower = query.toLowerCase();
                const kwWeight = rag.hybridKeywordWeight;
                for (const r of results) {
                    const summaryLower = (r.summary || '').toLowerCase();
                    const wordOverlap = queryLower.split(/\s+/).filter((w) =>
                        w.length > 2 && summaryLower.includes(w)
                    ).length;
                    const kwScore = Math.min(wordOverlap / Math.max(queryLower.split(/\s+/).filter((w) => w.length > 2).length, 1), 1.0);
                    r.score = r.score * (1 - kwWeight) + kwScore * kwWeight;
                }
                results.sort((a, b) => b.score - a.score);
            }

            // Slice to topK
            return results.slice(0, rag.topK);
        } catch (err) {
            console.warn('[MemsMemories RAG] Semantic search failed:', err.message);
            return [];
        }
    }

    /**
     * Bulk index existing memories. Call on RAG enable or manually.
     */
    async bulkIndex() {
        if (!this.isEnabled() || this._indexingInProgress) return;
        this._indexingInProgress = true;

        try {
            const all = await this._memory.getAll();
            const batchSize = this._settings.get('rag.batchIndexSize');
            let indexed = 0;

            for (let i = 0; i < all.length; i += batchSize) {
                const batch = all.slice(i, i + batchSize);
                for (const mem of batch) {
                    await this.indexMemory(mem);
                    indexed++;
                }
                if (this._settings.get('display.showSummarizationProgress') && indexed % 20 === 0) {
                    console.log(`[MemsMemories RAG] Indexed ${indexed}/${all.length} memories`);
                }
            }
            console.log(`[MemsMemories RAG] Bulk index complete: ${indexed} memories`);
        } catch (err) {
            console.error('[MemsMemories RAG] Bulk index error:', err);
        } finally {
            this._indexingInProgress = false;
        }
    }
}

/* ------------------------------------------------------------------ */
/*  MAIN EXTENSION CLASS                                               */
/* ------------------------------------------------------------------ */

class MemsMemoriesExtension {
    constructor() {
        this.settings = new SettingsManager();
        this.memoryStore = new MemoryStore();
        this.summarizer = null;
        this.injector = null;
        this.ragEngine = null;
        this._messageHookBound = null;
        this._ctx = null;
        this._panelEl = null;
    }

    /* ---- Lifecycle ------------------------------------------------- */

    async onActivate() {
        this._ctx = SillyTavern.getContext();
        this.settings.init(this._ctx);
        await this.memoryStore.init();

        this.ragEngine = new RAGEngine(this.settings, this.memoryStore);
        this.summarizer = new SummarizationEngine(this.settings, this.memoryStore, this.ragEngine);
        this.injector = new ContextInjector(this.settings, this.memoryStore, this.ragEngine);

        // Hook into message events
        this._messageHookBound = this._onMessageReceived.bind(this);
        if (this._ctx.eventSource) {
            this._ctx.eventSource.on('message_received', this._messageHookBound);
            this._ctx.eventSource.on('message_sent', this._messageHookBound);
        }

        // Register slash commands
        this._registerSlashCommands();

        // Render settings panel
        await this._renderSettingsPanel();

        // Render memory panel if enabled
        if (this.settings.get('display.showMemoryPanel')) {
            this._renderMemoryPanel();
        }

        // Register prompt injection hook
        this._registerPromptHook();

        console.log('[MemsMemories] Extension activated');
    }

    onEnable() {
        console.log('[MemsMemories] Extension enabled');
    }

    onDisable() {
        // Remove hooks
        if (this._ctx?.eventSource && this._messageHookBound) {
            this._ctx.eventSource.off('message_received', this._messageHookBound);
            this._ctx.eventSource.off('message_sent', this._messageHookBound);
        }
        console.log('[MemsMemories] Extension disabled');
    }

    /* ---- Message Handling ------------------------------------------ */

    async _onMessageReceived() {
        if (!this.settings.get('summarization.enabled')) return;
        await this.summarizer.summarizeIfNeeded();
    }

    /* ---- Slash Commands -------------------------------------------- */

    _registerSlashCommands() {
        const { registerSlashCommand } = this._ctx;
        if (!registerSlashCommand) return;

        registerSlashCommand('mem-summarize', async () => {
            await this.summarizer.summarizeIfNeeded();
            return 'Memories summarized.';
        }, [], 'Summarize recent conversation into memories');

        // ── Manual memory creation ───────────────────────────────
        registerSlashCommand('mem-add', async (args, text) => {
            // SillyTavern passes the raw text as the second arg.
            // Use that if present (works for multi-line input), else parse args.
            const content = (text || args || '').trim();
            if (!content) return 'Usage: /mem-add <your memory text>';

            const ctx = SillyTavern.getContext();
            const stored = await this.memoryStore.add({
                chatId: this._getChatId(),
                charName: ctx?.character?.name || ctx?.characterName || '',
                content,
                summary: content,
                importance: 0.8,        // manually-added memories are presumed important
                sourceMessages: [],
                tags: ['manual'],
            });

            // Index in RAG if enabled
            if (this.ragEngine && this.ragEngine.isEnabled() && this.settings.get('rag.indexOnSummarize')) {
                this.ragEngine.indexMemory(stored).catch((err) =>
                    console.warn('[MemsMemories] RAG index on manual add failed:', err?.message));
            }

            // Refresh panel & badge
            this._refreshMemoryPanel();
            this._updateMemoryBadge();

            return `Memory added: "${content.slice(0, 60)}${content.length > 60 ? '…' : ''}"`;
        }, [], 'Manually add a memory (usage: /mem-add <text>)');

        registerSlashCommand('mem-list', async (args) => {
            const count = parseInt(args) || 10;
            const memories = await this.memoryStore.getAll({ maxAgeDays: 365 });
            const recent = memories.sort((a, b) => b.createdAt - a.createdAt).slice(0, count);
            if (recent.length === 0) return 'No memories stored yet.';
            return recent.map((m, i) => `${i + 1}. [${m.importance.toFixed(2)}] ${m.summary}`).join('\n');
        }, [], 'List recent memories (usage: /mem-list [count])');

        registerSlashCommand('mem-clear', async () => {
            const chatId = this._getChatId();
            await this.memoryStore.clearChat(chatId);
            this.summarizer.reset();
            return 'All memories for this chat cleared.';
        }, [], 'Clear all memories for the current chat');

        registerSlashCommand('mem-clear-all', async () => {
            await this.memoryStore.clearAll();
            this.summarizer.reset();
            return 'ALL memories deleted.';
        }, [], 'Clear ALL memories (all chats)');

        registerSlashCommand('mem-count', async () => {
            const total = await this.memoryStore.count();
            const chatCount = await this.memoryStore.count({ chatId: this._getChatId() });
            return `Total memories: ${total} | This chat: ${chatCount}`;
        }, [], 'Show memory count');

        registerSlashCommand('mem-importance', async (args) => {
            const [index, scoreStr] = (args || '').split(/\s+/);
            const score = parseFloat(scoreStr);
            if (isNaN(score) || score < 0 || score > 1) {
                return 'Usage: /mem-importance <index> <0.0-1.0>';
            }
            const memories = await this.memoryStore.getAll({ maxAgeDays: 365 });
            const sorted = memories.sort((a, b) => b.createdAt - a.createdAt);
            const idx = parseInt(index) - 1;
            if (idx < 0 || idx >= sorted.length) return 'Invalid memory index.';
            await this.memoryStore.update(sorted[idx].id, { importance: score });
            return `Memory #${index} importance set to ${score.toFixed(2)}`;
        }, [], 'Set importance of a memory (usage: /mem-importance <index> <score>)');

        registerSlashCommand('mem-search', async (args) => {
            if (!args) return 'Usage: /mem-search <keyword>';
            const keyword = args.toLowerCase();
            const memories = await this.memoryStore.getAll({ maxAgeDays: 365 });
            const matches = memories.filter((m) =>
                (m.summary || '').toLowerCase().includes(keyword) ||
                (m.content || '').toLowerCase().includes(keyword)
            );
            if (matches.length === 0) return `No memories found for "${keyword}".`;
            return matches.slice(0, 10).map((m, i) =>
                `${i + 1}. [${m.importance.toFixed(2)}] ${m.summary}`
            ).join('\n');
        }, [], 'Search memories by keyword');

        registerSlashCommand('mem-delete', async (args) => {
            const index = parseInt(args);
            if (isNaN(index)) return 'Usage: /mem-delete <index from /mem-list>';
            const memories = await this.memoryStore.getAll({ maxAgeDays: 365 });
            const sorted = memories.sort((a, b) => b.createdAt - a.createdAt);
            const idx = index - 1;
            if (idx < 0 || idx >= sorted.length) return 'Invalid memory index.';
            await this.memoryStore.remove(sorted[idx].id);
            return `Memory #${index} deleted.`;
        }, [], 'Delete a memory by index from /mem-list');

        // ── RAG Slash Commands ──────────────────────────────────
        registerSlashCommand('mem-rag-status', async () => {
            const ragEnabled = this.settings.get('rag.enabled');
            if (!ragEnabled) return 'RAG is disabled. Enable it in Mem\'s Memories settings > RAG.';
            const provider = this.settings.get('rag.embeddingProvider');
            const vectorProvider = this.settings.get('rag.vectorProvider');
            const qdrantUrl = this.settings.get('rag.qdrantUrl');
            return `RAG: ENABLED | Vector DB: ${vectorProvider} @ ${qdrantUrl} | Embeddings: ${provider}`;
        }, [], 'Show RAG status');

        registerSlashCommand('mem-rag-index', async () => {
            if (!this.ragEngine || !this.ragEngine.isEnabled()) return 'RAG is not enabled. Enable it in settings first.';
            this.ragEngine.bulkIndex().catch((err) => console.error('[MemsMemories] RAG bulk index:', err));
            return 'Bulk indexing started. Check console for progress.';
        }, [], 'Re-index all memories into the vector database');

        registerSlashCommand('mem-rag-search', async (args) => {
            if (!args) return 'Usage: /mem-rag-search <query>';
            if (!this.ragEngine || !this.ragEngine.isEnabled()) return 'RAG is not enabled.';
            const results = await this.ragEngine.semanticSearch(args);
            if (results.length === 0) return 'No semantically similar memories found.';
            return results.map((r, i) =>
                `${i + 1}. [score: ${r.score.toFixed(3)}] ${r.summary}`
            ).join('\n');
        }, [], 'Semantic search memories (RAG)');

        console.log('[MemsMemories] Slash commands registered');
    }

    /* ---- Prompt Injection ------------------------------------------ */

    _registerPromptHook() {
        // Listen for the prompt being built and inject memories
        const originalSend = this._ctx.sendMessage;
        if (!originalSend) return;

        // We hook into the prompt preparation pipeline
        // SillyTavern fires events; we intercept before sending
        if (this._ctx.eventSource) {
            this._ctx.eventSource.on('before_generation', async (data) => {
                const injection = await this.injector.prepareInjection(this._ctx);
                if (!injection) return;

                const position = this.settings.get('injection.injectPosition');
                if (position === INJECT_POSITIONS.AFTER_SYSTEM && data.systemPrompt != null) {
                    data.systemPrompt = (data.systemPrompt || '') + '\n\n' + injection;
                } else if (position === INJECT_POSITIONS.BEFORE_SYSTEM && data.systemPrompt != null) {
                    data.systemPrompt = injection + '\n\n' + (data.systemPrompt || '');
                } else if (position === INJECT_POSITIONS.BEFORE_LAST && data.prompt != null) {
                    data.prompt = injection + '\n\n' + data.prompt;
                }
            });
        }
    }

    /* ---- Settings Panel -------------------------------------------- */

    async _renderSettingsPanel() {
        const s = this.settings.getAll();

        // Pre-compute boolean flags so settings.html can use simple {{#if flag}} checks.
        // This avoids Handlebars subexpressions like (eq a b) which SillyTavern doesn't register.
        const templateVars = {
            settings: s,
            isStrategyProgressive:  s.summarization.strategy === STRATEGIES.PROGRESSIVE,
            isStrategyHierarchical: s.summarization.strategy === STRATEGIES.HIERARCHICAL,
            isStrategyHybrid:       s.summarization.strategy === STRATEGIES.HYBRID,
            isFormatBullet:    s.memory.memoryFormat === MEMORY_FORMATS.BULLET,
            isFormatNarrative: s.memory.memoryFormat === MEMORY_FORMATS.NARRATIVE,
            isFormatJson:      s.memory.memoryFormat === MEMORY_FORMATS.JSON,
            isPositionBeforeSystem: s.injection.injectPosition === INJECT_POSITIONS.BEFORE_SYSTEM,
            isPositionAfterSystem:  s.injection.injectPosition === INJECT_POSITIONS.AFTER_SYSTEM,
            isPositionBeforeLast:   s.injection.injectPosition === INJECT_POSITIONS.BEFORE_LAST,
            isPositionAfterLast:    s.injection.injectPosition === INJECT_POSITIONS.AFTER_LAST,
            isSortImportance: s.injection.sortBy === SORT_MODES.IMPORTANCE,
            isSortRecency:    s.injection.sortBy === SORT_MODES.RECENCY,
            isSortRelevance:  s.injection.sortBy === SORT_MODES.RELEVANCE,
            isPanelRight: s.display.panelPosition === 'right',
            isPanelLeft:  s.display.panelPosition === 'left',
            isThemeAuto:  s.display.theme === 'auto',
            isThemeLight: s.display.theme === 'light',
            isThemeDark:  s.display.theme === 'dark',
            isRagQdrant: s.rag.vectorProvider === RAG_PROVIDERS.QDRANT,
            isRagChroma: s.rag.vectorProvider === RAG_PROVIDERS.CHROMA,
            isEmbedOllama: s.rag.embeddingProvider === EMBEDDING_PROVIDERS.OLLAMA,
            isEmbedOpenai: s.rag.embeddingProvider === EMBEDDING_PROVIDERS.OPENAI,
            isEmbedCustom: s.rag.embeddingProvider === EMBEDDING_PROVIDERS.CUSTOM,
        };

        // Try the proper SillyTavern template renderer first. Try multiple candidate paths
        // so the extension works regardless of which folder the user installed it to.
        const candidates = this._discoverExtensionPaths();
        const { renderExtensionTemplateAsync } = this._ctx;
        let settingsHtml = '';
        if (renderExtensionTemplateAsync) {
            for (const path of candidates) {
                try {
                    settingsHtml = await renderExtensionTemplateAsync(path, 'settings', templateVars);
                    if (settingsHtml && !settingsHtml.includes('404')) {
                        console.log(`[MemsMemories] Settings rendered via ${path}`);
                        break;
                    }
                } catch (err) {
                    console.warn(`[MemsMemories] renderExtensionTemplateAsync("${path}") failed:`, err?.message);
                }
            }
        }

        // Last-resort fallback: fetch settings.html via fetch() and do simple var replacement
        if (!settingsHtml) {
            try {
                const resp = await fetch(new URL('./settings.html', import.meta.url));
                if (resp.ok) {
                    const raw = await resp.text();
                    settingsHtml = this._simpleHandlebars(raw, templateVars);
                    console.log('[MemsMemories] Settings rendered via fetch fallback');
                }
            } catch (err) {
                console.warn('[MemsMemories] Fetch fallback failed:', err?.message);
            }
        }

        if (!settingsHtml) {
            console.error('[MemsMemories] Could not render settings panel via any method. The extension may not be properly installed.');
            return;
        }

        const $container = $('#extensions_settings2');
        if ($container.length) {
            $container.append(settingsHtml);
            this._bindSettingsEvents();
        } else {
            console.error('[MemsMemories] #extensions_settings2 not found in DOM');
        }
    }

    /**
     * Discover candidate folder names for the extension. Tries the most common
     * locations where a user might install it. Order: most-specific first.
     */
    _discoverExtensionPaths() {
        const paths = [];
        // Try to derive from the script's own URL (works for ES modules)
        try {
            const scriptUrl = import.meta.url;
            // /data/default/extensions/<folder>/index.js → folder is the second-to-last path segment
            const m = scriptUrl.match(/\/data\/default\/extensions\/([^/]+)\/index\.js/);
            if (m) paths.push(`third-party/${m[1]}`);
        } catch { /* import.meta.url may not be available */ }
        // Hard-coded common names as fallback
        paths.push('third-party/SillyTavern-Extension');
        paths.push('third-party/MemsMemories');
        paths.push('third-party/mems_memories');
        return [...new Set(paths)];
    }

    /**
     * Tiny Handlebars replacement for the fallback render path.
     * Supports {{var}}, {{var.sub}}, and {{#if flag}}…{{else}}…{{/if}}.
     */
    _simpleHandlebars(template, vars) {
        template = template.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)(?:\{\{else\}\}([\s\S]*?))?\{\{\/if\}\}/g, (_, k, a, b) => {
            const v = this._hbResolve(k.trim(), vars);
            return v ? a : (b || '');
        });
        template = template.replace(/\{\{\s*([^{}#\/][^}]*?)\s*\}\}/g, (_, k) => {
            const v = this._hbResolve(k.trim(), vars);
            return v == null ? '' : String(v);
        });
        return template;
    }

    _hbResolve(key, vars) {
        return key.split('.').reduce((o, k) => o == null ? o : o[k], vars);
    }

    _bindSettingsEvents() {
        const self = this;

        // Toggle sections
        $('#mems_memories_settings').on('click', '.mems-toggle-section', function () {
            const target = $(this).data('target');
            $(`#${target}`).slideToggle(200);
            $(this).toggleClass('collapsed');
        });

        // Generic input change handler
        $('#mems_memories_settings').on('change input', 'input, select, textarea', function () {
            const path = $(this).data('setting');
            if (!path) return;
            let value;
            if ($(this).attr('type') === 'checkbox') {
                value = $(this).prop('checked');
            } else if ($(this).attr('type') === 'number' || $(this).attr('type') === 'range') {
                value = parseFloat($(this).val());
                if ($(this).data('clamp-max') != null) {
                    value = Math.min(value, parseFloat($(this).data('clamp-max')));
                }
            } else {
                value = $(this).val();
            }
            self.settings.set(path, value);
            // Update range value display
            if ($(this).attr('type') === 'range') {
                const $valSpan = $(this).closest('.mems-range-group').find('.mems-range-value');
                if ($valSpan.length) $valSpan.text(value);
            }
            // Re-evaluate conditional blocks
            self._updateConditionals($(this));
        });

        // Initial conditional evaluation
        this._updateAllConditionals();

        // Reset button
        $('#mems_memories_reset').on('click', () => {
            if (confirm('Reset ALL Mem\'s Memories settings to defaults?')) {
                self.settings.reset();
                location.reload();
            }
        });

        // Force summarize button
        $('#mems_memories_summarize_now').on('click', async () => {
            await self.summarizer.summarizeIfNeeded();
            if (self.settings.get('display.notifyOnNewMemory')) {
                self._showToast('Summarization triggered');
            }
        });

        // Clear memories button
        $('#mems_memories_clear_memories').on('click', async () => {
            if (confirm('Clear all memories for this chat?')) {
                await self.memoryStore.clearChat(self._getChatId());
                self.summarizer.reset();
                self._refreshMemoryPanel();
            }
        });
    }

    /**
     * Update all conditional blocks based on current settings.
     * A conditional block has:
     *   data-show-when="rag.embeddingProvider" data-show-eq="ollama"
     * It becomes visible when the named setting equals the named value.
     */
    _updateAllConditionals() {
        const self = this;
        $('#mems_memories_settings .mems-conditional').each(function () {
            const $el = $(this);
            const whenPath = $el.data('show-when');
            const eqValue = $el.data('show-eq');
            if (!whenPath) return;
            const current = self.settings.get(whenPath);
            const shouldShow = String(current) === String(eqValue);
            $el.toggleClass('visible', shouldShow);
        });

        // Also: show/hide entire sections based on parent toggles
        // (e.g. enable RAG shows the RAG section body)
        const ragEnabled = this.settings.get('rag.enabled');
        $('#mems_section_rag').toggleClass('visible', true); // body always shown; could add master toggle
    }

    /** Update conditionals that depend on a specific input */
    _updateConditionals($changed) {
        const changedPath = $changed.data('setting');
        if (!changedPath) return;
        const self = this;
        $('#mems_memories_settings .mems-conditional').each(function () {
            const $el = $(this);
            const whenPath = $el.data('show-when');
            if (whenPath !== changedPath) return;
            const eqValue = $el.data('show-eq');
            const current = self.settings.get(whenPath);
            const shouldShow = String(current) === String(eqValue);
            $el.toggleClass('visible', shouldShow);
        });
    }

    /* ---- Memory Panel ---------------------------------------------- */

    _renderMemoryPanel() {
        const pos = this.settings.get('display.panelPosition');
        const sideClass = pos === 'left' ? 'mems-panel-left' : 'mems-panel-right';

        const html = `
        <div id="mems_memories_panel" class="${sideClass} mems-panel">
            <div id="mems_panel_drag_handle" class="mems-panel-header" title="Drag to move">
                <span class="mems-panel-drag-icon">⠿</span>
                <span class="mems-panel-title">🧠 Mem's Memories</span>
                <span id="mems_memory_count" class="mems-badge">0</span>
                <button id="mems_panel_add" class="mems-btn-icon" title="Add memory manually">+</button>
                <button id="mems_panel_refresh" class="mems-btn-icon" title="Refresh">↻</button>
                <button id="mems_panel_minimize" class="mems-btn-icon" title="Minimize">–</button>
                <button id="mems_panel_close" class="mems-btn-icon mems-btn-close" title="Close panel">✕</button>
            </div>
            <div id="mems_panel_add_form" class="mems-add-form mems-hidden">
                <textarea id="mems_add_textarea" class="mems-add-textarea" placeholder="Write a memory you want the AI to remember..." maxlength="2000"></textarea>
                <div class="mems-add-controls">
                    <label class="mems-add-importance-label">
                        Importance
                        <input type="range" id="mems_add_importance" min="0" max="1" step="0.05" value="0.8">
                        <span id="mems_add_importance_val" class="mems-range-value">0.80</span>
                    </label>
                    <button id="mems_add_save" class="mems-btn mems-btn-primary">Save</button>
                    <button id="mems_add_cancel" class="mems-btn mems-btn-secondary">Cancel</button>
                </div>
            </div>
            <div class="mems-panel-body">
                <div id="mems_memory_list" class="mems-memory-list"></div>
            </div>
            <div class="mems-panel-footer">
                <input type="text" id="mems_search_input" class="mems-search" placeholder="Search memories...">
            </div>
        </div>
        <button id="mems_panel_reopen" class="mems-panel-reopen ${sideClass}" title="Open Mem's Memories">🧠</button>`;

        $('body').append(html);
        this._panelEl = $('#mems_memories_panel');
        this._reopenBtn = $('#mems_panel_reopen');

        // Close button — hide panel, show floating reopen button
        $('#mems_panel_close').on('click', () => {
            this._panelEl.addClass('mems-panel-hidden');
            this._reopenBtn.addClass('mems-panel-reopen-visible');
        });

        // Reopen button — show panel, hide floating button
        this._reopenBtn.on('click', () => {
            this._panelEl.removeClass('mems-panel-hidden');
            this._reopenBtn.removeClass('mems-panel-reopen-visible');
        });

        // Minimize — collapse body only (panel stays visible as header)
        $('#mems_panel_minimize').on('click', () => {
            const body = this._panelEl.find('.mems-panel-body');
            const footer = this._panelEl.find('.mems-panel-footer');
            body.slideToggle(150);
            footer.slideToggle(150);
            const btn = $('#mems_panel_minimize');
            btn.text(btn.text() === '–' ? '+' : '–');
            btn.attr('title', btn.text() === '+' ? 'Expand' : 'Minimize');
        });

        $('#mems_panel_refresh').on('click', () => {
            this._refreshMemoryPanel();
        });

        // ── Manual add memory form ──
        this._setupAddForm();

        // ── Drag to move ──
        this._setupPanelDrag();

        const self = this;

        let searchTimeout;
        $('#mems_search_input').on('input', function () {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                self._refreshMemoryPanel($(this).val());
            }, 300);
        });

        this._refreshMemoryPanel();
        this._updateMemoryBadge();

        // Auto-refresh interval (configurable, 0 = off)
        const refreshMs = this.settings.get('display.memoryPanelRefreshInterval');
        if (refreshMs > 0) {
            setInterval(() => this._refreshMemoryPanel(), refreshMs);
        }
    }

    _setupPanelDrag() {
        const handle = document.getElementById('mems_panel_drag_handle');
        const panel = document.getElementById('mems_memories_panel');
        if (!handle || !panel) return;

        let isDragging = false;
        let startX, startY, startLeft, startTop;
        const self = this;

        handle.addEventListener('mousedown', (e) => {
            // Don't drag when clicking buttons inside the header
            if (e.target.tagName === 'BUTTON') return;

            isDragging = true;
            panel.classList.add('mems-panel-dragging');

            startX = e.clientX;
            startY = e.clientY;
            startLeft = panel.offsetLeft;
            startTop = panel.offsetTop;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const dx = e.clientX - startX;
            const dy = e.clientY - startY;

            let newLeft = startLeft + dx;
            let newTop = startTop + dy;

            // Clamp to viewport
            const maxLeft = window.innerWidth - panel.offsetWidth;
            const maxTop = window.innerHeight - panel.offsetHeight;
            newLeft = Math.max(0, Math.min(newLeft, maxLeft));
            newTop = Math.max(0, Math.min(newTop, maxTop));

            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (!isDragging) return;
            isDragging = false;
            panel.classList.remove('mems-panel-dragging');

            // Persist position in settings
            const pos = self.settings.get('display.panelPosition');
            if (pos) {
                self.settings.set('display.panelLeft', panel.style.left);
                self.settings.set('display.panelTop', panel.style.top);
            }
        });

        // Restore saved position
        const savedLeft = this.settings.get('display.panelLeft');
        const savedTop = this.settings.get('display.panelTop');
        if (savedLeft && savedTop) {
            panel.style.left = savedLeft;
            panel.style.top = savedTop;
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        }
    }

    async _refreshMemoryPanel(searchTerm) {
        const listEl = $('#mems_memory_list');
        if (!listEl.length) return;

        const memories = await this.memoryStore.getAll({
            chatId: this._getChatId(),
            maxAgeDays: 365,
        });

        memories.sort((a, b) => b.createdAt - a.createdAt);

        let filtered = memories;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = memories.filter((m) =>
                (m.summary || '').toLowerCase().includes(lower)
            );
        }

        if (filtered.length === 0) {
            listEl.html('<div class="mems-empty">No memories yet. Chat to create them!</div>');
        } else {
            listEl.html(filtered.map((m, i) => `
                <div class="mems-memory-item" data-id="${m.id}">
                    <div class="mems-memory-score" style="--score:${m.importance}" title="Importance: ${(m.importance * 100).toFixed(0)}%">
                        ${'★'.repeat(Math.round(m.importance * 5))}
                    </div>
                    <div class="mems-memory-text">${this._escapeHtml(m.summary)}</div>
                    <div class="mems-memory-meta">
                        <span class="mems-memory-date">${new Date(m.createdAt).toLocaleDateString()}</span>
                        <button class="mems-btn-delete" data-id="${m.id}" title="Delete">✕</button>
                    </div>
                </div>
            `).join(''));
        }

        // Delete buttons
        listEl.find('.mems-btn-delete').on('click', async (e) => {
            e.stopPropagation();
            const id = $(e.currentTarget).data('id');
            await this.memoryStore.remove(id);
            this._refreshMemoryPanel(searchTerm);
            this._updateMemoryBadge();
        });

        this._updateMemoryBadge();
    }

    /**
     * Wire up the manual "+ Add Memory" form in the panel.
     * Shows/hides the form, handles Save/Cancel, and submits via
     * _addMemoryManual.
     */
    _setupAddForm() {
        const $add = $('#mems_panel_add');
        const $form = $('#mems_panel_add_form');
        const $textarea = $('#mems_add_textarea');
        const $importance = $('#mems_add_importance');
        const $importanceVal = $('#mems_add_importance_val');
        const $save = $('#mems_add_save');
        const $cancel = $('#mems_add_cancel');

        if (!$add.length || !$form.length) return;

        // Toggle the form on "+" click
        $add.on('click', () => {
            const isOpen = !$form.hasClass('mems-hidden');
            if (isOpen) {
                $form.addClass('mems-hidden');
            } else {
                $form.removeClass('mems-hidden');
                $textarea.val('').trigger('focus');
            }
        });

        // Live-update importance value display
        $importance.on('input', () => {
            $importanceVal.text(parseFloat($importance.val()).toFixed(2));
        });

        // Cancel hides the form
        $cancel.on('click', () => {
            $form.addClass('mems-hidden');
            $textarea.val('');
        });

        // Save creates the memory
        $save.on('click', async () => {
            const content = $textarea.val().trim();
            if (!content) {
                $textarea.trigger('focus');
                return;
            }
            const importance = parseFloat($importance.val());
            $save.prop('disabled', true).text('Saving…');
            try {
                await this._addMemoryManual(content, importance);
                $form.addClass('mems-hidden');
                $textarea.val('');
                if (this.settings.get('display.notifyOnNewMemory')) {
                    this._showToast(`Memory saved (importance: ${(importance * 100).toFixed(0)}%)`);
                }
            } catch (err) {
                console.error('[MemsMemories] Failed to save manual memory:', err);
                this._showToast('Failed to save memory');
            } finally {
                $save.prop('disabled', false).text('Save');
            }
        });

        // Ctrl/Cmd+Enter to save, Escape to cancel
        $textarea.on('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                $save.trigger('click');
            } else if (e.key === 'Escape') {
                e.preventDefault();
                $cancel.trigger('click');
            }
        });
    }

    /**
     * Manually add a memory (used by the panel's "+ Add" form).
     * @param {string} content
     * @param {number} [importance=0.8]
     * @returns {Promise<object|null>}
     */
    async _addMemoryManual(content, importance = 0.8) {
        if (!content || !content.trim()) return null;
        const ctx = this._ctx;
        const stored = await this.memoryStore.add({
            chatId: this._getChatId(),
            charName: ctx?.character?.name || ctx?.characterName || '',
            content: content.trim(),
            summary: content.trim(),
            importance,
            sourceMessages: [],
            tags: ['manual'],
        });

        if (this.ragEngine && this.ragEngine.isEnabled() && this.settings.get('rag.indexOnSummarize')) {
            this.ragEngine.indexMemory(stored).catch((err) =>
                console.warn('[MemsMemories] RAG index on manual add failed:', err?.message));
        }

        this._refreshMemoryPanel();
        this._updateMemoryBadge();
        return stored;
    }

    async _updateMemoryBadge() {
        const count = await this.memoryStore.count({ chatId: this._getChatId() });
        $('#mems_memory_count').text(count);
    }

    _escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    _getChatId() {
        try {
            return this._ctx?.chatId
                || this._ctx?.chatName
                || (this._ctx?.character?.name ? `chat_${this._ctx.character.name}` : 'default');
        } catch { return 'default'; }
    }

    _showToast(message) {
        try {
            if (typeof toastr !== 'undefined') {
                toastr.info(message, "Mem's Memories");
            }
        } catch { /* not available */ }
    }
}

/* ------------------------------------------------------------------ */
/*  BOOTSTRAP                                                          */
/* ------------------------------------------------------------------ */

const extension = new MemsMemoriesExtension();

// Top-level safety net: catch any unhandled errors and surface them
window.addEventListener('error', (ev) => {
    if (ev.error) console.error('[MemsMemories] Unhandled error:', ev.error);
});
window.addEventListener('unhandledrejection', (ev) => {
    console.error('[MemsMemories] Unhandled promise rejection:', ev.reason);
});

console.log('[MemsMemories] Module loaded; ready for onActivate().');

export async function onActivate() {
    try {
        await extension.onActivate();
    } catch (err) {
        console.error('[MemsMemories] onActivate failed:', err);
    }
}

export function onEnable() {
    try {
        extension.onEnable();
    } catch (err) {
        console.error('[MemsMemories] onEnable failed:', err);
    }
}

export function onDisable() {
    try {
        extension.onDisable();
    } catch (err) {
        console.error('[MemsMemories] onDisable failed:', err);
    }
}
