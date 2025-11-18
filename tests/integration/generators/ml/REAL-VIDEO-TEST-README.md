# Real Soccer Video ML Pipeline Test

Complete MLOps pipeline with real YouTube video and visual player detection!

---

## Overview

This test demonstrates a **production-ready MLOps workflow** using:
- ✅ Real soccer match video from YouTube
- ✅ Pretrained YOLOv8 (no training needed - instant detection!)
- ✅ Visual output with bounding boxes around players
- ✅ Video generation showing tracking
- ✅ Optional pass detection (experimental)

**Test Video**: https://youtu.be/mcgbGn-frj4

---

## What You'll See

### Input (YouTube Video)
```
[Real soccer match footage]
```

### Output (Detections Visualized)
```
[Same frames with green boxes around each player]
[Confidence scores displayed: "Player 0.89", "Player 0.92", ...]
[Red boxes around ball (if detected)]
```

### Example Output Frame
```
┌────────────────────────────────────────────┐
│                                            │
│  ┌─────┐    "Player 0.92"                 │
│  │ ⚽  │    ┌────────────┐                 │
│  └─────┘    │  Player    │  "Player 0.87" │
│  Ball 0.85  │  0.92      │  ┌──────────┐  │
│             └────────────┘  │ Player   │  │
│                             │ 0.87     │  │
│   "Player 0.91"             └──────────┘  │
│   ┌────────────┐                          │
│   │  Player    │                          │
│   │  0.91      │                          │
│   └────────────┘                          │
│                                            │
└────────────────────────────────────────────┘
```

---

## Quick Start

### 1. Install Dependencies

```bash
# Python packages
pip install yt-dlp opencv-python ultralytics

# Verify installation
python3 -c "import yt_dlp, cv2; from ultralytics import YOLO; print('✅ All dependencies installed')"
```

### 2. Run the Test

```bash
npm run test:ml:real
```

### 3. View Results

```bash
# Open the detections folder
open .specweave/test-runs/ml-pipeline-real/[timestamp]/detections_visualized/

# Or use file browser
# Navigate to: .specweave/test-runs/ml-pipeline-real/[timestamp]/detections_visualized/
# Open any frame_*.jpg file
```

---

## Test Flow

```
┌────────────────────────────────────────────────────┐
│ 1. Download YouTube Video (yt-dlp)                 │
│    └─► https://youtu.be/mcgbGn-frj4                │
│                                                     │
│ 2. Extract Frames (1 FPS for 30 seconds)           │
│    └─► 30 JPEG frames extracted                    │
│                                                     │
│ 3. Detect Players (Pretrained YOLOv8)              │
│    └─► No training needed! Uses COCO model         │
│    └─► Detects "person" class = players            │
│                                                     │
│ 4. Visualize Detections                            │
│    └─► Draw green boxes around players             │
│    └─► Draw red boxes around ball (if detected)    │
│    └─► Add confidence scores                       │
│                                                     │
│ 5. Generate Output Video                           │
│    └─► Stitch visualized frames into video         │
│    └─► Watch tracking in action!                   │
│                                                     │
│ 6. Optional: Pass Detection (Experimental)         │
│    └─► Track ball movement between players         │
└────────────────────────────────────────────────────┘
```

---

## Expected Output

