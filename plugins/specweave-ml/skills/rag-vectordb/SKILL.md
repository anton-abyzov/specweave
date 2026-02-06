---
description: "RAG (Retrieval Augmented Generation) & Vector Database expert. Covers document loading, chunking strategies, embedding models, vector databases (Pinecone, Weaviate, Qdrant, ChromaDB, pgvector, Milvus), retrieval strategies, query transformation, RAGAS evaluation, multi-modal RAG, and production deployment patterns."
model: opus
context: fork
---

# RAG & Vector Database Systems

Expert guidance for building production-grade Retrieval Augmented Generation systems. Covers the full RAG pipeline from document ingestion through retrieval, generation, and evaluation.

## RAG Architecture Patterns

### Naive RAG

The simplest RAG pattern: embed query, retrieve top-k chunks, stuff into prompt.

```python
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough

# Setup
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
vectorstore = Chroma(persist_directory="./chroma_db", embedding_function=embeddings)
retriever = vectorstore.as_retriever(search_kwargs={"k": 4})

prompt = ChatPromptTemplate.from_messages([
    ("system", """Answer the question using ONLY the provided context.
If the context doesn't contain the answer, say "I don't have enough information."

Context:
{context}"""),
    ("human", "{question}"),
])

def format_docs(docs):
    return "\n\n---\n\n".join(
        f"Source: {doc.metadata.get('source', 'unknown')}\n{doc.page_content}"
        for doc in docs
    )

chain = (
    {"context": retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | ChatOpenAI(model="gpt-4o", temperature=0)
    | StrOutputParser()
)

answer = chain.invoke("What is the refund policy?")
```

### Advanced RAG

Adds pre-retrieval query enhancement and post-retrieval reranking.

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain_cohere import CohereRerank
from langchain.retrievers.multi_query import MultiQueryRetriever

# Step 1: Multi-query retrieval (generate query variations)
multi_query_retriever = MultiQueryRetriever.from_llm(
    retriever=vectorstore.as_retriever(search_kwargs={"k": 10}),
    llm=ChatOpenAI(model="gpt-4o-mini", temperature=0.3),
)

# Step 2: Reranking with Cohere
reranker = CohereRerank(model="rerank-v3.5", top_n=5)
compression_retriever = ContextualCompressionRetriever(
    base_compressor=reranker,
    base_retriever=multi_query_retriever,
)

# Use in chain
advanced_chain = (
    {"context": compression_retriever | format_docs, "question": RunnablePassthrough()}
    | prompt
    | ChatOpenAI(model="gpt-4o", temperature=0)
    | StrOutputParser()
)
```

### Hybrid RAG (Dense + Sparse)

Combines semantic similarity with keyword matching for better recall.

```python
from langchain_community.retrievers import BM25Retriever
from langchain.retrievers import EnsembleRetriever

# Dense retriever (semantic)
dense_retriever = vectorstore.as_retriever(search_kwargs={"k": 10})

# Sparse retriever (keyword/BM25)
bm25_retriever = BM25Retriever.from_documents(documents, k=10)

# Ensemble with reciprocal rank fusion
hybrid_retriever = EnsembleRetriever(
    retrievers=[dense_retriever, bm25_retriever],
    weights=[0.6, 0.4],  # Favor semantic but include keyword matches
)
```

## Document Loading

### Multi-Format Loading

```python
from langchain_community.document_loaders import (
    PyPDFLoader,
    UnstructuredHTMLLoader,
    CSVLoader,
    JSONLoader,
    TextLoader,
    DirectoryLoader,
    WebBaseLoader,
    RecursiveUrlLoader,
)

# PDF with page-level splitting
pdf_loader = PyPDFLoader("report.pdf")
pdf_docs = pdf_loader.load()  # Each page = one document

# Web scraping
web_loader = WebBaseLoader(
    web_paths=["https://docs.example.com/guide"],
    bs_kwargs={"parse_only": SoupStrainer(class_="main-content")},
)

# Recursive web crawling
from langchain_community.document_loaders import RecursiveUrlLoader
from bs4 import BeautifulSoup

def bs4_extractor(html: str) -> str:
    soup = BeautifulSoup(html, "html.parser")
    return soup.get_text(separator="\n", strip=True)

