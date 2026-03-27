import { create } from 'zustand'
import type { FrameSenseState, GlassesFrame } from '../types/contract'
import catalogData from '../data/catalog.json'

export const useFSStore = create<FrameSenseState>((set) => ({
    // initial state
    rawLandmarks: null,
    rawTransformMatrix: null,
    headPose: null,
    noseBridge: null,
    noseBridgeBottom: null,
    leftPupil: null,
    rightPupil: null,
    leftEarTop: null,
    rightEarTop: null,
    noseBridgeBottom: null,
    faceShape: null,
    selectedGlassesId: null,
    catalog: catalogData as GlassesFrame[],
    fitScore: null,
    fitNotes: [],

    // actions
    setLandmarks: (landmarks) => set({
        rawLandmarks: landmarks,
        noseBridge: landmarks[6],
        noseBridgeBottom: {
            x: (landmarks[195].x + landmarks[197].x) / 2,
            y: (landmarks[195].y + landmarks[197].y) / 2,
            z: (landmarks[195].z + landmarks[197].z) / 2,
        },
        leftPupil: landmarks[468],
        rightPupil: landmarks[473],
        leftEarTop: landmarks[356],
        rightEarTop: landmarks[127],
        noseBridgeBottom: {
            x: (landmarks[195].x + landmarks[197].x) / 2,
            y: (landmarks[195].y + landmarks[197].y) / 2,
            z: (landmarks[195].z + landmarks[197].z) / 2,
        },
    }),
    setHeadPose: (pose) => set({ headPose: pose }),
    setRawTransformMatrix: (m) => set({ rawTransformMatrix: m }),
    selectGlasses: (id) => set({ selectedGlassesId: id }),
    setFitScore: (score, notes) => set({ fitScore: score, fitNotes: notes }),
}))