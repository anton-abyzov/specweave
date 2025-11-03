# SpecWeave ML Plugin

**Complete ML/AI workflow integration for SpecWeave - From experiment tracking to production deployment**

Transform chaotic ML experimentation into disciplined, reproducible ML engineering using SpecWeave's increment-based workflow.

---

## 🎯 What This Plugin Does

Brings the same engineering discipline to ML that SpecWeave brings to software:

- ✅ **ML as Increments**: Every ML feature is a spec → plan → tasks → implement workflow
- ✅ **Experiment Tracking**: All experiments logged, versioned, and tied to increments
- ✅ **Reproducibility**: Reproduce any experiment from any increment
- ✅ **Living Documentation**: ML decisions captured in architecture docs
- ✅ **Production Ready**: Deployment artifacts, monitoring, A/B testing built-in

**The Problem**: ML development is often chaotic—Jupyter notebooks with no version control, experiments without documentation, models deployed with no reproducibility.

**The Solution**: SpecWeave ML plugin brings software engineering discipline to data science.

---

## 🚀 Quick Start

### Installation

```bash
# Install SpecWeave ML plugin
/plugin install specweave-ml@specweave

# Verify installation
/plugin list
# Should show: specweave-ml (13 skills, 1 agent, 3 commands)
```

### Your First ML Increment

```bash
# Create ML increment
/specweave:inc "build recommendation model"

# The ml-pipeline-orchestrator skill activates and creates:
# .specweave/increments/0042-recommendation-model/
# ├── spec.md            # ML requirements, success metrics
# ├── plan.md            # Pipeline architecture
# ├── tasks.md           # Implementation tasks
# ├── tests.md           # Evaluation criteria
# ├── experiments/       # Experiment tracking
# ├── data/              # Data samples, schemas
# ├── models/            # Trained models
# └── notebooks/         # Exploratory notebooks

# Execute ML tasks
/specweave:do

# The skill guides you through:
# 1. Data exploration
# 2. Feature engineering
# 3. Baseline models (mandatory!)
# 4. Candidate models (3-5 algorithms)
# 5. Hyperparameter tuning
# 6. Comprehensive evaluation
# 7. Model explainability
# 8. Deployment preparation
```

---

## 🧠 Thirteen Comprehensive Skills

### Core ML Lifecycle (5 skills)

#### 1. **ml-pipeline-orchestrator**

Orchestrates complete ML pipelines within SpecWeave increments.

**Activates for**: "ML pipeline", "train model", "build ML system"

**What it does**:
- Creates ML-specific increment structure
- Generates ML spec (problem definition, success metrics, data requirements)
- Guides through data → train → eval → deploy workflow
- Auto-tracks all experiments to increment folder
- Ensures baseline comparison, cross-validation, explainability

**Example**:
```bash
User: "Build a fraud detection model"

Skill creates increment 0051-fraud-detection:
- spec.md: Binary classification, 99% precision target
- plan.md: Imbalanced data handling, threshold tuning
- tasks.md: EDA → baseline → XGBoost/LightGBM → SHAP → deploy
- experiments/: Tracks all model attempts
```

### 2. **experiment-tracker**

Manages ML experiment tracking with MLflow, W&B, or built-in tracking.

**Activates for**: "track experiments", "MLflow", "wandb", "compare experiments"

**What it does**:
- Auto-configures tracking tools to log to increment folders
- Tracks params, metrics, artifacts for every experiment
- Generates experiment comparison reports
- Syncs experiment findings to living docs

**Example**:
```python
from specweave import track_experiment

# Automatically logs to: .specweave/increments/0042.../experiments/
with track_experiment("xgboost-v1") as exp:
    model.fit(X_train, y_train)
    exp.log_metric("accuracy", 0.87)
    exp.save_model(model, "model.pkl")

# Creates:
# - params.json
# - metrics.json
# - model.pkl
# - metadata.yaml
```

