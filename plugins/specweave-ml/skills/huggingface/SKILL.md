---
description: "Hugging Face Ecosystem expert. Covers Transformers (AutoModel, pipeline API), Model Hub, Datasets library, Tokenizers, Accelerate for multi-GPU, PEFT adapters, Evaluate metrics, TGI serving, Spaces deployment, Hub API, Safetensors, Optimum for ONNX/quantization, and Trainer API with custom training loops. Activates for: Hugging Face, HuggingFace, Transformers, Model Hub, TGI, Text Generation Inference, Safetensors, PEFT, Accelerate, Spaces, Datasets, Tokenizers, Optimum."
model: opus
context: fork
---

# Hugging Face Ecosystem

Expert guidance for the full Hugging Face ecosystem: Transformers, Datasets, Tokenizers, Accelerate, PEFT, Evaluate, TGI, Spaces, Hub API, Safetensors, and Optimum. Covers model loading, training, evaluation, optimization, and deployment.

## Transformers Library

### AutoModel and AutoTokenizer

```python
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoConfig
import torch

# Load model and tokenizer (auto-detects architecture)
model_name = "meta-llama/Llama-3.1-8B-Instruct"

tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    torch_dtype=torch.bfloat16,
    device_map="auto",                  # Automatic device placement
    attn_implementation="flash_attention_2",  # Flash Attention for speed
)

# Inspect config without downloading weights
config = AutoConfig.from_pretrained(model_name)
print(f"Hidden size: {config.hidden_size}")
print(f"Num layers: {config.num_hidden_layers}")
print(f"Vocab size: {config.vocab_size}")
```

### AutoModel Classes by Task

| Task | Class | Example Use |
|------|-------|-------------|
| Text generation | `AutoModelForCausalLM` | GPT, Llama, Mistral |
| Fill mask | `AutoModelForMaskedLM` | BERT, RoBERTa |
| Classification | `AutoModelForSequenceClassification` | Sentiment, topic |
| Token classification | `AutoModelForTokenClassification` | NER, POS tagging |
| Question answering | `AutoModelForQuestionAnswering` | Extractive QA |
| Seq2Seq | `AutoModelForSeq2SeqLM` | T5, BART |
| Image classification | `AutoModelForImageClassification` | ViT, ResNet |
| Object detection | `AutoModelForObjectDetection` | DETR, YOLOS |
| Speech recognition | `AutoModelForSpeechSeq2Seq` | Whisper |
| Vision-language | `AutoModelForVision2Seq` | LLaVA, PaliGemma |

### Pipeline API (Quick Inference)

```python
from transformers import pipeline

# Text generation
generator = pipeline(
    "text-generation",
    model="meta-llama/Llama-3.1-8B-Instruct",
    torch_dtype=torch.bfloat16,
    device_map="auto",
)

messages = [
    {"role": "system", "content": "You are a helpful coding assistant."},
    {"role": "user", "content": "Write a Python function to calculate fibonacci numbers."},
]

output = generator(
    messages,
    max_new_tokens=512,
    temperature=0.7,
    do_sample=True,
    top_p=0.9,
)
print(output[0]["generated_text"][-1]["content"])

# Sentiment analysis
classifier = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")
result = classifier("This product is amazing!")
# [{'label': 'POSITIVE', 'score': 0.9998}]

# Named entity recognition
ner = pipeline("ner", model="dslim/bert-base-NER", aggregation_strategy="simple")
entities = ner("Apple Inc. is headquartered in Cupertino, California.")
# [{'entity_group': 'ORG', 'word': 'Apple Inc.', 'score': 0.99},
#  {'entity_group': 'LOC', 'word': 'Cupertino, California', 'score': 0.98}]

# Zero-shot classification (no fine-tuning needed)
zero_shot = pipeline("zero-shot-classification", model="facebook/bart-large-mnli")
result = zero_shot(
    "I need to return this broken laptop",
    candidate_labels=["refund", "technical support", "billing", "shipping"],
)
# {'labels': ['refund', 'shipping', ...], 'scores': [0.82, 0.09, ...]}

# Image classification
img_classifier = pipeline("image-classification", model="google/vit-base-patch16-224")
result = img_classifier("photo.jpg")

# Speech-to-text
transcriber = pipeline("automatic-speech-recognition", model="openai/whisper-large-v3")
result = transcriber("audio.mp3", return_timestamps=True)
```

