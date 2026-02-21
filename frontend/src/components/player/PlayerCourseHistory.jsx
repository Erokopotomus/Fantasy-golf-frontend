import { Link } from 'react-router-dom'
import Card from '../common/Card'

const PlayerCourseHistory = ({ courseHistory }) => {
  if (!courseHistory || courseHistory.length === 0) return null

  const getScoreColor = (avgScore, par) => {
    const diff = avgScore - par
    if (diff <= -2) return 'text-gold'
    if (diff <= 0) return 'text-green-400'
    if (diff <= 2) return 'text-yellow-400'
    return 'text-red-400'
  }

  return (
    <Card padding="none">
      <div className="p-4 border-b border-dark-border">
        <h4 className="text-sm font-semibold text-text-muted">Course History</h4>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-dark-tertiary">
            <tr className="text-xs text-text-muted">
              <th className="p-3 text-left">Course</th>
              <th className="p-3 text-center">Rounds</th>
              <th className="p-3 text-center">Avg Score</th>
              <th className="p-3 text-center">Best</th>
              <th className="p-3 text-right">Wins</th>
            </tr>
          </thead>
          <tbody>
            {courseHistory.map((course, index) => (
              <tr key={index} className="border-b border-dark-border/50 hover:bg-dark-tertiary/50">
                <td className="p-3">
                  {course.courseId ? (
                    <Link to={`/courses/${course.courseId}`} className="text-text-primary font-medium hover:text-gold transition-colors">
                      {course.name}
                    </Link>
                  ) : (
                    <p className="text-text-primary font-medium">{course.name}</p>
                  )}
                  <p className="text-text-muted text-xs">Par {course.par}</p>
                </td>
                <td className="p-3 text-center text-text-secondary">{course.rounds}</td>
                <td className={`p-3 text-center font-medium ${getScoreColor(course.avgScore, course.par)}`}>
                  {course.avgScore.toFixed(1)}
                </td>
                <td className="p-3 text-center text-gold font-medium">{course.bestFinish}</td>
                <td className="p-3 text-right">
                  {course.wins > 0 ? (
                    <span className="text-yellow-400 font-medium">{course.wins}</span>
                  ) : (
                    <span className="text-text-muted">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default PlayerCourseHistory