### 3. **model-evaluator**

Comprehensive model evaluation with multiple metrics and statistical testing.

**Activates for**: "evaluate model", "model metrics", "compare models"

**What it does**:
- Computes classification/regression/ranking metrics
- Generates confusion matrices, ROC curves, residual plots
- Performs cross-validation with confidence intervals
- Compares models statistically (vs baseline, vs previous version)

**Example**:
```python
from specweave import ModelEvaluator

evaluator = ModelEvaluator(model, X_test, y_test, increment="0042")
report = evaluator.evaluate_all()

# Generates:
# - evaluation-report.md
# - confusion_matrix.png
# - roc_curve.png
# - comparison.md (vs baseline)
```

### 4. **model-explainer**

Model interpretability using SHAP, LIME, and feature importance.

**Activates for**: "explain model", "SHAP", "feature importance"

**What it does**:
- Generates global explanations (feature importance, partial dependence)
- Generates local explanations (SHAP/LIME for individual predictions)
- Creates human-readable explanation reports
- Critical for trust, debugging, regulatory compliance

**Example**:
```python
from specweave import ModelExplainer

explainer = ModelExplainer(model, X_train, increment="0042")
explainer.generate_all_reports()

# Creates:
# - feature-importance.png
# - shap-summary.png
# - pdp-plots/
# - local-explanations/
# - explainability-report.md
```

#### 5. **ml-deployment-helper**

Prepares models for production with APIs, containers, monitoring, A/B testing.

**Activates for**: "deploy model", "production deployment", "model API"

**What it does**:
- Generates FastAPI endpoints for model serving
- Creates Dockerfiles for containerization
- Sets up Prometheus/Grafana monitoring
- Configures A/B testing infrastructure
- Load tests models before deployment

**Example**:
```python
from specweave import create_model_api

api = create_model_api(
    model_path="models/model-v3.pkl",
    increment="0042",
    framework="fastapi"
)

# Creates:
# - api/main.py
# - api/models.py
# - Dockerfile
# - requirements.txt
# - monitoring/
# - ab-test/
```

### ML Engineering (2 skills)

#### 6. **feature-engineer**

Comprehensive feature engineering: data quality assessment, feature creation, selection, transformation, and validation.

**Activates for**: "feature engineering", "create features", "data preprocessing", "encode categorical"

**What it does**:
- **Phase 1**: Data quality assessment (missing values, outliers, data types)
- **Phase 2**: Feature creation (temporal, aggregation, interaction, ratio, binning, text features)
- **Phase 3**: Feature selection (correlation, variance, statistical, model-based, RFE)
- **Phase 4**: Feature transformation (scaling, encoding, log transform, power transform)
- **Phase 5**: Feature validation (data leakage detection, distribution drift, missing/invalid values)

#### 7. **automl-optimizer**

Automated machine learning with intelligent hyperparameter optimization and model selection.

**Activates for**: "automl", "hyperparameter tuning", "optimize hyperparameters", "neural architecture search"

**What it does**:
- Bayesian hyperparameter optimization (Optuna, Hyperopt)
- Automated algorithm selection (tries multiple models)
- Neural architecture search for deep learning
- Intelligent search space exploration
- Multi-objective optimization (accuracy + speed)

### Domain-Specific Pipelines (2 skills)

#### 8. **cv-pipeline-builder**

Computer vision ML pipelines for images: classification, object detection, segmentation.

**Activates for**: "computer vision", "image classification", "object detection", "CNN", "YOLO"

**What it does**:
- Image preprocessing and data augmentation
- CNN architectures (ResNet, EfficientNet, Vision Transformer)
- Transfer learning from ImageNet
- Object detection (YOLO, Faster R-CNN)
- Semantic segmentation (U-Net, DeepLab)

#### 9. **nlp-pipeline-builder**

Natural language processing pipelines: text classification, NER, sentiment analysis, generation.

