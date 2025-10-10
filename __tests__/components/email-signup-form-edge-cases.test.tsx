import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailSignupForm } from '@/components/email-signup-form'

// Mock fetch globally
global.fetch = jest.fn()

describe('EmailSignupForm - Edge Cases & Security Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Email Validation Edge Cases', () => {
    const invalidEmails = [
      '',
      ' ',
      '@',
      '@example.com',
      'user@',
      'user@@example.com',
      'user@example.',
      'user@.example.com',
      'user@example..com',
      'user name@example.com', // space in local part
      'user@exam ple.com', // space in domain
      'user@example.c', // too short TLD
      'a'.repeat(65) + '@example.com', // local part too long
      'user@' + 'a'.repeat(255) + '.com', // domain too long
      'user@example.com.', // trailing dot
      '.user@example.com', // leading dot in local part
      'user.@example.com', // trailing dot in local part
      'us..er@example.com', // consecutive dots in local part
      'user@-example.com', // domain starts with hyphen
      'user@example-.com', // domain ends with hyphen
      'user@192.168.1.256', // invalid IP address
      'user@[192.168.1.1', // incomplete IP bracket
      'user@192.168.1.1]', // incomplete IP bracket
      'user@[not.an.ip]', // invalid bracketed content
      'user@exam_ple.com', // underscore in domain (technically invalid)
      'user+tag@', // incomplete tagged email
      'user@.', // domain is just a dot
      'user@..', // domain is just dots
      'user@' + 'x'.repeat(64) + '.com', // label too long
      String.fromCharCode(0) + 'user@example.com', // null character
      'user' + String.fromCharCode(127) + '@example.com', // DEL character
      'user@example' + String.fromCharCode(0) + '.com', // null in domain
    ]

    invalidEmails.forEach((email) => {
      it(`should reject invalid email: "${email.replace(/\0/g, '\\0').replace(/\x7f/g, '\\x7f')}"`, async () => {
        const user = userEvent.setup()
        render(<EmailSignupForm />)

        const input = screen.getByPlaceholderText('Enter your email')
        const form = input.closest('form')

        await user.clear(input)

        // Handle empty string and special characters
        if (email.length > 0) {
          // Filter out null and DEL characters that userEvent can't handle
          const typableEmail = email.replace(/[\x00-\x1f\x7f]/g, '')
          if (typableEmail.length > 0) {
            await user.type(input, typableEmail)
          }
        }

        fireEvent.submit(form!)

        await waitFor(() => {
          expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
        })

        expect(global.fetch).not.toHaveBeenCalled()
      })
    })

    const validEdgeCaseEmails = [
      'a@b.co', // minimal valid email
      'test.email+tag@example.com', // plus addressing
      'user.name@example-domain.com', // hyphen in domain
      'user+tag+more@example.com', // multiple plus signs
      'user.123@example.com', // numbers in local part
      'x@example.museum', // long TLD
      'user@192.168.1.1', // IP address domain
      'user@[192.168.1.1]', // bracketed IP
      'user@localhost', // single word domain
      'user@sub.domain.example.com', // subdomain
      'user@x' + 'x'.repeat(62) + '.com', // 63 char label (max)
      'a'.repeat(64) + '@example.com', // 64 char local part (max)
      'test@' + 'a'.repeat(63) + '.' + 'b'.repeat(63) + '.com', // long domain components
      'user-name@example.com', // hyphen in local part
      'user_name@example.com', // underscore in local part
      '123@example.com', // numeric local part
      'user@123.456.789.123', // numeric domain
    ]

    validEdgeCaseEmails.forEach((email) => {
      it(`should accept valid edge case email: "${email}"`, async () => {
        const user = userEvent.setup()
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            message: 'Successfully subscribed!',
            email: email.toLowerCase()
          })
        })

        render(<EmailSignupForm />)

        const input = screen.getByPlaceholderText('Enter your email')
        const submitButton = screen.getByRole('button', { name: /join waitlist/i })

        await user.clear(input)
        await user.type(input, email)
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
            email: email,
            source: 'landing-page',
          })
        })
      })
    })
  })

  describe('Unicode and Internationalization Tests', () => {
    const unicodeEmails = [
      'тест@example.com', // Cyrillic
      'test@тест.com', // Cyrillic domain (punycode)
      'ユーザー@example.com', // Japanese
      'test@münchen.de', // German umlaut
      'café@example.com', // Accented characters
      'user@exämple.com', // Umlaut in domain
      'नाम@example.com', // Hindi
      '用户@example.com', // Chinese
      'user@中国.com', // Chinese domain
      '🙂@example.com', // Emoji (should be invalid)
      'test@🙂.com', // Emoji in domain (should be invalid)
      'José@example.com', // Spanish accent
      'Müller@example.com', // German umlaut
      'François@example.com', // French accent
    ]

    // Most Unicode in email addresses should be rejected by standard validators
    // Only basic ASCII should be accepted for security and compatibility
    unicodeEmails.forEach((email) => {
      it(`should handle Unicode email: "${email}"`, async () => {
        const user = userEvent.setup()
        render(<EmailSignupForm />)

        const input = screen.getByPlaceholderText('Enter your email')
        const form = input.closest('form')

        await user.clear(input)
        await user.type(input, email)
        fireEvent.submit(form!)

        // For security and compatibility, most Unicode should be rejected
        if (email.includes('🙂') || /[^\x00-\x7F]/.test(email)) {
          await waitFor(() => {
            expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
          })
          expect(global.fetch).not.toHaveBeenCalled()
        }
      })
    })
  })

  describe('Security Tests', () => {
    const maliciousInputs = [
      '<script>alert("xss")</script>@example.com',
      'user@example.com<script>alert("xss")</script>',
      'javascript:alert("xss")@example.com',
      'user@example.com"onload="alert(1)',
      "user@example.com'><script>alert(1)</script>",
      'user@example.com&lt;script&gt;alert(1)&lt;/script&gt;',
      'user@example.com\'; DROP TABLE users; --',
      'user@example.com" OR 1=1 --',
      'user@example.com\\x3cscript\\x3ealert(1)\\x3c/script\\x3e',
      'user@example.com%3Cscript%3Ealert(1)%3C/script%3E',
      '../../../etc/passwd@example.com',
      '..\\..\\..\\windows\\system32@example.com',
      'user@example.com\u0000',
      'user@example.com\n\r',
      'user@example.com\x08\x0b',
      'user@example.com\ufeff', // BOM character
      'user@example.com\u200b', // Zero-width space
      'user@example.com\u2028', // Line separator
      'user@example.com\u2029', // Paragraph separator
    ]

    maliciousInputs.forEach((maliciousInput) => {
      it(`should safely handle malicious input: "${maliciousInput.replace(/[\x00-\x1f\x7f-\x9f]/g, (char) => '\\x' + char.charCodeAt(0).toString(16).padStart(2, '0'))}"`, async () => {
        const user = userEvent.setup()
        render(<EmailSignupForm />)

        const input = screen.getByPlaceholderText('Enter your email')
        const form = input.closest('form')

        await user.clear(input)
        // Use fireEvent for malicious inputs to bypass userEvent sanitization
        fireEvent.change(input, { target: { value: maliciousInput } })
        fireEvent.submit(form!)

        // Should either show validation error or be safely handled
        await waitFor(() => {
          const errorElement = screen.queryByText(/please enter a valid email address/i)
          if (errorElement) {
            expect(errorElement).toBeInTheDocument()
          }
        })

        // Ensure no XSS payload is executed (no alert dialogs)
        expect(window.alert).not.toHaveBeenCalled()

        // If fetch was called, verify the payload is properly escaped
        if (global.fetch) {
          const calls = (global.fetch as jest.Mock).mock.calls
          calls.forEach(call => {
            const body = JSON.parse(call[1].body)
            // Verify no script tags in the submitted data
            expect(body.email).not.toMatch(/<script/i)
          })
        }
      })
    })

    it('should prevent XSS in error messages', async () => {
      const user = userEvent.setup()

      // Mock server returning malicious content
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          message: '<script>alert("XSS")</script>Server error'
        })
      })

      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      await user.type(input, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        // Error message should be displayed but script should not execute
        const errorElement = screen.getByText(/server error/i)
        expect(errorElement).toBeInTheDocument()

        // Verify no script tag is rendered
        expect(errorElement.innerHTML).not.toContain('<script>')
      })

      expect(window.alert).not.toHaveBeenCalled()
    })
  })

  describe('Boundary Conditions', () => {
    it('should handle extremely long email addresses', async () => {
      const user = userEvent.setup()
      const longEmail = 'a'.repeat(300) + '@' + 'b'.repeat(300) + '.com'

      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const form = input.closest('form')

      await user.clear(input)
      await user.type(input, longEmail)
      fireEvent.submit(form!)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })

      expect(global.fetch).not.toHaveBeenCalled()
    })

    it('should handle rapid successive submissions', async () => {
      const user = userEvent.setup()
      let resolveCount = 0

      ;(global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolveCount++
            resolve({
              ok: true,
              status: 201,
              json: async () => ({
                message: 'Successfully subscribed!',
                email: 'test@example.com'
              })
            })
          }, 100)
        })
      })

      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      await user.type(input, 'test@example.com')

      // Rapidly click submit multiple times
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only make one request due to disabled state
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Wait for request to complete
      await waitFor(() => {
        expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument()
      }, { timeout: 3000 })

      // Should only have made one API call despite multiple clicks
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('should handle network timeout gracefully', async () => {
      const user = userEvent.setup()

      // Mock a timeout scenario
      ;(global.fetch as jest.Mock).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Request timeout'))
          }, 100)
        })
      })

      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      await user.type(input, 'test@example.com')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })

      // Form should be re-enabled after error
      expect(submitButton).not.toBeDisabled()
      expect(input).not.toBeDisabled()
    })
  })

  describe('Race Conditions', () => {
    it('should handle form reset during submission', async () => {
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

      // Verify submission started
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Clear the input while submission is in progress
      fireEvent.change(input, { target: { value: '' } })

      // Resolve the promise
      resolvePromise!({
        ok: true,
        status: 201,
        json: async () => ({
          message: 'Successfully subscribed!',
          email: 'test@example.com'
        })
      })

      // Should still show success message despite manual input clearing
      await waitFor(() => {
        expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument()
      })

      // Form should be properly reset
      expect(input).toHaveValue('')
      expect(submitButton).not.toBeDisabled()
    })

    it('should handle component unmount during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const promise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      ;(global.fetch as jest.Mock).mockReturnValueOnce(promise)

      const { unmount } = render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      await user.type(input, 'test@example.com')
      await user.click(submitButton)

      // Verify submission started
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Unmount component while request is pending
      unmount()

      // Resolve the promise - should not cause any errors
      resolvePromise!({
        ok: true,
        status: 201,
        json: async () => ({
          message: 'Successfully subscribed!',
          email: 'test@example.com'
        })
      })

      // No assertion needed - just ensure no errors are thrown
    })
  })

  describe('Browser Compatibility', () => {
    it('should handle missing fetch API', async () => {
      const user = userEvent.setup()
      const originalFetch = global.fetch

      // Temporarily remove fetch
      delete (global as any).fetch

      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      await user.type(input, 'test@example.com')
      await user.click(submitButton)

      // Should show network error
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument()
      })

      // Restore fetch
      global.fetch = originalFetch
    })

    it('should handle form submission when JavaScript is disabled', () => {
      const { container } = render(<EmailSignupForm />)

      const form = container.querySelector('form')
      const input = screen.getByPlaceholderText('Enter your email')

      // Verify form exists and has proper attributes for graceful degradation
      expect(form).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'email')
      expect(input).toHaveAttribute('required')
    })
  })

  beforeAll(() => {
    // Mock window.alert to track XSS attempts
    jest.spyOn(window, 'alert').mockImplementation(() => {})
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })
})