recursive_loader = RecursiveUrlLoader(
    url="https://docs.example.com/",
    max_depth=3,
    extractor=bs4_extractor,
)

# Directory loading with glob patterns
dir_loader = DirectoryLoader(
    "./documents/",
    glob="**/*.md",
    loader_cls=TextLoader,
    show_progress=True,
)

# JSON with jq-like extraction
json_loader = JSONLoader(
    file_path="data.json",
    jq_schema=".records[].content",
    text_content=False,
)

# CSV with specific columns
csv_loader = CSVLoader(
    "data.csv",
    source_column="url",
    csv_args={"delimiter": ","},
)
```

### Database Loading

```python
from langchain_community.document_loaders import SQLDatabaseLoader
from langchain_community.utilities import SQLDatabase

db = SQLDatabase.from_uri("postgresql://user:pass@localhost:5432/mydb")

loader = SQLDatabaseLoader(
    query="SELECT title, content, updated_at FROM articles WHERE published = true",
    db=db,
    source_columns=["title"],
    metadata_columns=["updated_at"],
)
docs = loader.load()
```

## Chunking Strategies

### Fixed-Size Chunking

```python
from langchain_text_splitters import (
    RecursiveCharacterTextSplitter,
    CharacterTextSplitter,
    TokenTextSplitter,
)

# Recursive (recommended default): tries to split on natural boundaries
recursive_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n\n", "\n", ". ", " ", ""],
    length_function=len,
)

# Token-based (precise token counts for LLM context windows)
token_splitter = TokenTextSplitter(
    chunk_size=500,
    chunk_overlap=50,
    encoding_name="cl100k_base",  # OpenAI tokenizer
)
```

### Semantic Chunking

Splits based on meaning changes rather than fixed sizes.

```python
from langchain_experimental.text_splitter import SemanticChunker
from langchain_openai import OpenAIEmbeddings

semantic_splitter = SemanticChunker(
    OpenAIEmbeddings(model="text-embedding-3-small"),
    breakpoint_threshold_type="percentile",
    breakpoint_threshold_amount=95,
)

chunks = semantic_splitter.split_documents(documents)
```

### Document-Structure-Aware Chunking

```python
from langchain_text_splitters import (
    MarkdownHeaderTextSplitter,
    HTMLHeaderTextSplitter,
)

# Markdown: preserves header hierarchy in metadata
md_splitter = MarkdownHeaderTextSplitter(
    headers_to_split_on=[
        ("#", "h1"),
        ("##", "h2"),
        ("###", "h3"),
    ]
)
md_chunks = md_splitter.split_text(markdown_text)
# Each chunk has metadata: {"h1": "Introduction", "h2": "Overview"}

# HTML: similar structure-aware splitting
html_splitter = HTMLHeaderTextSplitter(
    headers_to_split_on=[
        ("h1", "Header 1"),
        ("h2", "Header 2"),
    ]
)

# Code-aware splitting
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter

python_splitter = RecursiveCharacterTextSplitter.from_language(
    language=Language.PYTHON,
    chunk_size=1000,
    chunk_overlap=100,
)
```

### Chunking Decision Framework

| Content Type | Strategy | Chunk Size | Overlap |
|-------------|----------|------------|---------|
| General text | Recursive character | 800-1200 | 150-200 |
| Technical docs | Markdown header | By section | 0 (section-based) |
| Code | Language-aware | 500-1000 | 50-100 |
| Legal/medical | Semantic | Dynamic | N/A |
| Chat logs | Fixed by turn | 1 message | Include previous turn |
| Tables/CSV | Row-based | 20-50 rows | 2-5 rows |

## Embedding Models

### Model Comparison and Selection

```python
from langchain_openai import OpenAIEmbeddings
from langchain_cohere import CohereEmbeddings
from langchain_huggingface import HuggingFaceEmbeddings

# OpenAI (best general-purpose, hosted)
openai_embeddings = OpenAIEmbeddings(
    model="text-embedding-3-large",  # 3072 dims, best quality
    dimensions=1536,  # Optional: reduce dimensions to save storage
)

# Cohere (strong multilingual support)
cohere_embeddings = CohereEmbeddings(
    model="embed-v4.0",
    input_type="search_document",  # "search_query" for queries
)

