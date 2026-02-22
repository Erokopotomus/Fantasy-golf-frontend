import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api'

const DIVISIONS = ['North', 'South', 'East', 'West']

const NflTeams = () => {
  const [teams, setTeams] = useState([])
  const [grouped, setGrouped] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    api.getNflTeams()
      .then(data => {
        setTeams(data.teams || [])
        setGrouped(data.grouped || {})
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
        <div className="text-center py-20 text-text-primary/30">Loading teams...</div>
      </div>
    )
  }

  const renderDivision = (conference, division) => {
    const key = `${conference} ${division}`
    const divTeams = grouped[key] || []

    return (
      <div key={key}>
        <h3 className="text-[11px] font-mono font-bold text-text-primary/25 uppercase tracking-widest mb-2">
          {division}
        </h3>
        <div className="space-y-1.5">
          {divTeams.map(team => (
            <Link
              key={team.abbreviation}
              to={`/nfl/teams/${team.abbreviation}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[var(--surface)] border border-[var(--card-border)] hover:bg-[var(--surface-alt)] hover:border-[var(--card-border)] transition-all group"
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-mono font-extrabold flex-shrink-0"
                style={{
                  backgroundColor: team.primaryColor ? `${team.primaryColor}25` : 'rgba(255,255,255,0.08)',
                  color: team.primaryColor || '#fff',
                }}
              >
                {team.abbreviation}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-text-primary text-sm font-semibold truncate group-hover:text-gold transition-colors">
                  {team.name}
                </p>
                <p className="text-text-primary/30 text-[11px]">{team.city}</p>
              </div>
              <svg className="w-4 h-4 text-text-primary/15 group-hover:text-gold/50 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-20 pb-8">
      <button onClick={() => navigate(-1)} className="text-text-primary/40 hover:text-text-primary/60 text-sm mb-4 inline-flex items-center gap-1">
        &larr; Back
      </button>

      <div className="flex items-center gap-3 mb-8">
        <span className="text-3xl">🏈</span>
        <h1 className="text-2xl font-display font-bold text-text-primary">NFL Teams</h1>
      </div>

      {/* Conference layout: NFC left, AFC right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* NFC */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--card-border)]">
            <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
              <span className="text-blue-400 text-xs font-mono font-extrabold">NFC</span>
            </div>
            <h2 className="text-lg font-display font-bold text-text-primary">National Football Conference</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {DIVISIONS.map(div => renderDivision('NFC', div))}
          </div>
        </div>

        {/* AFC */}
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[var(--card-border)]">
            <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center">
              <span className="text-red-400 text-xs font-mono font-extrabold">AFC</span>
            </div>
            <h2 className="text-lg font-display font-bold text-text-primary">American Football Conference</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {DIVISIONS.map(div => renderDivision('AFC', div))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default NflTeams
