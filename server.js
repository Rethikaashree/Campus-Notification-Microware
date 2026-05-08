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

function rankNotifications(notifications, limit = 10) {
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
    .slice(0, limit)
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
  if (req.method !== 'GET' || req.url !== '/api/notifications') {
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

  sendJson(res, 200, {
    source: NOTIFICATION_API,
    updatedAt: new Date().toISOString(),
    notifications: rankNotifications(payload.notifications || []),
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
