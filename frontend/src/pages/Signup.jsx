import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Button from '../components/common/Button'
import Input from '../components/common/Input'
import Checkbox from '../components/common/Checkbox'
import ClutchLogo from '../components/common/ClutchLogo'

const Signup = () => {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeToTerms, setAgreeToTerms] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (!username || username.length < 3) {
      setError('Username must be at least 3 characters')
      return
    }

    setLoading(true)

    const result = await signup(name, username, email, password)

    if (result.success) {
      navigate(from, { replace: true })
    } else {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left side - Image/Graphic */}
      <div className="hidden lg:flex flex-1 bg-[var(--surface)] items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="w-64 h-64 bg-gold/20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-glow-gold">
            <svg className="w-32 h-32 text-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold font-display text-text-primary mb-4">
            Join the Competition
          </h2>
          <p className="text-text-secondary leading-relaxed">
            Create or join leagues with friends, compete all season long, and
            prove you're the ultimate fantasy sports manager.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-md w-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-8">
            <ClutchLogo size={40} className="rounded-lg" />
            <span className="text-2xl font-display font-extrabold text-gold tracking-tight">CLUTCH</span>
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold font-display text-text-primary mb-2">Create your account</h1>
          <p className="text-text-secondary mb-8 leading-relaxed">
            Start your fantasy sports journey today
          </p>

          {error && (
            <div className="bg-live-red/10 border border-live-red/50 text-live-red px-4 py-3 rounded-lg mb-6 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Name"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />

            <Input
              label="Username"
              type="text"
              placeholder="e.g. BigCatGolf, JohnD23"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 30))}
              required
              helperText="Letters, numbers, and underscores only"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
            />

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              helperText="Must be at least 8 characters"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
            />

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              }
            />

            <Checkbox
              checked={agreeToTerms}
              onChange={(e) => setAgreeToTerms(e.target.checked)}
              label={
                <span>
                  I agree to the{' '}
                  <Link to="/terms" className="text-gold hover:text-gold/80 transition-colors duration-300">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-gold hover:text-gold/80 transition-colors duration-300">
                    Privacy Policy
                  </Link>
                </span>
              }
            />

            <Button type="submit" fullWidth loading={loading}>
              Create Account
            </Button>
          </form>

          {/* Google OAuth will be added here when implemented */}

          <p className="mt-8 text-center text-text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-gold hover:text-gold/80 font-medium transition-colors duration-300">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Signup