```
╔══════════════════════════════════════════════════════════════╗
║   ML Pipeline: Real Soccer Video with Player Detection      ║
╚══════════════════════════════════════════════════════════════╝

Test Run Directory: .specweave/test-runs/ml-pipeline-real/2025-10-31T...
YouTube Video: https://youtu.be/mcgbGn-frj4

🧪 Test 1: Check Python Dependencies
   ✅ Python 3.11.5
   ✅ yt_dlp: 2024.8.6
   ✅ cv2: 4.8.1
   ✅ ultralytics: 8.0.200
✅ PASS

🧪 Test 2: Create Test Directories
   ✅ Created test directories:
      - Test run: .specweave/test-runs/ml-pipeline-real/...
      - Frames: .../frames
      - Detections: .../detections_visualized
✅ PASS

🧪 Test 3: Download YouTube Video
   📺 Downloading: https://youtu.be/mcgbGn-frj4
   ⏳ This may take 1-2 minutes...
   ✅ Downloaded: Tottenham vs Liverpool | PL Highlights
      - Duration: 127s
      - Size: 15.32 MB
      - Path: .../videos/soccer_video.mp4
✅ PASS

🧪 Test 4: Extract Frames from Video
   🎬 Extracting frames (1 FPS for 30 seconds)...
   📊 Video info:
      - FPS: 25
      - Total frames: 3175
      - Duration: 127.00s
   ✅ Extracted 30 frames
      Location: .../frames
✅ PASS

🧪 Test 5: Detect Players with Pretrained YOLO
   🤖 Using pretrained YOLOv8 to detect players...
   🔍 Processing 30 frames...
      Processed 5/30 frames... (67 players detected so far)
      Processed 10/30 frames... (142 players detected so far)
      Processed 15/30 frames... (218 players detected so far)
      Processed 20/30 frames... (294 players detected so far)
      Processed 25/30 frames... (371 players detected so far)
      Processed 30/30 frames... (445 players detected so far)
   ✅ Detection complete:
      - Total players detected: 445
      - Avg players per frame: 14.8
      - Detections saved to: .../detections.json
✅ PASS

🧪 Test 6: Visualize Detections with Bounding Boxes
   🎨 Drawing bounding boxes on frames...
   ✅ Visualized 30 frames
   📁 View results: .../detections_visualized
   💡 Open any frame_*.jpg to see player detections!
✅ PASS

🧪 Test 7: Generate Video with Detections
   🎥 Creating video from visualized frames...
   ✅ Video created: .../detections_output.mp4
      - Size: 2.15 MB
   💡 Play this video to see player tracking!
✅ PASS

🧪 Test 8: Optional Pass Detection (Experimental)
   ⚽ Attempting basic pass detection...
   ⚽ Detected 12 potential passes
      Example pass events:
      - Frame 3: 16 players, ball moved 234.56px
      - Frame 7: 14 players, ball moved 189.32px
      - Frame 11: 15 players, ball moved 256.78px
✅ PASS

🧪 Test 9: Generate Comprehensive Report
   📊 Report Generated:
      - Location: .../ml-pipeline-real-video-report.json

   📁 Artifacts (view these!):
      ✅ video_downloaded: .../videos/soccer_video.mp4
      ✅ frames_extracted: .../frames
      ✅ detections_visualized: .../detections_visualized
      ✅ output_video: .../detections_output.mp4
      ✅ detections_json: .../detections.json

   💡 Next Steps:
      1. Open .../detections_visualized
      2. View frame_*.jpg files to see player detections
      3. Play detections_output.mp4 to see tracking
✅ PASS

╔══════════════════════════════════════════════════════════════╗
║                      Test Results Summary                    ║
╚══════════════════════════════════════════════════════════════╝

Total Tests: 9
✅ Passed: 9
❌ Failed: 0
⏭️  Skipped: 0

🎉 Check .../detections_visualized to see player detections!
```

---

## Artifacts Generated

After running the test, you'll find:

```
.specweave/test-runs/ml-pipeline-real/2025-10-31T.../
├── videos/
│   └── soccer_video.mp4              # Downloaded YouTube video (15-20 MB) [GITIGNORED]
├── frames/
│   ├── frame_000.jpg                 # Extracted frames (30 files)
│   ├── frame_001.jpg
│   └── ...
├── detections_visualized/            # ← VIEW THESE!
│   ├── frame_000.jpg                 # Frames with bounding boxes (30 files)
│   ├── frame_001.jpg
│   └── ...
│   └── detections.json               # Detection data (JSON)
├── detections_output.mp4             # Video with detections (2-3 MB)
├── download_youtube.py               # Python scripts (generated)
├── extract_frames.py
├── detect_players.py
├── visualize_detections.py
├── create_video.py
├── detect_passes.py
└── ml-pipeline-real-video-report.json  # Comprehensive report
```

