import { createContext, useContext, useReducer, useCallback } from 'react'

const DraftContext = createContext(null)

const initialState = {
  draft: null,
  league: null,
  players: [],
  picks: [],
  queue: [],
  currentPick: null,
  currentBid: null,
  userBudget: 0,
  timerSeconds: 0,
  isPaused: false,
  isUserTurn: false,
  loading: true,
  error: null,
}

function draftReducer(state, action) {
  switch (action.type) {
    case 'SET_DRAFT_STATE':
      return {
        ...state,
        ...action.payload,
        loading: false,
        error: null,
      }
    case 'SET_LOADING':
      return { ...state, loading: action.payload }
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false }
    case 'MAKE_PICK':
      return {
        ...state,
        picks: [...state.picks, action.payload],
        players: state.players.map(p =>
          p.id === action.payload.playerId
            ? { ...p, drafted: true, draftedBy: action.payload.teamId }
            : p
        ),
      }
    case 'SET_CURRENT_PICK':
      return {
        ...state,
        currentPick: action.payload.pick,
        isUserTurn: action.payload.isUserTurn,
        timerSeconds: action.payload.timerSeconds,
      }
    case 'SET_TIMER':
      return { ...state, timerSeconds: action.payload }
    case 'PAUSE_DRAFT':
      return {
        ...state,
        isPaused: true,
        draft: state.draft ? { ...state.draft, status: 'PAUSED' } : null,
      }
    case 'RESUME_DRAFT':
      return {
        ...state,
        isPaused: false,
        draft: state.draft ? { ...state.draft, status: 'IN_PROGRESS' } : null,
      }
    case 'ADD_TO_QUEUE':
      if (state.queue.find(p => p.id === action.payload.id)) {
        return state
      }
      return { ...state, queue: [...state.queue, action.payload] }
    case 'REMOVE_FROM_QUEUE':
      return {
        ...state,
        queue: state.queue.filter(p => p.id !== action.payload),
      }
    case 'REORDER_QUEUE':
      return { ...state, queue: action.payload }
    case 'SET_CURRENT_BID':
      return { ...state, currentBid: action.payload }
    case 'UPDATE_BUDGET':
      return { ...state, userBudget: action.payload }
    default:
      return state
  }
}

export function DraftProvider({ children }) {
  const [state, dispatch] = useReducer(draftReducer, initialState)

  const setDraftState = useCallback((payload) => {
    dispatch({ type: 'SET_DRAFT_STATE', payload })
  }, [])

  const setLoading = useCallback((loading) => {
    dispatch({ type: 'SET_LOADING', payload: loading })
  }, [])

  const setError = useCallback((error) => {
    dispatch({ type: 'SET_ERROR', payload: error })
  }, [])

  const makePick = useCallback((pick) => {
    dispatch({ type: 'MAKE_PICK', payload: pick })
  }, [])

  const setCurrentPick = useCallback((pick, isUserTurn, timerSeconds) => {
    dispatch({ type: 'SET_CURRENT_PICK', payload: { pick, isUserTurn, timerSeconds } })
  }, [])

  const setTimer = useCallback((seconds) => {
    dispatch({ type: 'SET_TIMER', payload: seconds })
  }, [])

  const pauseDraft = useCallback(() => {
    dispatch({ type: 'PAUSE_DRAFT' })
  }, [])

  const resumeDraft = useCallback(() => {
    dispatch({ type: 'RESUME_DRAFT' })
  }, [])

  const addToQueue = useCallback((player) => {
    dispatch({ type: 'ADD_TO_QUEUE', payload: player })
  }, [])

  const removeFromQueue = useCallback((playerId) => {
    dispatch({ type: 'REMOVE_FROM_QUEUE', payload: playerId })
  }, [])

  const reorderQueue = useCallback((newQueue) => {
    dispatch({ type: 'REORDER_QUEUE', payload: newQueue })
  }, [])

  const setCurrentBid = useCallback((bid) => {
    dispatch({ type: 'SET_CURRENT_BID', payload: bid })
  }, [])

  const updateBudget = useCallback((budget) => {
    dispatch({ type: 'UPDATE_BUDGET', payload: budget })
  }, [])

  const value = {
    ...state,
    setDraftState,
    setLoading,
    setError,
    makePick,
    setCurrentPick,
    setTimer,
    pauseDraft,
    resumeDraft,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    setCurrentBid,
    updateBudget,
  }

  return (
    <DraftContext.Provider value={value}>
      {children}
    </DraftContext.Provider>
  )
}

export function useDraftContext() {
  const context = useContext(DraftContext)
  if (!context) {
    throw new Error('useDraftContext must be used within a DraftProvider')
  }
  return context
}

export default DraftContext
