---
id: ml-ai-category
title: ML/AI & Machine Learning
sidebar_label: ML/AI
---

# ML/AI & Machine Learning

Understanding machine learning, artificial intelligence, and LLM-powered applications.

---

## Overview

ML/AI terms cover machine learning models, training, inference, and AI-powered application development. These concepts enable teams to integrate intelligent features, from simple predictions to complex LLM-powered assistants. SpecWeave itself is an AI-native framework designed to work seamlessly with Claude Code and other AI tools.

## Core Concepts

### Machine Learning Fundamentals

**Machine Learning**
- Systems that learn from data without explicit programming
- Types: Supervised, Unsupervised, Reinforcement Learning
- Use cases: recommendations, fraud detection, image recognition
- When to use: pattern recognition, large datasets, predictive tasks

**[Model Training](/docs/glossary/terms/model-training)**
- Process of teaching a model using data
- Steps: data collection, preprocessing, training, validation
- Metrics: accuracy, precision, recall, F1 score
- Tools: TensorFlow, PyTorch, scikit-learn

**[Inference](/docs/glossary/terms/inference)**
- Using a trained model to make predictions
- Real-time: API endpoint (fast, expensive)
- Batch: Process large datasets (slow, cheap)
- Edge: On-device inference (privacy, no network)

### Large Language Models (LLMs)

**[LLM (Large Language Model)](/docs/glossary/terms/llm)**
- AI models trained on massive text datasets
- Examples: GPT-4, Claude, Gemini, Llama
- Capabilities: text generation, code, reasoning, translation
- SpecWeave is LLM-native (designed for Claude Code)

**[Prompt Engineering](/docs/glossary/terms/prompt-engineering)**
- Crafting effective prompts for LLMs
- Techniques: few-shot learning, chain-of-thought, system prompts
- SpecWeave uses: structured prompts in skills, agents, commands
- Best practices: clear instructions, examples, constraints

**[Context Window](/docs/glossary/terms/context-window)**
- Maximum tokens an LLM can process
- Claude Sonnet 4.5: 200K tokens
- SpecWeave optimization: 75%+ reduction via plugins
- Trade-off: context size vs cost/speed

**[Token](/docs/glossary/terms/token)**
- Basic unit of LLM processing
- Roughly: 1 token ≈ 4 characters or 0.75 words
- Cost: charged per input/output token
- SpecWeave tracks: token usage per increment

### AI Frameworks

**[TensorFlow](/docs/glossary/terms/tensorflow)**
- Open-source ML framework by Google
- Best for: production ML, complex models
- Deployment: TensorFlow Serving, TFLite (mobile)
- When to use: enterprise ML, need for scale

**[PyTorch](/docs/glossary/terms/pytorch)**
- Open-source ML framework by Meta
- Best for: research, experimentation, flexibility
- More Pythonic, dynamic computation graphs
- When to use: research, prototyping, NLP

**[Scikit-learn](/docs/glossary/terms/scikit-learn)**
- Python ML library (classical algorithms)
- Algorithms: regression, classification, clustering
- Best for: traditional ML (not deep learning)
- When to use: simple ML tasks, need interpretability

### AI Development Patterns

**[RAG (Retrieval-Augmented Generation)](/docs/glossary/terms/rag)**
- Combine LLM with external knowledge retrieval
- Steps: Retrieve relevant docs → Generate response
- Use cases: chatbots, documentation search, Q&A
- SpecWeave uses: context loading from living docs

**[Fine-Tuning](/docs/glossary/terms/fine-tuning)**
- Adapt pre-trained model to specific task
- Requires: labeled data, training infrastructure
- Benefits: better performance on domain tasks
- Trade-offs: cost, maintenance vs prompt engineering

**[Vector Database](/docs/glossary/terms/vector-database)**
- Database optimized for similarity search
- Use cases: RAG, recommendations, semantic search
- Tools: Pinecone, Weaviate, Chroma, pgvector
- SpecWeave plugin: `specweave-vector-search` (planned)

---

## When to Use These Terms

