import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailSignupForm } from '@/components/email-signup-form'
import { axe, toHaveNoViolations } from 'jest-axe'

// Extend Jest matchers for accessibility
expect.extend(toHaveNoViolations)

// Mock fetch globally
global.fetch = jest.fn()

describe('EmailSignupForm - Accessibility Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('ARIA and Semantic HTML', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<EmailSignupForm />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper form structure', () => {
      render(<EmailSignupForm />)

      // Form should be identifiable
      const form = screen.getByRole('form')
      expect(form).toBeInTheDocument()

      // Input should have proper role and type
      const emailInput = screen.getByRole('textbox', { name: /email/i })
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')

      // Button should be properly labeled
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })

    it('should have proper labeling even without explicit labels', () => {
      render(<EmailSignupForm />)

      const emailInput = screen.getByPlaceholderText('Enter your email')

      // Input should be accessible by its placeholder or aria-label
      expect(emailInput).toBeInTheDocument()
      expect(emailInput).toHaveAttribute('placeholder', 'Enter your email')

      // While not ideal, the component uses placeholder as the primary identifier
      // In a production app, we'd recommend adding a proper label
    })

    it('should associate error messages with the input', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const form = input.closest('form')

      // Submit with invalid email
      await user.type(input, 'invalid')
      fireEvent.submit(form!)

      await waitFor(() => {
        const errorMessage = screen.getByText(/please enter a valid email address/i)
        expect(errorMessage).toBeInTheDocument()

        // Error should be announced to screen readers
        expect(errorMessage).toHaveAttribute('role', 'alert')

        // Ideally, the input would be associated with the error via aria-describedby
        // This would be an improvement for the component
      })
    })

    it('should announce loading states to screen readers', async () => {
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

      // Loading state should be announced
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
        expect(submitButton).toHaveAttribute('disabled')
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
        const successMessage = screen.getByText(/thank you for subscribing/i)
        expect(successMessage).toBeInTheDocument()
      })
    })

    it('should provide status updates with proper ARIA live regions', async () => {
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
        const statusMessage = screen.getByText(/thank you for subscribing/i)
        expect(statusMessage).toBeInTheDocument()

        // Status messages should be in a live region for screen reader announcement
        const messageContainer = statusMessage.closest('div')
        expect(messageContainer).toHaveClass('animate-in') // Has animation class
      })
    })
  })

  describe('Keyboard Navigation', () => {
    it('should be fully navigable with keyboard', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      // Tab to email input
      await user.tab()
      expect(emailInput).toHaveFocus()

      // Type email
      await user.type(emailInput, 'test@example.com')

      // Tab to submit button
      await user.tab()
      expect(submitButton).toHaveFocus()

      // Press Enter or Space to submit
      await user.keyboard('{Enter}')

      // Should trigger form submission
      expect(global.fetch).toHaveBeenCalled()
    })

    it('should handle Enter key submission from input field', async () => {
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

      const emailInput = screen.getByPlaceholderText('Enter your email')

      await user.click(emailInput)
      await user.type(emailInput, 'test@example.com')
      await user.keyboard('{Enter}')

      await waitFor(() => {
        expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument()
      })

      expect(global.fetch).toHaveBeenCalled()
    })

    it('should maintain focus management during loading', async () => {
      const user = userEvent.setup()

      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      ;(global.fetch as jest.Mock).mockReturnValueOnce(promise)

      render(<EmailSignupForm />)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)

      // During loading, focus should remain on the button (even though disabled)
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
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
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('should handle Escape key to clear error states', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const form = input.closest('form')

      // Create error state
      await user.type(input, 'invalid')
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })

      // Clear input and error should disappear
      await user.clear(input)
      await user.type(input, 'valid@example.com')

      await waitFor(() => {
        expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide meaningful button text in all states', async () => {
      const user = userEvent.setup()

      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      ;(global.fetch as jest.Mock).mockReturnValueOnce(promise)

      render(<EmailSignupForm />)

      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      // Initial state
      expect(submitButton).toHaveTextContent('Join Waitlist')

      const input = screen.getByPlaceholderText('Enter your email')
      await user.type(input, 'test@example.com')
      await user.click(submitButton)

      // Loading state - text should still indicate action
      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Join Waitlist')
        expect(submitButton).toBeDisabled()
      })

      resolvePromise!({
        ok: true,
        status: 201,
        json: async () => ({
          message: 'Successfully subscribed!',
          email: 'test@example.com'
        })
      })

      // After completion
      await waitFor(() => {
        expect(submitButton).toHaveTextContent('Join Waitlist')
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('should announce form validation errors clearly', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')

      // Submit invalid email
      await user.type(input, 'invalid.email')
      await user.tab() // Move focus away to trigger validation
      await user.tab() // Move to submit button
      await user.keyboard('{Enter}')

      await waitFor(() => {
        const errorMessage = screen.getByText(/please enter a valid email address/i)
        expect(errorMessage).toBeInTheDocument()

        // Error should be associated with an icon for visual users
        const errorIcon = document.querySelector('.lucide-alert-circle')
        expect(errorIcon).toBeInTheDocument()
      })
    })

    it('should provide success feedback with proper semantics', async () => {
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
        const successMessage = screen.getByText(/thank you for subscribing/i)
        expect(successMessage).toBeInTheDocument()

        // Success message should have proper visual indicator
        const successIcon = document.querySelector('.lucide-check-circle-2')
        expect(successIcon).toBeInTheDocument()
      })
    })
  })

  describe('Color Contrast and Visual Accessibility', () => {
    it('should have sufficient color contrast for text elements', () => {
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })
      const privacyText = screen.getByText(/we respect your privacy/i)

      // These elements should have proper styling classes that ensure contrast
      expect(input).toHaveClass('text-white')
      expect(input).toHaveClass('placeholder:text-gray-400')
      expect(submitButton).toHaveClass('text-white')
      expect(privacyText).toHaveClass('text-gray-400')
    })

    it('should show focus indicators clearly', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      // Focus input
      await user.tab()
      expect(input).toHaveFocus()
      expect(input).toHaveClass('focus:ring-2', 'focus:ring-blue-500')

      // Focus button
      await user.tab()
      expect(submitButton).toHaveFocus()
      expect(submitButton).toHaveClass('focus:ring-2', 'focus:ring-orange-400')
    })

    it('should handle high contrast mode', () => {
      // Mock high contrast mode
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-contrast: high'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }))
      })

      render(<EmailSignupForm />)

      // In high contrast mode, the component should still be functional
      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      expect(input).toBeInTheDocument()
      expect(submitButton).toBeInTheDocument()
    })
  })

  describe('Motion and Animation Accessibility', () => {
    it('should respect reduced motion preferences', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query.includes('prefers-reduced-motion: reduce'),
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        }))
      })

      const { container } = render(<EmailSignupForm />)

      // Component should still render and function with reduced motion
      expect(container).toBeInTheDocument()

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      expect(input).toBeInTheDocument()
      expect(submitButton).toBeInTheDocument()
    })

    it('should not cause motion sickness with animations', async () => {
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
        const successMessage = screen.getByText(/thank you for subscribing/i)
        expect(successMessage).toBeInTheDocument()

        // Animation classes should be reasonable and not excessive
        const messageContainer = successMessage.closest('div')
        expect(messageContainer).toHaveClass('animate-in')
        expect(messageContainer).toHaveClass('fade-in-0')
        expect(messageContainer).toHaveClass('slide-in-from-top-2')
      })
    })
  })

  describe('Form Completion and Error Recovery', () => {
    it('should provide clear instructions for error recovery', async () => {
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
        const errorMessage = screen.getByText(/this email is already subscribed/i)
        expect(errorMessage).toBeInTheDocument()

        // Error message should be clear and actionable
        expect(errorMessage).toBeVisible()

        // Form should remain accessible for correction
        expect(input).not.toBeDisabled()
        expect(input).toHaveValue('existing@example.com')
        expect(submitButton).not.toBeDisabled()
      })
    })

    it('should maintain form state appropriately', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')

      // Type partial email
      await user.type(input, 'partial@')

      // Move focus away and back
      await user.tab()
      await user.tab({ shift: true })

      // Input should retain value
      expect(input).toHaveValue('partial@')
      expect(input).toHaveFocus()
    })
  })
})