import catalog from './catalog.json'
import type { FaceShape, GlassesFrame } from '../types/contract'

export type { FaceShape }
export type Frame = GlassesFrame & { svgStyle: SvgStyle; color: string }

export type SvgStyle = 'round' | 'rect' | 'cat' | 'aviator' | 'browline' | 'geo'

const STYLE_TO_SVG: Record<string, SvgStyle> = {
    aviator: 'aviator',
    wayfarer: 'rect',
    rectangle: 'rect',
    square: 'rect',
    round: 'round',
    oval: 'round',
    browline: 'browline',
    cat_eye: 'cat',
    geometric: 'geo',
}

const STYLE_COLORS: Record<string, string> = {
    gold: '#b08a3e',
    gunmetal: '#4a4a4a',
    havana: '#5a3a1f',
    copper: '#9b6434',
    black: '#151515',
    gray: '#5a5a5a',
    brown: '#3a2a1f',
    silver: '#9a9a9a',
    green: '#2a3b2a',
    pink: '#b88a8a',
    red: '#7a1a1a',
    purple: '#3a1f5a',
}

export const frames: Frame[] = (catalog as GlassesFrame[]).map((f) => ({
    ...f,
    svgStyle: STYLE_TO_SVG[f.style] ?? 'rect',
    color: STYLE_COLORS[f.colors[0]] ?? '#1a1a1a',
}))

export const faceShapes: Record<FaceShape, { name: string; description: string; recommends: string }> = {
    oval: {
        name: 'Oval',
        description: 'Balanced proportions with a softly rounded jaw.',
        recommends: 'Most shapes work — try browlines, geometric, or aviators.',
    },
    round: {
        name: 'Round',
        description: 'Soft curves with similar width and length.',
        recommends: 'Angular frames — rectangle, square, or browline — add definition.',
    },
    square: {
        name: 'Square',
        description: 'Strong jawline with broad forehead and cheekbones.',
        recommends: 'Round, oval, or cat-eye frames soften strong angles.',
    },
    heart: {
        name: 'Heart',
        description: 'Wider forehead tapering to a narrow chin.',
        recommends: 'Bottom-heavy shapes — aviator or round — balance the face.',
    },
}
