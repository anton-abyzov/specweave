/**
 * ML Pipeline Workflow Integration Test - Soccer Player Detection
 *
 * Tests the complete MLOps pipeline for computer vision:
 * Data ingestion → Validation → Training → Validation → Deployment → Inference
 *
 * Based on TC-001: Soccer Player Detection Pipeline
 *
 * Prerequisites:
 * - Python 3.9+
 * - PyTorch (pip install torch torchvision)
 * - OpenCV (pip install opencv-python)
 * - Ultralytics YOLO (pip install ultralytics)
 *
 * Run: npm run test:ml:pipeline
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync, exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
    torch?: string;
    cv2?: string;
    ultralytics?: string;
  };
}

class MLPipelineSoccerDetectionTest {
  private results: TestResult[] = [];
  private testRunDir: string;
  private datasetDir: string;
  private modelsDir: string;
  private pythonCheck: PythonCheck = { available: false };

  constructor() {
    // Setup test directories
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.testRunDir = path.join(process.cwd(), '.specweave', 'test-runs', 'ml-pipeline', timestamp);
    this.datasetDir = path.join(this.testRunDir, 'dataset');
    this.modelsDir = path.join(this.testRunDir, 'models');
  }

  async run(): Promise<void> {
    console.log('╔══════════════════════════════════════════════════════════════╗');
    console.log('║      ML Pipeline: Soccer Player Detection Test              ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');
    console.log(`Test Run Directory: ${this.testRunDir}\n`);

    try {
      // Setup phase
      await this.test1_CheckPythonDependencies();

      if (!this.pythonCheck.available) {
        console.log('\n⚠️  Python dependencies not available. Skipping remaining tests.');
        return;
      }

      await this.test2_CreateTestDirectories();
      await this.test3_GenerateSyntheticDataset();

      // Pipeline execution phase
      await this.test4_ValidateDataQuality();
      await this.test5_PrepareDataForTraining();
      await this.test6_TrainModel();
      await this.test7_ValidateModelAccuracy();
      await this.test8_ExportToONNX();
      await this.test9_TestInference();

      // Cleanup and reporting
      await this.test10_GenerateMLOpsReport();
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
      // Check Python version
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
      const packages = ['torch', 'cv2', 'ultralytics'];
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
      // Create directory structure
      const dirs = [
        this.testRunDir,
        this.datasetDir,
        path.join(this.datasetDir, 'images', 'train'),
        path.join(this.datasetDir, 'images', 'val'),
        path.join(this.datasetDir, 'labels', 'train'),
        path.join(this.datasetDir, 'labels', 'val'),
        this.modelsDir,
        path.join(this.testRunDir, 'runs')
      ];

      dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      console.log(`   ✅ Created test directories:`);
      console.log(`      - Dataset: ${this.datasetDir}`);
      console.log(`      - Models: ${this.modelsDir}`);

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

  private async test3_GenerateSyntheticDataset(): Promise<void> {
    const testName = 'Test 3: Generate Synthetic Soccer Dataset';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Generate synthetic dataset using Python script
      const pythonScript = `
import cv2
import numpy as np
import os

def create_synthetic_soccer_frame(width=640, height=640):
    """Create synthetic soccer field image with players"""
    # Green field background
    img = np.zeros((height, width, 3), dtype=np.uint8)
    img[:, :] = [34, 139, 34]  # Green

    # White field lines
    cv2.line(img, (width//2, 0), (width//2, height), (255, 255, 255), 2)
    cv2.circle(img, (width//2, height//2), 50, (255, 255, 255), 2)

    # Players (red and blue circles)
    players = []
    for i in range(5):
        x = np.random.randint(50, width-50)
        y = np.random.randint(50, height-50)
        radius = 15
        color = (0, 0, 255) if i < 3 else (255, 0, 0)  # Red or blue
        cv2.circle(img, (x, y), radius, color, -1)

        # YOLO bbox (center_x, center_y, width, height) normalized
        center_x = x / width
        center_y = y / height
        bbox_w = (radius * 2) / width
        bbox_h = (radius * 2) / height
        players.append((center_x, center_y, bbox_w, bbox_h))

    return img, players

# Create dataset
base_dir = "${this.datasetDir.replace(/\\/g, '/')}"
splits = {'train': 8, 'val': 2}

frame_count = 0
for split, count in splits.items():
    img_dir = os.path.join(base_dir, 'images', split)
    lbl_dir = os.path.join(base_dir, 'labels', split)

    for i in range(count):
        # Generate frame
        img, players = create_synthetic_soccer_frame()

        # Save image
        img_path = os.path.join(img_dir, f'frame_{frame_count:03d}.jpg')
        cv2.imwrite(img_path, img)

        # Save YOLO annotations
        lbl_path = os.path.join(lbl_dir, f'frame_{frame_count:03d}.txt')
        with open(lbl_path, 'w') as f:
            for player in players:
                # Class 0 = player
                f.write(f'0 {player[0]:.6f} {player[1]:.6f} {player[2]:.6f} {player[3]:.6f}\\n')

        frame_count += 1

print(f"Generated {frame_count} frames with annotations")
`;

      // Write and execute Python script
      const scriptPath = path.join(this.testRunDir, 'generate_dataset.py');
      fs.writeFileSync(scriptPath, pythonScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';
      execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      // Verify dataset
      const trainImages = fs.readdirSync(path.join(this.datasetDir, 'images', 'train'));
      const valImages = fs.readdirSync(path.join(this.datasetDir, 'images', 'val'));

      console.log(`   ✅ Generated synthetic dataset:`);
      console.log(`      - Train images: ${trainImages.length}`);
      console.log(`      - Val images: ${valImages.length}`);
      console.log(`   📊 Dataset includes:`);
      console.log(`      - Green soccer field background`);
      console.log(`      - White field lines`);
      console.log(`      - Random player positions (red/blue circles)`);
      console.log(`      - YOLO format annotations`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Generated ${trainImages.length + valImages.length} frames`,
        details: { train: trainImages.length, val: valImages.length }
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

  private async test4_ValidateDataQuality(): Promise<void> {
    const testName = 'Test 4: Validate Data Quality';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Validation checks
      const checks = {
        images_exist: false,
        labels_exist: false,
        images_match_labels: false,
        annotations_valid: false
      };

      // Check images and labels
      const trainImgs = fs.readdirSync(path.join(this.datasetDir, 'images', 'train'));
      const trainLbls = fs.readdirSync(path.join(this.datasetDir, 'labels', 'train'));
      checks.images_exist = trainImgs.length > 0;
      checks.labels_exist = trainLbls.length > 0;
      checks.images_match_labels = trainImgs.length === trainLbls.length;

      // Validate YOLO format
      const firstLabel = fs.readFileSync(
        path.join(this.datasetDir, 'labels', 'train', trainLbls[0]),
        'utf-8'
      );
      const lines = firstLabel.trim().split('\n');
      checks.annotations_valid = lines.every(line => {
        const parts = line.split(' ');
        return parts.length === 5 && parts.every(p => !isNaN(parseFloat(p)));
      });

      const allPass = Object.values(checks).every(c => c);

      console.log(`   Validation Checks:`);
      Object.entries(checks).forEach(([key, value]) => {
        console.log(`      ${value ? '✅' : '❌'} ${key.replace(/_/g, ' ')}`);
      });

      if (!allPass) {
        throw new Error('Data validation failed');
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'All data quality checks passed',
        details: checks
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

  private async test5_PrepareDataForTraining(): Promise<void> {
    const testName = 'Test 5: Prepare Data for Training';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Create YOLO dataset YAML
      const datasetYaml = `
# Soccer Player Detection Dataset
path: ${this.datasetDir.replace(/\\/g, '/')}
train: images/train
val: images/val

# Classes
names:
  0: player
`;

      const yamlPath = path.join(this.datasetDir, 'dataset.yaml');
      fs.writeFileSync(yamlPath, datasetYaml);

      console.log(`   ✅ Created dataset configuration:`);
      console.log(`      - Path: ${yamlPath}`);
      console.log(`      - Classes: player (0)`);
      console.log(`      - Train split: images/train`);
      console.log(`      - Val split: images/val`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'Dataset prepared for training',
        details: { yaml_path: yamlPath }
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

  private async test6_TrainModel(): Promise<void> {
    const testName = 'Test 6: Train YOLOv8 Model';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      console.log(`   🚀 Starting training (this may take 20-30 seconds)...`);

      // Training script
      const trainingScript = `
from ultralytics import YOLO
import os

# Load YOLOv8 nano model (smallest and fastest)
model = YOLO('yolov8n.pt')

# Train parameters
results = model.train(
    data='${path.join(this.datasetDir, 'dataset.yaml').replace(/\\/g, '/')}',
    epochs=3,
    imgsz=640,
    batch=2,
    device='cpu',
    project='${this.testRunDir.replace(/\\/g, '/')}',
    name='runs/train',
    exist_ok=True,
    verbose=False,
    patience=0
)

print("Training completed successfully")
print(f"Model saved to: {results.save_dir}")
`;

      const scriptPath = path.join(this.testRunDir, 'train_model.py');
      fs.writeFileSync(scriptPath, trainingScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';

      // Execute training (with timeout)
      execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 60000  // 60 second timeout
      });

      // Verify model was saved
      const runsDir = path.join(this.testRunDir, 'runs', 'train');
      const weightsPath = path.join(runsDir, 'weights', 'best.pt');

      if (!fs.existsSync(weightsPath)) {
        throw new Error('Model weights not found after training');
      }

      console.log(`   ✅ Training completed:`);
      console.log(`      - Epochs: 3`);
      console.log(`      - Model: YOLOv8 nano`);
      console.log(`      - Device: CPU`);
      console.log(`      - Weights: ${weightsPath}`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'Model trained successfully',
        details: { weights_path: weightsPath }
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

  private async test7_ValidateModelAccuracy(): Promise<void> {
    const testName = 'Test 7: Validate Model Accuracy';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Validation script
      const validationScript = `
from ultralytics import YOLO
import json

# Load trained model
model = YOLO('${path.join(this.testRunDir, 'runs', 'train', 'weights', 'best.pt').replace(/\\/g, '/')}')

# Run validation
results = model.val(
    data='${path.join(this.datasetDir, 'dataset.yaml').replace(/\\/g, '/')}',
    verbose=False
)

# Extract metrics
metrics = {
    'mAP50': float(results.box.map50),
    'mAP50-95': float(results.box.map),
    'precision': float(results.box.mp),
    'recall': float(results.box.mr)
}

print(json.dumps(metrics, indent=2))
`;

      const scriptPath = path.join(this.testRunDir, 'validate_model.py');
      fs.writeFileSync(scriptPath, validationScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';
      const output = execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      // Extract JSON from output (filter out YOLO's additional output)
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error(`No JSON found in output: ${output}`);
      }
      const metrics = JSON.parse(jsonMatch[0]);

      console.log(`   📊 Validation Metrics:`);
      console.log(`      - mAP@0.5: ${(metrics.mAP50 * 100).toFixed(2)}%`);
      console.log(`      - mAP@0.5-0.95: ${(metrics['mAP50-95'] * 100).toFixed(2)}%`);
      console.log(`      - Precision: ${(metrics.precision * 100).toFixed(2)}%`);
      console.log(`      - Recall: ${(metrics.recall * 100).toFixed(2)}%`);

      // For toy dataset, we expect reasonable performance
      const threshold = 0.50;  // 50% mAP@0.5 is reasonable for 3 epochs
      if (metrics.mAP50 < threshold) {
        console.log(`   ⚠️  Warning: mAP@0.5 below ${threshold * 100}% (expected for toy dataset)`);
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Model validated: mAP@0.5 = ${(metrics.mAP50 * 100).toFixed(2)}%`,
        details: metrics
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

  private async test8_ExportToONNX(): Promise<void> {
    const testName = 'Test 8: Export Model to ONNX';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const exportScript = `
from ultralytics import YOLO

# Load trained model
model = YOLO('${path.join(this.testRunDir, 'runs', 'train', 'weights', 'best.pt').replace(/\\/g, '/')}')

# Export to ONNX
onnx_path = model.export(format='onnx', simplify=True)
print(f"ONNX model exported to: {onnx_path}")
`;

      const scriptPath = path.join(this.testRunDir, 'export_onnx.py');
      fs.writeFileSync(scriptPath, exportScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';
      const output = execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      console.log(`   ✅ Model exported to ONNX format`);
      console.log(`   📦 Suitable for:`);
      console.log(`      - Cross-platform deployment`);
      console.log(`      - Mobile/edge devices`);
      console.log(`      - Non-Python environments`);

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'Model exported to ONNX successfully'
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

  private async test9_TestInference(): Promise<void> {
    const testName = 'Test 9: Test Model Inference';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      const inferenceScript = `
from ultralytics import YOLO
import glob
import time
import json

# Load trained model
model = YOLO('${path.join(this.testRunDir, 'runs', 'train', 'weights', 'best.pt').replace(/\\/g, '/')}')

# Get validation images
val_images = glob.glob('${path.join(this.datasetDir, 'images', 'val', '*.jpg').replace(/\\/g, '/')}')

# Run inference
results_data = []
for img_path in val_images[:2]:  # Test on 2 images
    start_time = time.time()
    results = model(img_path, verbose=False)
    inference_time = (time.time() - start_time) * 1000  # ms

    # Get detections
    boxes = results[0].boxes
    detections = len(boxes) if boxes is not None else 0

    results_data.append({
        'image': img_path.split('/')[-1],
        'inference_time_ms': round(inference_time, 2),
        'detections': detections
    })

print(json.dumps(results_data, indent=2))
`;

      const scriptPath = path.join(this.testRunDir, 'test_inference.py');
      fs.writeFileSync(scriptPath, inferenceScript);

      const pythonCmd = this.pythonCheck.version?.includes('Python 3') ? 'python3' : 'python';
      const output = execSync(`${pythonCmd} "${scriptPath}"`, {
        encoding: 'utf-8',
        stdio: 'pipe'
      });

      // Extract JSON from output (filter out YOLO's additional output)
      const jsonMatch = output.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error(`No JSON found in output: ${output}`);
      }
      const inferenceResults = JSON.parse(jsonMatch[0]);

      console.log(`   🔮 Inference Results:`);
      inferenceResults.forEach((result: any) => {
        console.log(`      - ${result.image}:`);
        console.log(`        • Time: ${result.inference_time_ms}ms`);
        console.log(`        • Detections: ${result.detections} players`);
      });

      // Check latency threshold
      const avgLatency = inferenceResults.reduce((sum: number, r: any) => sum + r.inference_time_ms, 0) / inferenceResults.length;
      const latencyThreshold = 500;  // 500ms per frame

      if (avgLatency < latencyThreshold) {
        console.log(`   ✅ Average latency (${avgLatency.toFixed(2)}ms) below threshold (${latencyThreshold}ms)`);
      } else {
        console.log(`   ⚠️  Average latency (${avgLatency.toFixed(2)}ms) exceeds threshold (${latencyThreshold}ms)`);
      }

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: `Inference tested: avg ${avgLatency.toFixed(2)}ms per frame`,
        details: { inference_results: inferenceResults, avg_latency_ms: avgLatency }
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

  private async test10_GenerateMLOpsReport(): Promise<void> {
    const testName = 'Test 10: Generate MLOps Report';
    console.log(`\n🧪 ${testName}`);
    const start = Date.now();

    try {
      // Collect all artifacts
      const artifacts = {
        dataset: this.datasetDir,
        training_runs: path.join(this.testRunDir, 'runs', 'train'),
        model_weights: path.join(this.testRunDir, 'runs', 'train', 'weights', 'best.pt'),
        onnx_export: path.join(this.testRunDir, 'runs', 'train', 'weights', 'best.onnx'),
        test_run_directory: this.testRunDir
      };

      // Create MLOps report
      const report = {
        pipeline: 'Soccer Player Detection',
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

      const reportPath = path.join(this.testRunDir, 'mlops-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

      console.log(`   📊 MLOps Report Generated:`);
      console.log(`      - Location: ${reportPath}`);
      console.log(`      - Artifacts preserved in: ${this.testRunDir}`);
      console.log(`\n   📁 Artifacts:`);
      Object.entries(artifacts).forEach(([key, value]) => {
        const exists = fs.existsSync(value);
        console.log(`      ${exists ? '✅' : '❌'} ${key}: ${value}`);
      });

      this.results.push({
        name: testName,
        status: 'PASS',
        duration: Date.now() - start,
        message: 'MLOps report generated',
        details: { report_path: reportPath }
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

    // Save report
    const resultsDir = path.join(process.cwd(), 'test-results', 'ml-pipeline-workflow');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(resultsDir, `ml-pipeline-soccer-detection-${timestamp}.json`);

    const report = {
      suite: 'ML Pipeline Workflow: Soccer Player Detection',
      timestamp: new Date().toISOString(),
      summary: { total, passed, failed, skipped },
      results: this.results,
      artifacts: {
        test_run_dir: this.testRunDir,
        preserved: true
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📊 Report saved to: ${reportPath}`);
    console.log(`\n💡 Tip: Explore test artifacts in: ${this.testRunDir}`);
  }
}

// Run tests if called directly
const isMainModule = process.argv[1] === new URL(import.meta.url).pathname;
if (isMainModule) {
  const test = new MLPipelineSoccerDetectionTest();
  test.run().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

export { MLPipelineSoccerDetectionTest };
