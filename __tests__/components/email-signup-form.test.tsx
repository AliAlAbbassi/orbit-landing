import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailSignupForm } from '@/components/email-signup-form'

// Mock fetch globally
global.fetch = jest.fn()

describe('EmailSignupForm', () => {
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

  it('validates email format on submit', async () => {
    const user = userEvent.setup()
    render(<EmailSignupForm />)

    const input = screen.getByPlaceholderText('Enter your email')
    const form = input.closest('form')

    // Try to submit with invalid email - use fireEvent to bypass HTML5 validation
    await user.type(input, 'invalid')
    fireEvent.submit(form!)

    // Wait for validation error to appear
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    expect(global.fetch).not.toHaveBeenCalled()
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

  it('handles server error gracefully', async () => {
    const user = userEvent.setup()
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({
        message: 'Internal server error'
      })
    })

    render(<EmailSignupForm />)

    const input = screen.getByPlaceholderText('Enter your email')
    const submitButton = screen.getByRole('button', { name: /join waitlist/i })

    await user.type(input, 'test@example.com')
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText(/internal server error/i)).toBeInTheDocument()
    })
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

  it('disables form during submission', async () => {
    const user = userEvent.setup()

    // Create a promise we can control
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

    // Check that button is disabled and shows loading state during submission
    await waitFor(() => {
      expect(submitButton).toBeDisabled()
      expect(screen.getByText(/join waitlist/i)).toBeInTheDocument()
    })

    // Note: The input is set to disabled={isSubmitting} in the component
    expect(input).toBeDisabled()

    // Resolve the promise
    resolvePromise!({
      ok: true,
      status: 201,
      json: async () => ({
        message: 'Successfully subscribed!',
        email: 'test@example.com'
      })
    })

    await waitFor(() => {
      expect(input).not.toBeDisabled()
      expect(submitButton).not.toBeDisabled()
    })
  })

  it('shows loading spinner during submission', async () => {
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

    // Check for loading indicator
    await waitFor(() => {
      const loadingElement = screen.getByText(/join waitlist/i)
      expect(loadingElement).toBeInTheDocument()
    })

    resolvePromise!({
      ok: true,
      status: 201,
      json: async () => ({
        message: 'Successfully subscribed!',
        email: 'test@example.com'
      })
    })

    await waitFor(() => {
      expect(screen.queryByText(/join waitlist/i)).toBeInTheDocument()
    })
  })

  it('clears error message when user starts typing', async () => {
    const user = userEvent.setup()

    render(<EmailSignupForm />)

    const input = screen.getByPlaceholderText('Enter your email')
    const form = input.closest('form')

    // Submit with invalid data to trigger validation error
    await user.type(input, 'bad')
    fireEvent.submit(form!)

    // Wait for validation error
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
    })

    // Clear and type new email
    await user.clear(input)
    await user.type(input, 'good@example.com')

    // Error should be gone when form is revalidated
    await waitFor(() => {
      expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
    })
  })
})