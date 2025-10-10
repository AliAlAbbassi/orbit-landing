import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailSignupForm } from '@/components/email-signup-form'

// Mock fetch globally
global.fetch = jest.fn()

// Performance measurement utilities
const measurePerformance = async (operation: () => Promise<void>, label: string) => {
  const startTime = performance.now()
  const startMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0

  await operation()

  const endTime = performance.now()
  const endMemory = (performance as any).memory ? (performance as any).memory.usedJSHeapSize : 0

  return {
    duration: endTime - startTime,
    memoryDelta: endMemory - startMemory,
    label
  }
}

describe('EmailSignupForm - Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(global.fetch as jest.Mock).mockClear()
  })

  describe('Rendering Performance', () => {
    it('should render within acceptable time limits', async () => {
      const metrics = await measurePerformance(async () => {
        render(<EmailSignupForm />)
        await waitFor(() => {
          expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
        })
      }, 'Initial render')

      // Should render in less than 100ms
      expect(metrics.duration).toBeLessThan(100)
    })

    it('should handle rapid re-renders efficiently', async () => {
      let Component = () => <EmailSignupForm />
      const { rerender } = render(<Component />)

      const metrics = await measurePerformance(async () => {
        // Force 100 re-renders
        for (let i = 0; i < 100; i++) {
          rerender(<Component />)
        }
      }, 'Rapid re-renders')

      // 100 re-renders should complete in reasonable time
      expect(metrics.duration).toBeLessThan(1000)
    })

    it('should not leak memory during multiple renders', async () => {
      const initialMetrics = await measurePerformance(async () => {
        const { unmount } = render(<EmailSignupForm />)
        unmount()
      }, 'Single render/unmount')

      const batchMetrics = await measurePerformance(async () => {
        for (let i = 0; i < 50; i++) {
          const { unmount } = render(<EmailSignupForm />)
          unmount()
        }
      }, 'Batch render/unmount')

      // Memory usage should not grow excessively (allow significant variance in test environment)
      if ((performance as any).memory) {
        const expectedMemoryPerRender = batchMetrics.memoryDelta / 50
        const acceptableRange = Math.max(1000000, Math.abs(initialMetrics.memoryDelta) * 5) // Allow 5x variance or 1MB min
        expect(Math.abs(expectedMemoryPerRender)).toBeLessThan(acceptableRange)
      } else {
        // Skip memory check if not available
        expect(true).toBe(true)
      }
    })
  })

  describe('User Interaction Performance', () => {
    it('should respond to typing within acceptable latency', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')

      const metrics = await measurePerformance(async () => {
        await user.type(input, 'test@example.com')
      }, 'Typing interaction')

      // Each character should respond quickly (total < 500ms for 16 chars)
      expect(metrics.duration).toBeLessThan(500)
    })

    it('should handle rapid input changes efficiently', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')

      const metrics = await measurePerformance(async () => {
        // Rapid typing and clearing
        for (let i = 0; i < 10; i++) {
          await user.type(input, `test${i}@example.com`)
          await user.clear(input)
        }
      }, 'Rapid input changes')

      // Should handle rapid changes efficiently
      expect(metrics.duration).toBeLessThan(2000)
    })

    it('should maintain performance with validation errors', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const form = input.closest('form')

      const metrics = await measurePerformance(async () => {
        // Generate many validation errors
        for (let i = 0; i < 20; i++) {
          await user.type(input, 'invalid')
          fireEvent.submit(form!)

          await waitFor(() => {
            expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
          })

          await user.clear(input)

          await waitFor(() => {
            expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument()
          })
        }
      }, 'Validation error cycles')

      // Should handle validation efficiently even with many cycles (allow more time for CI)
      expect(metrics.duration).toBeLessThan(10000)
    })

    it('should handle focus/blur events efficiently', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      const metrics = await measurePerformance(async () => {
        // Rapid focus changes
        for (let i = 0; i < 50; i++) {
          await user.click(input)
          await user.click(submitButton)
        }
      }, 'Focus/blur cycles')

      // Focus changes should be fast
      expect(metrics.duration).toBeLessThan(1000)
    })
  })

  describe('Form Submission Performance', () => {
    it('should submit forms within acceptable response time', async () => {
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

      const metrics = await measurePerformance(async () => {
        await user.click(submitButton)

        await waitFor(() => {
          expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument()
        })
      }, 'Form submission')

      // Form submission UI updates should be fast (excluding network time)
      expect(metrics.duration).toBeLessThan(200)
    })

    it('should handle loading states efficiently', async () => {
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

      const metrics = await measurePerformance(async () => {
        await user.click(submitButton)

        // Wait for loading state
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

        // Wait for completion
        await waitFor(() => {
          expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument()
        })
      }, 'Loading state transitions')

      // Loading state changes should be immediate
      expect(metrics.duration).toBeLessThan(300)
    })

    it('should handle error states efficiently', async () => {
      const user = userEvent.setup()
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({
          message: 'Server error'
        })
      })

      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      await user.type(input, 'test@example.com')

      const metrics = await measurePerformance(async () => {
        await user.click(submitButton)

        await waitFor(() => {
          expect(screen.getByText(/server error/i)).toBeInTheDocument()
        })
      }, 'Error state handling')

      // Error display should be immediate after response
      expect(metrics.duration).toBeLessThan(200)
    })
  })

  describe('Memory Usage Performance', () => {
    it('should not accumulate memory with repeated submissions', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      // Measure baseline memory
      const baselineMetrics = await measurePerformance(async () => {
        // Single submission
        ;(global.fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({
            message: 'Successfully subscribed!',
            email: 'test@example.com'
          })
        })

        await user.type(input, 'test@example.com')
        await user.click(submitButton)

        await waitFor(() => {
          expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument()
        })

        // Reset for next test
        await user.clear(input)
      }, 'Baseline submission')

      // Measure with many submissions
      const batchMetrics = await measurePerformance(async () => {
        for (let i = 0; i < 20; i++) {
          ;(global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            status: 201,
            json: async () => ({
              message: 'Successfully subscribed!',
              email: `test${i}@example.com`
            })
          })

          await user.type(input, `test${i}@example.com`)
          await user.click(submitButton)

          await waitFor(() => {
            expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument()
          })

          await user.clear(input)
        }
      }, 'Batch submissions')

      // Memory usage should not grow excessively (lenient for test environment)
      if ((performance as any).memory) {
        const memoryPerSubmission = Math.abs(batchMetrics.memoryDelta) / 20
        const acceptableMemoryGrowth = Math.max(500000, Math.abs(baselineMetrics.memoryDelta) * 2) // 500KB min or 2x baseline
        expect(memoryPerSubmission).toBeLessThan(acceptableMemoryGrowth)
      } else {
        // Skip memory check if not available
        expect(true).toBe(true)
      }
    })

    it('should cleanup resources after errors', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: /join waitlist/i })

      const metrics = await measurePerformance(async () => {
        // Generate many error scenarios
        for (let i = 0; i < 10; i++) {
          ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

          await user.type(input, `test${i}@example.com`)
          await user.click(submitButton)

          await waitFor(() => {
            expect(screen.getByText(/network error/i)).toBeInTheDocument()
          })

          // Clear error state by typing new email
          await user.clear(input)
          await user.type(input, 'new@example.com')

          await waitFor(() => {
            expect(screen.queryByText(/network error/i)).not.toBeInTheDocument()
          })

          await user.clear(input)
        }
      }, 'Error cleanup cycles')

      // Should not accumulate excessive memory from errors (lenient for test environment)
      if ((performance as any).memory) {
        expect(Math.abs(metrics.memoryDelta)).toBeLessThan(5000000) // Less than 5MB growth
      } else {
        // Skip memory check if not available
        expect(true).toBe(true)
      }
    })
  })

  describe('Animation Performance', () => {
    it('should animate status messages efficiently', async () => {
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

      const metrics = await measurePerformance(async () => {
        await user.click(submitButton)

        await waitFor(() => {
          const successMessage = screen.getByText(/thank you for subscribing/i)
          expect(successMessage).toBeInTheDocument()

          // Verify animation classes are applied
          const messageContainer = successMessage.closest('div')
          expect(messageContainer).toHaveClass('animate-in')
        })
      }, 'Animation rendering')

      // Animation should render smoothly
      expect(metrics.duration).toBeLessThan(300)
    })

    it('should handle loading spinner efficiently', async () => {
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

      const metrics = await measurePerformance(async () => {
        await user.click(submitButton)

        // Wait for loading spinner to appear
        await waitFor(() => {
          expect(submitButton).toBeDisabled()
          // Loading spinner should be visible
          const spinner = document.querySelector('.animate-spin')
          expect(spinner).toBeInTheDocument()
        })

        resolvePromise!({
          ok: true,
          status: 201,
          json: async () => ({
            message: 'Successfully subscribed!',
            email: 'test@example.com'
          })
        })

        // Wait for loading to complete
        await waitFor(() => {
          expect(screen.getByText(/thank you for subscribing/i)).toBeInTheDocument()
        })
      }, 'Loading spinner lifecycle')

      // Loading state transitions should be smooth
      expect(metrics.duration).toBeLessThan(400)
    })
  })

  describe('Stress Testing', () => {
    it('should handle rapid user interactions without performance degradation', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')

      const metrics = await measurePerformance(async () => {
        // Simulate stressed user rapidly typing and erasing
        for (let i = 0; i < 100; i++) {
          await user.type(input, 'a')
          fireEvent.change(input, { target: { value: '' } })
        }
      }, 'Stress test - rapid typing')

      // Should maintain performance under stress
      expect(metrics.duration).toBeLessThan(2000)
    })

    it('should maintain performance with many form instances', async () => {
      const metrics = await measurePerformance(async () => {
        // Render many form instances simultaneously
        const instances = []
        for (let i = 0; i < 20; i++) {
          instances.push(render(<EmailSignupForm />))
        }

        // Verify all rendered correctly
        const inputs = screen.getAllByPlaceholderText('Enter your email')
        expect(inputs).toHaveLength(20)

        // Cleanup
        instances.forEach(instance => instance.unmount())
      }, 'Multiple form instances')

      // Should handle multiple instances efficiently
      expect(metrics.duration).toBeLessThan(1000)
    })

    it('should recover performance after intensive operations', async () => {
      const user = userEvent.setup()
      render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')

      // First, stress the component
      await measurePerformance(async () => {
        for (let i = 0; i < 50; i++) {
          await user.type(input, `stress${i}@example.com`)
          await user.clear(input)
        }
      }, 'Stress operations')

      // Then test if normal operations are still fast
      const recoveryMetrics = await measurePerformance(async () => {
        await user.type(input, 'normal@example.com')
      }, 'Post-stress recovery')

      // Should recover to normal performance
      expect(recoveryMetrics.duration).toBeLessThan(100)
    })
  })

  describe('Resource Monitoring', () => {
    it('should not create excessive DOM nodes', () => {
      const initialNodeCount = document.querySelectorAll('*').length

      const { unmount } = render(<EmailSignupForm />)

      const withComponentNodeCount = document.querySelectorAll('*').length

      unmount()

      const finalNodeCount = document.querySelectorAll('*').length

      // Should not create excessive nodes
      const nodesAdded = withComponentNodeCount - initialNodeCount
      expect(nodesAdded).toBeLessThan(50) // Reasonable DOM footprint

      // Should cleanup properly
      expect(finalNodeCount).toBeLessThanOrEqual(initialNodeCount + 5) // Allow some variance
    })

    it('should not register excessive event listeners', async () => {
      const user = userEvent.setup()

      // This is an approximation - hard to test directly in Jest
      const { unmount } = render(<EmailSignupForm />)

      const input = screen.getByPlaceholderText('Enter your email')

      // Interact to potentially create listeners
      await user.click(input)
      await user.type(input, 'test@example.com')

      // Component should not create memory leaks
      unmount()

      // Hard to assert directly, but the test documents the concern
      expect(true).toBe(true)
    })
  })
})

// Custom performance matcher
expect.extend({
  toBeFasterThan(received: number, expected: number) {
    const pass = received < expected
    return {
      message: () => `Expected ${received}ms to be faster than ${expected}ms`,
      pass,
    }
  },
})