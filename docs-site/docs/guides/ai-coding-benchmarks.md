# AI Coding Benchmarks: Which Models Actually Deliver?

**A data-driven comparison of coding models, with decontaminated benchmarks that reveal the real gaps**

---

:::info Last updated
February 2026. Benchmark data sourced from [SWE-rebench](https://swe-rebench.com/), [SWE-bench Verified](https://www.swebench.com/), [Aider Polyglot](https://aider.chat/docs/leaderboards/), and [LiveCodeBench](https://livecodebench.github.io/).
:::

## Why This Matters

If you're building software with AI assistance, the model you choose determines your productivity ceiling. But most benchmark leaderboards are misleading — models can be trained on the exact test questions, inflating scores by 10-20 percentage points.

This page cuts through the noise with **decontaminated benchmarks** that test models on problems they've never seen during training.

---

## The Contamination Problem

Traditional benchmarks like SWE-bench Verified use a fixed set of 500 GitHub issues, most created before late 2023. Since these problems predate most model training cutoffs, labs can (and do) train specifically on these tasks — a practice called **benchmark overfitting**.

The result: a model that scores 80% on SWE-bench Verified might only solve 40% of fresh, unseen problems of the same difficulty.

**Example**: MiniMax M2.5 scored **80.2%** on SWE-bench Verified — nearly matching Claude Opus 4.6's **80.8%**. On SWE-rebench with fresh problems? MiniMax dropped to **39.6%** while Opus 4.6 hit **51.7%**. A **12-point gap** completely invisible on the old benchmark.

---

## SWE-rebench (Decontaminated)

Created by [Nebius AI](https://nebius.com/blog/posts/introducing-swe-rebench), SWE-rebench fixes the contamination problem by continuously mining fresh GitHub tasks and tracking each problem's creation date against model release dates. If a model could have seen a problem during training, that evaluation is flagged.

**Current window**: 48 problems from 43 repositories (January 2026)

### Top 20 Results

| Rank | Model | Resolved | Cost/Problem |
|------|-------|----------|-------------|
| 1 | **Claude Code (Opus 4.6)** | **52.9%** | $3.50 |
| 2 | **Claude Opus 4.6** | **51.7%** | $0.93 |
| 3 | GPT-5.2 (xhigh) | 51.7% | $1.28 |
| 4 | GPT-5.2 (medium) | 51.0% | $0.76 |
| 5 | GPT-5.1 Codex Max | 48.5% | $0.73 |
| 6 | Claude Sonnet 4.5 | 47.1% | $0.94 |
| 7 | Gemini 3 Pro Preview | 46.7% | $0.59 |
| 8 | Gemini 3 Flash Preview | 46.7% | $0.32 |
| 9 | GPT-5.2 Codex | 45.0% | $0.46 |
| 10 | Codex | 44.0% | $0.29 |
| 11 | Claude Opus 4.5 | 43.8% | $1.19 |
| 12 | Kimi K2 Thinking | 43.8% | $0.42 |
| 13 | GPT-5.1 Codex | 42.9% | $0.64 |
| 14 | GLM-5 | 42.1% | $0.45 |
| 15 | GLM-4.7 | 41.3% | $0.27 |
| 16 | Qwen3-Coder-Next | 40.0% | $0.49 |
| 17 | MiniMax M2.5 | 39.6% | $0.09 |
| 18 | Kimi K2.5 | 37.9% | $0.18 |
| 19 | Devstral 2 (123B) | 37.5% | $0.09 |
| 20 | DeepSeek-V3.2 | 37.5% | $0.15 |

**Key insight**: The entire top 10 is Anthropic, OpenAI, and Google. Chinese models begin at rank 12.

Source: [swe-rebench.com](https://swe-rebench.com/)

---

## SWE-bench Verified (Traditional)

The original 500-problem subset, human-verified by OpenAI in August 2024. Still widely cited, but treat these numbers with healthy skepticism — contamination is a known issue.

### Top Results

| Model | Resolved |
|-------|----------|
| Claude Opus 4.5 | 80.9% |
| Claude Opus 4.6 | ~80.8% |
| MiniMax M2.5 | 80.2% |
| GPT-5.2 | ~80.0% |
| Claude Opus 4.5 + Live-SWE-agent | 79.2% |
| GPT-5.1 | 77.9% |
| Gemini 3 Pro | 76.2% |
| Claude Sonnet 4.5 | ~72% |

Notice how MiniMax M2.5 (80.2%) appears to match Claude Opus 4.6 (80.8%) on this benchmark. The SWE-rebench data above reveals the true gap: **12+ percentage points**.

Source: [swebench.com](https://www.swebench.com/), [llm-stats.com](https://llm-stats.com/benchmarks/swe-bench-verified)

---

## Aider Polyglot (Multi-Language Coding)

[Aider's Polyglot benchmark](https://aider.chat/docs/leaderboards/) tests models on 225 Exercism exercises across **C++, Go, Java, JavaScript, Python, and Rust**. This measures real code-editing ability across multiple languages — not just Python.

### Top Results

| Model | Score | Cost |
|-------|-------|------|
| GPT-5 (high) | 88.0% | $29.08 |
| GPT-5 (medium) | 86.7% | $17.69 |
| o3-pro (high) | 84.9% | $146.32 |
| Gemini 2.5 Pro (32k think) | 83.1% | $49.88 |
| GPT-5 (low) | 81.3% | $10.37 |
| o3 (high) | 81.3% | $21.23 |
| Grok 4 (high) | 79.6% | $59.62 |
| Gemini 2.5 Pro (default think) | 79.1% | $45.60 |

Source: [aider.chat/docs/leaderboards](https://aider.chat/docs/leaderboards/)

---

## LiveCodeBench (Competitive Programming)

[LiveCodeBench](https://livecodebench.github.io/) tests algorithmic and competitive programming with contamination-free problems. This measures raw problem-solving ability.

### Top Results

| Model | Elo / Score |
|-------|-------------|
| Gemini 3 Pro | 2,439 |
| GPT-5.2 | 2,243 |
| Kimi K2 Thinking | 83.1% |
| Gemini 3 Pro | 79.7% |
| o3-mini | 74.1% |

Gemini 3 Pro dominates algorithmic challenges specifically, achieving a Grandmaster-tier Codeforces rating. But for real-world software engineering (multi-file edits, understanding codebases, writing production code), Claude leads.

Source: [livecodebench.github.io](https://livecodebench.github.io/)

---

## What the Numbers Actually Mean

### The Three Tiers (February 2026)

**Tier 1 — Leading** (consistently top across decontaminated benchmarks):
- **Anthropic**: Claude Opus 4.6, Claude Code, Sonnet 4.5
- **OpenAI**: GPT-5.2, GPT-5.1 Codex

**Tier 2 — Strong but behind** (competitive on some benchmarks):
- **Google**: Gemini 3 Pro/Flash (excels at algorithmic coding)

**Tier 3 — Gap is real** (scores inflated on static benchmarks):
- Chinese models: Kimi K2, GLM-5, Qwen3-Coder, MiniMax M2.5, DeepSeek

The gap between Tier 1 and Tier 3 is **10-15 percentage points** on fresh, unseen problems. This isn't marginal — it's the difference between solving half your bugs autonomously vs. a third.

### Different Strengths

| Capability | Best Model | Notes |
|-----------|-----------|-------|
| Real-world SWE (fresh problems) | Claude Code (Opus 4.6) | 52.9% SWE-rebench |
| Multi-language code editing | GPT-5 (high) | 88.0% Aider Polyglot |
| Algorithmic/competitive | Gemini 3 Pro | Grandmaster Codeforces Elo |
| Cost efficiency | Codex / Gemini Flash | $0.29-$0.32 per problem |
| Autonomous operation | Claude Code | 30+ hour sessions, agentic workflows |

---

## What This Means for SpecWeave Users

SpecWeave defaults to **Claude Opus 4.6** as the primary model for planning, architecture, and complex implementation — the #1 model on the most rigorous decontaminated benchmark (SWE-rebench).

For routine tasks, **Haiku 4.5** provides excellent cost efficiency. **Sonnet 4.5** balances capability and speed for standard implementation work.

### Non-Claude Support

SpecWeave's increment-based workflow (specs, plans, tasks) works with any Claude Code-compatible model. The structured approach — where specs define what to build and tasks break it into steps — helps any model perform better by reducing ambiguity. But the quality ceiling is highest with the models that genuinely understand complex codebases, and the benchmarks consistently show which those are.

---

## Our Take

We use Claude Code with Opus 4.6 daily to build SpecWeave itself. The gap between top-tier and mid-tier models is immediately obvious in practice: better architectural decisions, fewer hallucinated APIs, more reliable multi-file edits.

Benchmark numbers confirm what daily use already shows — **work with the best models available**. The cost difference between a $0.09/problem model and a $3.50/problem model disappears when the cheaper one needs three retries and manual cleanup.

---

## Further Reading

- [SWE-rebench Leaderboard](https://swe-rebench.com/) — Decontaminated, continuously updated
- [SWE-rebench Paper](https://arxiv.org/abs/2505.20411) — Full methodology
- [Nebius Blog: Introducing SWE-rebench](https://nebius.com/blog/posts/introducing-swe-rebench)
- [SWE-bench Verified](https://www.swebench.com/) — Traditional benchmark (use with caution)
- [Aider Polyglot Leaderboard](https://aider.chat/docs/leaderboards/) — Multi-language coding
- [LiveCodeBench](https://livecodebench.github.io/) — Competitive programming
- [SpecWeave Model Selection Guide](/docs/guides/model-selection) — How SpecWeave routes to the right model