| Term | Use When | Don't Use When |
|------|----------|----------------|
| **Machine Learning** | Pattern recognition, large datasets | Simple rules, small data, need explainability |
| **LLM** | Text generation, code, reasoning | Real-time (&lt;10ms), strict determinism |
| **Prompt Engineering** | Working with LLMs, need better outputs | Traditional programming sufficient |
| **RAG** | LLM needs external knowledge | All knowledge fits in context window |
| **Fine-Tuning** | Domain-specific tasks, have labeled data | Generic tasks, no training data |
| **TensorFlow** | Production ML, need scale | Research, prototyping |
| **PyTorch** | Research, experimentation | Production (though improving) |
| **Vector Database** | Semantic search, RAG, recommendations | Traditional keyword search sufficient |

---

## Real-World Examples

### Building an AI-Powered Customer Support Bot

**Phase 1: Simple Keyword Matching (No ML)**

```python
# ❌ Rule-based (not ML, brittle)
def get_response(message):
    message_lower = message.lower()

    if "refund" in message_lower:
        return "To request a refund, visit: example.com/refunds"
    elif "shipping" in message_lower:
        return "Shipping takes 3-5 business days."
    else:
        return "Please contact support@example.com"

# Problems:
# - Doesn't understand intent ("I want my money back" → no match)
# - No context (can't reference previous messages)
# - Hard to maintain (add rules forever)
```

**Phase 2: LLM-Powered (Basic)**

```python
# ✅ LLM-powered (understands intent)
import anthropic

client = anthropic.Anthropic(api_key="...")

def get_response(message):
    response = client.messages.create(
        model="claude-3-5-sonnet-20250929",
        max_tokens=1024,
        system="You are a helpful customer support agent for an e-commerce company. Be polite and concise.",
        messages=[
            {"role": "user", "content": message}
        ]
    )

    return response.content[0].text

# Benefits:
# ✅ Understands intent ("I want my money back" → refund help)
# ✅ Natural language (no keyword matching)
# ✅ Flexible (handles unexpected questions)

# Problems:
# ❌ No company knowledge (can't answer "What's your return policy?")
# ❌ No context (can't reference previous messages)
```

**Phase 3: RAG (Knowledge Retrieval)**

```python
# ✅ RAG: LLM + Knowledge Base
import anthropic
from embeddings import get_embedding, search_similar

# Step 1: Index company knowledge
knowledge_base = [
    "Our return policy allows returns within 30 days of purchase.",
    "Shipping is free for orders over $50.",
    "We offer refunds to the original payment method.",
    # ... 1000+ more documents
]

# Create embeddings for all documents (one-time)
embeddings = [get_embedding(doc) for doc in knowledge_base]

# Step 2: Retrieve relevant knowledge
def get_response(message):
    # Find relevant documents (semantic search)
    query_embedding = get_embedding(message)
    relevant_docs = search_similar(query_embedding, embeddings, top_k=3)

    # Build context from relevant docs
    context = "\n".join(relevant_docs)

    # Generate response with context
    response = client.messages.create(
        model="claude-3-5-sonnet-20250929",
        max_tokens=1024,
        system=f"""You are a customer support agent. Use the following knowledge to answer:

{context}

Be polite and accurate. If you don't know, say so.""",
        messages=[
            {"role": "user", "content": message}
        ]
    )

    return response.content[0].text

# Example:
# User: "What's your return policy?"
# Relevant docs: "Our return policy allows returns within 30 days..."
# Response: "You can return items within 30 days of purchase. We offer..."

# Benefits:
# ✅ Access to company knowledge
# ✅ Accurate answers (grounded in docs)
# ✅ Scales (add more docs without retraining)
```

**Phase 4: Multi-Turn Conversations**

```python
# ✅ Conversation history (stateful)
conversation_history = {}

def get_response(user_id, message):
    # Retrieve conversation history
    if user_id not in conversation_history:
        conversation_history[user_id] = []

    # Retrieve relevant knowledge (RAG)
    query_embedding = get_embedding(message)
    relevant_docs = search_similar(query_embedding, embeddings, top_k=3)
    context = "\n".join(relevant_docs)

    # Add user message to history
    conversation_history[user_id].append({
        "role": "user",
        "content": message
    })

    # Generate response with history + context
    response = client.messages.create(
        model="claude-3-5-sonnet-20250929",
        max_tokens=1024,
        system=f"""Customer support agent. Use this knowledge:

{context}""",
        messages=conversation_history[user_id] # Full history!
    )

    # Add assistant response to history
    assistant_message = response.content[0].text
    conversation_history[user_id].append({
        "role": "assistant",
        "content": assistant_message
    })

    return assistant_message

# Example conversation:
# User: "I want to return my order"
# Bot: "I can help with that. What's your order number?"
# User: "12345" ← Bot remembers previous context!
# Bot: "Order 12345 is eligible for return. I'll send you a return label."

# Benefits:
# ✅ Multi-turn conversations
# ✅ Context retention
# ✅ Natural dialogue
```

