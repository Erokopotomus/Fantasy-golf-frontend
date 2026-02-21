import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import Card from '../components/common/Card'

const getDnaLabel = (val) => {
  if (val == null) return null
  if (val >= 0.32) return { text: 'Premium', color: 'text-gold', bar: 'bg-gold' }
  if (val >= 0.27) return { text: 'High', color: 'text-emerald-400', bar: 'bg-emerald-400' }
  if (val >= 0.22) return { text: 'Average', color: 'text-text-secondary', bar: 'bg-dark-tertiary/30' }
  return { text: 'Low', color: 'text-text-muted', bar: 'bg-dark-tertiary/10' }
}

const Courses = () => {
  const [courses, setCourses] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    setLoading(true)
    api.getCourses({ search: search || undefined })
      .then(data => setCourses(data.courses || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [search])

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-text-primary">Courses</h1>
        <p className="text-text-muted text-sm mt-1">PGA Tour venues — course DNA, stats, and history</p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Search courses..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-dark-secondary border border-dark-border rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-gold/50 transition-colors"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold" />
        </div>
      )}

      {/* Error */}
      {error && (
        <Card>
          <p className="text-red-400 text-center text-sm">Failed to load courses: {error}</p>
        </Card>
      )}

      {/* Course List */}
      {!loading && !error && (
        <>
          {courses.length === 0 ? (
            <Card>
              <p className="text-text-muted text-center text-sm">
                {search ? `No courses matching "${search}"` : 'No courses found'}
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {courses.map(course => {
                const dna = [
                  { label: 'DRV', value: course.drivingImportance },
                  { label: 'APP', value: course.approachImportance },
                  { label: 'ARG', value: course.aroundGreenImportance },
                  { label: 'PUT', value: course.puttingImportance },
                ].filter(d => d.value != null).map(d => ({ ...d, rating: getDnaLabel(d.value) }))

                return (
                  <Link key={course.id} to={`/courses/${course.id}`} className="block">
                    <Card hover className="h-full">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-sm font-display font-semibold text-text-primary">{course.name}</h3>
                          {course.nickname && course.nickname !== course.name && (
                            <p className="text-xs text-gold mt-0.5">"{course.nickname}"</p>
                          )}
                          {(course.city || course.state) && (
                            <p className="text-xs text-text-muted mt-0.5">
                              {[course.city, course.state, course.country].filter(Boolean).join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {course._count?.tournaments > 0 && (
                            <span className="text-[10px] font-mono text-text-muted">
                              {course._count.tournaments} event{course._count.tournaments !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Quick stats */}
                      <div className="flex items-center gap-4 mt-3 text-xs text-text-muted font-mono">
                        {course.par && <span>Par {course.par}</span>}
                        {course.yardage && <span>{course.yardage.toLocaleString()} yds</span>}
                        {course.grassType && <span>{course.grassType}</span>}
                      </div>

                      {/* Mini DNA bars */}
                      {dna.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          {dna.map(cat => {
                            const barPct = Math.min(100, Math.max(20, ((cat.value - 0.15) / 0.25) * 80 + 20))
                            return (
                              <div key={cat.label} className="flex-1">
                                <div className="flex items-center justify-between mb-0.5">
                                  <span className="text-[9px] text-text-muted">{cat.label}</span>
                                  <span className={`text-[8px] font-mono font-bold ${cat.rating.color}`}>{cat.rating.text}</span>
                                </div>
                                <div className="h-1 rounded-full bg-dark-tertiary/[0.06] overflow-hidden">
                                  <div className={`h-full rounded-full ${cat.rating.bar}`} style={{ width: `${barPct}%` }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}

          <p className="text-center text-text-muted text-xs pt-2">
            {courses.length} course{courses.length !== 1 ? 's' : ''}
          </p>
        </>
      )}
    </div>
  )
}

export default Courses
