// frontend/src/components/FaceShapeAnalyzer.tsx
// Upload a photo → get face shape prediction from the Python API
// Place in App.tsx and toggle with a boolean state

import { useState, useRef, useCallback } from 'react'
import { useFSStore } from '../store/useFSStore'

interface FaceShapeAnalyzerProps {
    onBack: () => void
}

interface PredictionResult {
    faceShape: string
    confidence: number
    probabilities: Record<string, number>
}

const SHAPE_DESCRIPTIONS: Record<string, { desc: string; emoji: string }> = {
    oval:    { emoji: '🥚', desc: 'Balanced proportions with a gently rounded jaw. Most frame styles suit you — you\'re the lucky one.' },
    round:   { emoji: '⭕', desc: 'Soft curves with similar width and height. Angular and geometric frames add definition.' },
    square:  { emoji: '⬛', desc: 'Strong jaw and broad forehead. Round and oval frames soften your features beautifully.' },
    heart:   { emoji: '🫀', desc: 'Wide forehead tapering to a narrow chin. Bottom-heavy frames balance your proportions.' },
    //diamond: { emoji: '💎', desc: 'Narrow forehead and jaw with wide cheekbones. Oval and rimless frames complement your angles.' },
}

export default function FaceShapeAnalyzer({ onBack }: FaceShapeAnalyzerProps) {
    const [image, setImage] = useState<string | null>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [result, setResult] = useState<PredictionResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const setFaceShape = useFSStore((s) => s.setFaceShape)
    
    const handleFile = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            setError('Please upload an image file.')
            return
        }

        // show preview
        const reader = new FileReader()
        reader.onload = (e) => setImage(e.target?.result as string)
        reader.readAsDataURL(file)

        // send to API
        setIsLoading(true)
        setResult(null)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('image', file)

            const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'
            const res = await fetch(`${apiUrl}/predict-image`, {
                method: 'POST',
                body: formData,
            })

            const text = await res.text()
            console.log('[FaceShape] Status:', res.status)
            console.log('[FaceShape] Raw response:', text)

            if (!text) {
                throw new Error('API returned an empty response. Check the Python terminal for errors.')
            }

            const data = JSON.parse(text)
            if (!res.ok) {
                throw new Error(data.error || 'Prediction failed')
            }
            setResult(data as PredictionResult)
            setFaceShape(data.faceShape)
        } catch (e: unknown) {
            if (e instanceof Error) {
                setError(e.message.includes('fetch') 
                    ? 'Could not reach the API. Make sure api.py is running on port 5173.' 
                    : e.message
                )
            }
        } finally {
            setIsLoading(false)
        }
    }, [])

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }, [handleFile])

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) handleFile(file)
    }

    const reset = () => {
        setImage(null)
        setResult(null)
        setError(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    const shapeInfo = result ? SHAPE_DESCRIPTIONS[result.faceShape.toLowerCase()] : null

    return (
        <div style={styles.overlay}>
            <div style={styles.panel}>

                {/* Header */}
                <div style={styles.header}>
                    <button onClick={onBack} style={styles.backBtn}>← Back</button>
                    <div style={styles.headerTitle}>
                        <span style={styles.headerEyebrow}>FRAMESENSE</span>
                        <h1 style={styles.heading}>Face Shape Analysis</h1>
                    </div>
                </div>

                <div style={styles.body}>
                    {/* Left — upload area */}
                    <div style={styles.left}>
                        {!image ? (
                            <div
                                style={{
                                    ...styles.dropzone,
                                    ...(isDragging ? styles.dropzoneDragging : {})
                                }}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={onDrop}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div style={styles.dropzoneIcon}>⬆</div>
                                <p style={styles.dropzoneText}>Drop a photo here</p>
                                <p style={styles.dropzoneSubtext}>or click to browse</p>
                                <p style={styles.dropzoneTip}>Face forward, good lighting</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    style={{ display: 'none' }}
                                    onChange={onFileChange}
                                />
                            </div>
                        ) : (
                            <div style={styles.previewWrapper}>
                                <img src={image} alt="uploaded face" style={styles.preview} />
                                {!isLoading && (
                                    <button onClick={reset} style={styles.retryBtn}>
                                        Try another photo
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right — result area */}
                    <div style={styles.right}>
                        {!image && !result && (
                            <div style={styles.placeholder}>
                                <div style={styles.placeholderShapes}>
                                    {Object.entries(SHAPE_DESCRIPTIONS).map(([shape, { emoji }]) => (
                                        <div key={shape} style={styles.shapeChip}>
                                            <span>{emoji}</span>
                                            <span style={styles.shapeChipLabel}>{shape}</span>
                                        </div>
                                    ))}
                                </div>
                                <p style={styles.placeholderText}>
                                    Upload a photo to discover your face shape and find glasses that suit you best.
                                </p>
                            </div>
                        )}

                        {isLoading && (
                            <div style={styles.loadingState}>
                                <div style={styles.spinner} />
                                <p style={styles.loadingText}>Analyzing your face shape…</p>
                            </div>
                        )}

                        {error && (
                            <div style={styles.errorBox}>
                                <span style={styles.errorIcon}>⚠</span>
                                <p style={styles.errorText}>{error}</p>
                            </div>
                        )}

                        {result && shapeInfo && (
                            <div style={styles.resultCard}>
                                <div style={styles.resultEmoji}>{shapeInfo.emoji}</div>
                                <div style={styles.resultLabel}>Your face shape</div>
                                <div style={styles.resultShape}>{result.faceShape}</div>
                                <div style={styles.resultDesc}>{shapeInfo.desc}</div>

                                {/* Confidence bar */}
                                <div style={styles.confidenceRow}>
                                    <span style={styles.confidenceLabel}>Confidence</span>
                                    <span style={styles.confidenceValue}>{Math.round(result.confidence * 100)}%</span>
                                </div>
                                <div style={styles.confidenceTrack}>
                                    <div style={{
                                        ...styles.confidenceFill,
                                        width: `${result.confidence * 100}%`
                                    }} />
                                </div>

                                {/* Probability breakdown */}
                                <div style={styles.probGrid}>
                                    {Object.entries(result.probabilities)
                                        .sort(([, a], [, b]) => b - a)
                                        .map(([shape, prob]) => (
                                            <div key={shape} style={styles.probRow}>
                                                <span style={styles.probShape}>{shape}</span>
                                                <div style={styles.probTrack}>
                                                    <div style={{
                                                        ...styles.probFill,
                                                        width: `${prob * 100}%`,
                                                        background: shape === result.faceShape
                                                            ? 'var(--accent, #00ff99)'
                                                            : 'rgba(255,255,255,0.15)'
                                                    }} />
                                                </div>
                                                <span style={styles.probValue}>{Math.round(prob * 100)}%</span>
                                            </div>
                                        ))
                                    }
                                </div>

                                {/* CTA */}
                                <button onClick={onBack} style={styles.ctaBtn}>
                                    Try on recommended glasses →
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
    overlay: {
        position: 'fixed',
        inset: 0,
        background: '#0a0a0a',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '"DM Sans", system-ui, sans-serif',
    },
    panel: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f0f0f',
        overflow: 'hidden',
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        padding: '1.25rem 2rem',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
    },
    backBtn: {
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '0.85rem',
        fontFamily: 'inherit',
        transition: 'background 0.15s',
        flexShrink: 0,
    },
    headerTitle: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.1rem',
    },
    headerEyebrow: {
        fontSize: '0.65rem',
        letterSpacing: '0.15em',
        color: 'rgba(255,255,255,0.3)',
        fontWeight: 600,
    },
    heading: {
        fontSize: '1.2rem',
        fontWeight: 700,
        color: '#fff',
        margin: 0,
        letterSpacing: '-0.02em',
    },
    body: {
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '0',
        overflow: 'hidden',
    },
    left: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        background: '#0a0a0a',
    },
    dropzone: {
        width: '100%',
        maxWidth: '400px',
        aspectRatio: '1',
        border: '2px dashed rgba(255,255,255,0.15)',
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        gap: '0.5rem',
        transition: 'border-color 0.2s, background 0.2s',
        background: 'rgba(255,255,255,0.02)',
    },
    dropzoneDragging: {
        borderColor: 'var(--accent, #00ff99)',
        background: 'rgba(0, 255, 153, 0.04)',
    },
    dropzoneIcon: {
        fontSize: '2.5rem',
        color: 'rgba(255,255,255,0.2)',
        marginBottom: '0.5rem',
    },
    dropzoneText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: '1rem',
        fontWeight: 600,
        margin: 0,
    },
    dropzoneSubtext: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: '0.8rem',
        margin: 0,
    },
    dropzoneTip: {
        color: 'rgba(255,255,255,0.2)',
        fontSize: '0.75rem',
        margin: '0.5rem 0 0',
        fontStyle: 'italic',
    },
    previewWrapper: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        width: '100%',
        maxWidth: '400px',
    },
    preview: {
        width: '100%',
        aspectRatio: '1',
        objectFit: 'cover',
        borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.1)',
    },
    retryBtn: {
        background: 'transparent',
        border: '1px solid rgba(255,255,255,0.15)',
        color: 'rgba(255,255,255,0.5)',
        padding: '0.4rem 1rem',
        borderRadius: '6px',
        cursor: 'pointer',
        fontSize: '0.8rem',
        fontFamily: 'inherit',
    },
    right: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        overflowY: 'auto',
    },
    placeholder: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        maxWidth: '360px',
        textAlign: 'center',
    },
    placeholderShapes: {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        justifyContent: 'center',
    },
    shapeChip: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.4rem 0.75rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)',
        fontSize: '0.8rem',
        color: 'rgba(255,255,255,0.5)',
    },
    shapeChipLabel: {
        textTransform: 'capitalize',
    },
    placeholderText: {
        color: 'rgba(255,255,255,0.3)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
        margin: 0,
    },
    loadingState: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
    },
    spinner: {
        width: '40px',
        height: '40px',
        border: '3px solid rgba(255,255,255,0.1)',
        borderTop: '3px solid var(--accent, #00ff99)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
    },
    loadingText: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: '0.9rem',
        margin: 0,
    },
    errorBox: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem',
        background: 'rgba(255, 80, 80, 0.08)',
        border: '1px solid rgba(255, 80, 80, 0.2)',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        maxWidth: '360px',
    },
    errorIcon: {
        color: '#ff5050',
        fontSize: '1rem',
        flexShrink: 0,
    },
    errorText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: '0.85rem',
        margin: 0,
        lineHeight: 1.5,
    },
    resultCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        width: '100%',
        maxWidth: '380px',
    },
    resultEmoji: {
        fontSize: '3rem',
        lineHeight: 1,
    },
    resultLabel: {
        fontSize: '0.7rem',
        letterSpacing: '0.12em',
        color: 'rgba(255,255,255,0.3)',
        textTransform: 'uppercase',
        fontWeight: 600,
    },
    resultShape: {
        fontSize: '2.5rem',
        fontWeight: 800,
        color: 'var(--accent, #00ff99)',
        textTransform: 'capitalize',
        letterSpacing: '-0.03em',
        lineHeight: 1,
    },
    resultDesc: {
        color: 'rgba(255,255,255,0.55)',
        fontSize: '0.88rem',
        lineHeight: 1.6,
        marginBottom: '0.5rem',
    },
    confidenceRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    confidenceLabel: {
        fontSize: '0.75rem',
        color: 'rgba(255,255,255,0.35)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
    },
    confidenceValue: {
        fontSize: '0.85rem',
        color: 'rgba(255,255,255,0.7)',
        fontWeight: 600,
    },
    confidenceTrack: {
        height: '4px',
        background: 'rgba(255,255,255,0.08)',
        borderRadius: '2px',
        overflow: 'hidden',
        marginBottom: '1rem',
    },
    confidenceFill: {
        height: '100%',
        background: 'var(--accent, #00ff99)',
        borderRadius: '2px',
        transition: 'width 0.6s ease',
    },
    probGrid: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.4rem',
        marginBottom: '1.25rem',
    },
    probRow: {
        display: 'grid',
        gridTemplateColumns: '70px 1fr 36px',
        alignItems: 'center',
        gap: '0.5rem',
    },
    probShape: {
        fontSize: '0.78rem',
        color: 'rgba(255,255,255,0.45)',
        textTransform: 'capitalize',
    },
    probTrack: {
        height: '3px',
        background: 'rgba(255,255,255,0.06)',
        borderRadius: '2px',
        overflow: 'hidden',
    },
    probFill: {
        height: '100%',
        borderRadius: '2px',
        transition: 'width 0.5s ease',
    },
    probValue: {
        fontSize: '0.72rem',
        color: 'rgba(255,255,255,0.3)',
        textAlign: 'right',
    },
    ctaBtn: {
        background: 'var(--accent, #00ff99)',
        color: '#000',
        border: 'none',
        padding: '0.85rem 1.5rem',
        borderRadius: '10px',
        cursor: 'pointer',
        fontSize: '0.9rem',
        fontWeight: 700,
        fontFamily: 'inherit',
        letterSpacing: '-0.01em',
        transition: 'opacity 0.15s',
    },
}
