const STORAGE_KEY = 'clutch-coach-profile'

export function useCoachProfile() {
  const get = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    } catch {
      return {}
    }
  }
  const set = (profile) => localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  return { profile: get(), setProfile: set }
}
