# MLflow UI - Visual Guide

## ✅ MLflow is Running!

**URL**: http://localhost:5000

**Status**: ✅ Server is running with 4 workers

---

## What You'll See

### 1. Main Experiments Page

When you open http://localhost:5000, you'll see:

```
┌─────────────────────────────────────────────────────────────┐
│ MLflow Tracking                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Experiments                                                │
│  ├── Default (0 runs)                                       │
│  └── soccer-player-detection (4 runs) ⭐                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Click on "soccer-player-detection"** to see your experiments!

---

### 2. Experiment Runs Table

You'll see a table with 4 rows (our 4 training runs):

| Run Name | Created | Duration | accuracy | precision | recall | f1_score | training_time |
|----------|---------|----------|----------|-----------|--------|----------|---------------|
| **medium_model_balanced** 🏆 | Just now | 0.028s | 1.000 | 1.000 | 1.000 | 1.000 | 0.028s |
| large_model_accurate | Just now | 0.056s | 1.000 | 1.000 | 1.000 | 1.000 | 0.056s |
| small_model_fast | Just now | 0.007s | 1.000 | 1.000 | 1.000 | 1.000 | 0.007s |
| overfitting_model_deep ⚠️ | Just now | 0.028s | 1.000 | 1.000 | 1.000 | 1.000 | 0.028s |

**Key Features**:
- **🏆 Production Candidate**: The medium model is tagged for production
- **⚠️ Experimental**: The overfitting model has a warning tag
- **Sortable**: Click column headers to sort by any metric
- **Searchable**: Filter runs by name or tags

---

### 3. Click on a Run to See Details

When you click on **"medium_model_balanced"**, you'll see:

#### Parameters Tab
```
┌─────────────────────────────────┐
│ Parameters                      │
├─────────────────────────────────┤
│ model_type: RandomForest        │
│ n_estimators: 50                │
│ max_depth: 10                   │
│ dataset_size: 800               │
└─────────────────────────────────┘
```

#### Metrics Tab
```
┌─────────────────────────────────┐
│ Metrics                         │
├─────────────────────────────────┤
│ accuracy: 1.000                 │
│ precision: 1.000                │
│ recall: 1.000                   │
│ f1_score: 1.000                 │
│ training_time_seconds: 0.028    │
└─────────────────────────────────┘
```

#### Tags Tab
```
┌─────────────────────────────────┐
│ Tags                            │
├─────────────────────────────────┤
│ stage: production_candidate     │
│ owner: ml_team                  │
└─────────────────────────────────┘
```

#### Artifacts Tab (Trained Model!)
```
┌─────────────────────────────────┐
│ Artifacts                       │
├─────────────────────────────────┤
│ 📁 player_detector_medium/      │
│   ├── MLmodel                   │
│   ├── conda.yaml                │
│   ├── model.pkl                 │ ← Your trained model!
│   ├── python_env.yaml           │
│   └── requirements.txt          │
└─────────────────────────────────┘
```

**You can download `model.pkl` and use it in production!**

---

### 4. Compare Runs

Click **"Compare"** button at the top, then select multiple runs:

```
┌───────────────────────────────────────────────────────────────┐
│ Parallel Coordinates Plot                                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│   Parameters          Metrics                                │
│   n_estimators ───────> accuracy                            │
│      10 ────────────────> 1.000                              │
│      50 ────────────────> 1.000                              │
│     100 ────────────────> 1.000                              │
│                                                               │
│   max_depth ──────────> training_time                       │
│       5 ────────────────> 0.007s                             │
│      10 ────────────────> 0.028s                             │
│      20 ────────────────> 0.056s                             │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Visual insights**:
- See how parameters affect metrics
- Identify trade-offs (speed vs accuracy)
- Find optimal configurations

---

### 5. Search and Filter

In the search box, try:

**Filter by tags**:
```
tags.stage = "production_candidate"
```
Result: Shows only the medium model

**Filter by metrics**:
```
metrics.training_time_seconds < 0.03
```
Result: Shows small and medium models (fast ones)

**Filter by parameters**:
```
params.n_estimators >= 50
```
Result: Shows medium and large models

---

## What This Demonstrates

### 1. Experiment Tracking in Action

Instead of manually tracking results in a spreadsheet:

**Before MLflow**:
```
# notes.txt
Run 1: n_estimators=10, accuracy=???  # forgot to save!
Run 2: n_estimators=50, accuracy=1.0  # but which model file?
Run 3: n_estimators=100 # where did I save this?
```

