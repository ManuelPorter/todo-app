import React, { useEffect, useRef, useState } from 'react'

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

type Tag = {
  id: number
  name: string
  color: string
}

type Subtask = {
  id: number
  title: string
  completed: boolean
}

type RecurrenceRule = 'DAILY' | 'WEEKLY_MON' | 'WEEKLY_TUE' | 'WEEKLY_WED' | 'WEEKLY_THU' | 'WEEKLY_FRI' | 'WEEKLY_SAT' | 'WEEKLY_SUN' | 'MONTHLY'

const RECURRENCE_LABELS: Record<RecurrenceRule, string> = {
  DAILY: 'Daily',
  WEEKLY_MON: 'Every Monday',
  WEEKLY_TUE: 'Every Tuesday',
  WEEKLY_WED: 'Every Wednesday',
  WEEKLY_THU: 'Every Thursday',
  WEEKLY_FRI: 'Every Friday',
  WEEKLY_SAT: 'Every Saturday',
  WEEKLY_SUN: 'Every Sunday',
  MONTHLY: 'Monthly',
}

type Todo = {
  id: number
  title: string
  description?: string
  completed: boolean
  createdAt?: string
  dueAt?: string
  priority: Priority
  deletedAt?: string
  tags?: Tag[]
  parentId?: number
  recurrenceRule?: RecurrenceRule
}

type AuthState = {
  token: string
  username: string
}

const TAG_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280']

const PRIORITY_ORDER: Record<Priority, number> = { LOW: 1, MEDIUM: 2, HIGH: 3, URGENT: 4 }

function useNotifications(todos: Todo[]) {
  const notifiedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    try {
      const stored: string[] = JSON.parse(localStorage.getItem('todo-notified') ?? '[]')
      notifiedRef.current = new Set(stored)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return

    function check() {
      const now = Date.now()
      for (const todo of todos) {
        if (!todo.dueAt || todo.completed) continue
        const due = new Date(todo.dueAt).getTime()
        const diff = due - now

        const key30 = `${todo.id}_30`
        if (diff > 0 && diff <= 30 * 60_000 && !notifiedRef.current.has(key30)) {
          const mins = Math.round(diff / 60_000)
          new Notification(`Due soon: ${todo.title}`, { body: `Due in ${mins} minute${mins !== 1 ? 's' : ''}` })
          notifiedRef.current.add(key30)
          localStorage.setItem('todo-notified', JSON.stringify([...notifiedRef.current]))
        }

        const keyDue = `${todo.id}_due`
        if (diff <= 0 && diff > -10 * 60_000 && !notifiedRef.current.has(keyDue)) {
          new Notification(`Due now: ${todo.title}`, { body: 'This task is due!' })
          notifiedRef.current.add(keyDue)
          localStorage.setItem('todo-notified', JSON.stringify([...notifiedRef.current]))
        }
      }
    }

    check()
    const id = setInterval(check, 60_000)
    return () => clearInterval(id)
  }, [todos])
}

function getStoredAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem('auth')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function AuthPage({ onAuth, dark, onToggleDark }: { onAuth: (auth: AuthState) => void; dark: boolean; onToggleDark: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!username || !password) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`)
        return
      }
      const auth: AuthState = { token: data.token, username: data.username }
      localStorage.setItem('auth', JSON.stringify(auth))
      onAuth(auth)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-8 rounded shadow w-full max-w-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Todo App</h1>
          <button
            onClick={onToggleDark}
            className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
        </div>

        <div className="flex mb-6 border dark:border-gray-600 rounded overflow-hidden">
          <button
            onClick={() => { setMode('login'); setError(null) }}
            className={`flex-1 py-2 text-sm font-medium ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('register'); setError(null) }}
            className={`flex-1 py-2 text-sm font-medium ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            className="p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            className="p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create account'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState<AuthState | null>(getStoredAuth)
  const [view, setView] = useState<'todos' | 'trash'>('todos')
  const [todos, setTodos] = useState<Todo[]>([])
  const [trashItems, setTrashItems] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [due, setDue] = useState('')
  const [priority, setPriority] = useState<Priority>('MEDIUM')
  const [query, setQuery] = useState('')
  const [sortField, setSortField] = useState('dueAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [dayPage, setDayPage] = useState(0)
  const DAYS_PER_PAGE = 3
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const [newRecurrence, setNewRecurrence] = useState<RecurrenceRule | ''>('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editDue, setEditDue] = useState('')
  const [editPriority, setEditPriority] = useState<Priority>('MEDIUM')
  const [editRecurrence, setEditRecurrence] = useState<RecurrenceRule | ''>('')

  const [tags, setTags] = useState<Tag[]>([])
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null)
  const [showTagPanel, setShowTagPanel] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#3B82F6')
  const [editTagIds, setEditTagIds] = useState<number[]>([])
  const [newTodoTagIds, setNewTodoTagIds] = useState<number[]>([])

  const [expandedTodos, setExpandedTodos] = useState<Set<number>>(new Set())
  const [subtasksMap, setSubtasksMap] = useState<Record<number, Subtask[]>>({})
  const [addingSubtaskId, setAddingSubtaskId] = useState<number | null>(null)
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')

  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  )
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  useEffect(() => { if (auth) load() }, [query, auth])
  useEffect(() => { if (auth && view === 'trash') loadTrash() }, [view, auth])
  useEffect(() => { if (auth) loadTags() }, [auth])

  useNotifications(todos)

  async function requestNotifPermission() {
    if (typeof Notification === 'undefined') return
    const result = await Notification.requestPermission()
    setNotifPermission(result)
  }

  function authHeaders(): HeadersInit {
    return auth ? { Authorization: `Bearer ${auth.token}` } : {}
  }

  function handleUnauthorized(status: number) {
    if (status === 401 || status === 403) {
      localStorage.removeItem('auth')
      setAuth(null)
    }
  }

  async function load(silent = false) {
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', '0')
      params.set('size', '1000')
      if (query) params.set('q', query)
      const res = await fetch('/api/todos?' + params.toString(), { headers: authHeaders() })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to load todos (${res.status})`)
      const data = await res.json()
      const todoList: Todo[] = data.content || []
      setTodos(todoList)
      setError(null)
      const subtaskResults = await Promise.all(
        todoList.map(async t => {
          const r = await fetch(`/api/todos/${t.id}/subtasks`, { headers: authHeaders() })
          const subtasks: Subtask[] = r.ok ? await r.json() : []
          return { id: t.id, subtasks }
        })
      )
      setSubtasksMap(prev => {
        const next = { ...prev }
        for (const { id, subtasks } of subtaskResults) next[id] = subtasks
        return next
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load todos')
    } finally {
      setLoading(false)
    }
  }

  async function loadTrash(silent = false) {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/todos/trash', { headers: authHeaders() })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to load trash (${res.status})`)
      const data = await res.json()
      setTrashItems(data.content || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trash')
    } finally {
      setLoading(false)
    }
  }

  async function loadTags() {
    const res = await fetch('/api/tags', { headers: authHeaders() })
    if (res.ok) setTags(await res.json())
  }

  async function createTag() {
    if (!newTagName.trim()) return
    const res = await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ name: newTagName.trim(), color: newTagColor }),
    })
    if (res.ok) {
      setNewTagName('')
      loadTags()
    }
  }

  async function deleteTag(id: number) {
    const res = await fetch('/api/tags/' + id, { method: 'DELETE', headers: authHeaders() })
    if (res.ok) {
      if (selectedTagId === id) setSelectedTagId(null)
      loadTags()
      load(true)
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!title) return
    const payload: any = { title, description: desc, priority, tagIds: newTodoTagIds }
    if (due) payload.dueAt = due
    if (newRecurrence) payload.recurrenceRule = newRecurrence
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to create todo (${res.status})`)
      setTitle(''); setDesc(''); setDue(''); setPriority('MEDIUM'); setNewTodoTagIds([]); setNewRecurrence('')
      setError(null)
      load(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo')
    }
  }

  const priorityBadge: Record<Priority, { label: string; className: string }> = {
    LOW:    { label: 'Low',    className: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
    MEDIUM: { label: 'Medium', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
    HIGH:   { label: 'High',   className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
    URGENT: { label: 'Urgent', className: 'bg-red-100 text-red-700 font-semibold dark:bg-red-900/30 dark:text-red-400' },
  }

  function formatDueTime(dueAt?: string) {
    if (!dueAt) return ''
    const d = new Date(dueAt)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  }

  function dayKey(dueAt?: string): string {
    if (!dueAt) return 'none'
    const d = new Date(dueAt)
    if (Number.isNaN(d.getTime())) return 'none'
    return d.toLocaleDateString('en-CA')
  }

  function dayLabel(key: string): { text: string; overdue: boolean } {
    if (key === 'none') return { text: 'No due date', overdue: false }
    const today = new Date()
    const todayKey = today.toLocaleDateString('en-CA')
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const tomorrowKey = tomorrow.toLocaleDateString('en-CA')
    const formatted = new Date(key + 'T00:00:00').toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    })
    if (key === todayKey) return { text: 'Today · ' + formatted, overdue: false }
    if (key === tomorrowKey) return { text: 'Tomorrow · ' + formatted, overdue: false }
    if (key < todayKey) return { text: 'Overdue · ' + formatted, overdue: true }
    return { text: formatted, overdue: false }
  }

  function groupedTodos(list: Todo[]): { key: string; label: string; overdue: boolean; items: Todo[] }[] {
    const map = new Map<string, Todo[]>()
    for (const t of list) {
      const key = dayKey(t.dueAt)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(t)
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => {
        if (a === 'none') return 1
        if (b === 'none') return -1
        return b.localeCompare(a)
      })
      .map(([key, items]) => {
        const { text, overdue } = dayLabel(key)
        return { key, label: text, overdue, items }
      })
  }

  async function toggle(id: number, checked: boolean) {
    if (pendingIds.has(id)) return
    setPendingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/todos/' + id, { headers: authHeaders() })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to fetch todo (${res.status})`)
      const t = await res.json()
      t.completed = checked
      const putRes = await fetch('/api/todos/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(t),
      })
      handleUnauthorized(putRes.status)
      if (!putRes.ok) throw new Error(`Failed to update todo (${putRes.status})`)
      setError(null)
      load(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo')
    } finally {
      setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  function startEdit(t: Todo) {
    setEditingId(t.id)
    setEditTitle(t.title)
    setEditDesc(t.description ?? '')
    setEditDue(t.dueAt ? t.dueAt.slice(0, 16) : '')
    setEditPriority(t.priority ?? 'MEDIUM')
    setEditTagIds(t.tags?.map(tag => tag.id) ?? [])
    setEditRecurrence(t.recurrenceRule ?? '')
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(id: number) {
    if (!editTitle.trim()) return
    const payload: any = {
      title: editTitle,
      description: editDesc,
      completed: todos.find(t => t.id === id)?.completed ?? false,
      priority: editPriority,
      tagIds: editTagIds,
      recurrenceRule: editRecurrence || null,
    }
    if (editDue) payload.dueAt = editDue
    try {
      const res = await fetch('/api/todos/' + id, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to update todo (${res.status})`)
      const updated: Todo = await res.json()
      setTodos(prev => prev.map(t => t.id === id ? updated : t))
      setEditingId(null)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo')
    }
  }

  async function bulkMarkComplete(ids: number[]) {
    if (ids.length === 0) return
    try {
      const res = await fetch('/api/todos/bulk/mark-complete', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(ids),
      })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to mark complete (${res.status})`)
      setError(null)
      load(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark complete')
    }
  }

  async function bulkDelete(ids: number[]) {
    if (ids.length === 0) return
    try {
      const res = await fetch('/api/todos/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(ids),
      })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to move to trash (${res.status})`)
      setError(null)
      load(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move to trash')
    }
  }

  async function remove(id: number) {
    if (pendingIds.has(id)) return
    setPendingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/todos/' + id, { method: 'DELETE', headers: authHeaders() })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to move to trash (${res.status})`)
      setError(null)
      load(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move to trash')
    } finally {
      setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function restore(id: number) {
    if (pendingIds.has(id)) return
    setPendingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/todos/' + id + '/restore', { method: 'PUT', headers: authHeaders() })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to restore todo (${res.status})`)
      setError(null)
      loadTrash(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore todo')
    } finally {
      setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function permanentDelete(id: number) {
    if (pendingIds.has(id)) return
    setPendingIds(prev => new Set(prev).add(id))
    try {
      const res = await fetch('/api/todos/' + id + '/permanent', { method: 'DELETE', headers: authHeaders() })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to permanently delete (${res.status})`)
      setError(null)
      loadTrash(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to permanently delete')
    } finally {
      setPendingIds(prev => { const s = new Set(prev); s.delete(id); return s })
    }
  }

  async function bulkRestore(ids: number[]) {
    if (ids.length === 0) return
    try {
      const res = await fetch('/api/todos/bulk/restore', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(ids),
      })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to restore (${res.status})`)
      setError(null)
      loadTrash(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to restore')
    }
  }

  async function emptyTrash() {
    try {
      const res = await fetch('/api/todos/trash', { method: 'DELETE', headers: authHeaders() })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to empty trash (${res.status})`)
      setError(null)
      loadTrash(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to empty trash')
    }
  }

  async function loadSubtasks(todoId: number) {
    const res = await fetch(`/api/todos/${todoId}/subtasks`, { headers: authHeaders() })
    if (res.ok) {
      const data: Subtask[] = await res.json()
      setSubtasksMap(prev => ({ ...prev, [todoId]: data }))
    }
  }

  function toggleExpand(todoId: number) {
    setExpandedTodos(prev => {
      const next = new Set(prev)
      if (next.has(todoId)) {
        next.delete(todoId)
      } else {
        next.add(todoId)
        loadSubtasks(todoId)
      }
      return next
    })
  }

  async function createSubtask(parentId: number) {
    if (!newSubtaskTitle.trim()) return
    const res = await fetch(`/api/todos/${parentId}/subtasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ title: newSubtaskTitle.trim() }),
    })
    if (res.ok) {
      setNewSubtaskTitle('')
      setAddingSubtaskId(null)
      loadSubtasks(parentId)
    }
  }

  async function toggleSubtask(parentId: number, subtaskId: number, checked: boolean) {
    const res = await fetch(`/api/todos/${subtaskId}`, { headers: authHeaders() })
    if (!res.ok) return
    const t = await res.json()
    t.completed = checked
    const putRes = await fetch(`/api/todos/${subtaskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(t),
    })
    if (putRes.ok) loadSubtasks(parentId)
  }

  async function deleteSubtask(parentId: number, subtaskId: number) {
    const res = await fetch(`/api/todos/${subtaskId}`, { method: 'DELETE', headers: authHeaders() })
    if (res.ok) loadSubtasks(parentId)
  }

  function logout() {
    localStorage.removeItem('auth')
    setAuth(null)
    setTodos([])
    setTrashItems([])
    setTags([])
    setSelectedTagId(null)
  }

  function toggleEditTag(tagId: number) {
    setEditTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  function toggleNewTodoTag(tagId: number) {
    setNewTodoTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    )
  }

  function sortTodos(list: Todo[]): Todo[] {
    return [...list].sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'priority':
          cmp = (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0)
          break
        case 'title':
          cmp = a.title.localeCompare(b.title)
          break
        case 'completed':
          cmp = Number(a.completed) - Number(b.completed)
          break
        case 'dueAt':
          cmp = (a.dueAt ?? '').localeCompare(b.dueAt ?? '')
          break
        default:
          cmp = (a.createdAt ?? '').localeCompare(b.createdAt ?? '')
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
  }

  if (!auth) {
    return <AuthPage onAuth={setAuth} dark={dark} onToggleDark={() => setDark(d => !d)} />
  }

  const filteredTodos = selectedTagId
    ? todos.filter(t => t.tags?.some(tag => tag.id === selectedTagId))
    : todos

  const displayTodos = sortTodos(filteredTodos)
  const allGroups = groupedTodos(displayTodos)
  const totalDayPages = Math.ceil(allGroups.length / DAYS_PER_PAGE)
  const visibleGroups = allGroups.slice(dayPage * DAYS_PER_PAGE, (dayPage + 1) * DAYS_PER_PAGE)

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto text-gray-900 dark:text-gray-100">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-2xl font-bold">Todo App</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">Logged in as <strong>{auth.username}</strong></span>
          <button
            onClick={() => setDark(d => !d)}
            className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? '☀️' : '🌙'}
          </button>
          {notifPermission !== 'unsupported' && (
            <button
              onClick={notifPermission === 'default' ? requestNotifPermission : undefined}
              className="p-1.5 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:cursor-default"
              title={
                notifPermission === 'granted' ? 'Notifications enabled' :
                notifPermission === 'denied' ? 'Notifications blocked — enable in browser settings' :
                'Enable notifications for due date reminders'
              }
            >
              {notifPermission === 'denied' ? '🔕' : '🔔'}
            </button>
          )}
          <button onClick={logout} className="text-sm text-red-600 dark:text-red-400 hover:underline">Logout</button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b dark:border-gray-700">
        <button
          onClick={() => setView('todos')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${view === 'todos' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          Todos
        </button>
        <button
          onClick={() => setView('trash')}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 ${view === 'trash' ? 'border-red-500 text-red-500' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          Trash
          {trashItems.length > 0 && (
            <span className="text-xs bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-full px-1.5 py-0.5 font-semibold">{trashItems.length}</span>
          )}
        </button>
      </div>

      {error && (
        <div className="flex items-center justify-between mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-300 rounded">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 font-bold text-red-600 dark:text-red-400">✕</button>
        </div>
      )}

      {view === 'trash' ? (
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">{trashItems.length} item{trashItems.length !== 1 ? 's' : ''} in trash</span>
            <div className="flex gap-2">
              {trashItems.length > 0 && (
                <>
                  <button
                    onClick={() => bulkRestore(trashItems.map(t => t.id))}
                    className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Restore all
                  </button>
                  <button
                    onClick={emptyTrash}
                    className="text-sm px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Empty trash
                  </button>
                </>
              )}
            </div>
          </div>

          {loading && <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Loading...</div>}
          {!loading && trashItems.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">Trash is empty.</div>
          )}

          <div className="space-y-3">
            {trashItems.map(t => (
              <div key={t.id} className="p-3 bg-white dark:bg-gray-800 rounded shadow opacity-75 flex items-start gap-3">
                <div className="flex-1">
                  <div className="font-semibold flex items-center gap-2 line-through text-gray-400 dark:text-gray-500">
                    {t.title}
                    <span className={`text-xs px-1.5 py-0.5 rounded no-underline ${(priorityBadge[t.priority] ?? priorityBadge['MEDIUM']).className}`}>
                      {(priorityBadge[t.priority] ?? priorityBadge['MEDIUM']).label}
                    </span>
                  </div>
                  {t.description && <div className="text-sm text-gray-400 dark:text-gray-500 line-through">{t.description}</div>}
                  {t.tags && t.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {t.tags.map(tag => (
                        <span key={tag.id} style={{ backgroundColor: tag.color }} className="text-xs px-1.5 py-0.5 rounded-full text-white opacity-60">
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {t.deletedAt && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Deleted {new Date(t.deletedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => restore(t.id)}
                  disabled={pendingIds.has(t.id)}
                  className="text-green-600 dark:text-green-400 text-sm disabled:opacity-50"
                >
                  Restore
                </button>
                <button
                  onClick={() => permanentDelete(t.id)}
                  disabled={pendingIds.has(t.id)}
                  className="text-red-600 dark:text-red-400 text-sm disabled:opacity-50"
                >
                  Delete forever
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Tag filter bar */}
          <div className="flex flex-wrap gap-1.5 mb-3 items-center">
            {tags.length > 0 && (
              <button
                onClick={() => { setSelectedTagId(null); setDayPage(0) }}
                className={`text-xs px-2.5 py-1 rounded-full transition-colors ${selectedTagId === null ? 'bg-gray-700 dark:bg-gray-500 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
              >
                All
              </button>
            )}
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => { setSelectedTagId(selectedTagId === tag.id ? null : tag.id); setDayPage(0) }}
                style={{ backgroundColor: tag.color }}
                className={`text-xs px-2.5 py-1 rounded-full text-white transition-opacity ${selectedTagId === tag.id ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-900' : 'opacity-75 hover:opacity-100'}`}
              >
                {tag.name}
              </button>
            ))}
            <button
              onClick={() => setShowTagPanel(p => !p)}
              className="text-xs px-2.5 py-1 rounded-full border border-dashed border-gray-400 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              {showTagPanel ? '✕ Close' : '+ Label'}
            </button>
          </div>

          {/* Tag management panel */}
          {showTagPanel && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded border dark:border-gray-700">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {tags.length === 0 && <span className="text-xs text-gray-400 dark:text-gray-500">No labels yet. Create one below.</span>}
                {tags.map(tag => (
                  <span key={tag.id} style={{ backgroundColor: tag.color }} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full text-white">
                    {tag.name}
                    <button
                      onClick={() => deleteTag(tag.id)}
                      className="hover:opacity-70 leading-none"
                      title="Delete label"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2 items-center">
                <input
                  className="p-1.5 border dark:border-gray-600 rounded text-sm flex-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                  value={newTagName}
                  onChange={e => setNewTagName(e.target.value)}
                  placeholder="Label name"
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); createTag() } }}
                />
                <div className="flex gap-1">
                  {TAG_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewTagColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-full transition-transform ${newTagColor === c ? 'ring-2 ring-offset-1 ring-gray-500 dark:ring-offset-gray-800 scale-110' : 'hover:scale-110'}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={createTag}
                  className="text-sm px-2.5 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <input
              className="flex-1 min-w-[8rem] p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              value={query}
              onChange={e => { setQuery(e.target.value); setDayPage(0) }}
              placeholder="Search..."
            />
            <select
              value={sortField}
              onChange={e => { setSortField(e.target.value); setDayPage(0) }}
              className="p-2 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="createdAt">Date created</option>
              <option value="dueAt">Due time</option>
              <option value="priority">Priority</option>
              <option value="title">Title</option>
              <option value="completed">Status</option>
            </select>
            <button
              onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
              className="p-2 border dark:border-gray-600 rounded text-sm hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              title={sortDir === 'desc' ? 'Descending — click to switch' : 'Ascending — click to switch'}
            >
              {sortDir === 'desc' ? '↓' : '↑'}
            </button>
          </div>

          <form onSubmit={create} className="mb-4">
            <div className="flex flex-wrap gap-2 items-center mb-2">
              <input className="flex-1 min-w-[8rem] p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
              <input className="flex-1 min-w-[8rem] p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" />
              <input type="datetime-local" className="p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white" value={due} onChange={e => setDue(e.target.value)} />
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)} className="p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
              <select value={newRecurrence} onChange={e => setNewRecurrence(e.target.value as RecurrenceRule | '')} className="p-2 border dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm">
                <option value="">No repeat</option>
                {(Object.keys(RECURRENCE_LABELS) as RecurrenceRule[]).map(r => (
                  <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
                ))}
              </select>
              <button className="bg-blue-600 text-white px-3 py-2 rounded shrink-0">Add</button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Labels:</span>
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleNewTodoTag(tag.id)}
                    style={newTodoTagIds.includes(tag.id) ? { backgroundColor: tag.color } : undefined}
                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                      newTodoTagIds.includes(tag.id)
                        ? 'text-white border-transparent'
                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            )}
          </form>

          <div className="space-y-6">
            {loading && <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Loading...</div>}
            {!loading && displayTodos.length === 0 && !error && (
              <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {selectedTagId ? 'No todos with this label.' : 'No todos found.'}
              </div>
            )}
            {!loading && visibleGroups.map(({ key, label, overdue, items }) => (
              <div key={key}>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold uppercase tracking-wide ${overdue ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                    {label}
                  </span>
                  <div className={`flex-1 min-w-[2rem] h-px ${overdue ? 'bg-red-200 dark:bg-red-900/50' : 'bg-gray-200 dark:bg-gray-700'}`} />
                  <button
                    onClick={() => bulkMarkComplete(items.filter(t => !t.completed).map(t => t.id))}
                    disabled={items.every(t => t.completed)}
                    className="text-xs px-2 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 disabled:opacity-40"
                  >
                    Mark complete
                  </button>
                  <button
                    onClick={() => bulkDelete(items.filter(t => t.completed).map(t => t.id))}
                    disabled={items.every(t => !t.completed)}
                    className="text-xs px-2 py-0.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 disabled:opacity-40"
                  >
                    Trash completed
                  </button>
                </div>
                <div className="space-y-3">
                  {items.map(t => (
                    <div key={t.id} className={`p-3 bg-white dark:bg-gray-800 rounded shadow ${t.completed ? 'opacity-75' : ''}`}>
                      {editingId === t.id ? (
                        <div className="flex flex-col gap-2">
                          <input
                            className="p-2 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            placeholder="Title"
                            autoFocus
                          />
                          <input
                            className="p-2 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            value={editDesc}
                            onChange={e => setEditDesc(e.target.value)}
                            placeholder="Description"
                          />
                          <input
                            type="datetime-local"
                            className="p-2 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            value={editDue}
                            onChange={e => setEditDue(e.target.value)}
                          />
                          <select value={editPriority} onChange={e => setEditPriority(e.target.value as Priority)} className="p-2 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                            <option value="URGENT">Urgent</option>
                          </select>
                          <select value={editRecurrence} onChange={e => setEditRecurrence(e.target.value as RecurrenceRule | '')} className="p-2 border dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                            <option value="">No repeat</option>
                            {(Object.keys(RECURRENCE_LABELS) as RecurrenceRule[]).map(r => (
                              <option key={r} value={r}>{RECURRENCE_LABELS[r]}</option>
                            ))}
                          </select>
                          {tags.length > 0 && (
                            <div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Labels</div>
                              <div className="flex flex-wrap gap-1.5">
                                {tags.map(tag => (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleEditTag(tag.id)}
                                    style={editTagIds.includes(tag.id) ? { backgroundColor: tag.color } : undefined}
                                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${
                                      editTagIds.includes(tag.id)
                                        ? 'text-white border-transparent'
                                        : 'border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    {tag.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="flex gap-2 justify-end">
                            <button onClick={cancelEdit} className="px-3 py-1 border dark:border-gray-600 rounded text-sm dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                            <button onClick={() => saveEdit(t.id)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Save</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start gap-3 flex-wrap">
                            <input type="checkbox" checked={t.completed} disabled={pendingIds.has(t.id)} onChange={e => toggle(t.id, e.target.checked)} className="mt-1 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold flex items-center gap-2 flex-wrap">
                                {t.title}
                                <span className={`text-xs px-1.5 py-0.5 rounded ${(priorityBadge[t.priority] ?? priorityBadge['MEDIUM']).className}`}>
                                  {(priorityBadge[t.priority] ?? priorityBadge['MEDIUM']).label}
                                </span>
                                {t.recurrenceRule && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                    ↻ {RECURRENCE_LABELS[t.recurrenceRule]}
                                  </span>
                                )}
                                {t.dueAt ? <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">{formatDueTime(t.dueAt)}</span> : null}
                              </div>
                              {t.description && <div className="text-sm text-gray-600 dark:text-gray-400">{t.description}</div>}
                              {t.tags && t.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {t.tags.map(tag => (
                                    <span
                                      key={tag.id}
                                      style={{ backgroundColor: tag.color }}
                                      className="text-xs px-1.5 py-0.5 rounded-full text-white"
                                    >
                                      {tag.name}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <button onClick={() => startEdit(t)} className="text-blue-600 dark:text-blue-400 text-sm">Edit</button>
                            <button onClick={() => remove(t.id)} disabled={pendingIds.has(t.id)} className="text-red-600 dark:text-red-400 text-sm disabled:opacity-50">Trash</button>
                          </div>
                          {/* Subtasks */}
                          <div className="mt-2 ml-6">
                            <button
                              onClick={() => toggleExpand(t.id)}
                              className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1"
                            >
                              <span>{expandedTodos.has(t.id) ? '▼' : '▶'}</span>
                              <span>
                                Subtasks
                                {subtasksMap[t.id]?.length
                                  ? ` · ${subtasksMap[t.id].filter(s => s.completed).length}/${subtasksMap[t.id].length}`
                                  : ''}
                              </span>
                            </button>
                            {expandedTodos.has(t.id) && (
                              <div className="mt-1.5 space-y-1">
                                {subtasksMap[t.id]?.map(s => (
                                  <div key={s.id} className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      checked={s.completed}
                                      onChange={e => toggleSubtask(t.id, s.id, e.target.checked)}
                                      className="mt-px"
                                    />
                                    <span className={`text-sm flex-1 ${s.completed ? 'line-through text-gray-400 dark:text-gray-500' : ''}`}>
                                      {s.title}
                                    </span>
                                    <button
                                      onClick={() => deleteSubtask(t.id, s.id)}
                                      className="text-red-400 hover:text-red-600 dark:hover:text-red-300 text-xs leading-none"
                                      title="Remove subtask"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                                {addingSubtaskId === t.id ? (
                                  <div className="flex gap-1 mt-1">
                                    <input
                                      className="flex-1 text-sm p-1 border dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                      value={newSubtaskTitle}
                                      onChange={e => setNewSubtaskTitle(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') createSubtask(t.id); if (e.key === 'Escape') { setAddingSubtaskId(null); setNewSubtaskTitle('') } }}
                                      placeholder="Subtask title"
                                      autoFocus
                                    />
                                    <button onClick={() => createSubtask(t.id)} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">Add</button>
                                    <button onClick={() => { setAddingSubtaskId(null); setNewSubtaskTitle('') }} className="text-xs px-2 py-1 border dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">✕</button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setAddingSubtaskId(t.id); setNewSubtaskTitle('') }}
                                    className="text-xs text-blue-500 dark:text-blue-400 hover:underline mt-0.5"
                                  >
                                    + Add subtask
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {totalDayPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">Page {dayPage + 1} of {totalDayPages}</div>
              <div className="flex gap-2">
                <button disabled={dayPage <= 0} onClick={() => setDayPage(p => p - 1)} className="px-3 py-1 border dark:border-gray-600 rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Prev</button>
                <button disabled={dayPage + 1 >= totalDayPages} onClick={() => setDayPage(p => p + 1)} className="px-3 py-1 border dark:border-gray-600 rounded disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
