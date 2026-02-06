---
description: "Edge ML / Mobile ML / Core ML expert. Covers Core ML (iOS) model conversion and inference, TensorFlow Lite (Android/iOS) with delegates, ONNX Runtime Mobile, ML Kit, on-device training, model optimization (pruning/distillation/quantization), privacy-preserving ML, federated learning, and performance benchmarking."
model: opus
context: fork
---

# Edge ML / Mobile ML

Expert guidance for deploying machine learning models on edge devices: iOS (Core ML), Android (TensorFlow Lite), cross-platform (ONNX Runtime Mobile), and Google ML Kit. Covers model conversion, optimization, on-device inference, privacy-preserving techniques, and performance benchmarking.

## Core ML (iOS)

### Model Conversion with coremltools

```python
import coremltools as ct
import torch

# From PyTorch
class SimpleClassifier(torch.nn.Module):
    def __init__(self):
        super().__init__()
        self.linear1 = torch.nn.Linear(768, 256)
        self.relu = torch.nn.ReLU()
        self.linear2 = torch.nn.Linear(256, 10)

    def forward(self, x):
        return self.linear2(self.relu(self.linear1(x)))

model = SimpleClassifier()
model.eval()

# Trace the model
example_input = torch.randn(1, 768)
traced_model = torch.jit.trace(model, example_input)

# Convert to Core ML
mlmodel = ct.convert(
    traced_model,
    inputs=[ct.TensorType(name="features", shape=(1, 768))],
    outputs=[ct.TensorType(name="logits")],
    compute_units=ct.ComputeUnit.ALL,        # CPU + GPU + Neural Engine
    minimum_deployment_target=ct.target.iOS17,
)

# Set model metadata
mlmodel.author = "ML Team"
mlmodel.short_description = "Text classifier for sentiment analysis"
mlmodel.version = "1.0.0"

# Save
mlmodel.save("TextClassifier.mlpackage")
```

### Converting Hugging Face Transformers

```python
import coremltools as ct
from transformers import AutoModelForSequenceClassification, AutoTokenizer
import torch

model_name = "distilbert-base-uncased-finetuned-sst-2-english"
model = AutoModelForSequenceClassification.from_pretrained(model_name)
tokenizer = AutoTokenizer.from_pretrained(model_name)
model.eval()

# Create example input
example_text = "This movie is great"
inputs = tokenizer(example_text, return_tensors="pt", padding="max_length", max_length=128)

# Trace with example inputs
class WrappedModel(torch.nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model

    def forward(self, input_ids, attention_mask):
        outputs = self.model(input_ids=input_ids, attention_mask=attention_mask)
        return outputs.logits

wrapped = WrappedModel(model)
traced = torch.jit.trace(wrapped, (inputs["input_ids"], inputs["attention_mask"]))

# Convert
mlmodel = ct.convert(
    traced,
    inputs=[
        ct.TensorType(name="input_ids", shape=(1, 128), dtype=int),
        ct.TensorType(name="attention_mask", shape=(1, 128), dtype=int),
    ],
    outputs=[ct.TensorType(name="logits")],
    compute_units=ct.ComputeUnit.ALL,
    minimum_deployment_target=ct.target.iOS17,
)

mlmodel.save("SentimentClassifier.mlpackage")
```

### Quantization for Core ML

```python
import coremltools as ct
from coremltools.models.neural_network import quantization_utils

# Post-training quantization
model = ct.models.MLModel("TextClassifier.mlpackage")

# Linear quantization to 8-bit
quantized_model = ct.compression_utils.linear_quantize_weights(
    model,
    dtype=ct.converters.mil.mil.types.type_mapping.np.int8,
)

# Palettization (k-means clustering of weights)
palettized_model = ct.compression_utils.palettize_weights(
    model,
    nbits=4,       # 4-bit palettization (16 unique values per tensor)
    mode="kmeans",
)

# Pruning (set small weights to zero)
pruned_model = ct.compression_utils.prune_weights(
    model,
    target_sparsity=0.5,   # Remove 50% of weights
    mode="threshold_based",
)

quantized_model.save("TextClassifier_quantized.mlpackage")
```