### SpecWeave ML/AI Example

```markdown
# Increment 0060: AI-Powered Code Review Assistant

## Acceptance Criteria
- **AC-US1-01**: Analyze pull requests automatically (P1)
- **AC-US1-02**: Suggest code improvements (P1)
- **AC-US1-03**: Detect security issues (P2)
- **AC-US1-04**: Generate review comments (P2)

## Architecture Decisions

**ADR-060**: Use Claude API for code analysis
- **Rationale**: Code understanding, natural language output, no training needed
- **Alternatives**: Fine-tune model (expensive), rule-based (brittle)
- **Trade-offs**: API cost vs flexibility

**ADR-061**: RAG with codebase context
- **Rationale**: LLM needs project-specific patterns, conventions
- **Alternatives**: Fine-tuning (expensive), no context (generic)
- **Trade-offs**: Indexing overhead vs quality

## Implementation Plan

**T-001**: Set up GitHub webhook
- Listen for pull request events
- Fetch diff (changed files)
- Queue for AI analysis
- Test webhook delivery

**T-002**: Implement code analysis pipeline
- Extract changed files from diff
- Retrieve relevant context (RAG):
  - Similar code patterns
  - Project conventions
  - Security policies
- Send to Claude API
- Parse response (suggestions, issues)

**T-003**: Generate review comments
- Format AI suggestions as GitHub comments
- Add inline comments on specific lines
- Include rationale + examples
- Test comment posting

**T-004**: Security issue detection
- Check OWASP patterns (SQL injection, XSS)
- Verify authentication/authorization
- Detect secrets in code
- Alert on high-severity issues

## Prompt Engineering

### System Prompt

```markdown
You are an expert code reviewer. Analyze pull requests and provide:
1. Code quality issues (complexity, duplication, naming)
2. Security vulnerabilities (OWASP Top 10)
3. Performance concerns (N+1 queries, inefficient algorithms)
4. Best practice violations (project conventions)

Project context:
- Language: TypeScript + Node.js
- Framework: Express + Prisma
- Style: ESLint + Prettier
- Patterns: See examples below

{RAG_CONTEXT}

Format:
- Issue: Brief description
- Severity: High/Medium/Low
- Location: File:Line
- Suggestion: How to fix
- Example: Code snippet

Be concise. Only report significant issues.
```

### Example AI Response

```markdown
## Code Review Summary

### High Severity Issues (2)

**1. SQL Injection Vulnerability**
- Location: `src/api/users.ts:45`
- Issue: User input directly in query
- Suggestion: Use parameterized query
- Example:
  ```typescript
  // ❌ Before (vulnerable)
  const users = await db.query(`SELECT * FROM users WHERE email = '${req.body.email}'`);

  // ✅ After (safe)
  const users = await db.users.findUnique({ where: { email: req.body.email } });
  ```

**2. Authentication Missing**
- Location: `src/api/orders.ts:78`
- Issue: No auth check before accessing user data
- Suggestion: Add authentication middleware
- Example:
  ```typescript
  // Add: app.get('/api/orders', authenticateToken, async (req, res) => {
  ```

### Medium Severity Issues (3)

**3. N+1 Query Problem**
- Location: `src/api/posts.ts:23`
- Issue: Fetching comments in loop (101 queries for 100 posts)
- Suggestion: Use Prisma `include`
- Example:
  ```typescript
  // ✅ Single query with JOIN
  const posts = await db.post.findMany({ include: { comments: true } });
  ```

... (more issues)
```

## Test Plan

**Given** PR with code changes → **When** AI analysis → **Then** suggestions posted

**Test Cases**:
- Unit: Prompt construction, response parsing (85% coverage)
- Integration: GitHub webhook, Claude API (80% coverage)
- E2E: Full PR review flow (100% critical path)

## Cost Analysis

**Token usage per PR**:
- Diff: ~2K tokens (input)
- RAG context: ~5K tokens (input)
- Response: ~3K tokens (output)
- Total: ~10K tokens/PR

**Pricing** (Claude Sonnet 4.5):
- Input: $3 / 1M tokens
- Output: $15 / 1M tokens
- Cost per PR: $0.06 (6 cents)

**Monthly cost** (100 PRs/month):
- $6/month (very affordable!)
```