### File Sizes (Typical)
- **YouTube video**: 15-20 MB (excluded from git)
- **Extracted frames**: ~1-2 MB (30 frames × 30-60 KB each)
- **Visualized frames**: ~1-2 MB (same as extracted)
- **Output video**: 2-3 MB
- **Detections JSON**: ~50 KB

**Total**: ~20-30 MB per test run

---

## Viewing Results

### Option 1: View Individual Frames (Recommended)

```bash
# Open detections folder
open .specweave/test-runs/ml-pipeline-real/[timestamp]/detections_visualized/

# View frames in Preview/Image Viewer
# Look for green boxes around players!
```

### Option 2: Watch Detection Video

```bash
# Play output video
open .specweave/test-runs/ml-pipeline-real/[timestamp]/detections_output.mp4

# Or use VLC/any video player
```

### Option 3: Inspect Detections Data

```bash
# View JSON data
cat .specweave/test-runs/ml-pipeline-real/[timestamp]/detections_visualized/detections.json

# Example data structure:
[
  {
    "frame": "frame_000.jpg",
    "players": [
      {
        "bbox": [123.45, 234.56, 156.78, 289.12],
        "confidence": 0.92
      },
      ...
    ],
    "ball": [
      {
        "bbox": [456.78, 123.45, 478.90, 145.67],
        "confidence": 0.85
      }
    ]
  },
  ...
]
```

---

## How It Works

### 1. YouTube Download (yt-dlp)

Uses `yt-dlp` (YouTube downloader) - same library as ec-ml-api:

```python
import yt_dlp

ydl_opts = {
    'format': 'best[ext=mp4]/best',  # Best quality MP4
    'outtmpl': 'soccer_video.%(ext)s',
    'nocheckcertificate': True,
    'geo_bypass': True,
    'http_headers': {
        'User-Agent': 'Mozilla/5.0...',  # Bypass bot detection
    },
}

with yt_dlp.YoutubeDL(ydl_opts) as ydl:
    ydl.download([video_url])
```

**Why yt-dlp?**
- ✅ Works with YouTube (no API key needed)
- ✅ Handles multiple formats
- ✅ Bypasses restrictions
- ✅ Active development (pytube often breaks)

### 2. Frame Extraction (OpenCV)

Extracts 1 frame per second for first 30 seconds:

```python
import cv2

cap = cv2.VideoCapture(video_path)
fps = int(cap.get(cv2.CAP_PROP_FPS))

for second in range(30):
    frame_number = second * fps
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(f'frame_{second:03d}.jpg', frame)
```

**Why 1 FPS?**
- ✅ Fast processing (30 frames vs 750+ frames)
- ✅ Sufficient for detection quality
- ✅ Smaller output files

### 3. Player Detection (Pretrained YOLOv8)

Uses **pretrained** YOLO (no training needed!):

```python
from ultralytics import YOLO

# Load pretrained model (COCO dataset)
model = YOLO('yolov8n.pt')  # Contains 'person' class

# Detect on frame
results = model(frame, conf=0.4)  # 40% confidence threshold

# Filter for 'person' class (class 0 in COCO)
for box in results[0].boxes:
    if int(box.cls[0]) == 0:  # person = player
        bbox = box.xyxy[0].tolist()
        confidence = float(box.conf[0])
```

**Why Pretrained?**
- ✅ No training needed (instant detection)
- ✅ COCO dataset includes 'person' class
- ✅ Works on any video immediately
- ✅ 80+ classes available (person, ball, etc.)

**COCO Classes**:
- Class 0: person (players)
- Class 32: sports ball (soccer ball)
- Class 37: tennis racket
- [Full list: 80 classes]

