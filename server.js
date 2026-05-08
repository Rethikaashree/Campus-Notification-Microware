import http from 'node:http'

const PORT = Number(process.env.PORT || 5000)
const NOTIFICATION_API =
  process.env.NOTIFICATION_API ||
  'http://4.224.186.213/evaluation-service/notifications'

const priorityWeights = {
  Placement: 3,
  Result: 2,
  Event: 1,
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload)

  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  })
  res.end(body)
}

function normalizeNotification(notification) {
  return {
    id: notification.ID || notification.id,
    type: notification.Type || notification.type,
    message: notification.Message || notification.message,
    timestamp: notification.Timestamp || notification.timestamp,
    unread: notification.unread ?? true,
  }
}

function sortByPriority(notifications) {
  return notifications
    .map(normalizeNotification)
    .filter((notification) => {
      return notification.id && notification.type && notification.timestamp
    })
    .sort((a, b) => {
      const weightGap =
        (priorityWeights[b.type] || 0) - (priorityWeights[a.type] || 0)

      if (weightGap !== 0) {
        return weightGap
      }

      return new Date(b.timestamp) - new Date(a.timestamp)
    })
}

function filterByType(notifications, notificationType) {
  if (!notificationType || notificationType === 'All') {
    return notifications
  }

  return notifications.filter((notification) => {
    return notification.type?.toLowerCase() === notificationType.toLowerCase()
  })
}

function paginate(notifications, page, limit) {
  const safePage = Math.max(Number(page) || 1, 1)
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50)
  const start = (safePage - 1) * safeLimit

  return {
    page: safePage,
    limit: safeLimit,
    total: notifications.length,
    totalPages: Math.max(Math.ceil(notifications.length / safeLimit), 1),
    notifications: notifications.slice(start, start + safeLimit),
  }
}

async function loggingMiddleware(req, res, next) {
  const startedAt = Date.now()

  res.onFinish = () => {
    const elapsedMs = Date.now() - startedAt
    console.log(`${req.method} ${req.url} ${res.statusCode} ${elapsedMs}ms`)
  }

  await next()
  res.onFinish()
}

async function corsMiddleware(req, res, next) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  await next()
}

async function notificationsRoute(req, res, next) {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`)

  if (req.method !== 'GET' || requestUrl.pathname !== '/api/notifications') {
    await next()
    return
  }

  const headers = {}

  if (process.env.NOTIFICATION_TOKEN) {
    headers.Authorization = `Bearer ${process.env.NOTIFICATION_TOKEN}`
  }

  const apiResponse = await fetch(NOTIFICATION_API, { headers })
  const payload = await apiResponse.json()

  if (!apiResponse.ok) {
    sendJson(res, apiResponse.status, {
      error: 'Notification API request failed',
      details: payload,
    })
    return
  }

  const notificationType = requestUrl.searchParams.get('notification_type')
  const limit = requestUrl.searchParams.get('limit')
  const page = requestUrl.searchParams.get('page')
  const mode = requestUrl.searchParams.get('mode')
  const normalized = (payload.notifications || []).map(normalizeNotification)
  const typedNotifications = filterByType(normalized, notificationType)
  const orderedNotifications =
    mode === 'priority'
      ? sortByPriority(typedNotifications)
      : typedNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  const pageResult = paginate(orderedNotifications, page, limit)

  sendJson(res, 200, {
    source: NOTIFICATION_API,
    updatedAt: new Date().toISOString(),
    ...pageResult,
  })
}

async function notFoundRoute(_req, res) {
  sendJson(res, 404, { error: 'Route not found' })
}

function compose(middlewares) {
  return (req, res) => {
    let index = -1

    async function dispatch(position) {
      if (position <= index) {
        throw new Error('next() called more than once')
      }

      index = position
      const middleware = middlewares[position]

      if (middleware) {
        await middleware(req, res, () => dispatch(position + 1))
      }
    }

    dispatch(0).catch((error) => {
      console.error(error)
      sendJson(res, 500, { error: 'Internal server error' })
    })
  }
}

const server = http.createServer(
  compose([loggingMiddleware, corsMiddleware, notificationsRoute, notFoundRoute]),
)

server.listen(PORT, () => {
  console.log(`Logging middleware API running on http://127.0.0.1:${PORT}`)
})