---

## How SpecWeave Uses ML/AI Terms

### 1. LLM-Native Framework

SpecWeave is designed for LLM-powered development:

```
Architecture:
┌─────────────────────────────────────────────┐
│  Claude Code (LLM)                          │
│  - Skills (auto-activate based on context) │
│  - Agents (isolated expert personas)       │
│  - Commands (structured interactions)      │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  SpecWeave Framework                        │
│  - Plugin system (modular capabilities)    │
│  - Context optimization (75% reduction)    │
│  - Living docs (always up-to-date)         │
└─────────────────────────────────────────────┘
```

### 2. Context Optimization

SpecWeave reduces LLM context usage:

```
Before (monolithic):
- All 44 skills + 20 agents = 50K tokens
- Simple React app: 50K tokens consumed

After (plugin architecture):
- Core plugin: 12K tokens
- React plugin: 4K tokens
- Total: 16K tokens (68% reduction!)

Cost savings:
- Before: $0.15 per conversation
- After: $0.048 per conversation
- Savings: 68% cheaper!
```

### 3. Prompt Engineering in Skills

Skills use structured prompts:

```markdown
---
name: increment-planner
description: Plans development increments with spec generation. Activates when user says: "create increment", "plan feature", "/inc", "new increment".
---

# Increment Planner Skill

## Prompt Structure

When activated, follow this prompt:

1. Clarify requirements (ask questions)
2. Generate user stories (As a..., I want..., So that...)
3. Define acceptance criteria (AC-US1-01, AC-US1-02)
4. Estimate complexity (time, dependencies)
5. Invoke agents (PM → Architect → Tech Lead)

## Example Prompt

User: "/inc Add user authentication"

Response:
"I'll help plan the user authentication increment. Let me ask a few questions:

1. Authentication methods needed? (email/password, OAuth, SSO)
2. Security requirements? (2FA, rate limiting, session management)
3. User types? (admin, regular user, guest)

Once I understand, I'll:
- Generate spec.md (user stories + acceptance criteria)
- Create plan.md (architecture + implementation)
- Generate tasks.md (implementation tasks with tests)"
```

### 4. Agent Persona Design

Agents use role-based prompts:

```markdown
# PM Agent

You are an expert Product Manager with 10+ years of experience.

Your responsibilities:
- Clarify user requirements
- Generate user stories
- Define acceptance criteria
- Prioritize features (P1, P2, P3)

Your communication style:
- Ask clarifying questions
- Think from user perspective
- Focus on business value
- Be concise

When planning increments:
1. Understand user needs (interview user)
2. Generate user stories (BDD format)
3. Define acceptance criteria (testable)
4. Estimate value + complexity
```

### 5. ML/AI Plugin (Planned)

**specweave-ml-ops plugin** (planned):
- ML model training workflows
- Experiment tracking (MLflow)
- Model versioning
- Inference deployment
- Cost tracking (compute + tokens)

---

## Related Categories

- **[Backend Development](/docs/glossary/categories/backend-category)** - AI-powered APIs
- **[Infrastructure & Operations](/docs/glossary/categories/infrastructure-category)** - ML infrastructure
- **[Performance & Scalability](/docs/glossary/categories/performance-category)** - Model optimization

---

## Learn More

### Guides
- Building with Claude Code (coming soon)
- Prompt Engineering Best Practices (coming soon)
- RAG Applications (coming soon)

### Books
- "Designing Machine Learning Systems" by Chip Huyen
- "Deep Learning" by Ian Goodfellow
- "Hands-On Machine Learning" by Aurélien Géron
- "The Hundred-Page Machine Learning Book" by Andriy Burkov

### External Resources
- [Anthropic Claude Documentation](https://docs.anthropic.com/)
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [Hugging Face Course](https://huggingface.co/learn)
- [Fast.ai Practical Deep Learning](https://www.fast.ai/)
- [Papers with Code](https://paperswithcode.com/)

---

**Navigation**:
- [← Back to Glossary](/docs/glossary/)
- [Browse by Category](/docs/glossary/index-by-category)
- [Alphabetical Index](/docs/glossary/README)
