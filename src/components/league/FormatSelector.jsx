import { LEAGUE_FORMATS, DRAFT_TYPES } from '../../hooks/useLeagueFormat'

const FormatIcon = ({ format }) => {
  const icons = {
    trophy: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
    swords: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    chart: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    skull: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 0V4m0 12v4m-4-4H4m16 0h-4" />
      </svg>
    ),
    target: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }
  return icons[format] || icons.trophy
}

const FormatSelector = ({ selectedFormat, onSelectFormat, selectedDraftType, onSelectDraftType, showDraftType = true }) => {
  const formats = Object.values(LEAGUE_FORMATS)
  const draftTypes = Object.values(DRAFT_TYPES).filter(dt => dt.id !== 'none')

  const handleFormatSelect = (formatId) => {
    onSelectFormat(formatId)
    // Auto-set draft type for one-and-done
    if (formatId === 'one-and-done') {
      onSelectDraftType('none')
    } else if (selectedDraftType === 'none') {
      onSelectDraftType('snake')
    }
  }

  return (
    <div className="space-y-6">
      {/* Format Selection */}
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-3">
          League Format
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {formats.map((format) => (
            <button
              key={format.id}
              type="button"
              onClick={() => handleFormatSelect(format.id)}
              className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                selectedFormat === format.id
                  ? 'border-accent-green bg-accent-green/10'
                  : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
              }`}
            >
              {selectedFormat === format.id && (
                <div className="absolute top-2 right-2">
                  <svg className="w-5 h-5 text-accent-green" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
              <div className={`mb-2 ${selectedFormat === format.id ? 'text-accent-green' : 'text-text-secondary'}`}>
                <FormatIcon format={format.icon} />
              </div>
              <h4 className={`font-semibold mb-1 ${selectedFormat === format.id ? 'text-white' : 'text-text-secondary'}`}>
                {format.name}
              </h4>
              <p className="text-xs text-text-muted line-clamp-2">{format.description}</p>
              {format.features && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {format.features.slice(0, 2).map((feature, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-dark-primary rounded-full text-text-muted">
                      {feature}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Draft Type Selection - only show if format requires draft */}
      {showDraftType && selectedFormat !== 'one-and-done' && (
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-3">
            Draft Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {draftTypes.map((draftType) => (
              <button
                key={draftType.id}
                type="button"
                onClick={() => onSelectDraftType(draftType.id)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  selectedDraftType === draftType.id
                    ? 'border-accent-green bg-accent-green/10'
                    : 'border-dark-border bg-dark-tertiary hover:border-text-muted'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className={`font-semibold ${selectedDraftType === draftType.id ? 'text-white' : 'text-text-secondary'}`}>
                      {draftType.name}
                    </h4>
                    <p className="text-xs text-text-muted mt-1">{draftType.description}</p>
                  </div>
                  {selectedDraftType === draftType.id && (
                    <svg className="w-5 h-5 text-accent-green flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* One-and-Done notice */}
      {selectedFormat === 'one-and-done' && (
        <div className="bg-dark-tertiary rounded-lg p-4 border border-dark-border">
          <div className="flex items-start gap-3">
            <div className="text-accent-green mt-0.5">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-white font-medium">No Draft Required</p>
              <p className="text-xs text-text-muted mt-1">
                In One & Done format, you pick any player for each tournament. Once used, a player can't be picked again all season.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FormatSelector
