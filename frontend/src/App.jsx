import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { ThemeProvider, useTheme } from './context/ThemeContext'
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
import { initErrorCapture } from './services/errorCapture'
import FloatingCaptureButton from './components/lab/FloatingCaptureButton'

// Critical path — eager load (public pages users hit first)
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'

// Everything else — lazy loaded (code-split per route)
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CreateLeague = lazy(() => import('./pages/CreateLeague'))
const JoinLeague = lazy(() => import('./pages/JoinLeague'))
const DraftRoom = lazy(() => import('./pages/DraftRoom'))
const TeamRoster = lazy(() => import('./pages/TeamRoster'))
const WaiverWire = lazy(() => import('./pages/WaiverWire'))
const Players = lazy(() => import('./pages/Players'))
const Leagues = lazy(() => import('./pages/Leagues'))
const LeagueHome = lazy(() => import('./pages/LeagueHome'))
const Draft = lazy(() => import('./pages/Draft'))
const Profile = lazy(() => import('./pages/Profile'))
const Tournaments = lazy(() => import('./pages/Tournaments'))
const TournamentScoring = lazy(() => import('./pages/TournamentScoring'))
const TournamentPreviewPage = lazy(() => import('./pages/TournamentPreviewPage'))
const Courses = lazy(() => import('./pages/Courses'))
const Standings = lazy(() => import('./pages/Standings'))
const LeagueLiveScoring = lazy(() => import('./pages/LeagueLiveScoring'))
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'))
const TradeCenter = lazy(() => import('./pages/TradeCenter'))
const LeagueSettings = lazy(() => import('./pages/LeagueSettings'))
const TeamSettings = lazy(() => import('./pages/TeamSettings'))
const News = lazy(() => import('./pages/News'))
const ManagerProfile = lazy(() => import('./pages/ManagerProfile'))
const ManagerLeaderboard = lazy(() => import('./pages/ManagerLeaderboard'))
const MockDraft = lazy(() => import('./pages/MockDraft'))
const MockDraftRoom = lazy(() => import('./pages/MockDraftRoom'))
const DraftHistory = lazy(() => import('./pages/DraftHistory'))
const DraftRecap = lazy(() => import('./pages/DraftRecap'))
const MockDraftRecap = lazy(() => import('./pages/MockDraftRecap'))
const NotificationSettings = lazy(() => import('./components/settings/NotificationSettings'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const ProveIt = lazy(() => import('./pages/ProveIt'))
const ImportLeague = lazy(() => import('./pages/ImportLeague'))
const CustomImport = lazy(() => import('./pages/CustomImport'))
const LeagueVault = lazy(() => import('./pages/LeagueVault'))
const VaultLanding = lazy(() => import('./pages/VaultLanding'))
const VaultReveal = lazy(() => import('./pages/VaultReveal'))
const VaultPublicLanding = lazy(() => import('./pages/VaultPublicLanding'))
const OwnerAssignment = lazy(() => import('./pages/OwnerAssignment'))
const SeasonRecap = lazy(() => import('./pages/SeasonRecap'))
const DraftDollars = lazy(() => import('./pages/DraftDollars'))
const PublicProfile = lazy(() => import('./pages/PublicProfile'))
const CourseDetail = lazy(() => import('./pages/CourseDetail'))
const Terms = lazy(() => import('./pages/Terms'))
const Privacy = lazy(() => import('./pages/Privacy'))
// Sport Hubs + Feed
const NflHub = lazy(() => import('./pages/NflHub'))
const GolfHub = lazy(() => import('./pages/GolfHub'))
const GolfCompare = lazy(() => import('./pages/GolfCompare'))
const TournamentRecap = lazy(() => import('./pages/TournamentRecap'))
const Feed = lazy(() => import('./pages/Feed'))
// NFL pages
const NflPlayers = lazy(() => import('./pages/NflPlayers'))
const NflPlayerDetail = lazy(() => import('./pages/NflPlayerDetail'))
const NflSchedule = lazy(() => import('./pages/NflSchedule'))
const NflTeams = lazy(() => import('./pages/NflTeams'))
const NflTeamDetail = lazy(() => import('./pages/NflTeamDetail'))
const NflCompare = lazy(() => import('./pages/NflCompare'))
const NflLeaderboards = lazy(() => import('./pages/NflLeaderboards'))
const GamedayPortal = lazy(() => import('./pages/GamedayPortal'))
// AI Coaching + Scout + Sim
const CoachSettings = lazy(() => import('./pages/CoachSettings'))
const CoachingReport = lazy(() => import('./pages/CoachingReport'))
const ScoutReport = lazy(() => import('./pages/ScoutReport'))
const ClutchSim = lazy(() => import('./pages/ClutchSim'))
// Clutch Rating
const ClutchRatingPage = lazy(() => import('./pages/ClutchRatingPage'))
// The Lab
const DraftBoards = lazy(() => import('./pages/DraftBoards'))
const DraftBoardEditor = lazy(() => import('./pages/DraftBoardEditor'))
const WatchList = lazy(() => import('./pages/WatchList'))
const DecisionJournal = lazy(() => import('./pages/DecisionJournal'))
const LabCaptures = lazy(() => import('./pages/LabCaptures'))
const LabCheatSheet = lazy(() => import('./pages/LabCheatSheet'))
const SeasonRace = lazy(() => import('./pages/SeasonRace'))
// Format-specific pages
const Matchups = lazy(() => import('./pages/Matchups'))
const PlayoffHistory = lazy(() => import('./pages/PlayoffHistory'))
const CategoryStandings = lazy(() => import('./pages/CategoryStandings'))
const SurvivorBoard = lazy(() => import('./pages/SurvivorBoard'))
const PickCenter = lazy(() => import('./pages/PickCenter'))

function WorkspaceRedirect() {
  const location = useLocation()
  return <Navigate to={location.pathname.replace(/^\/workspace/, '/lab') + location.search} replace />
}

function JoinRedirect() {
  const { code } = useParams()
  return <Navigate to={`/leagues/join?code=${code}`} replace />
}
function AppShell({ children }) {
  const { theme } = useTheme()
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {theme === 'dark' && <AuroraBackground />}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}

function App() {
  useEffect(() => { initErrorCapture() }, [])

  return (
    <ThemeProvider>
    <AuthProvider>
      <SportProvider>
      <NotificationProvider>
        <OnboardingProvider>
        <AppShell>
          <Navbar />
          <MobileNav />
          <FloatingCaptureButton />
          <NotificationContainer />
          <OnboardingModal />
          <main className="pb-20 md:pb-0">
          <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/join/:code" element={<JoinRedirect />} />
          <Route path="/onboarding" element={<Navigate to="/dashboard" replace />} />
          <Route path="/create-league" element={<Navigate to="/leagues/create" replace />} />
          <Route path="/register" element={<Navigate to="/signup" replace />} />
          <Route path="/golf/tournaments" element={<Navigate to="/tournaments" replace />} />
          <Route path="/golf/players" element={<Navigate to="/players" replace />} />
          <Route path="/live" element={<Navigate to="/tournaments" replace />} />
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
          <Route path="/tournaments/:tournamentId/recap" element={<TournamentRecap />} />
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
            path="/import/custom"
            element={
              <ProtectedRoute>
                <CustomImport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/vault"
            element={
              <ProtectedRoute>
                <VaultLanding />
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
            path="/leagues/:leagueId/vault/reveal"
            element={
              <ProtectedRoute>
                <VaultReveal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leagues/:leagueId/vault/assign-owners"
            element={
              <ProtectedRoute>
                <OwnerAssignment />
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
          {/* Public Vault Invite (no auth required) */}
          <Route path="/vault/invite/:inviteCode" element={<VaultPublicLanding />} />
          {/* Prove It Hub */}
          <Route
            path="/prove-it"
            element={
              <ProtectedRoute>
                <ProveIt />
              </ProtectedRoute>
            }
          />
          {/* Clutch Rating */}
          <Route
            path="/my-rating"
            element={
              <ProtectedRoute>
                <ClutchRatingPage />
              </ProtectedRoute>
            }
          />
          {/* The Lab (formerly Workspace) */}
          <Route
            path="/lab"
            element={
              <ProtectedRoute>
                <DraftBoards />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lab/watch-list"
            element={
              <ProtectedRoute>
                <WatchList />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lab/journal"
            element={
              <ProtectedRoute>
                <DecisionJournal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lab/captures"
            element={
              <ProtectedRoute>
                <LabCaptures />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lab/cheatsheet/:id"
            element={
              <ProtectedRoute>
                <LabCheatSheet />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lab/:boardId"
            element={
              <ProtectedRoute>
                <DraftBoardEditor />
              </ProtectedRoute>
            }
          />
          {/* AI Coaching + Scout + Sim */}
          <Route
            path="/coach/settings"
            element={
              <ProtectedRoute>
                <CoachSettings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/:reportId"
            element={
              <ProtectedRoute>
                <CoachingReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scout/:sport/:eventId"
            element={
              <ProtectedRoute>
                <ScoutReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sim"
            element={
              <ProtectedRoute>
                <ClutchSim />
              </ProtectedRoute>
            }
          />
          {/* Redirect old /workspace/* URLs to /lab/* */}
          <Route path="/workspace/*" element={<WorkspaceRedirect />} />
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
          <Route path="/leaderboard" element={<ManagerLeaderboard />} />
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
          <Route path="/golf/compare" element={<GolfCompare />} />
          <Route path="/season-race" element={<SeasonRace />} />
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
            path="/leagues/:leagueId/playoffs"
            element={
              <ProtectedRoute>
                <PlayoffHistory />
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
          </Suspense>
          </main>
          <Analytics />
          <SpeedInsights />
        </AppShell>
        </OnboardingProvider>
      </NotificationProvider>
      </SportProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}

export default App
