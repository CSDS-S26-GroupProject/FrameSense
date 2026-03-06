import { useState } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '../services/firebase'
import { useAuthStore } from '../store/useAuthStore'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import './AuthModal.css'

interface AuthModalProps {
  onClose?: () => void
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const { user } = useAuthStore()
  const [isSignup, setIsSignup] = useState(false)

  const handleLogout = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // If user is logged in, show user info and logout button
  if (user) {
    return (
      <div className="auth-modal">
        <div className="auth-modal-content">
          <button className="auth-modal-close" onClick={onClose}>
            ✕
          </button>
          <div className="user-info">
            <p className="user-email">{user.email}</p>
            <button className="logout-btn" onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    )
  }

  // If not logged in, show login/signup forms
  return (
    <div className="auth-modal">
      <div className="auth-modal-content">
        <button className="auth-modal-close" onClick={onClose}>
          ✕
        </button>
        <div className="auth-forms">
          {isSignup ? (
            <>
              <SignupForm onSuccess={onClose} />
              <p className="form-toggle">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignup(false)}
                  className="toggle-btn"
                >
                  Sign In
                </button>
              </p>
            </>
          ) : (
            <>
              <LoginForm onSuccess={onClose} />
              <p className="form-toggle">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setIsSignup(true)}
                  className="toggle-btn"
                >
                  Create One
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