### 4. Visualization (OpenCV)

Draws bounding boxes and labels:

```python
import cv2

for player in detections['players']:
    x1, y1, x2, y2 = map(int, player['bbox'])
    conf = player['confidence']

    # Green box
    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

    # Label
    label = f'Player {conf:.2f}'
    cv2.putText(frame, label, (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

cv2.imwrite('frame_with_detections.jpg', frame)
```

**Color Coding**:
- **Green**: Players (person class)
- **Red**: Ball (sports ball class)

### 5. Pass Detection (Experimental)

Tracks ball movement between frames:

```python
# Detect passes based on ball position changes
prev_ball_pos = None

for frame_data in detections_data:
    if len(frame_data['ball']) > 0:
        ball_center = calculate_center(frame_data['ball'][0]['bbox'])

        if prev_ball_pos:
            distance = calculate_distance(ball_center, prev_ball_pos)

            # Significant movement = potential pass
            if distance > 100:  # pixels
                passes.append({
                    'frame': frame_number,
                    'distance': distance
                })

        prev_ball_pos = ball_center
```

**Limitations**:
- ⚠️  Ball detection can be unreliable (small object)
- ⚠️  No player assignment (who passed to whom)
- ⚠️  Simple distance threshold (not ML-based)

**Future Enhancements**:
- Use tracking algorithms (DeepSORT, ByteTrack)
- Assign ball to nearest player
- Detect pass direction and velocity
- Classify pass types (short, long, through ball)

---

## Troubleshooting

### "yt-dlp not installed"

```bash
pip install yt-dlp

# Verify
python3 -c "import yt_dlp; print('OK')"
```

### "Video download failed"

**Possible causes**:
1. YouTube blocked the request
2. Video is private/unavailable
3. Network issues

**Solutions**:
- Try a different video URL
- Check internet connection
- Wait and retry (YouTube rate limiting)

### "No players detected"

**Possible causes**:
1. Low confidence threshold (default 0.4)
2. Frame quality issues
3. Players too small in frame

**Solutions**:
```python
# Lower confidence threshold
results = model(frame, conf=0.3)  # Try 30% instead of 40%

# Or check frame quality
print(f"Frame size: {frame.shape}")  # Should be reasonable resolution
```

### "Detections look wrong"

**Check**:
1. Are green boxes around actual players?
2. Is confidence score reasonable (>0.4)?
3. Are there false positives (non-players detected)?

**Adjust**:
```python
# Increase confidence threshold to reduce false positives
results = model(frame, conf=0.6)  # 60% confidence

# Or filter by bounding box size (players should be > 20x20 pixels)
if (x2 - x1) > 20 and (y2 - y1) > 20:
    # Valid detection
```

---

## Performance

### Test Duration

| Stage | Duration | Notes |
|-------|----------|-------|
| Dependency check | <1s | Quick version checks |
| Video download | 30-120s | Depends on video size & network |
| Frame extraction | 2-5s | 30 frames @ 1 FPS |
| Player detection | 20-30s | YOLOv8n on CPU |
| Visualization | 2-3s | Drawing boxes |
| Video generation | 2-3s | Stitching frames |
| **Total** | **1-3 minutes** | Mostly download time |

### Resource Usage

- **CPU**: 100% during detection (YOLOv8)
- **Memory**: ~500 MB (model + frames)
- **Disk**: ~20-30 MB per test run
- **Network**: 15-20 MB download

**GPU Support**: If GPU available, detection is 5-10x faster:

```python
# Enable GPU (CUDA/MPS)
model = YOLO('yolov8n.pt')
results = model(frame, device='cuda')  # or 'mps' for Apple Silicon
```

---

## Comparison with Synthetic Test

