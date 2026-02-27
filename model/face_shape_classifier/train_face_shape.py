import cv2
import numpy as np
import os

import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# ML imports
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.svm import SVC
from sklearn.decomposition import PCA
from sklearn.metrics import accuracy_score, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

print("Script started")

# =========================
# INITIAL SETUP
# =========================

MODEL_PATH = "face_landmarker.task"

base_options = python.BaseOptions(
    model_asset_path=MODEL_PATH
)

options = vision.FaceLandmarkerOptions(
    base_options=base_options,
    num_faces=1,
    output_face_blendshapes=False,
    output_facial_transformation_matrixes=False
)

landmarker = vision.FaceLandmarker.create_from_options(options)

# =========================
# LANDMARK EXTRACTION
# =========================

def extract_landmarks(image_path):
    image = cv2.imread(image_path)

    if image is None or image.size == 0:
        return None

    try:
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    except:
        return None

    mp_image = mp.Image(
        image_format=mp.ImageFormat.SRGB,
        data=image_rgb
    )

    result = landmarker.detect(mp_image)

    if not result.face_landmarks:
        return None

    landmarks = result.face_landmarks[0]
    return np.array([[lm.x, lm.y, lm.z] for lm in landmarks])

# =========================
# FULL LANDMARK FEATURES (936)
# =========================

def compute_full_features(landmarks):

    eps = 1e-6

    points = landmarks[:, :2].copy()

    center = np.mean(points, axis=0)
    points -= center

    FOREHEAD_TOP = 10
    CHIN = 152

    face_height = np.linalg.norm(
        landmarks[FOREHEAD_TOP][:2] - landmarks[CHIN][:2]
    )

    points /= (face_height + eps)

    return points.flatten()

# =========================
# DATASET BUILDING
# =========================

dataset_path = "dataset"
data = []
labels = []

print("Scanning dataset directory...")

for label in sorted(os.listdir(dataset_path)):
    class_dir = os.path.join(dataset_path, label)
    if not os.path.isdir(class_dir):
        continue

    print(f"Processing class: {label}")

    for img_file in os.listdir(class_dir):
        img_path = os.path.join(class_dir, img_file)

        landmarks = extract_landmarks(img_path)
        if landmarks is None:
            continue

        features = compute_full_features(landmarks)
        data.append(features)
        labels.append(label)

X = np.array(data)
y = np.array(labels)

print("Final dataset size:", X.shape)

# =========================
# TRAIN / TEST SPLIT
# =========================

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=0.25,
    random_state=42,
    stratify=y
)

print("Train shape:", X_train.shape)
print("Test shape:", X_test.shape)

# =========================
# RANDOM FOREST (baseline)
# =========================

rf_model = RandomForestClassifier(
    n_estimators=300,
    random_state=42
)

rf_model.fit(X_train, y_train)

rf_pred = rf_model.predict(X_test)
rf_acc = accuracy_score(y_test, rf_pred)

print("\nRandom Forest Accuracy:", round(rf_acc, 3))

# =========================
# SVM WITH PCA (100 components)
# =========================

svm_pipeline = Pipeline([
    ("scaler", StandardScaler()),
    ("pca", PCA(n_components=100)),
    ("svc", SVC(kernel="rbf", probability=True))
])

param_grid = {
    "svc__C": [10, 50, 100, 200, 500],
    "svc__gamma": [0.001, 0.005, 0.01, 0.02, 0.05]
}

grid = GridSearchCV(
    svm_pipeline,
    param_grid,
    cv=5,
    scoring="accuracy",
    n_jobs=-1
)

print("\nTuning SVM with PCA...")
grid.fit(X_train, y_train)

print("Best parameters:", grid.best_params_)
print("Best CV accuracy:", round(grid.best_score_, 3))

best_svm = grid.best_estimator_

y_pred_svm = best_svm.predict(X_test)
svm_acc = accuracy_score(y_test, y_pred_svm)

print("\nTuned SVM Test Accuracy:", round(svm_acc, 3))

# =========================
# CROSS VALIDATION
# =========================

cv_scores = cross_val_score(best_svm, X_train, y_train, cv=5)

print("\n5-Fold CV Scores:", np.round(cv_scores, 3))
print("Mean CV Accuracy:", round(cv_scores.mean(), 3))

# =========================
# CONFUSION MATRIX
# =========================

labels_unique = best_svm.classes_
cm = confusion_matrix(y_test, y_pred_svm, labels=labels_unique)

plt.figure(figsize=(6,5))
sns.heatmap(
    cm,
    annot=True,
    fmt="d",
    cmap="Greens",
    xticklabels=labels_unique,
    yticklabels=labels_unique
)

plt.title("Confusion Matrix (PCA 100 + SVM)")
plt.xlabel("Predicted")
plt.ylabel("True")
plt.tight_layout()
plt.show()
