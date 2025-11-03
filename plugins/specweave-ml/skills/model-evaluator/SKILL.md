---
name: model-evaluator
description: |
  Comprehensive ML model evaluation with multiple metrics, cross-validation, and statistical testing. Activates for "evaluate model", "model metrics", "model performance", "compare models", "validation metrics", "test accuracy", "precision recall", "ROC AUC". Generates detailed evaluation reports with visualizations and statistical significance tests, integrated with SpecWeave increment documentation.
---

# Model Evaluator

## Overview

Provides comprehensive, unbiased model evaluation following ML best practices. Goes beyond simple accuracy to evaluate models across multiple dimensions, ensuring confident deployment decisions.

## Core Evaluation Framework

### 1. Classification Metrics
- Accuracy, Precision, Recall, F1-score
- ROC AUC, PR AUC
- Confusion matrix
- Per-class metrics (for multi-class)
- Class imbalance handling

### 2. Regression Metrics
- RMSE, MAE, MAPE
- R² score, Adjusted R²
- Residual analysis
- Prediction interval coverage

### 3. Ranking Metrics (Recommendations)
- Precision@K, Recall@K
- NDCG@K, MAP@K
- MRR (Mean Reciprocal Rank)
- Coverage, Diversity

### 4. Statistical Validation
- Cross-validation (K-fold, stratified, time-series)
- Confidence intervals
- Statistical significance testing
- Calibration curves

## Usage

```python
from specweave import ModelEvaluator

evaluator = ModelEvaluator(
    model=trained_model,
    X_test=X_test,
    y_test=y_test,
    increment="0042"
)

# Comprehensive evaluation
report = evaluator.evaluate_all()

# Generates:
# - .specweave/increments/0042.../evaluation-report.md
# - Visualizations (confusion matrix, ROC curves, etc.)
# - Statistical tests
```

## Evaluation Report Structure

```markdown
# Model Evaluation Report: XGBoost Classifier

## Overall Performance
- **Accuracy**: 0.87 ± 0.02 (95% CI: [0.85, 0.89])
- **ROC AUC**: 0.92 ± 0.01
- **F1 Score**: 0.85 ± 0.02

## Per-Class Performance
| Class   | Precision | Recall | F1   | Support |
|---------|-----------|--------|------|---------|
| Class 0 | 0.88      | 0.85   | 0.86 | 1000    |
| Class 1 | 0.84      | 0.87   | 0.86 | 800     |

## Confusion Matrix
[Visualization embedded]

## Cross-Validation Results
- 5-fold CV accuracy: 0.86 ± 0.03
- Fold scores: [0.85, 0.88, 0.84, 0.87, 0.86]
- No overfitting detected (train=0.89, val=0.86, gap=0.03)

## Statistical Tests
- Comparison vs baseline: p=0.001 (highly significant)
- Comparison vs previous model: p=0.042 (significant)

## Recommendations
✅ Deploy: Model meets accuracy threshold (>0.85)
✅ Stable: Low variance across folds
⚠️  Monitor: Class 1 recall slightly lower (0.84)
```

## Model Comparison

```python
from specweave import compare_models

models = {
    "baseline": baseline_model,
    "xgboost": xgb_model,
    "lightgbm": lgbm_model,
    "neural-net": nn_model
}

comparison = compare_models(
    models,
    X_test,
    y_test,
    metrics=["accuracy", "auc", "f1"],
    increment="0042"
)
```

**Output**:
```
Model Comparison Report
=======================

| Model      | Accuracy | ROC AUC | F1   | Inference Time | Model Size |
|------------|----------|---------|------|----------------|------------|
| baseline   | 0.65     | 0.70    | 0.62 | 1ms           | 10KB       |
| xgboost    | 0.87     | 0.92    | 0.85 | 35ms          | 12MB       |
| lightgbm   | 0.86     | 0.91    | 0.84 | 28ms          | 8MB        |
| neural-net | 0.85     | 0.90    | 0.83 | 120ms         | 45MB       |

Recommendation: XGBoost
- Best accuracy and AUC
- Acceptable inference time (<50ms requirement)
- Good size/performance tradeoff
```

## Best Practices

1. **Always compare to baseline** - Random, majority, rule-based
2. **Use cross-validation** - Never trust single split
3. **Check calibration** - Are probabilities meaningful?
4. **Analyze errors** - What types of mistakes?
5. **Test statistical significance** - Is improvement real?

## Integration with SpecWeave

```bash
# Evaluate model in increment
/ml:evaluate-model 0042

# Compare all models in increment
/ml:compare-models 0042

# Generate full evaluation report
/ml:evaluation-report 0042
```

Evaluation results automatically included in increment COMPLETION-SUMMARY.md.
