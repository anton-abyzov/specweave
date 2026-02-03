---
name: ml-explain
description: Generate model explainability reports (SHAP, LIME, feature importance)
---

# Explain ML Model

You are generating explainability artifacts for an ML model in a SpecWeave increment. Make the black box transparent.

## Your Task

1. **Load Model**: Load model from increment
2. **Generate Global Explanations**: Feature importance, partial dependence
3. **Generate Local Explanations**: SHAP/LIME for sample predictions
4. **Create Report**: Comprehensive explainability documentation

## Explainability Steps

### Step 1: Feature Importance
```python
from specweave import ModelExplainer

explainer = ModelExplainer(model, X_train)
importance = explainer.feature_importance()
```

Create: `feature-importance.png`

### Step 2: SHAP Summary
```python
shap_values = explainer.shap_summary()
```

Create: `shap-summary.png` (beeswarm plot)

### Step 3: Partial Dependence Plots
```python
for feature in top_features:
    pdp = explainer.partial_dependence(feature)
```

Create: `pdp-plots/` directory

### Step 4: Local Explanations
```python
# Explain sample predictions
samples = [high_confidence, low_confidence, edge_case]
for sample in samples:
    explanation = explainer.explain_prediction(sample)
```

Create: `local-explanations/` directory

### Step 5: Generate Report

Create `explainability-report.md`:

```markdown
# Model Explainability Report

## Global Feature Importance
[Top 10 features with importance scores]

## SHAP Analysis
[Summary plot and interpretation]

## Partial Dependence
[How each feature affects predictions]

## Example Explanations
[3-5 example predictions with full explanations]

## Recommendations
[Model improvements based on feature analysis]
```

## Output

Report:
- Top 10 most important features
- Any surprising feature importance (might indicate data leakage)
- Model behavior insights
- Recommendations for improvement
