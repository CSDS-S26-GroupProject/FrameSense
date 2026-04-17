import os
import tempfile
from pathlib import Path

import cv2
import joblib
import mediapipe as mp
import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
from werkzeug.utils import secure_filename

# Resolve next to this file so Mac / Windows / Linux all work (no hardcoded drives).
_MODEL_DIR = Path(__file__).resolve().parent
MODEL_FILE = str(_MODEL_DIR / "face_shape_model.pkl")
LANDMARKER_PATH = str(_MODEL_DIR / "face_landmarker.task")

app = Flask(__name__)
CORS(app)  # allows the React frontend (localhost:5173) to call this API

if not os.path.exists(MODEL_FILE):
    raise FileNotFoundError(
        f"Model file '{MODEL_FILE}' not found. "
        "Run the training script first and make sure joblib.dump() is called at the end."
    )

model = joblib.load(MODEL_FILE)
print(f"Model loaded: {MODEL_FILE}")
print(f"Classes: {model.classes_}")

# =========================
# FEATURE EXTRACTION
# =========================
# Must match exactly what was used during training in the ML script.

def compute_full_features(landmarks: np.ndarray) -> np.ndarray:
    """
    Takes 468x3 landmark array.
    Returns 936-length feature vector (normalized x,y coordinates).
    """
    eps = 1e-6

    points = landmarks[:, :2].copy()  # use only x, y

    # center around mean
    center = np.mean(points, axis=0)
    points -= center

    # normalize by face height
    FOREHEAD_TOP = 10
    CHIN = 152
    face_height = np.linalg.norm(
        landmarks[FOREHEAD_TOP][:2] - landmarks[CHIN][:2]
    )
    points /= (face_height + eps)

    return points.flatten()  # 468 * 2 = 936 features


@app.route('/health', methods=['GET'])
def health():
    """Quick check that the API is running."""
    return jsonify({ 'status': 'ok', 'classes': list(model.classes_) })


@app.route('/predict', methods=['POST'])
def predict():
    """
    Accepts:
        { "landmarks": [[x, y, z], [x, y, z], ...] }  (468 points)

    Returns:
        {
            "faceShape": "oval",
            "confidence": 0.87,
            "probabilities": {
                "oval": 0.87,
                "round": 0.06,
                "square": 0.04,
                "heart": 0.02,
                "diamond": 0.01
            }
        }
    """
    try:
        body = request.get_json()

        if not body or 'landmarks' not in body:
            return jsonify({ 'error': 'Missing landmarks in request body' }), 400

        landmarks_raw = body['landmarks']

        # handle both [{x,y,z}, ...] and [[x,y,z], ...] formats
        if isinstance(landmarks_raw[0], dict):
            # frontend sends {x, y, z} objects
            landmarks = np.array(
                [[lm['x'], lm['y'], lm['z']] for lm in landmarks_raw],
                dtype=np.float32
            )
        else:
            # already an array format
            landmarks = np.array(landmarks_raw, dtype=np.float32)

        if landmarks.shape[0] < 468:
            return jsonify({
                'error': f'Expected 468 landmarks, got {landmarks.shape[0]}'
            }), 400

        features = compute_full_features(landmarks)
        shape = model.predict([features])[0]
        probs = model.predict_proba([features])[0]
        prob_dict = {
            cls: round(float(p), 4)
            for cls, p in zip(model.classes_, probs)
        }

        return jsonify({
            'faceShape':     shape,
            'confidence':    round(float(max(probs)), 4),
            'probabilities': prob_dict
        })

    except Exception as e:
        print(f"[/predict error]: {e}")  # prints full error to Python terminal
        return jsonify({ 'error': str(e) }), 500


_landmarker = None


def get_landmarker():
    """Lazy-load the MediaPipe landmarker (only once)."""
    global _landmarker
    if _landmarker is None:
        base_options = mp_python.BaseOptions(model_asset_path=LANDMARKER_PATH)
        options = mp_vision.FaceLandmarkerOptions(
            base_options=base_options,
            num_faces=1,
            output_face_blendshapes=False,
            output_facial_transformation_matrixes=False
        )
        _landmarker = mp_vision.FaceLandmarker.create_from_options(options)
    return _landmarker


@app.route('/predict-image', methods=['POST'])
def predict_image():
    """
    Accepts a multipart image upload.
    Runs MediaPipe face landmarking internally, then predicts face shape.

    Accepts:
        multipart/form-data with field 'image'

    Returns:
        {
            "faceShape": "oval",
            "confidence": 0.87,
            "probabilities": { "oval": 0.87, ... }
        }
    """
    try:
        if 'image' not in request.files:
            return jsonify({ 'error': 'No image file uploaded' }), 400

        file = request.files['image']
        if file.filename == '':
            return jsonify({ 'error': 'Empty filename' }), 400

        # save to a temp file so OpenCV can read it
        suffix = os.path.splitext(secure_filename(file.filename))[1]
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        # read with OpenCV
        image_bgr = cv2.imread(tmp_path)
        os.unlink(tmp_path)  # clean up temp file

        if image_bgr is None or image_bgr.size == 0:
            return jsonify({ 'error': 'Could not read image file' }), 400

        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)

        # run face landmark detection
        landmarker = get_landmarker()
        result = landmarker.detect(mp_image)

        if not result.face_landmarks:
            return jsonify({ 'error': 'No face detected in the image. Input another photo.' }), 422

        # convert to numpy array (468 x 3)
        landmarks_raw = result.face_landmarks[0]
        landmarks = np.array([[lm.x, lm.y, lm.z] for lm in landmarks_raw], dtype=np.float32)

        # extract features and predict
        features = compute_full_features(landmarks)
        shape = model.predict([features])[0]
        probs = model.predict_proba([features])[0]
        prob_dict = {
            cls: round(float(p), 4)
            for cls, p in zip(model.classes_, probs)
        }

        return jsonify({
            'faceShape':     shape,
            'confidence':    round(float(max(probs)), 4),
            'probabilities': prob_dict
        })

    except Exception as e:
        return jsonify({ 'error': str(e) }), 500



if __name__ == '__main__':
    # Port 5000 collides with macOS AirPlay Receiver on recent macOS versions.
    print("Starting FrameSense Face Shape API on http://localhost:5001")
    print("Endpoints:")
    print("  GET  /health   — check the API is running")
    print("  POST /predict  — predict face shape from 468 landmarks")
    app.run(host='0.0.0.0', port=5001, debug=True)
