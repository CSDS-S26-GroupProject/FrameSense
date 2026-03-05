# Face Landmark-Based Classification System

This project implements a face classification pipeline using facial landmark extraction and machine learning. Facial landmarks are extracted using MediaPipe Face Landmarker, transformed into normalized geometric features, and used to train and evaluate multiple classifiers.

The system compares:

* Random Forest (baseline)
* PCA + SVM (with hyperparameter tuning)

---

## Project Overview

The pipeline performs the following steps:

1. Extracts 3D facial landmarks from images using MediaPipe.
2. Normalizes and flattens landmarks into feature vectors (936 features).
3. Splits the dataset into training and test sets.
4. Trains:

    * A Random Forest classifier (baseline).
    * An SVM classifier with PCA dimensionality reduction.
5. Performs cross-validation.
6. Generates a confusion matrix visualization.

---

## How It Works

### 1. Landmark Extraction

Facial landmarks are extracted using MediaPipe’s FaceLandmarker model (`face_landmarker.task`).

Each face produces:

* 468 landmarks
* Each landmark has (x, y, z)
* Total raw features: 468 × 3 = 1404
* After using only (x, y): 468 × 2 = 936 features

---

### 2. Feature Engineering

Landmarks are normalized by:

* Centering around the mean face point
* Scaling by face height (distance between forehead top and chin)
* Flattening into a 936-dimensional feature vector

This makes the model:

* Scale-invariant
* Position-invariant

---

### 3. Dataset Structure

Your dataset folder must follow this structure:

```
dataset/
│
├── heart/
│   ├── img1.jpg
│   ├── img2.jpg
│   └── ...
│
├── square/
│   ├── img1.jpg
│   ├── img2.jpg
│   └── ...
```

Each subfolder name becomes the label for that class.

---

## Installation

### Required Python Version

Python 3.8+

### Install Dependencies

```bash
pip install opencv-python numpy mediapipe scikit-learn seaborn matplotlib
```

You must also download:

* `face_landmarker.task` (MediaPipe model file)
* Place it in the root directory of the project

---

## Running the Script

```bash
python your_script_name.py
```

The script will:

* Scan the dataset directory
* Extract landmarks
* Train models
* Output accuracy scores
* Display a confusion matrix

---

## Model 1: Random Forest (Baseline)

* 300 trees
* No feature scaling required
* Used as a performance baseline

Output example:

```
Random Forest Accuracy: X.XXX
```

---

## Model 2: PCA + SVM (Optimized)

Pipeline:

```
StandardScaler → PCA (100 components) → RBF SVM
```

Hyperparameters tuned via GridSearch:

* C ∈ [10, 50, 100, 200, 500]
* gamma ∈ [0.001, 0.005, 0.01, 0.02, 0.05]

Outputs:

* Best parameters
* Best cross-validation accuracy
* Test accuracy
* 5-fold CV scores

---

## Confusion Matrix

A heatmap is generated showing classification performance across classes.

* X-axis: Predicted labels
* Y-axis: True labels
* Color intensity indicates frequency

---

## Evaluation Metrics

The script reports:

* Test Accuracy
* 5-Fold Cross Validation Accuracy
* Confusion Matrix
* Best GridSearch Parameters

---

## File Requirements

Required files:

```
face_landmarker.task
dataset/ (structured by class folders)
your_script.py
```

---

## Notes

* Images without detectable faces are skipped.
* If an image fails to load or process, it is ignored.
* Only 1 face per image is processed.
* Ensure good lighting and clear frontal faces for best accuracy.

---

## Potential Improvements

* Use full 3D coordinates (x, y, z)
* Add facial ratio-based geometric features
* Try deep learning models
* Increase dataset size
* Experiment with different PCA components

---