**Activates for**: "nlp", "text classification", "sentiment analysis", "BERT", "transformers"

**What it does**:
- Text preprocessing and tokenization
- Transformer models (BERT, RoBERTa, GPT)
- Fine-tuning on custom datasets
- Named entity recognition
- Text generation
- Sentiment analysis

### Additional Domain-Specific Skills (4 skills) ✨ NEW

#### 10. **time-series-forecaster**

Time series forecasting with ARIMA, Prophet, LSTM, and statistical methods.

**Activates for**: "time series", "forecasting", "predict future", "ARIMA", "Prophet", "sales forecast"

**What it does**:
- Statistical methods (ARIMA, seasonal decomposition, stationarity testing)
- Prophet (Facebook) - Handles multiple seasonality + holidays
- Deep learning (LSTM, GRU) - Complex patterns, multivariate forecasting
- Multivariate forecasting (VAR) - Multiple related time series
- Time series-specific validation (no data leakage, temporal split)

#### 11. **anomaly-detector**

Anomaly and outlier detection using Isolation Forest, One-Class SVM, autoencoders.

**Activates for**: "anomaly detection", "fraud detection", "outlier detection", "intrusion detection"

**What it does**:
- Statistical methods (Z-score, IQR)
- Isolation Forest (general purpose, high-dimensional)
- One-Class SVM (trained on normal data only)
- Autoencoders (deep learning, complex patterns)
- LOF (Local Outlier Factor) - Density-based anomalies

#### 12. **data-visualizer**

Automated data visualization for EDA, model performance, and business reporting.

**Activates for**: "visualize data", "EDA", "create plots", "confusion matrix", "ROC curve"

**What it does**:
- EDA visualizations (distributions, correlations, missing values, outliers)
- Model performance (confusion matrix, ROC curve, learning curves, calibration)
- Feature analysis (importance, SHAP, partial dependence)
- Time series plots (decomposition, ACF/PACF, forecast with intervals)
- Interactive dashboards (Plotly, Grafana)

#### 13. **model-registry**

Centralized model versioning, staging, and lifecycle management.

**Activates for**: "model registry", "model versioning", "deploy to production", "rollback model"

**What it does**:
- Model versioning (semantic versioning: major.minor.patch)
- Staging pipeline (dev → staging → production → archived)
- Model metadata tracking (performance, hyperparameters, lineage)
- Model lineage (data → features → training → deployment)
- Safe rollback (one-command revert to stable version)

---

## 🤖 ML Engineer Agent

Specialized agent for ML system design and implementation.

**When to use**: Complex ML decisions, architecture reviews, best practices guidance

**Expertise**:
- Algorithm selection (when to use XGBoost vs neural nets)
- Hyperparameter tuning strategies
- Preventing ML anti-patterns (data leakage, overfitting, class imbalance)
- Production ML architecture
- MLOps best practices

**Example**:
```bash
User: "My model has 95% train accuracy but 65% test accuracy"

ML Engineer Agent:
"Classic overfitting. Here's the fix:
1. Reduce model complexity (max_depth, layers)
2. Add regularization (L1/L2, dropout)
3. More training data if possible
4. Feature selection (remove noisy features)

For XGBoost:
params = {
    'max_depth': 3,  # Reduce from default 6
    'min_child_weight': 5,
    'gamma': 0.1,
    'subsample': 0.8
}

Track experiments in increment 0042 so we see what works."
```

---

## 🎓 Commands

### `/ml:evaluate <increment_id>`

Evaluate ML model with comprehensive metrics.

```bash
/ml:evaluate 0042

# Generates:
# - evaluation-report.md
# - Confusion matrix, ROC curves
# - Cross-validation results
# - Baseline comparison
# - Statistical significance tests
```

### `/ml:explain <increment_id>`

Generate model explainability reports.

