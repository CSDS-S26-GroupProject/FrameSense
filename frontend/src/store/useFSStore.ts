import { create } from 'zustand'
import type { FrameSenseState, GlassesFrame } from '../types/contract'
import catalogData from '../data/catalog.json'

export const useFSStore = create<FrameSenseState>((set) => ({
    // initial state
    rawLandmarks: null,
    headPose: null,
    noseBridge: null,
    leftPupil: null,
    rightPupil: null,
    faceShape: null,
    selectedGlassesId: null,
    catalog: catalogData as GlassesFrame[],
    fitScore: null,
    fitNotes: [],

    // actions
    setLandmarks: (landmarks) => set({
        rawLandmarks: landmarks,
        noseBridge: landmarks[6],
        leftPupil: landmarks[468],
        rightPupil: landmarks[473],
    }),
    setHeadPose: (pose) => set({ headPose: pose }),
    selectGlasses: (id) => set({ selectedGlassesId: id }),
    setFitScore: (score, notes) => set({ fitScore: score, fitNotes: notes }),
}))