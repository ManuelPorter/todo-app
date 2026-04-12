import React, { useEffect, useState } from 'react'

type Todo = {
  id: number
  title: string
  description?: string
  completed: boolean
  dueAt?: string
}

type AuthState = {
  token: string
  username: string
}

function getStoredAuth(): AuthState | null {
  try {
    const raw = localStorage.getItem('auth')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function AuthPage({ onAuth }: { onAuth: (auth: AuthState) => void }) {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded shadow w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Todo App</h1>

        <div className="flex mb-6 border rounded overflow-hidden">
          <button
            onClick={() => { setMode('login'); setError(null) }}
            className={`flex-1 py-2 text-sm font-medium ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('register'); setError(null) }}
            className={`flex-1 py-2 text-sm font-medium ${mode === 'register' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
          >
            Register
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded text-sm">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="flex flex-col gap-3">
          <input
            className="p-2 border rounded"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            className="p-2 border rounded"
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
  const [todos, setTodos] = useState<Todo[]>([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [due, setDue] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [size] = useState(6)
  const [totalPages, setTotalPages] = useState(0)
  const [sort, setSort] = useState('createdAt')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (auth) load() }, [page, query, sort, auth])

  function authHeaders(): HeadersInit {
    return auth ? { Authorization: `Bearer ${auth.token}` } : {}
  }

  function handleUnauthorized(status: number) {
    if (status === 401 || status === 403) {
      localStorage.removeItem('auth')
      setAuth(null)
    }
  }

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', String(size))
      if (query) params.set('q', query)
      if (sort) params.set('sort', sort)
      const res = await fetch('/api/todos?' + params.toString(), { headers: authHeaders() })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to load todos (${res.status})`)
      const data = await res.json()
      setTodos(data.content || [])
      setTotalPages(data.totalPages || 0)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load todos')
    } finally {
      setLoading(false)
    }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault()
    if (!title) return
    const payload: any = { title, description: desc }
    if (due) payload.dueAt = due
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to create todo (${res.status})`)
      setTitle(''); setDesc(''); setDue('')
      setError(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create todo')
    }
  }

  function formatDueAt(dueAt?: string) {
    if (!dueAt) return ''
    const d = new Date(dueAt)
    if (Number.isNaN(d.getTime())) return dueAt
    return d.toLocaleString()
  }

  async function toggle(id: number, checked: boolean) {
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
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update todo')
    }
  }

  async function remove(id: number) {
    try {
      const res = await fetch('/api/todos/' + id, { method: 'DELETE', headers: authHeaders() })
      handleUnauthorized(res.status)
      if (!res.ok) throw new Error(`Failed to delete todo (${res.status})`)
      setError(null)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete todo')
    }
  }

  function logout() {
    localStorage.removeItem('auth')
    setAuth(null)
    setTodos([])
  }

  if (!auth) {
    return <AuthPage onAuth={setAuth} />
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Todo App</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Logged in as <strong>{auth.username}</strong></span>
          <button onClick={logout} className="text-sm text-red-600 hover:underline">Logout</button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-4 font-bold text-red-600">✕</button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <input
          className="flex-1 p-2 border rounded"
          value={query}
          onChange={e => { setQuery(e.target.value); setPage(0) }}
          placeholder="Search..."
        />
        <select value={sort} onChange={e => setSort(e.target.value)} className="p-2 border rounded">
          <option value="createdAt">Newest</option>
          <option value="dueAt">Due date</option>
        </select>
      </div>

      <form onSubmit={create} className="flex gap-2 mb-4 items-center">
        <input className="flex-1 p-2 border rounded" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
        <input className="w-48 p-2 border rounded" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description" />
        <input type="datetime-local" className="p-2 border rounded" value={due} onChange={e => setDue(e.target.value)} />
        <button className="bg-blue-600 text-white px-3 py-2 rounded">Add</button>
      </form>

      <div className="space-y-3">
        {loading && <div className="text-sm text-gray-500 text-center py-4">Loading...</div>}
        {!loading && todos.map(t => (
          <div key={t.id} className={`p-3 bg-white rounded shadow flex items-start gap-3 ${t.completed ? 'opacity-75' : ''}`}>
            <input type="checkbox" checked={t.completed} onChange={e => toggle(t.id, e.target.checked)} />
            <div className="flex-1">
              <div className="font-semibold">
                {t.title} {t.dueAt ? <span className="text-sm text-gray-500">due {formatDueAt(t.dueAt)}</span> : null}
              </div>
              <div className="text-sm text-gray-600">{t.description}</div>
            </div>
            <button onClick={() => remove(t.id)} className="text-red-600">Delete</button>
          </div>
        ))}
        {!loading && todos.length === 0 && !error && (
          <div className="text-sm text-gray-500 text-center py-4">No todos found.</div>
        )}
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-gray-600">Page {page + 1} of {Math.max(1, totalPages)}</div>
        <div className="flex gap-2">
          <button disabled={page <= 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-3 py-1 border rounded">Prev</button>
          <button disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 border rounded">Next</button>
        </div>
      </div>
    </div>
  )
}
