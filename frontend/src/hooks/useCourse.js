import { useState, useEffect, useCallback } from 'react'
import api from '../services/api'

export const useCourse = (courseId) => {
  const [course, setCourse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchCourse = useCallback(async () => {
    if (!courseId) {
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await api.getCourse(courseId)
      setCourse(data.course)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    setLoading(true)
    fetchCourse()
  }, [courseId, fetchCourse])

  return { course, loading, error, refetch: fetchCourse }
}

export default useCourse