# Local / sentence-transformers (free, private)
local_embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-large-en-v1.5",
    model_kwargs={"device": "cuda"},
    encode_kwargs={"normalize_embeddings": True, "batch_size": 64},
)
```

### Embedding Selection Decision Framework

| Criterion | OpenAI text-embedding-3 | Cohere embed-v4 | BGE-large (local) |
|-----------|------------------------|------------------|-------------------|
| Quality | Excellent | Excellent | Very good |
| Speed | Fast (API) | Fast (API) | Depends on hardware |
| Privacy | Data sent to API | Data sent to API | Fully private |
| Cost | ~$0.13/1M tokens | ~$0.10/1M tokens | Hardware only |
| Multilingual | Good | Excellent | Model-dependent |
| Dimensions | 256-3072 | 1024 | 1024 |

## Vector Databases

### Pinecone

```python
from langchain_pinecone import PineconeVectorStore
from pinecone import Pinecone, ServerlessSpec

# Initialize
pc = Pinecone(api_key="...")
pc.create_index(
    name="my-index",
    dimension=1536,
    metric="cosine",
    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
)

vectorstore = PineconeVectorStore.from_documents(
    documents=chunks,
    embedding=embeddings,
    index_name="my-index",
    namespace="production",
)

# Metadata filtering
retriever = vectorstore.as_retriever(
    search_kwargs={
        "k": 5,
        "filter": {"category": "technical", "year": {"$gte": 2024}},
    }
)
```

### Qdrant

```python
from langchain_qdrant import QdrantVectorStore
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams

client = QdrantClient(url="http://localhost:6333")
client.create_collection(
    collection_name="documents",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
)

vectorstore = QdrantVectorStore.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name="documents",
    url="http://localhost:6333",
)

# Advanced filtering
from qdrant_client.models import Filter, FieldCondition, MatchValue, Range

retriever = vectorstore.as_retriever(
    search_kwargs={
        "k": 5,
        "filter": Filter(
            must=[
                FieldCondition(key="metadata.source", match=MatchValue(value="docs")),
                FieldCondition(key="metadata.date", range=Range(gte="2024-01-01")),
            ]
        ),
    }
)
```

### pgvector (PostgreSQL)

```python
from langchain_postgres import PGVector

connection_string = "postgresql+psycopg://user:pass@localhost:5432/vectordb"

vectorstore = PGVector.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name="my_collection",
    connection=connection_string,
    use_jsonb=True,
)

# Benefits: uses existing PostgreSQL infrastructure,
# ACID transactions, joins with relational data
```

### ChromaDB (Local Development)

```python
from langchain_chroma import Chroma

# Ephemeral (in-memory)
vectorstore = Chroma.from_documents(documents=chunks, embedding=embeddings)

# Persistent (local storage)
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=embeddings,
    persist_directory="./chroma_db",
    collection_name="my_docs",
    collection_metadata={"hnsw:space": "cosine"},
)
```

### Vector DB Selection Decision Framework

| DB | Best For | Hosting | Filtering | Scale |
|----|----------|---------|-----------|-------|
| Pinecone | Managed production | Cloud-only | Metadata | Billions |
| Qdrant | Self-hosted + cloud | Both | Rich payload | Millions-Billions |
| pgvector | Existing PostgreSQL | Self-hosted | SQL | Millions |
| ChromaDB | Development/prototyping | Local | Basic | Thousands-Millions |
| Weaviate | Hybrid search + modules | Both | GraphQL-like | Millions-Billions |
| Milvus | High-performance at scale | Both | Expression | Billions+ |

## Retrieval Strategies

### Maximum Marginal Relevance (MMR)

Balances relevance with diversity to avoid redundant results.

```python
retriever = vectorstore.as_retriever(
    search_type="mmr",
    search_kwargs={
        "k": 5,
        "fetch_k": 20,  # Fetch 20, then select 5 diverse results
        "lambda_mult": 0.7,  # 0 = max diversity, 1 = max relevance
    },
)
```

### Reranking

```python
from langchain.retrievers import ContextualCompressionRetriever
from langchain_cohere import CohereRerank

# Cohere reranker (production-grade)
reranker = CohereRerank(model="rerank-v3.5", top_n=5)