### Generation Configuration

```python
from transformers import GenerationConfig

gen_config = GenerationConfig(
    max_new_tokens=512,
    temperature=0.7,
    top_p=0.9,
    top_k=50,
    repetition_penalty=1.1,
    do_sample=True,
    num_beams=1,                       # 1 = greedy/sampling, >1 = beam search
    early_stopping=True,
    pad_token_id=tokenizer.pad_token_id,
    eos_token_id=tokenizer.eos_token_id,
)

# Apply chat template and generate
inputs = tokenizer.apply_chat_template(
    messages,
    return_tensors="pt",
    add_generation_prompt=True,
).to(model.device)

outputs = model.generate(inputs, generation_config=gen_config)
response = tokenizer.decode(outputs[0][inputs.shape[1]:], skip_special_tokens=True)
```

## Model Hub

### Finding Models

```python
from huggingface_hub import HfApi

api = HfApi()

# Search models by task and library
models = api.list_models(
    filter="text-generation",
    library="transformers",
    sort="downloads",
    direction=-1,
    limit=10,
)

for model in models:
    print(f"{model.id}: {model.downloads:,} downloads")

# Search by specific criteria
models = api.list_models(
    search="llama 8b instruct",
    sort="likes",
    direction=-1,
)
```

### Uploading Models

```python
from huggingface_hub import HfApi, create_repo

api = HfApi()

# Create repository
create_repo("my-org/my-model", private=True, repo_type="model")

# Upload entire directory
api.upload_folder(
    folder_path="./my-model",
    repo_id="my-org/my-model",
    commit_message="Upload fine-tuned model",
    ignore_patterns=["*.pyc", "__pycache__", "*.log"],
)

# Or use the model's save method
model.push_to_hub("my-org/my-model", private=True)
tokenizer.push_to_hub("my-org/my-model")
```

## Datasets Library

### Loading Datasets

```python
from datasets import load_dataset, DatasetDict, Dataset

# From Hub
dataset = load_dataset("squad")
dataset = load_dataset("imdb", split="train")
dataset = load_dataset("json", data_files="data.jsonl")
dataset = load_dataset("csv", data_files={"train": "train.csv", "test": "test.csv"})

# Streaming (for large datasets, no download required)
dataset = load_dataset("allenai/c4", "en", split="train", streaming=True)
for example in dataset.take(10):
    print(example["text"][:100])

# From pandas
import pandas as pd
df = pd.read_csv("data.csv")
dataset = Dataset.from_pandas(df)

# From dict
dataset = Dataset.from_dict({
    "text": ["Hello world", "How are you"],
    "label": [0, 1],
})
```

### Processing Datasets

```python
# Map (apply function to each example)
def tokenize_function(examples):
    return tokenizer(
        examples["text"],
        padding="max_length",
        truncation=True,
        max_length=512,
    )

tokenized = dataset.map(
    tokenize_function,
    batched=True,           # Process in batches for speed
    batch_size=1000,
    num_proc=4,             # Parallel processing
    remove_columns=["text"],
)

# Filter
filtered = dataset.filter(lambda x: len(x["text"]) > 100)
filtered = dataset.filter(lambda x: x["label"] in [0, 1], num_proc=4)

# Select/shuffle/split
shuffled = dataset.shuffle(seed=42)
subset = dataset.select(range(1000))
split = dataset.train_test_split(test_size=0.1, seed=42)

# Sort
sorted_ds = dataset.sort("length", reverse=True)

# Rename and remove columns
dataset = dataset.rename_column("old_name", "new_name")
dataset = dataset.remove_columns(["unnecessary_col1", "unnecessary_col2"])

# Add new column
dataset = dataset.add_column("idx", list(range(len(dataset))))
```

