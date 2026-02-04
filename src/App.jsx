import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import CreateLeague from './pages/CreateLeague'
import JoinLeague from './pages/JoinLeague'
import DraftRoom from './pages/DraftRoom'
import TeamRoster from './pages/TeamRoster'
import WaiverWire from './pages/WaiverWire'
import Players from './pages/Players'
import Leagues from './pages/Leagues'
import Draft from './pages/Draft'
import Profile from './pages/Profile'

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-dark-primary">
        <Navbar />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues"
            element={
              <ProtectedRoute>
                <Leagues />
              </ProtectedRoute>
            }
          />
          <Route
            path="/draft"
            element={
              <ProtectedRoute>
                <Draft />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/create"
            element={
              <ProtectedRoute>
                <CreateLeague />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/join"
            element={
              <ProtectedRoute>
                <JoinLeague />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/draft"
            element={
              <ProtectedRoute>
                <DraftRoom />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/roster"
            element={
              <ProtectedRoute>
                <TeamRoster />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/waivers"
            element={
              <ProtectedRoute>
                <WaiverWire />
              </ProtectedRoute>
            }
          />
          <Route
            path="/players"
            element={
              <ProtectedRoute>
                <Players />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  )
}

export default App