reranking_retriever = ContextualCompressionRetriever(
    base_compressor=reranker,
    base_retriever=vectorstore.as_retriever(search_kwargs={"k": 20}),
)

# Cross-encoder reranker (local, no API needed)
from langchain_community.cross_encoders import HuggingFaceCrossEncoder
from langchain.retrievers.document_compressors import CrossEncoderReranker

cross_encoder = HuggingFaceCrossEncoder(model_name="cross-encoder/ms-marco-MiniLM-L-6-v2")
compressor = CrossEncoderReranker(model=cross_encoder, top_n=5)

local_reranking_retriever = ContextualCompressionRetriever(
    base_compressor=compressor,
    base_retriever=vectorstore.as_retriever(search_kwargs={"k": 20}),
)
```

### Self-Query Retrieval

Automatically extracts metadata filters from natural language queries.

```python
from langchain.retrievers.self_query.base import SelfQueryRetriever
from langchain.chains.query_constructor.base import AttributeInfo

metadata_field_info = [
    AttributeInfo(name="category", description="Document category", type="string"),
    AttributeInfo(name="year", description="Publication year", type="integer"),
    AttributeInfo(name="author", description="Document author", type="string"),
]

self_query_retriever = SelfQueryRetriever.from_llm(
    llm=ChatOpenAI(model="gpt-4o-mini", temperature=0),
    vectorstore=vectorstore,
    document_contents="Technical documentation about software engineering",
    metadata_field_info=metadata_field_info,
)

# "Show me articles by John from 2024" automatically becomes:
# filter={"author": "John", "year": 2024} + semantic search
```

## Query Transformation

### HyDE (Hypothetical Document Embeddings)

Generate a hypothetical answer, embed that instead of the query.

```python
from langchain.chains import HypotheticalDocumentEmbedder
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

hyde_embeddings = HypotheticalDocumentEmbedder.from_llm(
    llm=ChatOpenAI(model="gpt-4o-mini", temperature=0.5),
    base_embeddings=OpenAIEmbeddings(model="text-embedding-3-small"),
    prompt_key="web_search",  # Or custom prompt template
)

# Use HyDE embeddings in your vectorstore
vectorstore = Chroma(embedding_function=hyde_embeddings)
```

### Multi-Query Retrieval

```python
from langchain.retrievers.multi_query import MultiQueryRetriever

multi_retriever = MultiQueryRetriever.from_llm(
    retriever=vectorstore.as_retriever(search_kwargs={"k": 5}),
    llm=ChatOpenAI(model="gpt-4o-mini", temperature=0.3),
)

# Automatically generates 3 query variations and deduplicates results
docs = multi_retriever.invoke("How does authentication work?")
# Generated queries might be:
# 1. "What is the authentication mechanism?"
# 2. "How do users log in and verify identity?"
# 3. "What security protocols handle user authentication?"
```

### Step-Back Prompting

Ask a more general question first to get broader context.

```python
from langchain_core.prompts import ChatPromptTemplate

step_back_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert at generating broader, more general questions."),
    ("human", "Given the specific question: {question}\n\nGenerate a step-back question that is more general and would help answer the original."),
])

step_back_chain = step_back_prompt | llm | StrOutputParser()

# Use both original and step-back results
original_docs = retriever.invoke(question)
step_back_q = step_back_chain.invoke({"question": question})
step_back_docs = retriever.invoke(step_back_q)

all_docs = original_docs + step_back_docs
```

## Evaluation with RAGAS

```python
from ragas import evaluate
from ragas.metrics import (
    faithfulness,
    answer_relevancy,
    context_precision,
    context_recall,
)
from datasets import Dataset

# Prepare evaluation dataset
eval_data = {
    "question": ["What is the refund policy?", "How do I reset my password?"],
    "answer": ["Refunds within 30 days...", "Go to settings and click..."],
    "contexts": [
        ["Policy doc: Refunds are available within 30 days of purchase..."],
        ["Help doc: To reset your password, navigate to Settings > Security..."],
    ],
    "ground_truth": ["Full refund within 30 days", "Settings > Security > Reset Password"],
}

dataset = Dataset.from_dict(eval_data)

result = evaluate(
    dataset=dataset,
    metrics=[faithfulness, answer_relevancy, context_precision, context_recall],
)