### Creating Custom Datasets

```python
from datasets import DatasetDict, Dataset, Features, Value, ClassLabel

# Define schema
features = Features({
    "text": Value("string"),
    "label": ClassLabel(names=["negative", "neutral", "positive"]),
    "score": Value("float32"),
})

# Create with schema
dataset = Dataset.from_dict(
    {"text": ["great!", "ok", "terrible"], "label": [2, 1, 0], "score": [0.95, 0.5, 0.1]},
    features=features,
)

# Upload to Hub
dataset.push_to_hub("my-org/my-dataset", private=True)
```

## Tokenizers

### Using Tokenizers

```python
from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B-Instruct")

# Basic tokenization
tokens = tokenizer("Hello, world!")
print(tokens)
# {'input_ids': [128000, 9906, 11, 1917, 0], 'attention_mask': [1, 1, 1, 1, 1]}

# Decode back
text = tokenizer.decode(tokens["input_ids"], skip_special_tokens=True)

# Batch tokenization with padding/truncation
batch = tokenizer(
    ["Short text", "This is a much longer piece of text that needs truncation"],
    padding=True,
    truncation=True,
    max_length=128,
    return_tensors="pt",
)

# Special tokens
print(f"BOS: {tokenizer.bos_token} ({tokenizer.bos_token_id})")
print(f"EOS: {tokenizer.eos_token} ({tokenizer.eos_token_id})")
print(f"PAD: {tokenizer.pad_token} ({tokenizer.pad_token_id})")

# Set pad token if missing (common for decoder-only models)
if tokenizer.pad_token is None:
    tokenizer.pad_token = tokenizer.eos_token
```

### Training Custom Tokenizers

```python
from tokenizers import Tokenizer, models, trainers, pre_tokenizers, processors

# BPE tokenizer from scratch
tokenizer = Tokenizer(models.BPE(unk_token="[UNK]"))
tokenizer.pre_tokenizer = pre_tokenizers.ByteLevel(add_prefix_space=False)

trainer = trainers.BpeTrainer(
    vocab_size=32000,
    special_tokens=["[UNK]", "[CLS]", "[SEP]", "[PAD]", "[MASK]"],
    min_frequency=2,
    show_progress=True,
)

# Train on files
tokenizer.train(files=["corpus.txt"], trainer=trainer)

# Or train from the existing tokenizer (extend vocabulary)
from transformers import AutoTokenizer

base_tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-3.1-8B")
new_tokens = ["<custom_tag>", "<end_custom>", "[DOMAIN_TERM]"]
num_added = base_tokenizer.add_tokens(new_tokens)
print(f"Added {num_added} tokens")

# Resize model embeddings to match
model.resize_token_embeddings(len(base_tokenizer))
```

## Accelerate (Multi-GPU Training)

### Basic Usage

```python
from accelerate import Accelerator

accelerator = Accelerator(
    mixed_precision="bf16",
    gradient_accumulation_steps=4,
    log_with="wandb",
)

# Prepare model, optimizer, and dataloader
model, optimizer, train_dataloader = accelerator.prepare(
    model, optimizer, train_dataloader
)

# Training loop
for epoch in range(num_epochs):
    model.train()
    for batch in train_dataloader:
        with accelerator.accumulate(model):
            outputs = model(**batch)
            loss = outputs.loss
            accelerator.backward(loss)
            optimizer.step()
            optimizer.zero_grad()

        accelerator.log({"train_loss": loss.item()})

# Save model (handles distributed state)
accelerator.wait_for_everyone()
unwrapped_model = accelerator.unwrap_model(model)
unwrapped_model.save_pretrained(
    "output",
    save_function=accelerator.save,
    state_dict=accelerator.get_state_dict(model),
)
```

