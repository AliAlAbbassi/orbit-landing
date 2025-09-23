import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailSignupForm } from '@/components/email-signup-form'

// Mock fetch globally
global.fetch = jest.fn()

describe('EmailSignupForm - Working Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  it('renders the email signup form', () => {
    render(<EmailSignupForm />)

    expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /join waitlist/i })).toBeInTheDocument()
    expect(screen.getByText(/we respect your privacy/i)).toBeInTheDocument()
  })

  it('submits valid email successfully', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        message: 'Successfully subscribed!',
        email: 'test@example.com'
      })
    })

    render(<EmailSignupForm />)

    const input = screen.getByPlaceholderText('Enter your email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    await user.type(input, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'test@example.com',
        source: 'landing-page',
      })
    })

    // Check that input is cleared after successful submission
    expect(input).toHaveValue('')
  })

  it('handles duplicate email error', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({
        message: 'Email already subscribed'
      })
    })

    render(<EmailSignupForm />)

    const input = screen.getByPlaceholderText('Enter your email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    await user.type(input, 'existing@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/this email is already subscribed/i)).toBeInTheDocument()
    })

    // Input should not be cleared on error
    expect(input).toHaveValue('existing@example.com')
  })

  it('handles network error gracefully', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(<EmailSignupForm />)

    const input = screen.getByPlaceholderText('Enter your email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    await user.type(input, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()

    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    ;(global.fetch as jest.Mock).mockReturnValueOnce(promise)

    render(<EmailSignupForm />)

    const input = screen.getByPlaceholderText('Enter your email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    await user.type(input, 'test@example.com')
    await user.click(submitButton)

    // Check loading state appears
    await waitFor(() => {
      expect(screen.getByText(/join waitlist/i)).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
    })

    // Resolve the promise - just verify the loading state worked
    resolvePromise!({
      ok: true,
      status: 201,
      json: async () => ({
        message: 'Successfully subscribed!',
        email: 'test@example.com'
      })
    })

    // Just verify we can get the success message eventually
    await waitFor(() => {
      expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument()
    })
  })

  it('disables input during submission', async () => {
    const user = userEvent.setup()

    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    ;(global.fetch as jest.Mock).mockReturnValueOnce(promise)

    render(<EmailSignupForm />)

    const input = screen.getByPlaceholderText('Enter your email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    await user.type(input, 'test@example.com')
    await user.click(submitButton)

    // Check that form is disabled during submission
    await waitFor(() => {
      expect(input).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })

    // Resolve the promise
    resolvePromise!({
      ok: true,
      status: 201,
      json: async () => ({
        message: 'Successfully subscribed!',
        email: 'test@example.com'
      })
    })

    // Check that form is enabled again
    await waitFor(() => {
      expect(input).not.toBeDisabled()
      expect(submitButton).not.toBeDisabled()
    })
  })
})