```bash
/ml:explain 0042

# Generates:
# - feature-importance.png
# - shap-summary.png
# - pdp-plots/
# - local-explanations/
# - explainability-report.md
```

### `/ml:deploy <increment_id>`

Generate deployment artifacts.

```bash
/ml:deploy 0042

# Generates:
# - FastAPI app (api/)
# - Dockerfile
# - Monitoring (monitoring/)
# - A/B test infrastructure (ab-test/)
# - Load test results
# - DEPLOYMENT.md runbook
```

---

## 💡 Complete ML Workflow Example

### Step 1: Create ML Increment

```bash
/specweave:inc "build product recommendation model"
```

**What happens**:
- ml-pipeline-orchestrator skill activates
- Creates increment: `0042-product-recommendation-model`
- Generates ML-specific spec.md, plan.md, tasks.md

**Generated spec.md**:
```markdown
## ML Problem Definition
- Problem type: Ranking (collaborative filtering)
- Input: User behavior history (clicks, purchases)
- Output: Top-10 product recommendations
- Success metrics: Precision@10 > 0.25, NDCG@10 > 0.30

## Data Requirements
- Training data: 6 months user interactions
- Validation: Last month (time-based split)
- Features: User profile, product attributes, interaction history

## Model Requirements
- Latency: <100ms inference
- Throughput: 1000 req/sec
- Explainability: Show why products recommended
```

### Step 2: Execute ML Tasks

```bash
/specweave:do
```

**Guided workflow**:

**Task 1: Data Exploration**
```python
# Auto-generated EDA template
from specweave import track_experiment

with track_experiment("exp-001-eda", increment="0042") as exp:
    df = pd.read_csv("data/interactions.csv")
    
    exp.log_param("dataset_size", len(df))
    exp.log_metric("unique_users", df["user_id"].nunique())
    exp.log_metric("unique_products", df["product_id"].nunique())
    
    # Auto-generates: eda-summary.md
```

**Task 3: Train Baseline**
```python
# Baseline models (mandatory!)
baselines = ["random", "popularity"]

for strategy in baselines:
    with track_experiment(f"baseline-{strategy}", increment="0042") as exp:
        model = BaselineRecommender(strategy=strategy)
        model.fit(interactions)
        
        precision_10 = evaluate_recommendations(model, test_users)
        exp.log_metric("precision@10", precision_10)
```

**Task 4: Train Candidate Models**
```python
# Try multiple algorithms
candidates = {
    "collaborative-filtering": CollaborativeFiltering(),
    "matrix-factorization": MatrixFactorization(factors=50),
    "neural-cf": NeuralCollaborativeFiltering(layers=[64, 32])
}

for name, model in candidates.items():
    with track_experiment(name, increment="0042") as exp:
        model.fit(train_interactions)
        
        metrics = evaluate_model(model, test_users)
        exp.log_metrics(metrics)
        exp.save_model(model, f"{name}.pkl")
```

**Task 6: Model Evaluation**
```python
# Comprehensive evaluation
evaluator = ModelEvaluator(
    model=best_model,
    test_data=test_users,
    increment="0042"
)

report = evaluator.evaluate_all()
# Generates: evaluation-report.md with all metrics
```

**Task 7: Model Explainability**
```python
# Generate SHAP explanations
explainer = ModelExplainer(best_model, train_data, increment="0042")
explainer.generate_all_reports()

# Creates:
# - feature-importance.png
# - shap-summary.png
# - example-recommendations-explained.md
```

### Step 3: Validate Increment

```bash
/specweave:validate 0042
```

**Checks**:
- ✅ All experiments logged
- ✅ Best model saved (matrix-factorization)
- ✅ Evaluation metrics documented
- ✅ Model meets success criteria (precision@10=0.28 > 0.25 target)
- ✅ Explainability artifacts present

### Step 4: Complete Increment

```bash
/specweave:done 0042
```