| Feature | Synthetic Test | Real Video Test |
|---------|----------------|-----------------|
| **Data Source** | Generated circles | Real YouTube video |
| **Realism** | Low (toy data) | High (actual players) |
| **Training** | Yes (3 epochs) | No (pretrained model) |
| **Speed** | Fast (~30s total) | Medium (~1-3 min) |
| **Use Case** | Testing pipeline | Realistic detection |
| **Visualization** | Synthetic frames | Real soccer frames |
| **File Size** | Small (~2 MB) | Large (~20-30 MB) |
| **Internet Required** | No | Yes (download video) |

**When to Use**:
- **Synthetic**: CI/CD, quick pipeline validation
- **Real Video**: Demo, visual verification, realistic testing

---

## Advanced Use Cases

### 1. Use Your Own Video

Replace the YouTube URL:

```typescript
// In ml-pipeline-real-video.test.ts
private readonly youtubeUrl = 'https://youtu.be/YOUR_VIDEO_ID';
```

Or pass as environment variable:

```bash
export TEST_YOUTUBE_URL="https://youtu.be/YOUR_VIDEO_ID"
npm run test:ml:real
```

### 2. Detect Other Objects

YOLO can detect 80+ classes:

```python
# Detect ball (class 32)
if int(box.cls[0]) == 32:
    # Sports ball detected

# Detect referee (also 'person' but different jersey)
# Would need custom training or color filtering

# Full COCO classes:
# 0: person, 1: bicycle, 2: car, 3: motorcycle, ...
# 32: sports ball, 33: kite, 34: baseball bat, ...
```

### 3. Track Individual Players

Use DeepSORT for tracking:

```bash
pip install deep-sort-realtime

# Then in Python
from deep_sort_realtime.deepsort_tracker import DeepSort

tracker = DeepSort()
tracks = tracker.update_tracks(detections, frame)

for track in tracks:
    track_id = track.track_id  # Unique ID per player
    bbox = track.to_ltrb()      # Bounding box
```

### 4. Export to CSV

```python
import csv

with open('detections.csv', 'w') as f:
    writer = csv.writer(f)
    writer.writerow(['frame', 'player_id', 'x1', 'y1', 'x2', 'y2', 'confidence'])

    for frame_data in detections_data:
        for i, player in enumerate(frame_data['players']):
            writer.writerow([
                frame_data['frame'],
                i,
                *player['bbox'],
                player['confidence']
            ])
```

---

## Future Enhancements

### Short-term
- [ ] GPU support detection and usage
- [ ] Configurable confidence thresholds
- [ ] Export detections to multiple formats (CSV, JSON, XML)
- [ ] Support for custom YOLO models

### Medium-term
- [ ] Real pass detection with player tracking
- [ ] Heat maps (where players spend time)
- [ ] Player jersey color classification (team detection)
- [ ] Ball possession tracking

### Long-term
- [ ] Action recognition (shot, tackle, corner)
- [ ] Player identification (jersey numbers with OCR)
- [ ] Tactical analysis (formation detection)
- [ ] Real-time streaming support

---

## Resources

### Documentation
- [YOLOv8 Docs](https://docs.ultralytics.com/)
- [yt-dlp Docs](https://github.com/yt-dlp/yt-dlp)
- [OpenCV Docs](https://docs.opencv.org/)

### Related Tests
- `ml-pipeline-soccer-detection.test.ts` - Synthetic data version
- `jira-bidirectional-sync.test.ts` - Integration test pattern

### External Repos
- `/Users/antonabyzov/Projects/easychamp/ec-ml-api` - YouTube downloader source
- `/Users/antonabyzov/Projects/github/ml_soccer_roboflow` - Soccer analytics examples

---

## Contributing

To add new features:

1. **Fork the test** - Copy to new file
2. **Modify detection** - Change Python scripts
3. **Update docs** - Document new features
4. **Test locally** - Ensure it works
5. **Submit PR** - Include examples

---

## License

MIT License - Same as SpecWeave

---

**Author**: SpecWeave Contributors
**Created**: 2025-10-31
**Status**: ✅ Complete and Functional
