import { Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { OnboardingProvider } from './context/OnboardingContext'
import { SportProvider } from './context/SportContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Navbar from './components/layout/Navbar'
import MobileNav from './components/layout/MobileNav'
import AuroraBackground from './components/layout/AuroraBackground'
import NotificationContainer from './components/notifications/NotificationContainer'
import OnboardingModal from './components/onboarding/OnboardingModal'
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
import Tournaments from './pages/Tournaments'
import TournamentScoring from './pages/TournamentScoring'
import TournamentPreviewPage from './pages/TournamentPreviewPage'
import Courses from './pages/Courses'
import Standings from './pages/Standings'
import LeagueLiveScoring from './pages/LeagueLiveScoring'
import PlayerProfile from './pages/PlayerProfile'
import TradeCenter from './pages/TradeCenter'
import LeagueSettings from './pages/LeagueSettings'
import TeamSettings from './pages/TeamSettings'
import News from './pages/News'
import ManagerProfile from './pages/ManagerProfile'
import MockDraft from './pages/MockDraft'
import MockDraftRoom from './pages/MockDraftRoom'
import DraftHistory from './pages/DraftHistory'
import DraftRecap from './pages/DraftRecap'
import MockDraftRecap from './pages/MockDraftRecap'
import NotificationSettings from './components/settings/NotificationSettings'
import AdminDashboard from './pages/AdminDashboard'
import ProveIt from './pages/ProveIt'
import ImportLeague from './pages/ImportLeague'
import LeagueVault from './pages/LeagueVault'
import SeasonRecap from './pages/SeasonRecap'
import DraftDollars from './pages/DraftDollars'
import PublicProfile from './pages/PublicProfile'
import CourseDetail from './pages/CourseDetail'
// Sport Hubs + Feed
import NflHub from './pages/NflHub'
import GolfHub from './pages/GolfHub'
import Feed from './pages/Feed'
// NFL pages
import NflPlayers from './pages/NflPlayers'
import NflPlayerDetail from './pages/NflPlayerDetail'
import NflSchedule from './pages/NflSchedule'
import NflTeams from './pages/NflTeams'
import NflTeamDetail from './pages/NflTeamDetail'
import NflCompare from './pages/NflCompare'
import NflLeaderboards from './pages/NflLeaderboards'
import GamedayPortal from './pages/GamedayPortal'
// Workspace
import DraftBoards from './pages/DraftBoards'
import DraftBoardEditor from './pages/DraftBoardEditor'
import WatchList from './pages/WatchList'
import DecisionJournal from './pages/DecisionJournal'
// Format-specific pages
import Matchups from './pages/Matchups'
import CategoryStandings from './pages/CategoryStandings'
import SurvivorBoard from './pages/SurvivorBoard'
import PickCenter from './pages/PickCenter'

function App() {
  return (
    <AuthProvider>
      <SportProvider>
      <NotificationProvider>
        <OnboardingProvider>
        <div className="min-h-screen bg-dark-primary">
          <AuroraBackground />
          <div className="relative z-10">
          <Navbar />
          <MobileNav />
          <NotificationContainer />
          <OnboardingModal />
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
            path="/leagues/:leagueId/team-settings"
            element={
              <ProtectedRoute>
                <TeamSettings />
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
            path="/tournaments"
            element={
              <ProtectedRoute>
                <Tournaments />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tournaments/:tournamentId/preview"
            element={
              <ProtectedRoute>
                <TournamentPreviewPage />
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
            path="/leagues/:leagueId/scoring"
            element={
              <ProtectedRoute>
                <LeagueLiveScoring />
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
            path="/courses"
            element={
              <ProtectedRoute>
                <Courses />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={
              <ProtectedRoute>
                <CourseDetail />
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
          <Route path="/news" element={<News />} />
          {/* Import & League Vault */}
          <Route
            path="/import"
            element={
              <ProtectedRoute>
                <ImportLeague />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/vault"
            element={
              <ProtectedRoute>
                <LeagueVault />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/recap"
            element={
              <ProtectedRoute>
                <SeasonRecap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/draft-dollars"
            element={
              <ProtectedRoute>
                <DraftDollars />
              </ProtectedRoute>
            }
          />
          {/* Public Profile (no auth required) */}
          <Route path="/u/:username" element={<PublicProfile />} />
          {/* Prove It Hub */}
          <Route
            path="/prove-it"
            element={
              <ProtectedRoute>
                <ProveIt />
              </ProtectedRoute>
            }
          />
          {/* Workspace */}
          <Route
            path="/workspace"
            element={
              <ProtectedRoute>
                <DraftBoards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/watch-list"
            element={
              <ProtectedRoute>
                <WatchList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/journal"
            element={
              <ProtectedRoute>
                <DecisionJournal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/workspace/:boardId"
            element={
              <ProtectedRoute>
                <DraftBoardEditor />
              </ProtectedRoute>
            }
          />
          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          {/* Notification Settings */}
          <Route
            path="/settings/notifications"
            element={
              <ProtectedRoute>
                <NotificationSettings />
              </ProtectedRoute>
            }
          />
          {/* Manager Profile */}
          <Route
            path="/manager/:userId"
            element={
              <ProtectedRoute>
                <ManagerProfile />
              </ProtectedRoute>
            }
          />
          {/* Mock Draft routes */}
          <Route
            path="/mock-draft"
            element={
              <ProtectedRoute>
                <MockDraft />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mock-draft/room"
            element={
              <ProtectedRoute>
                <MockDraftRoom />
              </ProtectedRoute>
            }
          />
          {/* Draft History routes */}
          <Route
            path="/draft/history"
            element={
              <ProtectedRoute>
                <DraftHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/draft/history/mock/:id"
            element={
              <ProtectedRoute>
                <MockDraftRecap />
              </ProtectedRoute>
            }
          />
          <Route
            path="/draft/history/:draftId"
            element={
              <ProtectedRoute>
                <DraftRecap />
              </ProtectedRoute>
            }
          />
          {/* Sport Hub + Feed routes */}
          <Route path="/feed" element={<Feed />} />
          <Route path="/nfl" element={<NflHub />} />
          <Route path="/golf" element={<GolfHub />} />
          {/* NFL routes */}
          <Route path="/nfl/players" element={<NflPlayers />} />
          <Route path="/nfl/players/:playerId" element={<NflPlayerDetail />} />
          <Route path="/nfl/leaderboards" element={<NflLeaderboards />} />
          <Route path="/nfl/compare" element={<ProtectedRoute><NflCompare /></ProtectedRoute>} />
          <Route path="/nfl/schedule" element={<ProtectedRoute><NflSchedule /></ProtectedRoute>} />
          <Route path="/nfl/teams" element={<NflTeams />} />
          <Route path="/nfl/teams/:abbr" element={<NflTeamDetail />} />
          {/* Gameday Portal */}
          <Route
            path="/leagues/:leagueId/gameday"
            element={
              <ProtectedRoute>
                <GamedayPortal />
              </ProtectedRoute>
            }
          />
          {/* Format-specific routes */}
          <Route
            path="/leagues/:leagueId/matchups"
            element={
              <ProtectedRoute>
                <Matchups />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/categories"
            element={
              <ProtectedRoute>
                <CategoryStandings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/survivor"
            element={
              <ProtectedRoute>
                <SurvivorBoard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/picks"
            element={
              <ProtectedRoute>
                <PickCenter />
              </ProtectedRoute>
            }
          />
          </Routes>
          </main>
          <Analytics />
          <SpeedInsights />
          </div>
        </div>
        </OnboardingProvider>
      </NotificationProvider>
      </SportProvider>
    </AuthProvider>
  )
}

export default App