### Accelerate Config

```bash
# Interactive configuration
accelerate config

# Launch training
accelerate launch --num_processes 4 train.py

# Or with config file
accelerate launch --config_file accelerate_config.yaml train.py
```

```yaml
# accelerate_config.yaml
compute_environment: LOCAL_MACHINE
distributed_type: MULTI_GPU
num_processes: 4
mixed_precision: bf16
use_cpu: false
gpu_ids: 0,1,2,3
```

### Big Model Inference

```python
from accelerate import init_empty_weights, load_checkpoint_and_dispatch

# Load model across multiple devices (model parallelism)
with init_empty_weights():
    model = AutoModelForCausalLM.from_config(config)

model = load_checkpoint_and_dispatch(
    model,
    checkpoint="./model-weights",
    device_map="auto",
    no_split_module_classes=["LlamaDecoderLayer"],
    max_memory={0: "20GiB", 1: "20GiB", "cpu": "30GiB"},
)
```

## PEFT (Parameter-Efficient Fine-Tuning)

### Adapter Types

```python
from peft import (
    LoraConfig,
    PrefixTuningConfig,
    PromptTuningConfig,
    IA3Config,
    get_peft_model,
)

# LoRA (most popular, see fine-tuning skill for details)
lora_config = LoraConfig(r=16, lora_alpha=32, target_modules="all-linear")

# Prefix Tuning (prepends trainable tokens to each layer)
prefix_config = PrefixTuningConfig(
    task_type="CAUSAL_LM",
    num_virtual_tokens=20,
    prefix_projection=True,
)

# Prompt Tuning (soft prompts prepended to input)
prompt_config = PromptTuningConfig(
    task_type="CAUSAL_LM",
    num_virtual_tokens=20,
    prompt_tuning_init="TEXT",
    prompt_tuning_init_text="Classify the sentiment of this text:",
    tokenizer_name_or_path="model-name",
)

# IA3 (smallest adapter, modifies activations)
ia3_config = IA3Config(
    task_type="CAUSAL_LM",
    target_modules=["k_proj", "v_proj", "down_proj"],
    feedforward_modules=["down_proj"],
)

model = get_peft_model(base_model, lora_config)  # Or any config
```

### Loading and Switching Adapters

```python
from peft import PeftModel

# Load base model with adapter
model = PeftModel.from_pretrained(base_model, "path/to/adapter")

# Multiple adapters
model.load_adapter("path/to/code-adapter", adapter_name="code")
model.load_adapter("path/to/chat-adapter", adapter_name="chat")

# Switch between adapters
model.set_adapter("code")
code_output = model.generate(**inputs)

model.set_adapter("chat")
chat_output = model.generate(**inputs)

# Merge adapter into base model (for deployment)
merged = model.merge_and_unload()
```

## Evaluate Library

```python
import evaluate

# Load metrics
accuracy = evaluate.load("accuracy")
f1 = evaluate.load("f1")
bleu = evaluate.load("bleu")
rouge = evaluate.load("rouge")
bertscore = evaluate.load("bertscore")

# Compute metrics
accuracy_result = accuracy.compute(
    predictions=[0, 1, 1, 0],
    references=[0, 1, 0, 0],
)
# {'accuracy': 0.75}

rouge_result = rouge.compute(
    predictions=["The cat sat on the mat"],
    references=["The cat is sitting on the mat"],
)
# {'rouge1': 0.857, 'rouge2': 0.6, 'rougeL': 0.857, 'rougeLsum': 0.857}

bertscore_result = bertscore.compute(
    predictions=["The weather is nice today"],
    references=["It is a beautiful day"],
    lang="en",
)

# Combine metrics
combined = evaluate.combine(["accuracy", "f1", "precision", "recall"])
results = combined.compute(predictions=[0, 1, 1], references=[0, 1, 0])
```

## Text Generation Inference (TGI)

### Deployment