### On-Device Inference (Swift)

```swift
import CoreML
import NaturalLanguage

// Load model
let config = MLModelConfiguration()
config.computeUnits = .all  // CPU + GPU + Neural Engine

let model = try SentimentClassifier(configuration: config)

// Prepare input
let tokenizer = NLTokenizer(unit: .word)
tokenizer.string = "This product is amazing"

// Run inference
let input = SentimentClassifierInput(
    input_ids: inputTensor,
    attention_mask: maskTensor
)

let prediction = try model.prediction(input: input)
let sentiment = prediction.logits  // [negative_score, positive_score]

// Async prediction (non-blocking UI)
Task {
    let result = try await model.prediction(input: input)
    await MainActor.run {
        updateUI(with: result)
    }
}
```

### Core ML with Vision Framework

```swift
import Vision
import CoreML

// Image classification
let config = MLModelConfiguration()
config.computeUnits = .all

let model = try VNCoreMLModel(for: ImageClassifier(configuration: config).model)

let request = VNCoreMLRequest(model: model) { request, error in
    guard let results = request.results as? [VNClassificationObservation] else { return }
    let topResult = results.first!
    print("\(topResult.identifier): \(topResult.confidence)")
}

// Process image
let handler = VNImageRequestHandler(cgImage: image, options: [:])
try handler.perform([request])
```

### Core ML with NLP Framework

```swift
import NaturalLanguage

// Built-in NLP (no model needed)
let tagger = NLTagger(tagSchemes: [.nameType])
tagger.string = "Apple Inc. is headquartered in Cupertino, California."

tagger.enumerateTags(in: tagger.string!.startIndex..<tagger.string!.endIndex,
                      unit: .word,
                      scheme: .nameType,
                      options: [.omitPunctuation, .omitWhitespace]) { tag, range in
    if let tag = tag {
        print("\(tagger.string![range]): \(tag.rawValue)")
    }
    return true
}

// Custom NLP model
let sentimentModel = try NLModel(mlModel: CustomSentiment(configuration: config).model)
let sentiment = sentimentModel.predictedLabel(for: "This is great!")
```

### Performance: Neural Engine vs GPU vs CPU

| Compute Unit | Best For | Latency | Power |
|-------------|----------|---------|-------|
| Neural Engine | Most ML ops, quantized models | Lowest | Lowest |
| GPU | Large batches, complex architectures | Low | Medium |
| CPU | Small models, compatibility | Medium-High | Highest |
| ALL (recommended) | Auto-dispatch per layer | Optimal | Optimal |

```swift
// Force specific compute unit
let config = MLModelConfiguration()
config.computeUnits = .cpuAndNeuralEngine  // Skip GPU for battery savings

// Measure performance
let start = CFAbsoluteTimeGetCurrent()
let _ = try model.prediction(input: input)
let elapsed = CFAbsoluteTimeGetCurrent() - start
print("Inference time: \(elapsed * 1000)ms")
```

## TensorFlow Lite (Android/iOS)

### Model Conversion from TensorFlow

```python
import tensorflow as tf

# From SavedModel
converter = tf.lite.TFLiteConverter.from_saved_model("saved_model_dir")
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()

with open("model.tflite", "wb") as f:
    f.write(tflite_model)

# From Keras model
model = tf.keras.applications.MobileNetV3Small(
    input_shape=(224, 224, 3),
    weights="imagenet",
)

converter = tf.lite.TFLiteConverter.from_keras_model(model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]

# Full integer quantization (smallest, fastest on mobile)
def representative_dataset():
    for _ in range(100):
        yield [tf.random.normal((1, 224, 224, 3))]

converter.representative_dataset = representative_dataset
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.uint8
converter.inference_output_type = tf.uint8

tflite_quant_model = converter.convert()
```

### Conversion from PyTorch (via ONNX)

