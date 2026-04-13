import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

const MOCK_AUTH = { token: 'fake-jwt', username: 'alice' }

const MOCK_TODOS_RESPONSE = {
  content: [
    { id: 1, title: 'Buy milk', description: 'From the store', completed: false, dueAt: null },
    { id: 2, title: 'Read book', description: '', completed: true, dueAt: '2026-05-01T10:00:00' },
  ],
  totalPages: 1,
  page: 0,
  size: 6,
  totalElements: 2,
}

beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

function seedAuth() {
  localStorage.setItem('auth', JSON.stringify(MOCK_AUTH))
}

function mockFetchOnce(data: object, ok = true) {
  vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
    ok,
    status: ok ? 200 : 400,
    json: async () => data,
  } as Response)
}

function mockFetch(...responses: { data: object; ok?: boolean }[]) {
  const spy = vi.spyOn(globalThis, 'fetch')
  for (const { data, ok = true } of responses) {
    spy.mockResolvedValueOnce({
      ok,
      status: ok ? 200 : 400,
      json: async () => data,
    } as Response)
  }
  return spy
}

describe('App (authenticated)', () => {
  it('renders the todo list on load', async () => {
    seedAuth()
    mockFetchOnce(MOCK_TODOS_RESPONSE)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Buy milk')).toBeInTheDocument()
      expect(screen.getByText('Read book')).toBeInTheDocument()
    })
  })

  it('shows logged-in username in header', async () => {
    seedAuth()
    mockFetchOnce(MOCK_TODOS_RESPONSE)

    render(<App />)

    await waitFor(() => expect(screen.getByText('alice')).toBeInTheDocument())
  })

  it('shows empty state message when there are no todos', async () => {
    seedAuth()
    mockFetchOnce({ content: [], totalPages: 0, totalElements: 0 })

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/no todos found/i)).toBeInTheDocument()
    })
  })

  it('logout clears auth and shows login page', async () => {
    seedAuth()
    mockFetchOnce(MOCK_TODOS_RESPONSE)

    render(<App />)
    await waitFor(() => screen.getByText('Buy milk'))

    await userEvent.click(screen.getByRole('button', { name: /logout/i }))

    expect(localStorage.getItem('auth')).toBeNull()
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
  })

  it('shows error banner when load fails', async () => {
    seedAuth()
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  it('dismisses error when X button is clicked', async () => {
    seedAuth()
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network error'))

    render(<App />)
    await waitFor(() => screen.getByText(/network error/i))

    await userEvent.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByText(/network error/i)).not.toBeInTheDocument()
  })

  it('formats due date for todos', async () => {
    seedAuth()
    mockFetchOnce(MOCK_TODOS_RESPONSE)

    render(<App />)

    await waitFor(() => {
      // The "Read book" todo has a dueAt — verify "due" label appears
      expect(screen.getByText(/due/i)).toBeInTheDocument()
    })
  })

  it('disables Prev button on first page', async () => {
    seedAuth()
    mockFetchOnce({ content: [], totalPages: 1, totalElements: 0 })

    render(<App />)
    await waitFor(() => screen.getByText(/page 1/i))

    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled()
  })

  it('disables Next button when on last page', async () => {
    seedAuth()
    mockFetchOnce({ content: [], totalPages: 1, totalElements: 0 })

    render(<App />)
    await waitFor(() => screen.getByText(/page 1/i))

    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('creates a todo and reloads the list', async () => {
    seedAuth()
    mockFetch(
      { data: MOCK_TODOS_RESPONSE },                                 // initial load
      { data: { id: 3, title: 'New task', completed: false } },     // POST create
      { data: { ...MOCK_TODOS_RESPONSE, totalElements: 3,           // reload after create
          content: [...MOCK_TODOS_RESPONSE.content,
            { id: 3, title: 'New task', completed: false }] } },
    )

    render(<App />)
    await waitFor(() => screen.getByText('Buy milk'))

    await userEvent.type(screen.getAllByPlaceholderText('Title')[0], 'New task')
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }))

    await waitFor(() => {
      expect(screen.getByText('New task')).toBeInTheDocument()
    })
  })

  it('redirects to login when API returns 401', async () => {
    seedAuth()
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Unauthorized' }),
    } as Response)

    render(<App />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    })
    expect(localStorage.getItem('auth')).toBeNull()
  })
})
