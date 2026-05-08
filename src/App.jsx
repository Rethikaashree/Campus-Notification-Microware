import {
  Alert,
  AppBar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import { useCallback, useEffect, useMemo, useState } from 'react'

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
  },
  {
    id: 'd146095a',
    type: 'Result',
    message: 'Mid-semester marks published',
    timestamp: '2026-04-22 17:51:30',
  },
  {
    id: '9158f9ad',
    type: 'Event',
    message: 'Farewell rehearsal moved to main auditorium',
    timestamp: '2026-04-22 17:51:06',
  },
  {
    id: '722ca80e',
    type: 'Placement',
    message: 'Aptitude round shortlist released',
    timestamp: '2026-04-22 17:50:32',
  },
  {
    id: '2c8b94fd',
    type: 'Result',
    message: 'Internal assessment revaluation window open',
    timestamp: '2026-04-22 17:49:58',
  },
  {
    id: '554d21ab',
    type: 'Event',
    message: 'Innovation club meetup starts at 5 PM',
    timestamp: '2026-04-22 17:48:44',
  },
]

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1f6f59',
    },
    secondary: {
      main: '#2f6f9f',
    },
    warning: {
      main: '#a45c24',
    },
    background: {
      default: '#eef4f1',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h3: {
      fontWeight: 800,
      letterSpacing: 0,
    },
    h5: {
      fontWeight: 800,
      letterSpacing: 0,
    },
    h6: {
      fontWeight: 800,
      letterSpacing: 0,
    },
    button: {
      fontWeight: 800,
      textTransform: 'none',
    },
  },
})

function formatTime(value) {
  return new Intl.DateTimeFormat('en', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    month: 'short',
    day: 'numeric',
  }).format(new Date(value.replace?.(' ', 'T') || value))
}

function getNotificationId(notification) {
  return notification.id || notification.ID
}

function getNotificationType(notification) {
  return notification.type || notification.Type
}

function getNotificationMessage(notification) {
  return notification.message || notification.Message
}

function getNotificationTimestamp(notification) {
  return notification.timestamp || notification.Timestamp
}

function sortPriority(notifications) {
  return [...notifications].sort((a, b) => {
    const weightGap =
      (priorityWeights[getNotificationType(b)] || 0) -
      (priorityWeights[getNotificationType(a)] || 0)

    if (weightGap !== 0) {
      return weightGap
    }

    return (
      new Date(getNotificationTimestamp(b)) - new Date(getNotificationTimestamp(a))
    )
  })
}

function NotificationCard({ notification, index, viewed, onMarkViewed }) {
  const type = getNotificationType(notification)
  const id = getNotificationId(notification)
  const isNew = !viewed

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Chip
            label={`#${index + 1}`}
            size="small"
            color={isNew ? 'primary' : 'default'}
          />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              justifyContent="space-between"
              alignItems={{ xs: 'flex-start', sm: 'center' }}
            >
              <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>
                {getNotificationMessage(notification)}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={type}
                  color={
                    type === 'Placement'
                      ? 'primary'
                      : type === 'Result'
                        ? 'secondary'
                        : 'warning'
                  }
                  size="small"
                />
                <Chip
                  label={isNew ? 'New' : 'Viewed'}
                  variant={isNew ? 'filled' : 'outlined'}
                  color={isNew ? 'success' : 'default'}
                  size="small"
                />
              </Stack>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
              {formatTime(getNotificationTimestamp(notification))} / ID {id}
            </Typography>
          </Box>
          <Button
            variant={isNew ? 'contained' : 'outlined'}
            size="small"
            onClick={() => onMarkViewed(id)}
          >
            Mark viewed
          </Button>
        </Stack>
      </CardContent>
    </Card>
  )
}

