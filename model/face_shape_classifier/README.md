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

Facial landmarks are extracted using **MediaPipe's FaceLandmarker model** (`face_landmarker.task`).

Each face produces:

- **468 landmarks**
- Each landmark has coordinates **(x, y, z)**

Total raw features:

468 × 3 = 1404 features

This project uses only **(x, y)** coordinates:

468 × 2 = 936 features

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

This project uses the **Face Shape Dataset** available on Kaggle:

https://www.kaggle.com/datasets/niten19/face-shape-dataset

The original dataset from Kaggle provides **separate folders for training and testing images**, each containing subfolders for different face shapes.

However, for this project the dataset structure was **modified to simplify the machine learning pipeline**.

### Dataset Restructuring

The original dataset was reorganized so that **all images from both the training and testing folders were combined into a single directory called `dataset`**.

Within this directory, images are grouped only by **face shape class**. This allows the script to:

- scan the dataset automatically
- generate feature vectors for all images
- perform the **train-test split programmatically using scikit-learn**

This approach simplifies preprocessing and ensures that the dataset can be easily reused with different training splits.

### Original Dataset Structure (Kaggle)

```
dataset_original/
│
├── train/
│ ├── heart/
│ ├── square/
│ ├── oval/
│ └── round/
│
├── test/
│ ├── heart/
│ ├── square/
│ ├── oval/
│ └── round/
```

### Modified Dataset Structure (Used in This Project)

All images from both folders were merged into:

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
│
├── oval/
│   ├── img1.jpg
│   ├── img2.jpg
│   └── ...
│
├── round/
│   ├── img1.jpg
│   ├── img2.jpg
│   └── ...
```

Each folder name represents the **label used for classification**.

The script then automatically performs a **training/testing split during execution**, typically using an **80/20 split**.

### Face Shape Classes

The dataset contains four classes:

- Heart  
- Square  
- Oval  
- Round

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

### Project Structure

```
project_root/
│
├── dataset/
│ ├── heart/
│ ├── square/
│ ├── oval/
│ └── round/
│
├── face_landmarker.task
├── train_face_shape.py
└── README.md
```
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

## Results

The models were evaluated using a held-out test set and 5-fold cross-validation.

| Model | Test Accuracy | Mean Cross-Validation Accuracy |
|------|------|------|
| Random Forest | 0.534 | — |
| PCA (100) + SVM | 0.678 | 0.652 |

The PCA + SVM classifier significantly outperformed the Random Forest baseline. Dimensionality reduction using PCA helps remove noise and redundant information from the high-dimensional landmark feature space, allowing the SVM classifier to better separate the face shape classes.

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


