import { useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Card from '../components/common/Card'
import Button from '../components/common/Button'
import api from '../services/api'

const CONFIDENCE_COLORS = {
  high: 'bg-green-500/20 text-green-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-red-500/20 text-red-400',
}

const DATA_CATEGORIES = [
  { value: 'standings', label: 'Standings' },
  { value: 'records', label: 'All-Time Records' },
  { value: 'awards', label: 'Awards' },
  { value: 'trophies', label: 'Trophies' },
  { value: 'draft_history', label: 'Draft History' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'custom_stats', label: 'Custom Stats' },
  { value: 'punishments', label: 'Punishments' },
  { value: 'nicknames', label: 'Nicknames' },
  { value: 'other', label: 'Other' },
]

const COLUMN_CATEGORIES = [
  'SEASON_YEAR', 'TEAM_NAME', 'OWNER_NAME', 'WINS', 'LOSSES', 'TIES',
  'POINTS_FOR', 'POINTS_AGAINST', 'FINAL_STANDING', 'PLAYOFF_RESULT',
  'CHAMPIONSHIP_WON', 'DRAFT_PICK', 'DRAFT_ROUND', 'PLAYER_NAME',
  'PLAYER_POSITION', 'TRADE_DATE', 'TRADE_DETAILS', 'WAIVER_CLAIM',
  'FAAB_SPENT', 'WEEKLY_SCORE', 'WEEK_NUMBER', 'OPPONENT',
  'ALL_TIME_WINS', 'ALL_TIME_LOSSES', 'TROPHY_NAME', 'AWARD_NAME',
  'PUNISHMENT', 'NICKNAME', 'NOTES', 'CUSTOM',
]

// ─── Spreadsheet Tab ────────────────────────────────────────────────────────

const SpreadsheetImport = ({ leagueId, onComplete }) => {
  const [step, setStep] = useState('upload') // upload | preview | confirm | done
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [preview, setPreview] = useState(null)
  const [overrides, setOverrides] = useState({})
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)
  const [sheetsUrl, setSheetsUrl] = useState('')

  const handleFileUpload = useCallback(async (file) => {
    if (!leagueId) {
      setError('Please select a league first')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await api.uploadCustomSpreadsheet(file, leagueId)
      setPreview(data)
      setStep('preview')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  const handleSheetsImport = useCallback(async () => {
    if (!leagueId || !sheetsUrl) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.importGoogleSheets(sheetsUrl, leagueId)
      setPreview(data)
      setStep('preview')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [leagueId, sheetsUrl])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFileUpload(file)
  }, [handleFileUpload])

  const handleConfirm = useCallback(async () => {
    if (!preview?.previewId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.confirmCustomImport(preview.previewId, overrides)
      setResult(data)
      setStep('done')
      if (onComplete) onComplete(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [preview, overrides, onComplete])

  const updateColumnMapping = (sheetName, header, newMapping) => {
    setOverrides(prev => ({
      ...prev,
      [sheetName]: {
        ...prev[sheetName],
        columns: [
          ...(prev[sheetName]?.columns || []).filter(c => c.header !== header),
          { header, mappedTo: newMapping },
        ],
      },
    }))
  }

  const updateCategory = (sheetName, category) => {
    setOverrides(prev => ({
      ...prev,
      [sheetName]: { ...prev[sheetName], dataCategory: category },
    }))
  }

  const updateSeasonYear = (sheetName, year) => {
    setOverrides(prev => ({
      ...prev,
      [sheetName]: { ...prev[sheetName], seasonYear: year ? parseInt(year) : null },
    }))
  }

  if (step === 'done' && result) {
    return (
      <Card className="text-center py-12">
        <div className="text-4xl mb-4">&#10003;</div>
        <h3 className="text-xl font-display font-bold text-white mb-2">Import Complete</h3>
        <p className="text-text-secondary mb-6 font-mono">
          {result.imported} record{result.imported !== 1 ? 's' : ''} imported successfully.
        </p>
        <Button onClick={() => { setStep('upload'); setPreview(null); setResult(null) }}>
          Import More Data
        </Button>
      </Card>
    )
  }

  if (step === 'preview' && preview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-bold text-white">
            Preview: {preview.fileName || preview.sourceUrl}
          </h3>
          <button onClick={() => { setStep('upload'); setPreview(null) }} className="text-text-secondary hover:text-white text-sm">
            Back
          </button>
        </div>

        {preview.sheets?.map((sheet, i) => (
          <Card key={i}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-display font-bold text-white">{sheet.sheetName}</h4>
              <span className="text-xs text-text-secondary font-mono">{sheet.totalRows} rows</span>
            </div>

            {/* Category + Season Override */}
            <div className="flex gap-4 mb-4">
              <div>
                <label className="text-xs text-text-secondary font-mono block mb-1">Data Category</label>
                <select
                  className="bg-dark-tertiary text-white text-sm rounded px-3 py-1.5 border border-dark-tertiary focus:border-accent-gold outline-none"
                  value={overrides[sheet.sheetName]?.dataCategory || sheet.mapping?.dataCategory || 'other'}
                  onChange={(e) => updateCategory(sheet.sheetName, e.target.value)}
                >
                  {DATA_CATEGORIES.map(c => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-text-secondary font-mono block mb-1">Season Year</label>
                <input
                  type="number"
                  placeholder="e.g. 2024"
                  className="bg-dark-tertiary text-white text-sm rounded px-3 py-1.5 border border-dark-tertiary focus:border-accent-gold outline-none w-24"
                  value={overrides[sheet.sheetName]?.seasonYear ?? sheet.mapping?.seasonYear ?? ''}
                  onChange={(e) => updateSeasonYear(sheet.sheetName, e.target.value)}
                />
              </div>
            </div>

            {/* Column Mapping Table */}
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-tertiary">
                    <th className="text-left text-text-secondary font-mono py-2 pr-4">Column</th>
                    <th className="text-left text-text-secondary font-mono py-2 pr-4">Detected Type</th>
                    <th className="text-left text-text-secondary font-mono py-2 pr-4">Confidence</th>
                    <th className="text-left text-text-secondary font-mono py-2">Override</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.mapping?.columns?.map((col, j) => (
                    <tr key={j} className="border-b border-dark-tertiary/50">
                      <td className="py-2 pr-4 text-white font-mono">{col.header}</td>
                      <td className="py-2 pr-4 text-text-secondary">{col.mappedTo}</td>
                      <td className="py-2 pr-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-mono ${CONFIDENCE_COLORS[col.confidence] || CONFIDENCE_COLORS.low}`}>
                          {col.confidence}
                        </span>
                      </td>
                      <td className="py-2">
                        <select
                          className="bg-dark-tertiary text-white text-xs rounded px-2 py-1 border border-dark-tertiary focus:border-accent-gold outline-none"
                          value={
                            overrides[sheet.sheetName]?.columns?.find(c => c.header === col.header)?.mappedTo
                            || col.mappedTo
                          }
                          onChange={(e) => updateColumnMapping(sheet.sheetName, col.header, e.target.value)}
                        >
                          {COLUMN_CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Sample Data Preview */}
            {sheet.sampleRows?.length > 0 && (
              <div>
                <h5 className="text-xs text-text-secondary font-mono mb-2">Data Preview (first 5 rows)</h5>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b border-dark-tertiary">
                        {sheet.headers.map((h, k) => (
                          <th key={k} className="text-left text-text-secondary py-1 pr-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sheet.sampleRows.map((row, k) => (
                        <tr key={k} className="border-b border-dark-tertiary/30">
                          {row.map((cell, l) => (
                            <td key={l} className="py-1 pr-3 text-white">{cell != null ? String(cell) : ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </Card>
        ))}

        {error && <p className="text-red-400 text-sm font-mono">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => { setStep('upload'); setPreview(null) }}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? 'Importing...' : 'Confirm & Import'}
          </Button>
        </div>
      </div>
    )
  }

  // Upload step
  return (
    <div className="space-y-6">
      {/* File Upload Zone */}
      <Card>
        <h3 className="font-display font-bold text-white mb-4">Upload Spreadsheet</h3>
        <div
          className="border-2 border-dashed border-dark-tertiary rounded-lg p-8 text-center hover:border-accent-gold/50 transition-colors cursor-pointer"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="text-3xl mb-2">&#128196;</div>
          <p className="text-white font-display mb-1">
            {loading ? 'Processing...' : 'Drop your file here or click to browse'}
          </p>
          <p className="text-text-secondary text-sm font-mono">Supports .xlsx, .xls, and .csv</p>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
          />
        </div>
      </Card>

      {/* Google Sheets URL */}
      <Card>
        <h3 className="font-display font-bold text-white mb-4">Or Import from Google Sheets</h3>
        <div className="flex gap-3">
          <input
            type="url"
            placeholder="Paste Google Sheets URL..."
            className="flex-1 bg-dark-tertiary text-white rounded px-4 py-2 border border-dark-tertiary focus:border-accent-gold outline-none font-mono text-sm"
            value={sheetsUrl}
            onChange={(e) => setSheetsUrl(e.target.value)}
          />
          <Button onClick={handleSheetsImport} disabled={loading || !sheetsUrl}>
            {loading ? 'Loading...' : 'Import'}
          </Button>
        </div>
        <p className="text-xs text-text-secondary mt-2 font-mono">
          Sheet must be set to "Anyone with the link can view"
        </p>
      </Card>

      {error && <p className="text-red-400 text-sm font-mono">{error}</p>}
    </div>
  )
}

// ─── Website Tab ────────────────────────────────────────────────────────────

const WebsiteImport = ({ leagueId, onComplete }) => {
  const [step, setStep] = useState('input') // input | crawling | preview | done
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState(null)
  const [includedUrls, setIncludedUrls] = useState(new Set())
  const [result, setResult] = useState(null)

  const handleCrawl = useCallback(async () => {
    if (!leagueId || !url) return
    setLoading(true)
    setError(null)
    setStep('crawling')
    try {
      const data = await api.importWebsite(url, leagueId)
      setPreview(data)
      // Default: include all pages
      setIncludedUrls(new Set(data.pages?.map(p => p.url) || []))
      setStep('preview')
    } catch (err) {
      setError(err.message)
      setStep('input')
    } finally {
      setLoading(false)
    }
  }, [leagueId, url])

  const handleConfirm = useCallback(async () => {
    if (!preview?.previewId) return
    setLoading(true)
    setError(null)
    try {
      const data = await api.confirmCustomImport(preview.previewId, {}, [...includedUrls])
      setResult(data)
      setStep('done')
      if (onComplete) onComplete(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [preview, includedUrls, onComplete])

  const toggleUrl = (pageUrl) => {
    setIncludedUrls(prev => {
      const next = new Set(prev)
      if (next.has(pageUrl)) next.delete(pageUrl)
      else next.add(pageUrl)
      return next
    })
  }

  if (step === 'done' && result) {
    return (
      <Card className="text-center py-12">
        <div className="text-4xl mb-4">&#10003;</div>
        <h3 className="text-xl font-display font-bold text-white mb-2">Website Import Complete</h3>
        <p className="text-text-secondary mb-6 font-mono">
          {result.imported} record{result.imported !== 1 ? 's' : ''} imported from {preview?.pagesScanned} pages.
        </p>
        <Button onClick={() => { setStep('input'); setPreview(null); setResult(null) }}>
          Import More Data
        </Button>
      </Card>
    )
  }

  if (step === 'crawling') {
    return (
      <Card className="text-center py-12">
        <div className="animate-spin text-4xl mb-4">&#8987;</div>
        <h3 className="text-lg font-display font-bold text-white mb-2">Scanning Your Site</h3>
        <p className="text-text-secondary font-mono text-sm">
          Crawling pages and extracting data... this may take a minute.
        </p>
      </Card>
    )
  }

  if (step === 'preview' && preview) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-display font-bold text-white">
            Found data on {preview.pagesScanned} page{preview.pagesScanned !== 1 ? 's' : ''}
          </h3>
          <button onClick={() => { setStep('input'); setPreview(null) }} className="text-text-secondary hover:text-white text-sm">
            Back
          </button>
        </div>

        {preview.pages?.map((page, i) => (
          <Card key={i}>
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={includedUrls.has(page.url)}
                onChange={() => toggleUrl(page.url)}
                className="mt-1 accent-accent-gold"
              />
              <div className="flex-1">
                <h4 className="font-display font-bold text-white text-sm">{page.title || page.url}</h4>
                <p className="text-xs text-text-secondary font-mono truncate">{page.url}</p>

                {page.extractedData?.map((data, j) => (
                  <div key={j} className="mt-3 pl-4 border-l-2 border-accent-gold/30">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 bg-accent-gold/20 text-accent-gold rounded text-xs font-mono">
                        {data.category}
                      </span>
                      {data.seasonYear && (
                        <span className="text-xs text-text-secondary font-mono">Season {data.seasonYear}</span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">{data.description}</p>
                    {data.rows?.length > 0 && (
                      <p className="text-xs text-text-secondary font-mono mt-1">
                        {data.rows.length} record{data.rows.length !== 1 ? 's' : ''} found
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        ))}

        {error && <p className="text-red-400 text-sm font-mono">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => { setStep('input'); setPreview(null) }}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={loading || includedUrls.size === 0}>
            {loading ? 'Importing...' : `Import ${includedUrls.size} Page${includedUrls.size !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    )
  }

  // Input step
  return (
    <Card>
      <h3 className="font-display font-bold text-white mb-4">Import from League Website</h3>
      <p className="text-text-secondary text-sm mb-4">
        Paste your league's website URL and we'll crawl it for standings, records, awards, and other league data.
      </p>
      <div className="flex gap-3">
        <input
          type="url"
          placeholder="https://yourleague.com"
          className="flex-1 bg-dark-tertiary text-white rounded px-4 py-2 border border-dark-tertiary focus:border-accent-gold outline-none font-mono text-sm"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button onClick={handleCrawl} disabled={loading || !url}>
          {loading ? 'Scanning...' : 'Scan Site'}
        </Button>
      </div>
      <p className="text-xs text-text-secondary mt-2 font-mono">
        We'll scan up to 20 pages within the same domain. Only publicly accessible content.
      </p>
      {error && <p className="text-red-400 text-sm font-mono mt-2">{error}</p>}
    </Card>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────

const CustomImport = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialLeagueId = searchParams.get('leagueId') || ''

  const [tab, setTab] = useState('spreadsheet')
  const [leagueId, setLeagueId] = useState(initialLeagueId)
  const [leagues, setLeagues] = useState([])
  const [loadingLeagues, setLoadingLeagues] = useState(true)

  // Fetch user's leagues for the selector
  useState(() => {
    api.request('/leagues').then(data => {
      const all = [...(data.owned || []), ...(data.member || [])]
      setLeagues(all)
      if (!leagueId && all.length > 0) setLeagueId(all[0].id)
    }).catch(() => {}).finally(() => setLoadingLeagues(false))
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Custom Data Import</h1>
          <p className="text-text-secondary text-sm mt-1">
            Import your league's custom history — records, awards, punishments, and more.
          </p>
        </div>
        <button
          onClick={() => navigate('/import')}
          className="text-text-secondary hover:text-white text-sm"
        >
          Back to Imports
        </button>
      </div>

      {/* League Selector */}
      <Card className="mb-6">
        <label className="text-xs text-text-secondary font-mono block mb-2">Select League</label>
        {loadingLeagues ? (
          <p className="text-text-secondary text-sm font-mono">Loading leagues...</p>
        ) : leagues.length === 0 ? (
          <p className="text-text-secondary text-sm">
            No leagues found.{' '}
            <button onClick={() => navigate('/import')} className="text-accent-gold hover:underline">
              Import a league first
            </button>
          </p>
        ) : (
          <select
            className="bg-dark-tertiary text-white rounded px-4 py-2 border border-dark-tertiary focus:border-accent-gold outline-none w-full"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
          >
            {leagues.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        )}
      </Card>

      {/* Tab Selector */}
      <div className="flex gap-1 mb-6 bg-dark-secondary rounded-lg p-1">
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-display transition-colors ${
            tab === 'spreadsheet' ? 'bg-dark-tertiary text-white' : 'text-text-secondary hover:text-white'
          }`}
          onClick={() => setTab('spreadsheet')}
        >
          Spreadsheet / CSV
        </button>
        <button
          className={`flex-1 py-2 px-4 rounded-md text-sm font-display transition-colors ${
            tab === 'website' ? 'bg-dark-tertiary text-white' : 'text-text-secondary hover:text-white'
          }`}
          onClick={() => setTab('website')}
        >
          Website
        </button>
      </div>

      {/* Tab Content */}
      {leagueId && tab === 'spreadsheet' && (
        <SpreadsheetImport leagueId={leagueId} />
      )}
      {leagueId && tab === 'website' && (
        <WebsiteImport leagueId={leagueId} />
      )}
    </div>
  )
}

export default CustomImport
