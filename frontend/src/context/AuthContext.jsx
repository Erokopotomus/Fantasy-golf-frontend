import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'
import { track, identify, reset, Events } from '../services/analytics'

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
    const token = localStorage.getItem('clutch_token')
    const userData = localStorage.getItem('user')

    if (token && userData) {
      try {
        setUser(JSON.parse(userData))
      } catch (e) {
        localStorage.removeItem('clutch_token')
        localStorage.removeItem('user')
      }
      // Refresh user from server to pick up any new fields (e.g. role)
      api.getMe().then(data => {
        if (data?.user) {
          localStorage.setItem('user', JSON.stringify(data.user))
          setUser(data.user)
        }
      }).catch(() => {}).finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    try {
      const data = await api.login(email, password)

      localStorage.setItem('clutch_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      identify(data.user.id, { name: data.user.name, email: data.user.email })
      track(Events.LOGGED_IN)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const signup = async (name, username, email, password) => {
    try {
      const data = await api.signup(name, username, email, password)

      localStorage.setItem('clutch_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      setUser(data.user)
      identify(data.user.id, { name: data.user.name, email: data.user.email })
      track(Events.SIGNED_UP)

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  const logout = () => {
    localStorage.removeItem('clutch_token')
    localStorage.removeItem('user')
    setUser(null)
    track(Events.LOGGED_OUT)
    reset()
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