**With MLflow**:
- Everything automatically tracked
- Never lose an experiment
- Always know which model is which

---

### 2. Model Versioning

Notice how each run has its own saved model:
- `player_detector_small/model.pkl`
- `player_detector_medium/model.pkl`
- `player_detector_large/model.pkl`
- `player_detector_overfit/model.pkl`

**You can load ANY of these models later**:
```python
import mlflow.sklearn

# Load the production candidate model
model = mlflow.sklearn.load_model("runs:/<RUN_ID>/player_detector_medium")

# Use for predictions
predictions = model.predict(new_data)
```

---

### 3. Collaboration

If your team member asks:
> "Which model should I deploy?"

**Answer**:
1. Open http://localhost:5000
2. Look for runs tagged `production_candidate`
3. Check the metrics
4. Download the model
5. Done!

No digging through Slack messages or email chains!

---

### 4. Reproducibility

Every experiment includes:
- **Exact parameters** used
- **Exact metrics** achieved
- **Trained model** (downloadable)
- **Timestamp** (when it was created)
- **Environment** (Python packages used)

**Anyone can reproduce your results!**

---

## Interactive Features to Try

### 1. Chart View

Click the **"Chart"** tab to see:
- Line charts of metrics over time
- Bar charts comparing runs
- Scatter plots of parameters vs metrics

### 2. Download Models

In any run's Artifacts tab:
- Click on `player_detector_medium/`
- Right-click `model.pkl`
- Select "Download"
- Now you have the trained model!

### 3. Register Models

Click **"Register Model"** button:
- Creates a model in the Model Registry
- Assigns version numbers (v1, v2, v3)
- Tracks which version is in production
- Enables model lifecycle management

### 4. Compare Side-by-Side

Select 2+ runs, click "Compare":
- See parameters side-by-side
- See metrics side-by-side
- Identify best performer instantly

---

## Real-World Use Case: Our Soccer Detection

In **TC-003** (our planned test), we would:

### During Training:
```python
with mlflow.start_run(run_name="yolov8n_soccer_detection"):
    # Log training parameters
    mlflow.log_param("model", "yolov8n")
    mlflow.log_param("confidence_threshold", 0.4)
    mlflow.log_param("training_epochs", 50)
    mlflow.log_param("dataset", "synthetic_soccer_field")

    # Train model
    results = train_yolo_model()

    # Log metrics
    mlflow.log_metric("map50", results.metrics.map50)
    mlflow.log_metric("precision", results.metrics.precision)
    mlflow.log_metric("recall", results.metrics.recall)
    mlflow.log_metric("players_detected", 399)

    # Save model
    mlflow.pytorch.log_model(model, "soccer_player_detector")
```

### In the UI, you'd see:
```
Experiment: soccer-player-detection
├── Run 1: yolov8n_soccer_detection
│   ├── Parameters: model=yolov8n, confidence=0.4, epochs=50
│   ├── Metrics: map50=0.92, precision=0.87, players_detected=399
│   └── Artifacts: soccer_player_detector/ (trained model)
│
├── Run 2: yolov8s_higher_conf
│   ├── Parameters: model=yolov8s, confidence=0.5, epochs=50
│   ├── Metrics: map50=0.94, precision=0.91, players_detected=412
│   └── Artifacts: soccer_player_detector/ (trained model)
│
└── Run 3: yolov8m_experimental
    ├── Parameters: model=yolov8m, confidence=0.3, epochs=100
    ├── Metrics: map50=0.89, precision=0.62, players_detected=445
    └── Artifacts: soccer_player_detector/ (trained model)
```

**Decision**: Run 2 (yolov8s) has best balance → Register as v1.0 → Deploy!

---

## Summary

**MLflow UI shows you:**

1. ✅ **All experiments** in one place (no lost results!)
2. ✅ **Parameters used** for each run
3. ✅ **Metrics achieved** (accuracy, F1, etc.)
4. ✅ **Trained models** (downloadable!)
5. ✅ **Comparison tools** (charts, tables)
6. ✅ **Search & filter** (find best models fast)
7. ✅ **Tags** (production, experimental, etc.)

**It's like GitHub for ML experiments!**

---

## Next Steps

### Refresh the page!
Open http://localhost:5000 and explore:
1. Click on "soccer-player-detection" experiment
2. Click on each run to see details
3. Compare runs using the Compare button
4. Download a model from the Artifacts tab

### Stop the server when done:
```bash
# Find the MLflow process
ps aux | grep mlflow

# Kill it
kill <PID>
```

---

**Enjoy exploring MLflow!** 🎉