**Generates COMPLETION-SUMMARY.md**:
```markdown
## Product Recommendation Model - COMPLETE

### Experiments Run: 5
1. baseline-random: precision@10=0.05
2. baseline-popularity: precision@10=0.12
3. collaborative-filtering: precision@10=0.22
4. matrix-factorization: precision@10=0.28 ✅ BEST
5. neural-cf: precision@10=0.26

### Best Model
- Algorithm: Matrix Factorization (50 factors)
- Metrics: precision@10=0.28, ndcg@10=0.32
- Training time: 12 min
- Model size: 8 MB
- Inference latency: 35ms (target: <100ms)

### Deployment Ready
- ✅ Meets accuracy target (precision@10 > 0.25)
- ✅ Latency acceptable (<100ms)
- ✅ Explainability: Top factors computed
- ✅ A/B test plan documented
```

### Step 5: Deploy to Production

```bash
# Create deployment increment
/specweave:inc "0043-deploy-recommendation-model"

# Generate deployment artifacts
/ml:deploy 0042

# Creates:
# - api/ (FastAPI app)
# - Dockerfile
# - monitoring/ (Grafana dashboards)
# - ab-test/ (10% traffic to new model)
# - load-tests/ (benchmarked at 1000 RPS)
```

### Step 6: Sync Living Docs

```bash
/specweave:sync-docs update
```

**Updates**:
```markdown
<!-- .specweave/docs/internal/architecture/ml-models.md -->

## Recommendation Model (Increment 0042)

### Algorithm
Matrix Factorization with 50 latent factors

### Performance
- Precision@10: 0.28 (44% better than popularity baseline)
- NDCG@10: 0.32
- Inference: 35ms

### Why This Model?
- Tried 5 approaches (random, popularity, CF, MF, neural)
- MF best balance of accuracy and speed
- Neural CF only 2% better but 10x slower

### Deployment
- Deployed: 2024-01-15
- A/B test: 10% traffic
- Monitoring: Grafana dashboard (link)
```

---

## 🏆 ML Best Practices (Enforced)

### 1. Always Compare to Baseline

```python
# The skill REQUIRES baseline models
baselines = ["random", "majority", "popularity", "rule-based"]

# New model must beat best baseline by significant margin (20%+)
if new_model_accuracy < baseline_accuracy * 1.2:
    warn("New model not significantly better than baseline")
```

### 2. Always Use Cross-Validation

```python
# Never trust single train/test split
cv_scores = cross_val_score(model, X, y, cv=5)

if cv_scores.std() > 0.1:
    warn("High variance - model unstable across folds")
```

### 3. Always Track Experiments

```python
# Every experiment logged, no exceptions
with track_experiment("xgboost-v1", increment="0042") as exp:
    exp.log_params(params)
    exp.log_metrics(metrics)
    exp.save_model(model)
    exp.log_note("Why this configuration")
```

### 4. Always Explain Models

```python
# Production models MUST be explainable
explainer = ModelExplainer(model, X_train)
explainer.generate_all_reports(increment="0042")

# No "black boxes" in production
```

### 5. Always Load Test Before Production

```python
# Benchmark performance before deploying
load_test_results = load_test_model(
    api_url=api_url,
    target_rps=100,
    duration=60
)

if load_test_results["p95_latency"] > 100:  # ms
    raise DeploymentError("Latency too high")
```

---

## 🔧 Configuration

### MLflow Integration

```python
# Auto-configured to log to increment
import mlflow
from specweave import configure_mlflow

configure_mlflow(increment="0042")

# All MLflow logs → .specweave/increments/0042.../experiments/
```

### Weights & Biases Integration

```python
import wandb
from specweave import configure_wandb

configure_wandb(increment="0042")

# W&B project = increment ID
# Logs both to W&B dashboard + local increment folder
```

### Custom Tracking Backend

```python
from specweave import register_tracking_backend

# Use your own tracking system
register_tracking_backend(MyCustomTracker)
```

