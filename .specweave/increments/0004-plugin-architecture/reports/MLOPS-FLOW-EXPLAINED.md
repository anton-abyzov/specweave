# MLOps Flow Explained - Soccer Player Detection

**Date**: 2025-10-31
**Purpose**: Detailed explanation of how the ML pipeline test works

---

## Overview: End-to-End MLOps Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Data      │────▶│   Training   │────▶│ Validation  │
│ Generation  │     │   (YOLOv8)   │     │  (Metrics)  │
└─────────────┘     └──────────────┘     └─────────────┘
                                                │
                                                ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Inference   │◀────│ Deployment   │◀────│   ONNX      │
│  Testing    │     │  (Package)   │     │  Export     │
└─────────────┘     └──────────────┘     └─────────────┘
```

---

## Step-by-Step Breakdown

### Step 1: Data Generation (Synthetic)

**Current Approach**: Creates fake soccer images programmatically

**Python Code**:
```python
def create_synthetic_soccer_frame(width=640, height=640):
    # 1. Create green field
    img = np.zeros((height, width, 3), dtype=np.uint8)
    img[:, :] = [34, 139, 34]  # RGB green

    # 2. Draw white lines (center line, circle)
    cv2.line(img, (width//2, 0), (width//2, height), (255, 255, 255), 2)
    cv2.circle(img, (width//2, height//2), 50, (255, 255, 255), 2)

    # 3. Add "players" (colored circles)
    players = []
    for i in range(5):
        x = np.random.randint(50, width-50)
        y = np.random.randint(50, height-50)
        radius = 15
        color = (0, 0, 255) if i < 3 else (255, 0, 0)  # Red or blue
        cv2.circle(img, (x, y), radius, color, -1)

        # Create YOLO annotation (normalized coordinates)
        center_x = x / width
        center_y = y / height
        bbox_w = (radius * 2) / width
        bbox_h = (radius * 2) / height
        players.append((center_x, center_y, bbox_w, bbox_h))

    return img, players
```

**Result**:
- **Image**: 640x640 pixels, green background, white lines, 5 colored circles
- **Annotation**: YOLO format (class, center_x, center_y, width, height)

**Why Synthetic?**
- ✅ Fast generation (~2 seconds for 10 frames)
- ✅ No external dependencies (no video downloads)
- ✅ Reproducible results
- ✅ Simple to understand and debug
- ❌ Not realistic (can't see actual player detection)

---

### Step 2: Data Validation

**Checks**:
1. Images exist in train/val folders
2. Labels (annotations) exist for each image
3. Image count matches label count
4. YOLO format is valid (5 numbers per line)

**Code**:
```typescript
const trainImgs = fs.readdirSync(path.join(this.datasetDir, 'images', 'train'));
const trainLbls = fs.readdirSync(path.join(this.datasetDir, 'labels', 'train'));

checks.images_exist = trainImgs.length > 0;
checks.labels_exist = trainLbls.length > 0;
checks.images_match_labels = trainImgs.length === trainLbls.length;

// Validate YOLO format: "0 0.512 0.634 0.042 0.058"
const firstLabel = fs.readFileSync(labelPath, 'utf-8');
const lines = firstLabel.trim().split('\n');
checks.annotations_valid = lines.every(line => {
    const parts = line.split(' ');
    return parts.length === 5 && parts.every(p => !isNaN(parseFloat(p)));
});
```

---

### Step 3: Model Training (YOLOv8)

**Training Script**:
```python
from ultralytics import YOLO

# Load pretrained YOLOv8 nano (smallest, fastest)
model = YOLO('yolov8n.pt')

# Train on synthetic dataset
results = model.train(
    data='dataset.yaml',    # Points to our synthetic data
    epochs=3,               # Just 3 epochs (fast for testing)
    imgsz=640,              # 640x640 images
    batch=2,                # Batch size 2 (low memory)
    device='cpu',           # CPU only (no GPU needed)
    patience=0              # No early stopping
)
```

**What Happens**:
1. **Epoch 1**: Model learns basic patterns (circles are "players")
2. **Epoch 2**: Improves detection accuracy
3. **Epoch 3**: Final refinement

**Output**:
- `best.pt` - Best model weights (saved automatically)
- `last.pt` - Final epoch weights
- `results.csv` - Metrics per epoch
- `results.png` - Training curves (loss over time)

**Duration**: 20-30 seconds on CPU

---

### Step 4: Model Validation

**Metrics Extracted**:
```python
results = model.val(data='dataset.yaml', verbose=False)

metrics = {
    'mAP50': float(results.box.map50),      # Mean Average Precision @ IoU 0.5
    'mAP50-95': float(results.box.map),     # mAP @ IoU 0.5-0.95
    'precision': float(results.box.mp),     # Precision
    'recall': float(results.box.mr)         # Recall
}
```

**What These Mean**:

- **mAP@0.5**: How well model detects players (at 50% overlap threshold)
  - 100% = perfect detection
  - 80%+ = very good
  - 50%+ = acceptable for toy dataset

- **Precision**: % of predictions that are correct
  - High precision = few false positives (doesn't see players where there aren't any)

- **Recall**: % of actual players detected
  - High recall = few false negatives (finds most players)

**For Synthetic Data**:
- Expected mAP@0.5: 70-90% (circles are easy to detect)
- Expected precision: 85%+
- Expected recall: 80%+

---

### Step 5: ONNX Export

**Why ONNX?**
- Cross-platform format
- Works in C++, JavaScript, Java (not just Python)
- Optimized for inference (faster than PyTorch)
- Mobile/edge device compatible

**Export**:
```python
model = YOLO('best.pt')
onnx_path = model.export(format='onnx', simplify=True)
```

**Result**: `best.onnx` file (can be loaded in any ONNX runtime)

---

### Step 6: Inference Testing

**Code**:
```python
model = YOLO('best.pt')
results = model('validation_image.jpg')

# Get detections
boxes = results[0].boxes
for box in boxes:
    class_id = int(box.cls[0])      # 0 = player
    confidence = float(box.conf[0])  # 0.0 to 1.0
    bbox = box.xyxy[0].tolist()     # [x1, y1, x2, y2]
```

**Measurements**:
- **Inference time**: How long to process one image (target: <500ms)
- **Detection count**: How many players found
- **Confidence**: How sure the model is (0.0 to 1.0)

---

## Current Limitations

### 1. Can't See Actual Detections

**Problem**: Synthetic circles don't look like real players.

**What You Get**:
```
Input:  [Green field with 5 colored circles]
Output: "Detected 5 players with 87% mAP"
```

**What's Missing**: Visual proof! Can't see bounding boxes drawn on images.

### 2. Not Using Real Soccer Video

**Problem**: The YouTube video you provided (https://youtu.be/mcgbGn-frj4) would be much more realistic.

**What We Need**:
1. Download video
2. Extract frames (e.g., 1 frame per second)
3. Manually label a few frames (or use pretrained model)
4. Train on real frames
5. Visualize detections with bounding boxes

---

## Enhancement: Real Video + Visualization

Let me create an enhanced version that:

1. ✅ Downloads real soccer video from YouTube
2. ✅ Extracts frames
3. ✅ Uses pretrained YOLOv8 (no manual labeling needed!)
4. ✅ Draws bounding boxes on images
5. ✅ Saves visualized results

### Proposed Flow

```
YouTube Video (mcgbGn-frj4)
    │
    ▼
Extract Frames (10 frames at 1 FPS)
    │
    ▼
Use Pretrained YOLOv8 (detect 'person' class)
    │
    ▼
Fine-tune Model (3 epochs)
    │
    ▼
Visualize Detections
    │
    ▼
Save: detections_visualized/frame_001.jpg
      [Green box around each player]
```

### What You'll See

**Before** (input frame):
```
[Raw soccer match frame]
```

**After** (output frame):
```
[Same frame with green boxes around players]
[Confidence scores: 0.89, 0.92, 0.87, ...]
[Labels: "player 0.89", "player 0.92", ...]
```

---

## Implementation Plan

I'll create:

1. **Enhanced test** with:
   - YouTube video download (yt-dlp)
   - Frame extraction (ffmpeg or OpenCV)
   - Pretrained YOLO inference
   - Visualization (draw bounding boxes)
   - Save visualized results

2. **Gitignore update**:
   - Add `*.mp4`, `*.avi` to gitignore
   - Preserve visualized images (small PNGs)

3. **Documentation**:
   - How to view results
   - Where visualized frames are saved

---

## Next: Let's Build It!

I'll create the enhanced test now that:
- Downloads your YouTube video
- Shows real player detections
- Visualizes results with bounding boxes

**Run it**: `npm run test:ml:pipeline:real`

**View results**: `.specweave/test-runs/ml-pipeline/.../detections_visualized/`

---

**Ready to implement?** Let me know and I'll create the enhanced version!
