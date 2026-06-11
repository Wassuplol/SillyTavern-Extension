# Mem's Memories — Best Settings

> Production-ready plug & play configuration. Start here, tune to your model.

## Summarization
| Setting | Value | Why |
|---|---|---|
| Strategy | **Hybrid** | Combines progressive (fast) + hierarchical (accurate). Best balance. |
| Auto-Summary Trigger | **10** messages | Summarize every ~10 messages. Enough context per chunk without overloading. |
| Max Summary Tokens | **300** | Compact enough to inject, detailed enough to be useful. |
| Compression Ratio | **0.4** | 40% compression — keeps key info, drops filler. |
| Recency Window | **20** | Last 20 messages weighted higher. Good for ongoing convo tracking. |
| Min Message Length | **50** chars | Filter out "ok", "lol" etc. |
| Preserve Named Entities | ✅ on | Never lose character names, locations, items. |
| Preserve Quotes | ✅ on | Preserves exact character dialogue. |
| Deduplicate | ✅ on | No redundant summary lines. |

## Memory Store
| Setting | Value | Why |
|---|---|---|
| Max Memories | **200** | Plenty for long campaigns, not bloated. |
| Retention | **30** days | Month of history. Increase for slow-paced RP. |
| Importance Threshold | **0.2** | Low bar — keep most things, prune only noise. |
| Merge Similar | ✅ on | Coalesces updates to same topic. |
| Merge Threshold | **0.85** | Only merge very similar entries. |
| Memory Format | **Bullet List** | Most token-efficient. Use Narrative for prose-heavy RP. |
| Auto-Score Importance | ✅ on | LLM scores memories so you don't have to. |
| Max Memory Tokens | **150** | Tight per-memory budget. |

## Context Injection
| Setting | Value | Why |
|---|---|---|
| Enable Injection | ✅ on | Core feature — inject memories into LLM context. |
| Inject Position | **After System Prompt** | LLM sees character card first, then memories as context. |
| Max Injected Memories | **8** | 8 most relevant memories. Enough context, not flooding. |
| Injection Token Budget | **800** | Generous but bounded. |
| Sort By | **Relevance** | Best results via vector search. Fallback: Recency. |
| Recency Decay | **0.85** | Gentle decay — recent stays relevant longer. |
| Boost Current Character | ✅ on | Prioritize memories about the current character. |

## Display
| Setting | Value | Why |
|---|---|---|
| Show Memory Panel | ✅ on | Visual memory browser. |
| Show Summarization Progress | ✅ on | See what's happening. |
| Memory Badge Count | ✅ on | Quick glance at memory count. |
| Panel Position | **Right** | Standard ST extension layout. |
| Confirm Before Auto-Summary | off | No interruptions. Enable if you want manual control. |
| Notify On New Memory | ✅ on | Toast when memories are created. |
| Theme | **Auto** | Follows ST dark/light mode. |
| Panel Refresh | **15000** ms | Refresh memory list every 15s. |

## Connections
| Setting | Value | Why |
|---|---|---|
| ST API Base | *leave empty* | Auto-detect from SillyTavern. |
| External Summarizer Endpoint | *leave empty* | Uses current chat model unless you need dedicated summarizer. |
| Connection Timeout | **15000** ms | 15s timeout — reasonable for local & cloud APIs. |
| Test Connection On Startup | ✅ on | Validate endpoints on load. |

## Advanced
| Setting | Value | Why |
|---|---|---|
| Debug Mode | off | Enable only when troubleshooting. |
| Chunk Overlap | **20** tokens | Small overlap between summary chunks for continuity. |
| Retry On Failure | ✅ on | Auto-retry if summarization fails. |
| Max Retries | **2** | Two retries then skip. |
| Cooldown | **30** seconds | No rapid-fire summarizations. |
| Batch Size | **25** messages | Process 25 messages per chunk. |
| Pre-Summarize Chunking | ✅ on | Split long convos before summarizing. |
| Chunk Token Size | **1500** | Chunk size for pre-summarization. |

## RAG (Vector Memory)
| Setting | Value | Why |
|---|---|---|
| Enable RAG | off | Enable only when Qdrant + embedding are set up. |
| Vector Database | **Qdrant** | Fast, self-hosted, free. |
| Qdrant URL | `http://localhost:6333` | Default local Qdrant. |
| Collection Name | `mems_memories` | Default collection. |
| Vector Dimension | **768** | Matches Ollama nomic-embed-text / qwen3-embedding. |
| Embedding Provider | **Ollama** | Free, local, fast. |
| Ollama Endpoint | `http://localhost:11434` | Default Ollama. |
| Embedding Model | `nomic-embed-text` | Lightweight, good quality. |
| Similarity Threshold | **0.65** | Retrieve only meaningfully similar memories. |
| Top-K | **8** | 8 most similar results. |
| Hybrid Search | ✅ on | Vector + keyword for best results. |
| Keyword Weight | **0.3** | 70% vector, 30% keyword. |
| Auto-Index On Summarize | ✅ on | Index memories as they're created. |
| Batch Index Size | **20** | Index 20 at a time. |
| Embedding Timeout | **10000** ms | 10s timeout for embedding API. |
| Retry On Embedding Failure | ✅ on | Auto-retry on embedding error. |
| Max Embedding Retries | **2** | Two retries. |

---

**Quick Start:**
1. Load this config (copy DEFAULT_SETTINGS with values above)
2. Enable Summarization + Injection
3. Optionally set up Qdrant + Ollama for RAG
4. Chat normally — Mem's Memories handles the rest