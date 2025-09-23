import React from 'react'
import { render, screen } from '@testing-library/react'
import { EmailSignupForm } from '@/components/email-signup-form'

// Mock fetch globally
global.fetch = jest.fn()

describe('EmailSignupForm - Basic Tests', () => {
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

  it('renders mail icon', () => {
    render(<EmailSignupForm />)

    // Check for mail icon by looking for SVG with specific path
    const mailIcon = document.querySelector('svg')
    expect(mailIcon).toBeInTheDocument()
    expect(mailIcon).toHaveClass('lucide-mail')
  })
})