```python
import torch
import onnx
from onnx_tf.backend import prepare

# Step 1: PyTorch to ONNX
model = MyModel()
model.eval()
dummy_input = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model,
    dummy_input,
    "model.onnx",
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    opset_version=13,
)

# Step 2: ONNX to TensorFlow
onnx_model = onnx.load("model.onnx")
tf_rep = prepare(onnx_model)
tf_rep.export_graph("saved_model_dir")

# Step 3: TensorFlow to TFLite
converter = tf.lite.TFLiteConverter.from_saved_model("saved_model_dir")
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()
```

### TFLite Interpreter (Python)

```python
import numpy as np
import tensorflow as tf

# Load model
interpreter = tf.lite.Interpreter(model_path="model.tflite")
interpreter.allocate_tensors()

# Get input/output details
input_details = interpreter.get_input_details()
output_details = interpreter.get_output_details()

print(f"Input shape: {input_details[0]['shape']}")
print(f"Input dtype: {input_details[0]['dtype']}")
print(f"Output shape: {output_details[0]['shape']}")

# Run inference
input_data = np.random.rand(1, 224, 224, 3).astype(np.float32)
interpreter.set_tensor(input_details[0]['index'], input_data)
interpreter.invoke()

output_data = interpreter.get_tensor(output_details[0]['index'])
print(f"Prediction: {output_data}")
```

### Android Inference (Kotlin)

```kotlin
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.GpuDelegate
import org.tensorflow.lite.support.image.TensorImage
import java.nio.ByteBuffer

class ImageClassifier(context: Context) {
    private val interpreter: Interpreter

    init {
        // Load model from assets
        val modelBuffer = loadModelFile(context, "model.tflite")

        // Configure with GPU delegate
        val options = Interpreter.Options()
        options.addDelegate(GpuDelegate())
        options.setNumThreads(4)

        interpreter = Interpreter(modelBuffer, options)
    }

    fun classify(bitmap: Bitmap): FloatArray {
        // Preprocess
        val input = preprocessImage(bitmap)  // Resize, normalize

        // Allocate output buffer
        val output = Array(1) { FloatArray(1000) }

        // Run inference
        interpreter.run(input, output)

        return output[0]
    }

    private fun loadModelFile(context: Context, filename: String): ByteBuffer {
        val assetFileDescriptor = context.assets.openFd(filename)
        val inputStream = assetFileDescriptor.createInputStream()
        val fileChannel = inputStream.channel
        return fileChannel.map(
            FileChannel.MapMode.READ_ONLY,
            assetFileDescriptor.startOffset,
            assetFileDescriptor.declaredLength
        )
    }

    fun close() {
        interpreter.close()
    }
}
```

### TFLite Delegates

| Delegate | Platform | Speedup | Best For |
|----------|----------|---------|----------|
| GPU | Android, iOS | 2-7x | Conv, dense layers |
| NNAPI | Android (8.1+) | 2-10x | Quantized models, device NPU |
| Metal | iOS | 2-5x | GPU-intensive models |
| Hexagon | Qualcomm SoCs | 3-10x | Quantized models |
| XNNPACK | All (CPU) | 1.5-3x | CPU fallback, float models |
| Core ML | iOS | 2-8x | Apple Neural Engine |

```kotlin
// NNAPI delegate (Android)
val nnApiOptions = NnApiDelegate.Options()
nnApiOptions.setAllowFp16(true)
nnApiOptions.setExecutionPreference(NnApiDelegate.Options.EXECUTION_PREFERENCE_SUSTAINED_SPEED)
val nnApiDelegate = NnApiDelegate(nnApiOptions)

val options = Interpreter.Options()
options.addDelegate(nnApiDelegate)
```

### Quantization Approaches