print(result)
# {'faithfulness': 0.92, 'answer_relevancy': 0.88,
#  'context_precision': 0.85, 'context_recall': 0.90}
```

### Metrics Explained

| Metric | Measures | Good Score |
|--------|----------|------------|
| Faithfulness | Is the answer grounded in retrieved context? | > 0.85 |
| Answer Relevancy | Does the answer address the question? | > 0.80 |
| Context Precision | Are retrieved docs relevant to the question? | > 0.75 |
| Context Recall | Did we retrieve all needed information? | > 0.80 |

## Production Patterns

### Incremental Indexing

```python
import hashlib
from datetime import datetime

def compute_doc_hash(content: str) -> str:
    return hashlib.sha256(content.encode()).hexdigest()

def incremental_index(new_docs, vectorstore, metadata_store):
    """Only index new or modified documents."""
    to_add = []
    to_delete = []

    for doc in new_docs:
        doc_hash = compute_doc_hash(doc.page_content)
        existing = metadata_store.get(doc.metadata["source"])

        if existing is None:
            # New document
            doc.metadata["content_hash"] = doc_hash
            doc.metadata["indexed_at"] = datetime.utcnow().isoformat()
            to_add.append(doc)
        elif existing["content_hash"] != doc_hash:
            # Modified document
            to_delete.append(existing["vector_id"])
            doc.metadata["content_hash"] = doc_hash
            doc.metadata["indexed_at"] = datetime.utcnow().isoformat()
            to_add.append(doc)
        # Unchanged documents are skipped

    if to_delete:
        vectorstore.delete(ids=to_delete)
    if to_add:
        ids = vectorstore.add_documents(to_add)
        for doc, vid in zip(to_add, ids):
            metadata_store.upsert(doc.metadata["source"], {
                "vector_id": vid,
                "content_hash": doc.metadata["content_hash"],
            })

    return {"added": len(to_add), "deleted": len(to_delete)}
```

### Embedding Cache

```python
from langchain.storage import LocalFileStore
from langchain_openai import OpenAIEmbeddings
from langchain.embeddings import CacheBackedEmbeddings

underlying = OpenAIEmbeddings(model="text-embedding-3-small")
store = LocalFileStore("./embedding_cache/")

cached_embeddings = CacheBackedEmbeddings.from_bytes_store(
    underlying_embeddings=underlying,
    document_embedding_cache=store,
    namespace=underlying.model,
)

# Subsequent calls with the same text skip the API
vectorstore = Chroma.from_documents(
    documents=chunks,
    embedding=cached_embeddings,
)
```

### Multi-Modal RAG

```python
from langchain_community.document_loaders import UnstructuredPDFLoader

# Extract text, tables, and images from PDF
loader = UnstructuredPDFLoader(
    "report.pdf",
    mode="elements",
    strategy="hi_res",
    extract_images_in_pdf=True,
)
elements = loader.load()

# Separate by element type
texts = [e for e in elements if e.metadata.get("category") == "NarrativeText"]
tables = [e for e in elements if e.metadata.get("category") == "Table"]
images = [e for e in elements if e.metadata.get("category") == "Image"]

# Summarize tables and images for embedding
table_summaries = []
for table in tables:
    summary = llm.invoke(f"Summarize this table:\n{table.page_content}")
    table_summaries.append(Document(
        page_content=summary.content,
        metadata={**table.metadata, "original": table.page_content, "type": "table"},
    ))

# Index all element types together
all_docs = texts + table_summaries
vectorstore = Chroma.from_documents(all_docs, embedding=embeddings)
```

## RAG Pipeline Decision Framework

| Question | If Yes | If No |
|----------|--------|-------|
| Data changes frequently? | Incremental indexing | One-time batch index |
| Need precise keyword match? | Hybrid (dense + BM25) | Dense only |
| Results seem redundant? | MMR retrieval | Standard similarity |
| Quality not good enough? | Add reranking step | Check chunking first |
| Users ask complex questions? | Multi-query + step-back | Direct retrieval |
| Need metadata filtering? | Self-query or explicit filters | Standard semantic |
| Budget constrained? | Local embeddings + ChromaDB | Hosted solutions |
| Millions of documents? | Pinecone/Qdrant/Milvus | pgvector/ChromaDB |
