/**
 * ML Pipeline Workflow Integration Test - Real Soccer Video with Visualization
 *
 * This test downloads a real soccer match video from YouTube and demonstrates:
 * 1. YouTube video download (yt-dlp)
 * 2. Frame extraction from video
 * 3. Player detection using pretrained YOLOv8
 * 4. Visualization with bounding boxes
 * 5. Optional: Pass detection (tracking ball and player movements)
 *
 * Based on user request: https://youtu.be/mcgbGn-frj4
 *
 * Prerequisites:
 * - Python 3.9+
 * - yt-dlp (pip install yt-dlp)
 * - OpenCV (pip install opencv-python)
 * - Ultralytics YOLO (pip install ultralytics)
 *
 * Run: npm run test:ml:real
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  duration: number;
  message?: string;
  details?: any;
}

interface PythonCheck {
  available: boolean;
  version?: string;
  pip_packages?: {
    yt_dlp?: string;
    cv2?: string;
    ultralytics?: string;
  };
}

class MLPipelineRealVideoTest {
  private results: TestResult[] = [];
  private testRunDir: string;
  private videoPath: string = '';
  private framesDir: string;
  private detectionsDir: string;
  private pythonCheck: PythonCheck = { available: false };

  // YouTube video URL from user
  private readonly youtubeUrl = 'https://youtu.be/mcgbGn-frj4';

  constructor() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.testRunDir = path.join(process.cwd(), '.specweave', 'test-runs', 'ml-pipeline-real', timestamp);
    this.framesDir = path.join(this.testRunDir, 'frames');
    this.detectionsDir = path.join(this.testRunDir, 'detections_visualized');
  }

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║   ML Pipeline: Real Soccer Video with Player Detection      ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`Test Run Directory: ${this.testRunDir}`);
    console.log(`YouTube Video: ${this.youtubeUrl}\n`);

    try {
      // Setup phase
      await this.test1_CheckPythonDependencies();

      if (!this.pythonCheck.available) {
        console.log('\n⚠️  Python dependencies not available. Skipping remaining tests.');
        return;
      }

      await this.test2_CreateTestDirectories();
      await this.test3_DownloadYouTubeVideo();
      await this.test4_ExtractFrames();

      // Detection phase
      await this.test5_DetectPlayersWithPretrainedYOLO();
      await this.test6_VisualizeDetections();
      await this.test7_GenerateVideoWithDetections();

      // Optional: Advanced analysis
      await this.test8_OptionalPassDetection();

      // Reporting
      await this.test9_GenerateReport();
    } catch (error) {
      console.error('❌ Test suite failed:', error);
    } finally {
      await this.generateReport();
    }
  }

  private async test1_CheckPythonDependencies(): Promise<void> {
    const testName = 'Test 1: Check Python Dependencies';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      let pythonCmd = 'python3';
      try {
        const versionOutput = execSync(`${pythonCmd} --version`, { encoding: 'utf-8', stdio: 'pipe' });
        this.pythonCheck.version = versionOutput.trim();
        this.pythonCheck.available = true;
      } catch {
        try {
          pythonCmd = 'python';
          const versionOutput = execSync(`${pythonCmd} --version`, { encoding: 'utf-8', stdio: 'pipe' });
          this.pythonCheck.version = versionOutput.trim();
          this.pythonCheck.available = true;
        } catch {
          throw new Error('Python not found. Please install Python 3.9+');
        }
      }

      console.log(`   ✅ ${this.pythonCheck.version}`);

      // Check required packages
      const packages = ['yt_dlp', 'cv2', 'ultralytics'];
      const installedPackages: any = {};

      for (const pkg of packages) {
        try {
          const checkScript = `import ${pkg}; print(${pkg}.__version__ if hasattr(${pkg}, '__version__') else 'installed')`;
          const output = execSync(`${pythonCmd} -c "${checkScript}"`, {
            encoding: 'utf-8',
            stdio: 'pipe'
          });
          installedPackages[pkg] = output.trim();
          console.log(`   ✅ ${pkg}: ${installedPackages[pkg]}`);
        } catch {
          console.log(`   ❌ ${pkg}: not installed`);
          throw new Error(`Missing Python package: ${pkg}. Install with: pip install ${pkg === 'cv2' ? 'opencv-python' : pkg}`);
        }
      }

      this.pythonCheck.pip_packages = installedPackages;

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'All Python dependencies available',
        details: { python: this.pythonCheck }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.pythonCheck.available = false;
      this.results.push({
        name: testName,
        status: 'SKIP',
        duration: Date.now() - start,
        message: error.message,
        details: { reason: 'Missing dependencies' }
      });
      console.log(`⏭️  SKIP: ${error.message}\n`);
    }
  }

  private async test2_CreateTestDirectories(): Promise<void> {
    const testName = 'Test 2: Create Test Directories';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const dirs = [
        this.testRunDir,
        this.framesDir,
        this.detectionsDir,
        path.join(this.testRunDir, 'videos')
      ];

      dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      console.log(`   ✅ Created test directories:`);
      console.log(`      - Test run: ${this.testRunDir}`);
      console.log(`      - Frames: ${this.framesDir}`);
      console.log(`      - Detections: ${this.detectionsDir}`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'Test directories created',
        details: { testRunDir: this.testRunDir }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
      throw error;
    }
  }

  private async test3_DownloadYouTubeVideo(): Promise<void> {
    const testName = 'Test 3: Download YouTube Video';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      console.log(`   📺 Downloading: ${this.youtubeUrl}`);
      console.log(`   ⏳ This may take 1-2 minutes depending on video size...`);

      // Python script using yt-dlp (copied from ec-ml-api)
      const downloadScript = `
import yt_dlp
import os

output_dir = "${path.join(this.testRunDir, 'videos').replace(/\\/g, '/')}"
video_url = "${this.youtubeUrl}"

ydl_opts = {
    'format': 'best[ext=mp4]/best',  # Get best quality MP4
    'outtmpl': os.path.join(output_dir, 'soccer_video.%(ext)s'),
    'quiet': False,
    'no_warnings': False,
    'merge_output_format': 'mp4',
    'nocheckcertificate': True,
    'geo_bypass': True,
    'http_headers': {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
    'retries': 10,
    'fragment_retries': 10,
}

try:
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(video_url, download=True)
        title = info.get('title', 'Unknown')
        duration = info.get('duration', 0)

        print(f"✅ Downloaded: {title}")
        print(f"   Duration: {duration}s")

        # Find the downloaded file
        for file in os.listdir(output_dir):
            if file.startswith('soccer_video') and file.endswith(('.mp4', '.webm', '.mkv')):
                file_path = os.path.join(output_dir, file)
                size_mb = os.path.getsize(file_path) / (1024 * 1024)
                print(f"   Size: {size_mb:.2f} MB")
                print(f"   Path: {file_path}")
except Exception as e:
    print(f"❌ Download failed: {str(e)}")
    raise
`;

      const scriptPath = path.join(this.testRunDir, 'download_youtube.py');
      fs.writeFileSync(scriptPath, downloadScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';
      execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'inherit',  // Show download progress
        timeout: 180000,  // 3 minute timeout
        cwd: this.testRunDir  // Run in test directory to contain runs/ folder
      });

      // Find downloaded video
      const videosDir = path.join(this.testRunDir, 'videos');
      const videoFiles = fs.readdirSync(videosDir).filter(f =>
        f.startsWith('soccer_video') && (f.endsWith('.mp4') || f.endsWith('.webm') || f.endsWith('.mkv'))
      );

      if (videoFiles.length === 0) {
        throw new Error('Video file not found after download');
      }

      this.videoPath = path.join(videosDir, videoFiles[0]);
      const videoStats = fs.statSync(this.videoPath);
      const sizeMB = videoStats.size / (1024 * 1024);

      console.log(`   ✅ Video downloaded successfully:`);
      console.log(`      - Path: ${this.videoPath}`);
      console.log(`      - Size: ${sizeMB.toFixed(2)} MB`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Video downloaded (${sizeMB.toFixed(2)} MB)`,
        details: { videoPath: this.videoPath, sizeMB }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
      throw error;
    }
  }

  private async test4_ExtractFrames(): Promise<void> {
    const testName = 'Test 4: Extract Frames from Video';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      console.log(`   🎬 Extracting frames (1 frame per second for first 30 seconds)...`);

      const extractScript = `
import cv2
import os

video_path = "${this.videoPath.replace(/\\/g, '/')}"
output_dir = "${this.framesDir.replace(/\\/g, '/')}"

cap = cv2.VideoCapture(video_path)
fps = int(cap.get(cv2.CAP_PROP_FPS))
total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
duration = total_frames / fps if fps > 0 else 0

print(f"📊 Video info:")
print(f"   - FPS: {fps}")
print(f"   - Total frames: {total_frames}")
print(f"   - Duration: {duration:.2f}s")

# Extract 1 frame per second for first 30 seconds (or less if video is shorter)
max_seconds = min(30, int(duration))
frame_count = 0

for second in range(max_seconds):
    frame_number = second * fps
    cap.set(cv2.CAP_PROP_POS_FRAMES, frame_number)
    ret, frame = cap.read()

    if ret:
        output_path = os.path.join(output_dir, f'frame_{second:03d}.jpg')
        cv2.imwrite(output_path, frame)
        frame_count += 1
        if frame_count % 5 == 0:
            print(f"   Extracted {frame_count}/{max_seconds} frames...")

cap.release()
print(f"✅ Extracted {frame_count} frames")
`;

      const scriptPath = path.join(this.testRunDir, 'extract_frames.py');
      fs.writeFileSync(scriptPath, extractScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';
      execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'inherit',
        cwd: this.testRunDir  // Run in test directory to contain runs/ folder
      });

      const extractedFrames = fs.readdirSync(this.framesDir).filter(f => f.endsWith('.jpg'));

      console.log(`   ✅ Extracted ${extractedFrames.length} frames`);
      console.log(`      Location: ${this.framesDir}`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Extracted ${extractedFrames.length} frames`,
        details: { frameCount: extractedFrames.length, framesDir: this.framesDir }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
      throw error;
    }
  }

  private async test5_DetectPlayersWithPretrainedYOLO(): Promise<void> {
    const testName = 'Test 5: Detect Players with Pretrained YOLO';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      console.log(`   🤖 Using pretrained YOLOv8 to detect players...`);
      console.log(`   ⏳ This may take 20-30 seconds...`);

      const detectionScript = `
from ultralytics import YOLO
import cv2
import os
import glob
import json

# Load pretrained YOLOv8 model (COCO dataset - includes 'person' class)
model = YOLO('yolov8n.pt')  # Nano model for speed

frames_dir = "${this.framesDir.replace(/\\/g, '/')}"
output_dir = "${this.detectionsDir.replace(/\\/g, '/')}"

# Get all frame files
frame_files = sorted(glob.glob(os.path.join(frames_dir, 'frame_*.jpg')))

detections_data = []
total_detections = 0

print(f"🔍 Processing {len(frame_files)} frames...")

for i, frame_path in enumerate(frame_files):
    frame = cv2.imread(frame_path)

    # Run YOLO detection
    results = model(frame, conf=0.4, verbose=False)

    # Filter for 'person' class (class 0 in COCO)
    # COCO classes: 0=person, 32=sports ball, etc.
    boxes = results[0].boxes

    frame_detections = {
        'frame': os.path.basename(frame_path),
        'players': [],
        'ball': []
    }

    if boxes is not None:
        for box in boxes:
            class_id = int(box.cls[0])
            confidence = float(box.conf[0])
            bbox = box.xyxy[0].tolist()  # [x1, y1, x2, y2]

            # Class 0 = person (player)
            if class_id == 0:
                frame_detections['players'].append({
                    'bbox': bbox,
                    'confidence': confidence
                })
                total_detections += 1

            # Class 32 = sports ball (optional)
            elif class_id == 32:
                frame_detections['ball'].append({
                    'bbox': bbox,
                    'confidence': confidence
                })

    detections_data.append(frame_detections)

    if (i + 1) % 5 == 0:
        print(f"   Processed {i + 1}/{len(frame_files)} frames... ({total_detections} players detected so far)")

# Save detections data
detections_file = os.path.join(output_dir, 'detections.json')
with open(detections_file, 'w') as f:
    json.dump(detections_data, f, indent=2)

print(f"✅ Detection complete:")
print(f"   - Total players detected: {total_detections}")
print(f"   - Avg players per frame: {total_detections / len(frame_files):.1f}")
print(f"   - Detections saved to: {detections_file}")
`;

      const scriptPath = path.join(this.testRunDir, 'detect_players.py');
      fs.writeFileSync(scriptPath, detectionScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';
      execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'inherit',
        timeout: 60000,
        cwd: this.testRunDir  // Run in test directory to contain runs/ folder
      });

      // Read detections data
      const detectionsFile = path.join(this.detectionsDir, 'detections.json');
      const detectionsData = JSON.parse(fs.readFileSync(detectionsFile, 'utf-8'));

      const totalPlayers = detectionsData.reduce((sum: number, frame: any) => sum + frame.players.length, 0);
      const avgPlayers = totalPlayers / detectionsData.length;

      console.log(`   ✅ Player detection complete:`);
      console.log(`      - Total players detected: ${totalPlayers}`);
      console.log(`      - Average per frame: ${avgPlayers.toFixed(1)}`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Detected ${totalPlayers} players across ${detectionsData.length} frames`,
        details: { totalPlayers, avgPlayers: avgPlayers.toFixed(1) }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
      throw error;
    }
  }

  private async test6_VisualizeDetections(): Promise<void> {
    const testName = 'Test 6: Visualize Detections with Bounding Boxes';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      console.log(`   🎨 Drawing bounding boxes on frames...`);

      const visualizeScript = `
import cv2
import json
import os

frames_dir = "${this.framesDir.replace(/\\/g, '/')}"
output_dir = "${this.detectionsDir.replace(/\\/g, '/')}"
detections_file = os.path.join(output_dir, 'detections.json')

# Load detections
with open(detections_file, 'r') as f:
    detections_data = json.load(f)

for frame_data in detections_data:
    frame_name = frame_data['frame']
    frame_path = os.path.join(frames_dir, frame_name)
    frame = cv2.imread(frame_path)

    # Draw bounding boxes for players
    for player in frame_data['players']:
        bbox = player['bbox']
        conf = player['confidence']
        x1, y1, x2, y2 = map(int, bbox)

        # Green box for players
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

        # Confidence label
        label = f'Player {conf:.2f}'
        cv2.putText(frame, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

    # Draw bounding boxes for ball (if detected)
    for ball in frame_data['ball']:
        bbox = ball['bbox']
        conf = ball['confidence']
        x1, y1, x2, y2 = map(int, bbox)

        # Red box for ball
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)

        label = f'Ball {conf:.2f}'
        cv2.putText(frame, label, (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

    # Save visualized frame
    output_path = os.path.join(output_dir, frame_name)
    cv2.imwrite(output_path, frame)

print(f"✅ Visualized {len(detections_data)} frames")
print(f"   Saved to: {output_dir}")
`;

      const scriptPath = path.join(this.testRunDir, 'visualize_detections.py');
      fs.writeFileSync(scriptPath, visualizeScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';
      execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'inherit',
        cwd: this.testRunDir  // Run in test directory to contain runs/ folder
      });

      const visualizedFrames = fs.readdirSync(this.detectionsDir).filter(f => f.endsWith('.jpg'));

      console.log(`   ✅ Visualized ${visualizedFrames.length} frames`);
      console.log(`   📁 View results: ${this.detectionsDir}`);
      console.log(`   💡 Open any frame_*.jpg to see player detections!`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Visualized ${visualizedFrames.length} frames`,
        details: { detectionsDir: this.detectionsDir, frameCount: visualizedFrames.length }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
      throw error;
    }
  }

  private async test7_GenerateVideoWithDetections(): Promise<void> {
    const testName = 'Test 7: Generate Video with Detections';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      console.log(`   🎥 Creating video from visualized frames...`);

      const videoScript = `
import cv2
import os
import glob

detections_dir = "${this.detectionsDir.replace(/\\/g, '/')}"
output_video = os.path.join("${this.testRunDir.replace(/\\/g, '/')}", 'detections_output.mp4')

# Get all visualized frames
frame_files = sorted(glob.glob(os.path.join(detections_dir, 'frame_*.jpg')))

if len(frame_files) == 0:
    raise Exception("No frames found")

# Read first frame to get dimensions
first_frame = cv2.imread(frame_files[0])
height, width = first_frame.shape[:2]

# Create video writer
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
fps = 1  # 1 fps since we extracted 1 frame per second
out = cv2.VideoWriter(output_video, fourcc, fps, (width, height))

for frame_file in frame_files:
    frame = cv2.imread(frame_file)
    out.write(frame)

out.release()
print(f"✅ Video created: {output_video}")
`;

      const scriptPath = path.join(this.testRunDir, 'create_video.py');
      fs.writeFileSync(scriptPath, videoScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';
      execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'inherit',
        cwd: this.testRunDir  // Run in test directory to contain runs/ folder
      });

      const videoPath = path.join(this.testRunDir, 'detections_output.mp4');
      const videoSize = fs.statSync(videoPath).size / (1024 * 1024);

      console.log(`   ✅ Video with detections created:`);
      console.log(`      - Path: ${videoPath}`);
      console.log(`      - Size: ${videoSize.toFixed(2)} MB`);
      console.log(`   💡 Play this video to see player tracking!`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Video created (${videoSize.toFixed(2)} MB)`,
        details: { videoPath, sizeMB: videoSize.toFixed(2) }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
      throw error;
    }
  }

  private async test8_OptionalPassDetection(): Promise<void> {
    const testName = 'Test 8: Optional Pass Detection (Experimental)';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      console.log(`   ⚽ Attempting basic pass detection...`);
      console.log(`   Note: This is experimental and requires ball detection + tracking`);

      // Simple pass detection logic (experimental)
      const passScript = `
import json
import os

detections_file = "${path.join(this.detectionsDir, 'detections.json').replace(/\\/g, '/')}"

with open(detections_file, 'r') as f:
    detections_data = json.load(f)

# Simple pass detection: check for ball movement between players
passes = []
prev_ball_pos = None

for i, frame_data in enumerate(detections_data):
    if len(frame_data['ball']) > 0:
        ball = frame_data['ball'][0]
        ball_center = [
            (ball['bbox'][0] + ball['bbox'][2]) / 2,
            (ball['bbox'][1] + ball['bbox'][3]) / 2
        ]

        if prev_ball_pos is not None:
            # Calculate ball movement
            dx = ball_center[0] - prev_ball_pos[0]
            dy = ball_center[1] - prev_ball_pos[1]
            distance = (dx**2 + dy**2)**0.5

            # If ball moved significantly, might be a pass
            if distance > 100:  # Threshold in pixels
                # Find nearest players before and after
                passes.append({
                    'frame': i,
                    'distance': round(distance, 2),
                    'players_in_frame': len(frame_data['players'])
                })

        prev_ball_pos = ball_center

print(f"⚽ Detected {len(passes)} potential passes")
if len(passes) > 0:
    print(f"   Example pass events:")
    for pass_event in passes[:5]:  # Show first 5
        print(f"   - Frame {pass_event['frame']}: {pass_event['players_in_frame']} players, ball moved {pass_event['distance']}px")
else:
    print(f"   ⚠️  No passes detected (ball detection may be limited)")
`;

      const scriptPath = path.join(this.testRunDir, 'detect_passes.py');
      fs.writeFileSync(scriptPath, passScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';
      execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'inherit',
        cwd: this.testRunDir  // Run in test directory to contain runs/ folder
      });

      console.log(`   ℹ️  Pass detection is experimental and may need refinement`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'Experimental pass detection completed',
        details: { note: 'Requires ball detection and tracking refinement' }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'SKIP',
        duration: Date.now() - start,
        message: `Pass detection skipped: ${error.message}`
      });
      console.log(`⏭️  SKIP: ${error.message}\n`);
    }
  }

  private async test9_GenerateReport(): Promise<void> {
    const testName = 'Test 9: Generate Comprehensive Report';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const artifacts = {
        video_downloaded: this.videoPath,
        frames_extracted: this.framesDir,
        detections_visualized: this.detectionsDir,
        output_video: path.join(this.testRunDir, 'detections_output.mp4'),
        detections_json: path.join(this.detectionsDir, 'detections.json')
      };

      const report = {
        pipeline: 'Real Soccer Video with Player Detection',
        youtube_url: this.youtubeUrl,
        test_run: new Date().toISOString(),
        python_environment: this.pythonCheck,
        artifacts: artifacts,
        test_results: this.results,
        summary: {
          total_tests: this.results.length,
          passed: this.results.filter(r => r.status === 'PASS').length,
          failed: this.results.filter(r => r.status === 'FAIL').length,
          skipped: this.results.filter(r => r.status === 'SKIP').length
        }
      };

      const reportPath = path.join(this.testRunDir, 'ml-pipeline-real-video-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`   📊 Report Generated:`);
      console.log(`      - Location: ${reportPath}`);
      console.log(`\n   📁 Artifacts (view these!):`);
      Object.entries(artifacts).forEach(([key, value]) => {
        const exists = fs.existsSync(value);
        console.log(`      ${exists ? '✅' : '❌'} ${key}: ${value}`);
      });

      console.log(`\n   💡 Next Steps:`);
      console.log(`      1. Open ${this.detectionsDir}`);
      console.log(`      2. View frame_*.jpg files to see player detections`);
      console.log(`      3. Play detections_output.mp4 to see tracking`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'Report generated',
        details: { reportPath }
      });
      console.log('✅ PASS\n');
    } catch (error: any) {
      this.results.push({
        name: testName,
        status: 'FAIL',
        duration: Date.now() - start,
        message: error.message
      });
      console.log(`❌ FAIL: ${error.message}\n`);
    }
  }

  private async generateReport(): Promise<void> {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                      Test Results Summary                    ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const skipped = this.results.filter(r => r.status === 'SKIP').length;
    const total = this.results.length;

    console.log(`Total Tests: ${total}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}\n`);

    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️ ';
      console.log(`${icon} ${result.name} (${result.duration}ms)`);
      if (result.message) {
        console.log(`   ${result.message}`);
      }
    });

    // Save summary report
    const resultsDir = path.join(process.cwd(), 'test-results', 'ml-pipeline-real-video');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `ml-pipeline-real-video-${timestamp}.json`);

    const report = {
      suite: 'ML Pipeline: Real Soccer Video with Player Detection',
      timestamp: new Date().toISOString(),
      summary: { total, passed, failed, skipped },
      results: this.results,
      artifacts: {
        test_run_dir: this.testRunDir,
        detections_dir: this.detectionsDir,
        preserved: true
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Report saved to: ${reportPath}`);
    console.log(`\n🎉 Check ${this.detectionsDir} to see player detections!`);
  }
}

// Run tests
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const test = new MLPipelineRealVideoTest();
  test.run().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { MLPipelineRealVideoTest };
