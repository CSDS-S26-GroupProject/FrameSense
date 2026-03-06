import { db } from './firebase'
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  Timestamp,
} from 'firebase/firestore'

// ===== USER PROFILE OPERATIONS =====

interface UserProfileData {
  email: string
  displayName: string
  preferences?: {
    favoriteFrameStyles: string[]
    preferredColors: string[]
  }
}

export async function saveUserProfile(uid: string, userData: UserProfileData) {
  try {
    await setDoc(
      doc(db, 'users', uid),
      {
        ...userData,
        createdAt: Timestamp.now(),
        lastLoginAt: Timestamp.now(),
      },
      { merge: true }
    )
  } catch (error) {
    console.error('Error saving user profile:', error)
    throw error
  }
}

export async function getUserProfile(uid: string) {
  try {
    const docSnap = await getDoc(doc(db, 'users', uid))
    return docSnap.exists() ? docSnap.data() : null
  } catch (error) {
    console.error('Error getting user profile:', error)
    throw error
  }
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfileData>) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      lastLoginAt: Timestamp.now(),
    })
  } catch (error) {
    console.error('Error updating user profile:', error)
    throw error
  }
}

// ===== FIT SESSION OPERATIONS =====

interface Measurement {
  interpupillaryDistance: number
  noseBridge: { x: number; y: number; z: number }
}

interface FitSessionData {
  glassesId: string
  glassesName: string
  fitScore: number
  fitNotes: string[]
  faceShape?: string
  measurements: Measurement
}

interface FitSessionWithId extends FitSessionData {
  id: string
  timestamp: Timestamp
}

export async function saveFitSession(uid: string, sessionData: FitSessionData) {
  try {
    const sessionsRef = collection(db, 'users', uid, 'fitSessions')
    const docRef = await addDoc(sessionsRef, {
      ...sessionData,
      timestamp: Timestamp.now(),
    })
    return docRef.id
  } catch (error) {
    console.error('Error saving fit session:', error)
    throw error
  }
}

export async function getUserFitSessions(uid: string): Promise<FitSessionWithId[]> {
  try {
    const sessionsRef = collection(db, 'users', uid, 'fitSessions')
    const querySnapshot = await getDocs(sessionsRef)
    const sessions = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FitSessionWithId[]
    // Sort by timestamp descending (most recent first)
    return sessions.sort((a, b) => {
      const timeA = (a.timestamp as Timestamp).toMillis()
      const timeB = (b.timestamp as Timestamp).toMillis()
      return timeB - timeA
    })
  } catch (error) {
    console.error('Error getting fit sessions:', error)
    throw error
  }
}

export async function getRecentFitSession(uid: string) {
  try {
    const sessions = await getUserFitSessions(uid)
    return sessions.length > 0 ? sessions[0] : null
  } catch (error) {
    console.error('Error getting recent fit session:', error)
    throw error
  }
}

// ===== GLASSES CATALOG OPERATIONS =====

interface GlassesFrameData {
  name: string
  style: string
  frameWidthMm: number
  colors: string[]
  recommendedFaceShapes: string[]
  modelPath: string
}

export async function getGlassesCatalog() {
  try {
    const framesRef = collection(db, 'glassesFrames')
    const querySnapshot = await getDocs(framesRef)
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error('Error getting glasses catalog:', error)
    throw error
  }
}

export async function getGlassesById(frameId: string) {
  try {
    const docSnap = await getDoc(doc(db, 'glassesFrames', frameId))
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null
  } catch (error) {
    console.error('Error getting glasses by ID:', error)
    throw error
  }
}

export async function addGlassesToCatalog(frameId: string, glassesData: GlassesFrameData) {
  try {
    await setDoc(doc(db, 'glassesFrames', frameId), glassesData)
  } catch (error) {
    console.error('Error adding glasses to catalog:', error)
    throw error
  }
}

// ===== USER PREFERENCES OPERATIONS =====

export async function updateUserPreferences(
  uid: string,
  preferences: {
    favoriteFrameStyles?: string[]
    preferredColors?: string[]
  }
) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      preferences,
    })
  } catch (error) {
    console.error('Error updating user preferences:', error)
    throw error
  }
}

export async function addFavoriteFrame(uid: string, frameId: string) {
  try {
    const userDoc = await getUserProfile(uid)
    const currentFavorites = userDoc?.preferences?.favoriteFrameStyles || []
    if (!currentFavorites.includes(frameId)) {
      await updateUserPreferences(uid, {
        favoriteFrameStyles: [...currentFavorites, frameId],
      })
    }
  } catch (error) {
    console.error('Error adding favorite frame:', error)
    throw error
  }
}

export async function removeFavoriteFrame(uid: string, frameId: string) {
  try {
    const userDoc = await getUserProfile(uid)
    const currentFavorites = userDoc?.preferences?.favoriteFrameStyles || []
    await updateUserPreferences(uid, {
      favoriteFrameStyles: currentFavorites.filter((id: string) => id !== frameId),
    })
  } catch (error) {
    console.error('Error removing favorite frame:', error)
    throw error
  }
}
