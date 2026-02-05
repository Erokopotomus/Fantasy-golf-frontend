import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import MobileNav from './components/layout/MobileNav'
import NotificationContainer from './components/notifications/NotificationContainer'
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
import LeagueHome from './pages/LeagueHome'
import Draft from './pages/Draft'
import Profile from './pages/Profile'
import TournamentScoring from './pages/TournamentScoring'
import Standings from './pages/Standings'
import PlayerProfile from './pages/PlayerProfile'
import TradeCenter from './pages/TradeCenter'
import LeagueSettings from './pages/LeagueSettings'

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-dark-primary">
          <Navbar />
          <MobileNav />
          <NotificationContainer />
          <main className="pb-20 md:pb-0">
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
            path="/leagues/:leagueId"
            element={
              <ProtectedRoute>
                <LeagueHome />
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
          <Route
            path="/tournaments/:tournamentId"
            element={
              <ProtectedRoute>
                <TournamentScoring />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/standings"
            element={
              <ProtectedRoute>
                <Standings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/players/:playerId"
            element={
              <ProtectedRoute>
                <PlayerProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/trades"
            element={
              <ProtectedRoute>
                <TradeCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/settings"
            element={
              <ProtectedRoute>
                <LeagueSettings />
              </ProtectedRoute>
            }
          />
          </Routes>
          </main>
        </div>
      </NotificationProvider>
    </AuthProvider>
  )
}

export default App
