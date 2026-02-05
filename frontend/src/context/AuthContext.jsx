import { createContext, useContext, useState, useEffect } from 'react'
import { mockApi } from '../services/mockApi'
import api from '../services/api'

// Toggle via environment variable - defaults to REAL API in production
const envValue = import.meta.env.VITE_USE_MOCK_API
const USE_MOCK_API = envValue === 'true' || envValue === true
console.log('USE_MOCK_API:', USE_MOCK_API, 'env value:', envValue)

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing token on mount
    const token = localStorage.getItem('clutch_token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (e) {
        localStorage.removeItem('clutch_token')
        localStorage.removeItem('user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    try {
      let data

      if (USE_MOCK_API) {
        data = await mockApi.auth.login(email, password)
      } else {
        data = await api.login(email, password)
      }

      localStorage.setItem('clutch_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const signup = async (name, email, password) => {
    try {
      let data

      if (USE_MOCK_API) {
        data = await mockApi.auth.register(name, email, password)
      } else {
        data = await api.signup(name, email, password)
      }

      localStorage.setItem('clutch_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('clutch_token')
    localStorage.removeItem('user')
    setUser(null)
  }

  const updateUser = (updates) => {
    const updatedUser = { ...user, ...updates }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUser(updatedUser)
    return { success: true }
  }

  const value = {
    user,
    loading,
    login,
    signup,
    logout,
    updateUser,
    isAuthenticated: !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext
