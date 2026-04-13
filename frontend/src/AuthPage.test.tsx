import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'

// AuthPage is the default view when no auth is stored
beforeEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

// The "Login" text appears twice: once in the tab bar, once on the submit button.
// Use the selector option to target specifically the submit button.
function getSubmitButton() {
  return screen.getByText(/login|create account/i, { selector: 'button[type="submit"]' })
}

describe('AuthPage', () => {
  it('renders login form by default', () => {
    render(<App />)
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(getSubmitButton()).toHaveTextContent('Login')
  })

  it('switches to register mode when Register tab is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(getSubmitButton()).toHaveTextContent('Create account')
  })

  it('switches back to login mode when Login tab is clicked', async () => {
    render(<App />)
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    // In register mode there is only one "Login" button (the tab), so getByRole is unambiguous
    await userEvent.click(screen.getByRole('button', { name: 'Login' }))
    expect(getSubmitButton()).toHaveTextContent('Login')
  })

  it('does not submit when fields are empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    render(<App />)
    await userEvent.click(getSubmitButton())
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('shows error message on failed login', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    } as Response)

    render(<App />)
    await userEvent.type(screen.getByPlaceholderText('Username'), 'alice')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'wrongpass')
    await userEvent.click(getSubmitButton())

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument()
    })
  })

  it('stores auth and transitions to app on successful login', async () => {
    vi.spyOn(globalThis, 'fetch')
      // login call
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ token: 'fake-jwt', username: 'alice' }),
      } as Response)
      // subsequent load() call for todos
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [], totalPages: 0 }),
      } as Response)

    render(<App />)
    await userEvent.type(screen.getByPlaceholderText('Username'), 'alice')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'pass123')
    await userEvent.click(getSubmitButton())

    await waitFor(() => {
      expect(screen.getByText(/logged in as/i)).toBeInTheDocument()
    })
    expect(localStorage.getItem('auth')).toContain('alice')
  })

  it('clears error when switching modes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({ error: 'Invalid credentials' }),
    } as Response)

    render(<App />)
    await userEvent.type(screen.getByPlaceholderText('Username'), 'alice')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'bad')
    await userEvent.click(getSubmitButton())

    await waitFor(() => expect(screen.getByText('Invalid credentials')).toBeInTheDocument())

    // In login mode both "Login" buttons exist; click "Register" tab (unambiguous) then switch back
    await userEvent.click(screen.getByRole('button', { name: 'Register' }))
    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
  })
})