```bash
# Docker deployment
docker run --gpus all --shm-size 1g \
    -p 8080:80 \
    -v /path/to/model:/model \
    ghcr.io/huggingface/text-generation-inference:latest \
    --model-id /model \
    --dtype bfloat16 \
    --max-input-length 4096 \
    --max-total-tokens 8192 \
    --max-batch-prefill-tokens 4096 \
    --max-concurrent-requests 128
```

### Client Usage

```python
from huggingface_hub import InferenceClient

client = InferenceClient("http://localhost:8080")

# Simple generation
output = client.text_generation(
    "Explain quantum computing:",
    max_new_tokens=256,
    temperature=0.7,
)

# Chat completions (OpenAI-compatible)
response = client.chat_completion(
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is machine learning?"},
    ],
    max_tokens=512,
    temperature=0.7,
)
print(response.choices[0].message.content)

# Streaming
for token in client.text_generation(
    "Once upon a time",
    max_new_tokens=100,
    stream=True,
):
    print(token, end="")
```

## Spaces (Gradio / Streamlit)

### Gradio App

```python
import gradio as gr
from transformers import pipeline

# Load model
generator = pipeline("text-generation", model="gpt2")

def generate_text(prompt, max_length, temperature):
    result = generator(
        prompt,
        max_new_tokens=max_length,
        temperature=temperature,
        do_sample=True,
    )
    return result[0]["generated_text"]

# Build interface
demo = gr.Interface(
    fn=generate_text,
    inputs=[
        gr.Textbox(label="Prompt", lines=3),
        gr.Slider(50, 500, value=200, label="Max Length"),
        gr.Slider(0.1, 2.0, value=0.7, label="Temperature"),
    ],
    outputs=gr.Textbox(label="Generated Text", lines=10),
    title="Text Generator",
    examples=[["Once upon a time", 200, 0.7]],
)

demo.launch()
```

## Hub API

### Programmatic Management

```python
from huggingface_hub import HfApi, hf_hub_download, snapshot_download

api = HfApi()

# Download specific file
file_path = hf_hub_download(
    repo_id="meta-llama/Llama-3.1-8B",
    filename="config.json",
    token="hf_...",
)

# Download entire model
snapshot_download(
    repo_id="meta-llama/Llama-3.1-8B",
    local_dir="./llama-3.1-8b",
    ignore_patterns=["*.bin"],         # Skip pytorch_model.bin if using safetensors
)

# Repository management
api.create_repo("my-org/new-model", private=True)
api.delete_repo("my-org/old-model")
api.update_repo_visibility("my-org/my-model", private=False)

# File management
api.upload_file(
    path_or_fileobj="./model.safetensors",
    path_in_repo="model.safetensors",
    repo_id="my-org/my-model",
)

# Create model card
from huggingface_hub import ModelCard

card = ModelCard.from_template(
    card_data=ModelCardData(
        language="en",
        license="mit",
        library_name="transformers",
        tags=["text-generation", "llama"],
        datasets=["my-dataset"],
        metrics=["accuracy"],
    ),
    model_id="my-org/my-model",
    model_description="Fine-tuned Llama for customer support.",
)
card.push_to_hub("my-org/my-model")
```

## Safetensors

```python
from safetensors.torch import save_file, load_file

# Save tensors (safe, fast, memory-mapped)
tensors = {"weight": torch.randn(10, 10), "bias": torch.randn(10)}
save_file(tensors, "model.safetensors")

# Load tensors
loaded = load_file("model.safetensors")

# Benefits over pickle-based formats:
# - No arbitrary code execution risk
# - Memory-mapped loading (fast, low memory)
# - Zero-copy loading on GPU
# - Format validation before loading
```

## Optimum (ONNX / Quantization / Optimization)

### ONNX Export