```python
import tensorflow as tf

# 1. Post-training dynamic range quantization (simplest)
converter = tf.lite.TFLiteConverter.from_saved_model("saved_model")
converter.optimizations = [tf.lite.Optimize.DEFAULT]
# Weights quantized to int8, activations remain float at runtime
tflite_model = converter.convert()

# 2. Post-training full integer quantization (best performance)
converter = tf.lite.TFLiteConverter.from_saved_model("saved_model")
converter.optimizations = [tf.lite.Optimize.DEFAULT]
converter.representative_dataset = representative_dataset
converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS_INT8]
converter.inference_input_type = tf.int8
converter.inference_output_type = tf.int8
tflite_model = converter.convert()

# 3. Quantization-aware training (best accuracy)
import tensorflow_model_optimization as tfmot

q_aware_model = tfmot.quantization.keras.quantize_model(model)
q_aware_model.compile(optimizer="adam", loss="sparse_categorical_crossentropy")
q_aware_model.fit(train_data, epochs=5)

converter = tf.lite.TFLiteConverter.from_keras_model(q_aware_model)
converter.optimizations = [tf.lite.Optimize.DEFAULT]
tflite_model = converter.convert()
```

## ONNX Runtime Mobile

### Cross-Platform Inference

```python
import onnxruntime as ort
import numpy as np

# Export PyTorch model to ONNX
import torch

model = MyModel()
model.eval()
dummy = torch.randn(1, 3, 224, 224)

torch.onnx.export(
    model, dummy, "model.onnx",
    input_names=["input"],
    output_names=["output"],
    dynamic_axes={"input": {0: "batch"}, "output": {0: "batch"}},
    opset_version=17,
)

# Inference with ONNX Runtime
session = ort.InferenceSession(
    "model.onnx",
    providers=["CoreMLExecutionProvider", "CPUExecutionProvider"],
)

# Run
input_data = np.random.randn(1, 3, 224, 224).astype(np.float32)
results = session.run(None, {"input": input_data})
print(f"Output shape: {results[0].shape}")
```

### ONNX Model Optimization

```python
import onnxruntime as ort
from onnxruntime.quantization import quantize_dynamic, QuantType
from onnxruntime.transformers import optimizer

# Graph optimization
optimized_model = optimizer.optimize_model(
    "model.onnx",
    model_type="bert",
    num_heads=12,
    hidden_size=768,
    optimization_options=None,
)
optimized_model.save_model_to_file("model_optimized.onnx")

# Dynamic quantization
quantize_dynamic(
    model_input="model_optimized.onnx",
    model_output="model_quantized.onnx",
    weight_type=QuantType.QInt8,
)
```

### Platform-Specific Execution Providers

| Provider | Platform | Hardware |
|----------|----------|----------|
| CoreMLExecutionProvider | iOS, macOS | Apple Neural Engine + GPU |
| NnapiExecutionProvider | Android | NPU, GPU, DSP |
| QNNExecutionProvider | Android (Qualcomm) | Hexagon DSP, Adreno GPU |
| XnnpackExecutionProvider | All | CPU (optimized) |
| CPUExecutionProvider | All | CPU (baseline) |

```python
# Priority order: tries first provider, falls back to next
session = ort.InferenceSession(
    "model.onnx",
    providers=[
        "CoreMLExecutionProvider",    # Try Neural Engine first
        "XnnpackExecutionProvider",   # Optimized CPU fallback
        "CPUExecutionProvider",       # Basic CPU fallback
    ],
)

# Check which provider was selected
print(session.get_providers())
```

## ML Kit (Google)

### Pre-Built APIs

```kotlin
// Text Recognition (OCR)
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions

val recognizer = TextRecognition.getClient(TextRecognizerOptions.Builder().build())

val image = InputImage.fromBitmap(bitmap, 0)
recognizer.process(image)
    .addOnSuccessListener { result ->
        for (block in result.textBlocks) {
            for (line in block.lines) {
                println("Text: ${line.text}, Confidence: ${line.confidence}")
            }
        }
    }
    .addOnFailureListener { e ->
        println("Error: ${e.message}")
    }

// Face Detection
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetectorOptions

val options = FaceDetectorOptions.Builder()
    .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_ACCURATE)
    .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_ALL)
    .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
    .build()

val detector = FaceDetection.getClient(options)

detector.process(image)
    .addOnSuccessListener { faces ->
        for (face in faces) {
            val smileProb = face.smilingProbability
            val leftEyeOpen = face.leftEyeOpenProbability
            val bounds = face.boundingBox
        }
    }

// Barcode Scanning
import com.google.mlkit.vision.barcode.BarcodeScanning

val scanner = BarcodeScanning.getClient()
scanner.process(image)
    .addOnSuccessListener { barcodes ->
        for (barcode in barcodes) {
            println("Value: ${barcode.rawValue}, Format: ${barcode.format}")
        }
    }
```