---

## 📊 Integration with SpecWeave

### With Increments

All ML work is an increment:
```
0042-recommendation-model       # ML feature development
0043-deploy-recommendation      # Deployment
0044-retrain-with-q1-data       # Model retraining
```

### With Living Docs

ML decisions captured in docs:
```
.specweave/docs/internal/
├── architecture/
│   ├── ml-models.md              # All models documented
│   ├── adr/
│   │   └── 0015-use-matrix-factorization.md
│   └── diagrams/
│       └── ml-pipeline.mmd
└── delivery/
    └── runbooks/
        └── model-retraining.md
```

### With GitHub Integration

```bash
# ML increments sync to GitHub issues
/specweave:github:sync

# Creates issue: "0042: Build recommendation model"
# Tracks: experiments, model versions, deployment
```

---

## 🎯 When to Use This Plugin

**Use specweave-ml when you need to**:

- ✅ Build ML features with same discipline as software
- ✅ Track experiments systematically (not scattered notebooks)
- ✅ Ensure reproducibility (anyone can recreate results)
- ✅ Maintain team knowledge (living docs capture decisions)
- ✅ Deploy ML models to production (APIs, monitoring, A/B tests)
- ✅ Comply with regulations (explainability, audit trails)

**Don't use if**:

- Quick exploratory analysis (use notebooks directly)
- One-off experiments (no need for increment overhead)
- Non-production ML (prototypes, research)

---

## 🚀 Advanced Features

### Multi-Stage ML Pipelines

```python
from specweave import ExperimentPipeline

pipeline = ExperimentPipeline("recommendation-full-pipeline")

# Stage 1: Preprocessing
with pipeline.stage("preprocessing") as stage:
    df_clean = preprocess(df)
    stage.log_metric("rows_after_cleaning", len(df_clean))

# Stage 2: Feature engineering
with pipeline.stage("features") as stage:
    features = engineer_features(df_clean)
    stage.log_metric("num_features", features.shape[1])

# Stage 3: Model training
with pipeline.stage("training") as stage:
    model = train_model(features)
    stage.log_metric("accuracy", accuracy)

# Logs entire pipeline with stage dependencies
```

### Model Registry

```python
from specweave import ModelRegistry

# Register model versions
registry = ModelRegistry()

registry.register(
    model_path="models/model-v3.pkl",
    name="recommendation-model",
    version="0042-v3",
    metadata={"accuracy": 0.87, "training_date": "2024-01-15"}
)

# Production deployment
registry.promote_to_production("0042-v3")

# Rollback if needed
registry.rollback_to("0042-v2")
```

### Feature Store Integration

```python
from specweave import FeatureStore

# Define features in increment
features = FeatureStore(increment="0042")

features.register(
    name="user_7day_purchase_count",
    definition="COUNT(purchases) WHERE date >= NOW() - 7 days",
    type="int",
    category="user"
)

# Use features across increments
features_df = features.get_features(["user_7day_purchase_count"])
```

---

## 📖 Resources

- **SpecWeave Docs**: https://spec-weave.com
- **ML Plugin Guide**: https://spec-weave.com/plugins/ml
- **Example Increments**: [examples/ml/](/examples/ml/)
- **Community**: https://github.com/anton-abyzov/specweave/discussions

---

## 🤝 Contributing

Want to improve the ML plugin?

```bash
# Clone SpecWeave
git clone https://github.com/anton-abyzov/specweave

# Navigate to ML plugin
cd plugins/specweave-ml

# Make improvements
vim skills/ml-pipeline-orchestrator/SKILL.md

# Test
npm test

# Submit PR
git push && create PR
```

---

## 📝 License

MIT License - See [LICENSE](../../LICENSE)

---

**Transform ML chaos into ML discipline with SpecWeave ML Plugin** 🤖📊✨

**Version**: 1.0.0
**Last Updated**: 2024-01-15