```python
from optimum.onnxruntime import ORTModelForSequenceClassification
from transformers import AutoTokenizer

# Export and load in one step
model = ORTModelForSequenceClassification.from_pretrained(
    "distilbert-base-uncased-finetuned-sst-2-english",
    export=True,
)
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased-finetuned-sst-2-english")

# Use with pipeline (same API, faster inference)
from optimum.pipelines import pipeline

ort_pipeline = pipeline("sentiment-analysis", model=model, tokenizer=tokenizer)
result = ort_pipeline("This is great!")

# Save ONNX model
model.save_pretrained("./onnx_model")
```

### Quantization with Optimum

```python
from optimum.onnxruntime import ORTQuantizer
from optimum.onnxruntime.configuration import AutoQuantizationConfig

# Dynamic quantization (no calibration data needed)
quantizer = ORTQuantizer.from_pretrained("./onnx_model")
dqconfig = AutoQuantizationConfig.avx512_vnni(is_static=False, per_channel=False)
quantizer.quantize(save_dir="./quantized_model", quantization_config=dqconfig)

# Static quantization (needs calibration data, better quality)
from optimum.onnxruntime.configuration import AutoCalibrationConfig

qconfig = AutoQuantizationConfig.avx512_vnni(is_static=True, per_channel=True)
calibration_config = AutoCalibrationConfig.minmax(calibration_dataset)
quantizer.quantize(
    save_dir="./static_quantized",
    quantization_config=qconfig,
    calibration_config=calibration_config,
)
```

## Trainer API

### Custom Training Loop with Callbacks

```python
from transformers import (
    Trainer, TrainingArguments,
    EarlyStoppingCallback,
    TrainerCallback,
)

# Custom callback
class LoggingCallback(TrainerCallback):
    def on_log(self, args, state, control, logs=None, **kwargs):
        if logs:
            print(f"Step {state.global_step}: {logs}")

    def on_epoch_end(self, args, state, control, **kwargs):
        print(f"Epoch {state.epoch} completed")

# Custom metric computation
def compute_metrics(eval_pred):
    predictions, labels = eval_pred
    predictions = predictions.argmax(axis=-1)
    accuracy = (predictions == labels).mean()
    f1 = f1_score(labels, predictions, average="weighted")
    return {"accuracy": accuracy, "f1": f1}

training_args = TrainingArguments(
    output_dir="./results",
    num_train_epochs=5,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=32,
    learning_rate=2e-5,
    warmup_steps=500,
    weight_decay=0.01,
    eval_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    metric_for_best_model="f1",
    greater_is_better=True,
    report_to="wandb",
    bf16=True,
    dataloader_num_workers=4,
    group_by_length=True,           # Group similar lengths for efficiency
    save_total_limit=3,
    logging_steps=50,
    push_to_hub=True,
    hub_model_id="my-org/my-model",
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    eval_dataset=eval_dataset,
    compute_metrics=compute_metrics,
    callbacks=[
        EarlyStoppingCallback(early_stopping_patience=3),
        LoggingCallback(),
    ],
)

trainer.train()
trainer.push_to_hub()
```

### Resuming from Checkpoint

```python
# Training automatically saves checkpoints
trainer.train(resume_from_checkpoint=True)

# Or specify a specific checkpoint
trainer.train(resume_from_checkpoint="./results/checkpoint-1000")
```

## Decision Framework: Choosing the Right Tool

| Need | Tool | Example |
|------|------|---------|
| Quick prototype | `pipeline()` | Sentiment analysis demo |
| Custom training | `Trainer` + `Accelerate` | Fine-tune BERT for NER |
| Efficient fine-tuning | `PEFT` + `TRL` | LoRA on Llama 8B |
| Production serving | TGI or vLLM | API endpoint for chat |
| Demo/app | Gradio on Spaces | Interactive model showcase |
| Edge deployment | Optimum (ONNX) | Mobile inference |
| Large datasets | `datasets` streaming | Process C4 corpus |
| Multi-GPU | `Accelerate` | Distributed training |
| Model evaluation | `evaluate` | Benchmark on standard metrics |
| Safe storage | Safetensors | Model weight persistence |