### Custom Models with ML Kit

```kotlin
import com.google.mlkit.common.model.LocalModel
import com.google.mlkit.vision.objects.custom.CustomObjectDetectorOptions

// Load custom TFLite model
val localModel = LocalModel.Builder()
    .setAssetFilePath("custom_model.tflite")
    .build()

val options = CustomObjectDetectorOptions.Builder(localModel)
    .setDetectorMode(CustomObjectDetectorOptions.SINGLE_IMAGE_MODE)
    .enableMultipleObjects()
    .enableClassification()
    .setClassificationConfidenceThreshold(0.5f)
    .setMaxPerObjectLabelCount(3)
    .build()

val objectDetector = ObjectDetection.getClient(options)
```

## Model Optimization Techniques

### Pruning

```python
import tensorflow_model_optimization as tfmot

# Structured pruning (remove entire channels/filters)
pruning_params = {
    "pruning_schedule": tfmot.sparsity.keras.PolynomialDecay(
        initial_sparsity=0.0,
        final_sparsity=0.5,         # Remove 50% of weights
        begin_step=0,
        end_step=1000,
    )
}

pruned_model = tfmot.sparsity.keras.prune_low_magnitude(model, **pruning_params)
pruned_model.compile(optimizer="adam", loss="sparse_categorical_crossentropy")

# Training callbacks for pruning
callbacks = [tfmot.sparsity.keras.UpdatePruningStep()]
pruned_model.fit(train_data, epochs=10, callbacks=callbacks)

# Strip pruning wrappers for deployment
final_model = tfmot.sparsity.keras.strip_pruning(pruned_model)
```

### Knowledge Distillation

```python
import torch
import torch.nn.functional as F

class DistillationTrainer:
    def __init__(self, teacher, student, temperature=4.0, alpha=0.5):
        self.teacher = teacher.eval()
        self.student = student
        self.temperature = temperature
        self.alpha = alpha  # Balance between distillation and task loss

    def distillation_loss(self, student_logits, teacher_logits, labels):
        # Soft target loss (KL divergence on softened probabilities)
        soft_teacher = F.softmax(teacher_logits / self.temperature, dim=-1)
        soft_student = F.log_softmax(student_logits / self.temperature, dim=-1)
        distill_loss = F.kl_div(soft_student, soft_teacher, reduction="batchmean")
        distill_loss *= self.temperature ** 2

        # Hard target loss (standard cross-entropy)
        hard_loss = F.cross_entropy(student_logits, labels)

        # Combined loss
        return self.alpha * distill_loss + (1 - self.alpha) * hard_loss

    def train_step(self, batch):
        inputs, labels = batch
        with torch.no_grad():
            teacher_logits = self.teacher(inputs)

        student_logits = self.student(inputs)
        loss = self.distillation_loss(student_logits, teacher_logits, labels)
        return loss
```

### Model Size Comparison

| Technique | Size Reduction | Accuracy Impact | Inference Speedup |
|-----------|---------------|-----------------|-------------------|
| Float16 | 2x | Minimal | 1.5-2x |
| INT8 quantization | 4x | 1-3% drop | 2-4x |
| INT4 quantization | 8x | 3-8% drop | 3-6x |
| Pruning (50%) | ~2x | 1-5% drop | 1.5-3x |
| Knowledge distillation | 5-20x (model dependent) | 2-5% drop | 5-20x |
| Pruning + quantization | ~8x | 3-6% drop | 4-8x |

