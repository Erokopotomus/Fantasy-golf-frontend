import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Checkbox from '../components/common/Checkbox'
import ClutchLogo from '../components/common/ClutchLogo'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const fromLocation = location.state?.from
  const from = fromLocation ? `${fromLocation.pathname}${fromLocation.search || ''}` : '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(email, password)

    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-8">
            <ClutchLogo size={40} className="rounded-lg" />
            <span className="text-2xl font-display font-extrabold text-gold tracking-tight">CLUTCH</span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary mb-2">Welcome back</h1>
          <p className="text-text-secondary mb-8 leading-relaxed">
            Sign in to your account to continue
          </p>

          {error && (
            <div className="bg-live-red/10 border border-live-red/50 text-live-red px-4 py-3 rounded-lg mb-6 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
            />

            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />

            <div className="flex items-center justify-between">
              <Checkbox
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                label="Remember me"
              />
              <Link to="/forgot-password" className="text-sm text-gold hover:text-gold/80 transition-colors duration-300">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" fullWidth loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-6">
          </div>

          <p className="mt-8 text-center text-text-secondary">
            Don't have an account?{' '}
            <Link to="/signup" state={{ from: location.state?.from }} className="text-gold hover:text-gold/80 font-medium transition-colors duration-300">
              Sign up free
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image/Graphic */}
      <div className="hidden lg:flex flex-1 bg-[var(--surface)] items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="w-64 h-64 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-glow-gold">
            <svg className="w-32 h-32 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-display text-text-primary mb-4">
            Track Your Season Performance
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Get detailed insights on your team's performance, compare with league
            members, and make data-driven decisions.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
