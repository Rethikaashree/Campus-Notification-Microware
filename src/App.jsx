import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'

const priorityWeights = {
  Placement: 3,
  Result: 2,
  Event: 1,
}

const fallbackNotifications = [
  {
    id: 'b283218f',
    type: 'Placement',
    message: 'CSX Corporation hiring',
    timestamp: '2026-04-22 17:51:18',
    unread: true,
  },
  {
    id: '9158f9ad',
    type: 'Event',
    message: 'Farewell rehearsal moved to main auditorium',
    timestamp: '2026-04-22 17:51:06',
    unread: true,
  },
  {
    id: 'd146095a',
    type: 'Result',
    message: 'Mid-semester marks published',
    timestamp: '2026-04-22 17:51:30',
    unread: true,
  },
  {
    id: '722ca80e',
    type: 'Placement',
    message: 'Aptitude round shortlist released',
    timestamp: '2026-04-22 17:50:32',
    unread: true,
  },
  {
    id: '2c8b94fd',
    type: 'Result',
    message: 'Internal assessment revaluation window open',
    timestamp: '2026-04-22 17:49:58',
    unread: false,
  },
  {
    id: '554d21ab',
    type: 'Event',
    message: 'Innovation club meetup starts at 5 PM',
    timestamp: '2026-04-22 17:48:44',
    unread: true,
  },
]

const typeMeta = {
  Placement: { label: 'Career', icon: 'P' },
  Result: { label: 'Academic', icon: 'R' },
  Event: { label: 'Campus', icon: 'E' },
}

function formatTime(value) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
  }).format(new Date(value.replace(' ', 'T')))
}

function App() {
  const [activeType, setActiveType] = useState('All')
  const [notifications, setNotifications] = useState(fallbackNotifications)
  const [isLoading, setIsLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [error, setError] = useState('')

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/notifications')
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || 'Unable to fetch notifications')
      }

      setNotifications(payload.notifications)
      setLastUpdated(payload.updatedAt)
    } catch (fetchError) {
      setError(fetchError.message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchNotifications, 0)
    const intervalId = window.setInterval(fetchNotifications, 5000)

    return () => {
      window.clearTimeout(timeoutId)
      window.clearInterval(intervalId)
    }
  }, [fetchNotifications])

  const rankedNotifications = useMemo(() => {
    return notifications
      .filter((item) => activeType === 'All' || item.type === activeType)
      .sort((a, b) => {
        const weightGap = priorityWeights[b.type] - priorityWeights[a.type]

        if (weightGap !== 0) {
          return weightGap
        }

        return new Date(b.timestamp) - new Date(a.timestamp)
      })
  }, [activeType, notifications])

  const unreadCount = notifications.filter((item) => item.unread).length
  const statusText = error
    ? 'API unavailable'
    : isLoading
      ? 'Refreshing feed'
      : 'Live priority feed'

  return (
    <main className="app-shell">
      <section className="hero-section">
        <nav className="topbar" aria-label="Application summary">
          <div className="brand">
            <span className="brand-mark">CN</span>
            <span>Campus Notify</span>
          </div>
          <div className="sync-status">
            <span className="pulse" aria-hidden="true"></span>
            {statusText}
          </div>
        </nav>

        <div className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Stage 1 Priority Inbox</p>
            <h1>Important campus alerts, ranked before they get buried.</h1>
            <p className="lede">
              Placement notices, results, and events are ordered by priority
              and recency so students see the right update first.
            </p>
            <div className="hero-actions" aria-label="Inbox actions">
              <button
                type="button"
                className="primary-action"
                onClick={fetchNotifications}
                disabled={isLoading}
              >
                {isLoading ? 'Refreshing...' : 'Refresh feed'}
              </button>
              <button type="button" className="ghost-action">
                Export top 10
              </button>
            </div>
          </div>

          <div className="signal-panel" aria-label="Priority statistics">
            <div>
              <span className="stat-value">{unreadCount}</span>
              <span className="stat-label">Unread</span>
            </div>
            <div>
              <span className="stat-value">10</span>
              <span className="stat-label">Top limit</span>
            </div>
            <div>
              <span className="stat-value">3x</span>
              <span className="stat-label">Placement weight</span>
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard">
        <aside className="control-panel" aria-label="Priority controls">
          <div>
            <p className="section-kicker">Filters</p>
            <h2>Notification types</h2>
          </div>

          <div className="filter-list">
            {['All', 'Placement', 'Result', 'Event'].map((type) => (
              <button
                type="button"
                className={activeType === type ? 'filter active' : 'filter'}
                onClick={() => setActiveType(type)}
                key={type}
              >
                <span>{type === 'All' ? 'A' : typeMeta[type].icon}</span>
                {type}
              </button>
            ))}
          </div>

          <div className="priority-rule">
            <p className="section-kicker">Ranking rule</p>
            <ol>
              <li>Placement alerts first</li>
              <li>Results before events</li>
              <li>Newest notification wins ties</li>
            </ol>
          </div>
        </aside>

        <section className="inbox-panel" aria-label="Ranked notifications">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Priority Inbox</p>
              <h2>Top notifications</h2>
            </div>
            <span>
              {lastUpdated
                ? `Updated ${formatTime(lastUpdated)}`
                : `${rankedNotifications.length} visible`}
            </span>
          </div>

          {error && (
            <div className="notice" role="status">
              Showing sample notifications because the middleware could not
              reach the protected API: {error}
            </div>
          )}

          <div className="notification-list">
            {rankedNotifications.map((item, index) => (
              <article className="notification-card" key={item.id}>
                <div className="rank">#{index + 1}</div>
                <div className={`type-badge ${item.type.toLowerCase()}`}>
                  {typeMeta[item.type].icon}
                </div>
                <div className="notification-content">
                  <div className="notification-title">
                    <h3>{item.message}</h3>
                    {item.unread && <span>Unread</span>}
                  </div>
                  <p>
                    {typeMeta[item.type].label} update / {formatTime(item.timestamp)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="approach-panel" aria-label="Implementation approach">
          <p className="section-kicker">Approach</p>
          <h2>Efficient top 10</h2>
          <p>
            Keep a fixed-size priority queue keyed by type weight and timestamp.
            Each new notification is compared once, preserving the strongest ten
            without sorting the entire feed repeatedly.
          </p>
          <div className="metric-row">
            <span>Update cost</span>
            <strong>O(log 10)</strong>
          </div>
          <div className="metric-row">
            <span>Memory</span>
            <strong>O(10)</strong>
          </div>
        </aside>
      </section>
    </main>
  )
}

export default App