## Privacy-Preserving ML

### Federated Learning

```python
# Conceptual federated learning flow
import flwr as fl  # Flower framework
import torch

class FederatedClient(fl.client.NumPyClient):
    def __init__(self, model, train_data, device):
        self.model = model
        self.train_data = train_data
        self.device = device

    def get_parameters(self, config):
        return [val.cpu().numpy() for val in self.model.state_dict().values()]

    def set_parameters(self, parameters):
        params_dict = zip(self.model.state_dict().keys(), parameters)
        state_dict = {k: torch.tensor(v) for k, v in params_dict}
        self.model.load_state_dict(state_dict, strict=True)

    def fit(self, parameters, config):
        self.set_parameters(parameters)
        # Train locally (data never leaves device)
        train_local(self.model, self.train_data, epochs=1)
        return self.get_parameters(config), len(self.train_data), {}

    def evaluate(self, parameters, config):
        self.set_parameters(parameters)
        loss, accuracy = evaluate_local(self.model, self.train_data)
        return float(loss), len(self.train_data), {"accuracy": float(accuracy)}

# Server aggregation strategy
strategy = fl.server.strategy.FedAvg(
    fraction_fit=0.3,           # 30% of clients per round
    fraction_evaluate=0.2,
    min_fit_clients=5,
    min_evaluate_clients=3,
    min_available_clients=10,
)

fl.server.start_server(
    server_address="0.0.0.0:8080",
    config=fl.server.ServerConfig(num_rounds=50),
    strategy=strategy,
)
```

### On-Device Processing Patterns

```swift
// iOS: Process sensitive data entirely on device
import CoreML
import Vision

class PrivateMLProcessor {
    private let model: VNCoreMLModel

    // All inference happens on-device, no network calls
    func processImage(_ image: CGImage) -> [Classification] {
        let request = VNCoreMLRequest(model: model) { request, error in
            // Results computed locally
        }

        // Disable any cloud fallback
        request.usesCPUOnly = false  // Still uses Neural Engine, just no cloud

        let handler = VNImageRequestHandler(cgImage: image)
        try? handler.perform([request])
    }

    // Differential privacy for analytics
    func reportMetricWithPrivacy(value: Double, epsilon: Double = 1.0) {
        let noise = laplacianNoise(scale: 1.0 / epsilon)
        let privatizedValue = value + noise
        // Send privatizedValue to server (individual value is protected)
        analytics.report(privatizedValue)
    }
}
```

## Performance Benchmarking

### Benchmarking Framework

```python
import time
import numpy as np
import psutil
import os

class ModelBenchmark:
    def __init__(self, model_name: str):
        self.model_name = model_name
        self.results = {}

    def measure_latency(self, inference_fn, input_data, warmup=10, iterations=100):
        """Measure inference latency with warmup."""
        # Warmup runs (not counted)
        for _ in range(warmup):
            inference_fn(input_data)

        # Timed runs
        latencies = []
        for _ in range(iterations):
            start = time.perf_counter()
            inference_fn(input_data)
            end = time.perf_counter()
            latencies.append((end - start) * 1000)  # Convert to ms

        self.results["latency"] = {
            "mean_ms": np.mean(latencies),
            "p50_ms": np.percentile(latencies, 50),
            "p95_ms": np.percentile(latencies, 95),
            "p99_ms": np.percentile(latencies, 99),
            "std_ms": np.std(latencies),
        }
        return self.results["latency"]

    def measure_memory(self, load_fn):
        """Measure peak memory usage during model loading."""
        process = psutil.Process(os.getpid())
        mem_before = process.memory_info().rss / 1024 / 1024  # MB

        model = load_fn()

        mem_after = process.memory_info().rss / 1024 / 1024
        self.results["memory_mb"] = mem_after - mem_before
        return self.results["memory_mb"]

    def measure_model_size(self, model_path: str):
        """Measure model file size."""
        size_bytes = os.path.getsize(model_path)
        self.results["size_mb"] = size_bytes / 1024 / 1024
        return self.results["size_mb"]

    def report(self):
        """Print benchmark results."""
        print(f"\n{'='*50}")
        print(f"Benchmark: {self.model_name}")
        print(f"{'='*50}")
        if "latency" in self.results:
            lat = self.results["latency"]
            print(f"Latency (mean): {lat['mean_ms']:.2f} ms")
            print(f"Latency (p95):  {lat['p95_ms']:.2f} ms")
            print(f"Latency (p99):  {lat['p99_ms']:.2f} ms")
        if "memory_mb" in self.results:
            print(f"Memory usage:   {self.results['memory_mb']:.1f} MB")
        if "size_mb" in self.results:
            print(f"Model size:     {self.results['size_mb']:.1f} MB")

# Usage
bench = ModelBenchmark("MobileNetV3-Small-INT8")
bench.measure_model_size("model.tflite")
bench.measure_memory(lambda: tf.lite.Interpreter(model_path="model.tflite"))
bench.measure_latency(run_inference, sample_input)
bench.report()
```