function App() {
  const [pageMode, setPageMode] = useState('all')
  const [notificationType, setNotificationType] = useState('All')
  const [limit, setLimit] = useState(10)
  const [page, setPage] = useState(1)
  const [notifications, setNotifications] = useState(fallbackNotifications)
  const [viewedIds, setViewedIds] = useState(() => {
    return new Set(JSON.parse(localStorage.getItem('viewed-notifications') || '[]'))
  })
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(fallbackNotifications.length)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState('')

  const filteredFallback = useMemo(() => {
    const typed =
      notificationType === 'All'
        ? fallbackNotifications
        : fallbackNotifications.filter((item) => item.type === notificationType)
    const ordered = pageMode === 'priority' ? sortPriority(typed) : typed
    const start = (page - 1) * limit

    return ordered.slice(start, start + limit)
  }, [limit, notificationType, page, pageMode])

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true)
    setError('')

    const query = new URLSearchParams({
      limit: String(limit),
      page: String(page),
      mode: pageMode === 'priority' ? 'priority' : 'all',
    })

    if (notificationType !== 'All') {
      query.set('notification_type', notificationType)
    }

    try {
      const response = await fetch(`/api/notifications?${query.toString()}`)
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.details?.message || payload.error)
      }

      setNotifications(payload.notifications)
      setTotal(payload.total)
      setTotalPages(payload.totalPages)
      setLastUpdated(payload.updatedAt)
    } catch (fetchError) {
      setNotifications(filteredFallback)
      setTotal(filteredFallback.length)
      setTotalPages(1)
      setError(fetchError.message)
    } finally {
      setIsLoading(false)
    }
  }, [filteredFallback, limit, notificationType, page, pageMode])

  useEffect(() => {
    const timeoutId = window.setTimeout(fetchNotifications, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchNotifications])

  function handleMarkViewed(id) {
    const nextViewed = new Set(viewedIds)
    nextViewed.add(id)
    setViewedIds(nextViewed)
    localStorage.setItem('viewed-notifications', JSON.stringify([...nextViewed]))
  }

  function handleModeChange(_event, nextMode) {
    setPageMode(nextMode)
    setPage(1)
  }

  const newCount = notifications.filter((notification) => {
    return !viewedIds.has(getNotificationId(notification))
  }).length

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <AppBar position="sticky" color="inherit" elevation={0}>
          <Toolbar sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              Campus Notify
            </Typography>
            <Badge badgeContent={newCount} color="success">
              <Chip label="Live via middleware" color="primary" variant="outlined" />
            </Badge>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Stack spacing={3}>
                <Card>
                  <CardContent>
                    <Typography variant="overline" color="primary">
                      Stage 2
                    </Typography>
                    <Typography variant="h3" sx={{ mt: 1 }}>
                      Notification Center
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 2 }}>
                      Review every campus notification, switch to priority view,
                      filter by type, and track what has already been viewed.
                    </Typography>
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">Controls</Typography>
                    <Stack spacing={2} sx={{ mt: 2 }}>
                      <FormControl fullWidth>
                        <InputLabel>Notification type</InputLabel>
                        <Select
                          value={notificationType}
                          label="Notification type"
                          onChange={(event) => {
                            setNotificationType(event.target.value)
                            setPage(1)
                          }}
                        >
                          {['All', 'Placement', 'Result', 'Event'].map((type) => (
                            <MenuItem value={type} key={type}>
                              {type}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      <TextField
                        label="Limit per page"
                        type="number"
                        value={limit}
                        inputProps={{ min: 1, max: 50 }}
                        onChange={(event) => {
                          setLimit(Number(event.target.value))
                          setPage(1)
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={fetchNotifications}
                        disabled={isLoading}
                      >
                        {isLoading ? 'Refreshing...' : 'Refresh notifications'}
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Stack>
            </Grid>

            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    justifyContent="space-between"
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                  >
                    <Box>
                      <Typography variant="h5">
                        {pageMode === 'priority'
                          ? 'Priority Notifications'
                          : 'All Notifications'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {total} total / {lastUpdated ? `Updated ${formatTime(lastUpdated)}` : 'Waiting for API'}
                      </Typography>
                    </Box>
                    {isLoading && <CircularProgress size={28} />}
                  </Stack>

                  <Tabs value={pageMode} onChange={handleModeChange} sx={{ mt: 2 }}>
                    <Tab value="all" label="All notifications" />
                    <Tab value="priority" label="Priority notifications" />
                  </Tabs>

                  {error && (
                    <Alert severity="warning" sx={{ my: 2 }}>
                      API fallback active: {error}
                    </Alert>
                  )}

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={1.5}>
                    {notifications.map((notification, index) => (
                      <NotificationCard
                        notification={notification}
                        index={(page - 1) * limit + index}
                        viewed={viewedIds.has(getNotificationId(notification))}
                        onMarkViewed={handleMarkViewed}
                        key={getNotificationId(notification)}
                      />
                    ))}
                  </Stack>

                  <Stack alignItems="center" sx={{ pt: 3 }}>
                    <Pagination
                      count={totalPages}
                      page={page}
                      color="primary"
                      onChange={(_event, nextPage) => setPage(nextPage)}
                    />
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ThemeProvider>
  )
}

export default App
