// frontend/src/types/contract.ts

// ----- Primitives -----

export interface Point3D {
    x: number; // normalized [0, 1] in MediaPipe space
    y: number;
    z: number;
}

export interface HeadPose {
    pitch: number; // up/down tilt in degrees
    yaw: number;   // left/right turn in degrees
    roll: number;  // head tilt (ear to shoulder) in degrees
}

export type FaceShape = 'oval' | 'round' | 'square' | 'heart' | 'diamond';

// ----- Glasses Catalog -----

export interface GlassesFrame {
    id: string;
    name: string;
    style: string;
    frameWidthMm: number;
    bridgeWidthMm: number;
    templeLengthMm: number;
    colors: string[];
    recommendedShapes: FaceShape[];
    modelPath: string;       // path to .glb file
    thumbnailPath: string;   // path to preview image
}

// ----- The Core Data Contract -----

export interface FrameSenseState {
    // Team 1 writes these
    rawLandmarks: Point3D[] | null;       // all 468 MediaPipe landmarks
    headPose: HeadPose | null;
    noseBridge: Point3D | null;           // landmark #6
    leftPupil: Point3D | null;            // landmark #468
    rightPupil: Point3D | null;           // landmark #473
    leftEarTop: Point3D | null;            // landmark #468
    rightEarTop: Point3D | null;
    faceShape: FaceShape | null;          // Phase 2

    // Team 3 writes these
    selectedGlassesId: string | null;
    catalog: GlassesFrame[];
    fitScore: number | null;              // 0–100
    fitNotes: string[];                   // e.g. ["Frame width is 3mm too wide"]

    // Team 1 actions
    setLandmarks: (landmarks: Point3D[]) => void;
    setHeadPose: (pose: HeadPose) => void;

    // Team 3 actions
    selectGlasses: (id: string) => void;
    setFitScore: (score: number, notes: string[]) => void;
}