### Battery Impact Testing (iOS)

```swift
import os.signpost

let log = OSLog(subsystem: "com.app.ml", category: .pointsOfInterest)

// Measure energy impact with Instruments
func benchmarkInference() {
    let signpostID = OSSignpostID(log: log)

    os_signpost(.begin, log: log, name: "ML Inference", signpostID: signpostID)
    let result = model.prediction(input: input)
    os_signpost(.end, log: log, name: "ML Inference", signpostID: signpostID)

    // Use Xcode Instruments > Energy Log to measure actual battery impact
}
```

### Performance Targets by Use Case

| Use Case | Target Latency | Max Model Size | Max Memory |
|----------|---------------|----------------|------------|
| Real-time camera | < 33ms (30 FPS) | < 10 MB | < 50 MB |
| Photo processing | < 500ms | < 50 MB | < 200 MB |
| Text classification | < 50ms | < 5 MB | < 30 MB |
| Voice command | < 100ms | < 20 MB | < 100 MB |
| Background task | < 5s | < 100 MB | < 500 MB |

## A/B Testing Models on Device

```python
# Server-side configuration
ab_test_config = {
    "experiment_id": "model_v2_rollout",
    "variants": {
        "control": {"model": "model_v1.tflite", "weight": 0.5},
        "treatment": {"model": "model_v2.tflite", "weight": 0.5},
    },
    "metrics": ["latency_ms", "accuracy", "user_satisfaction"],
}
```

```kotlin
// Android: A/B test model variants
class ModelABTest(context: Context) {
    private val variant: String = assignVariant()

    private fun assignVariant(): String {
        // Consistent assignment based on user ID
        val userId = getUserId()
        return if (userId.hashCode() % 2 == 0) "control" else "treatment"
    }

    fun getModel(): Interpreter {
        val modelFile = when (variant) {
            "control" -> "model_v1.tflite"
            "treatment" -> "model_v2.tflite"
            else -> "model_v1.tflite"
        }
        return Interpreter(loadModel(modelFile))
    }

    fun logMetric(name: String, value: Double) {
        analytics.log(mapOf(
            "experiment" to "model_v2_rollout",
            "variant" to variant,
            "metric" to name,
            "value" to value,
        ))
    }
}
```

## Decision Framework: Choosing an Edge ML Platform

| Criterion | Core ML | TFLite | ONNX Runtime | ML Kit |
|-----------|---------|--------|-------------|--------|
| Platform | iOS/macOS only | Android + iOS | Cross-platform | Android + iOS |
| Ease of use | High | Medium | Medium | Highest |
| Custom models | Yes | Yes | Yes | Limited |
| Pre-built APIs | Vision/NLP frameworks | No | No | Yes (text, face, barcode) |
| Neural Engine | Native | Via delegate | Via Core ML EP | Via TFLite |
| Model format | .mlpackage | .tflite | .onnx | .tflite |
| Best for | iOS-first apps | Android-first apps | Cross-platform | Quick prototyping |
