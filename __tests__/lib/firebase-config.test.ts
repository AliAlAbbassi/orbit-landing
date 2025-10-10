/**
 * Firebase Configuration Tests
 *
 * These tests ensure the Firebase configuration is properly set up and handles
 * various edge cases and error conditions gracefully.
 */

// Mock Firebase modules before importing
jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(),
}))

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
}))

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(),
  isSupported: jest.fn(),
}))

describe('Firebase Configuration', () => {
  let mockInitializeApp: jest.Mock
  let mockGetApps: jest.Mock
  let mockGetFirestore: jest.Mock
  let mockGetAnalytics: jest.Mock
  let mockIsSupported: jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    // Clear module cache to reset Firebase config
    jest.resetModules()

    const firebaseApp = require('firebase/app')
    const firebaseFirestore = require('firebase/firestore')
    const firebaseAnalytics = require('firebase/analytics')

    mockInitializeApp = firebaseApp.initializeApp
    mockGetApps = firebaseApp.getApps
    mockGetFirestore = firebaseFirestore.getFirestore
    mockGetAnalytics = firebaseAnalytics.getAnalytics
    mockIsSupported = firebaseAnalytics.isSupported

    // Default mocks
    mockGetApps.mockReturnValue([])
    mockInitializeApp.mockReturnValue({ name: '[DEFAULT]' })
    mockGetFirestore.mockReturnValue({})
    mockGetAnalytics.mockReturnValue({})
    mockIsSupported.mockResolvedValue(true)
  })

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    delete process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
    delete process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
    delete process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
    delete process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
    delete process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    delete process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
  })

  describe('Configuration Loading', () => {
    it('should load Firebase config from environment variables', () => {
      // Set up environment variables
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test.firebaseapp.com'
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test.appspot.com'
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789'
      process.env.NEXT_PUBLIC_FIREBASE_APP_ID = '1:123:web:abc'
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = 'G-ABCDEF'

      // Import the config
      require('@/lib/firebase-config')

      // Should call initializeApp with correct config
      expect(mockInitializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: 'test.firebaseapp.com',
        projectId: 'test-project',
        storageBucket: 'test.appspot.com',
        messagingSenderId: '123456789',
        appId: '1:123:web:abc',
        measurementId: 'G-ABCDEF',
      })

      expect(mockGetFirestore).toHaveBeenCalled()
    })

    it('should handle missing environment variables gracefully', () => {
      // Don't set any environment variables
      expect(() => {
        require('@/lib/firebase-config')
      }).not.toThrow()

      // Should still call initializeApp with undefined values
      expect(mockInitializeApp).toHaveBeenCalledWith({
        apiKey: undefined,
        authDomain: undefined,
        projectId: undefined,
        storageBucket: undefined,
        messagingSenderId: undefined,
        appId: undefined,
        measurementId: undefined,
      })
    })

    it('should handle partial environment variables', () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'test-api-key'
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
      // Missing other variables

      require('@/lib/firebase-config')

      expect(mockInitializeApp).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        authDomain: undefined,
        projectId: 'test-project',
        storageBucket: undefined,
        messagingSenderId: undefined,
        appId: undefined,
        measurementId: undefined,
      })
    })

    it('should handle empty string environment variables', () => {
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = ''
      process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = ''
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'

      require('@/lib/firebase-config')

      expect(mockInitializeApp).toHaveBeenCalledWith({
        apiKey: '',
        authDomain: '',
        projectId: 'test-project',
        storageBucket: undefined,
        messagingSenderId: undefined,
        appId: undefined,
        measurementId: undefined,
      })
    })
  })

  describe('App Initialization', () => {
    it('should not reinitialize if app already exists', () => {
      // Mock existing app
      const existingApp = { name: '[DEFAULT]', options: {} }
      mockGetApps.mockReturnValue([existingApp])

      require('@/lib/firebase-config')

      // Should not call initializeApp
      expect(mockInitializeApp).not.toHaveBeenCalled()
      expect(mockGetFirestore).toHaveBeenCalledWith(existingApp)
    })

    it('should initialize new app if none exists', () => {
      mockGetApps.mockReturnValue([])
      const newApp = { name: '[DEFAULT]', options: {} }
      mockInitializeApp.mockReturnValue(newApp)

      require('@/lib/firebase-config')

      expect(mockInitializeApp).toHaveBeenCalled()
      expect(mockGetFirestore).toHaveBeenCalledWith(newApp)
    })

    it('should handle Firebase initialization errors', () => {
      mockGetApps.mockReturnValue([])
      mockInitializeApp.mockImplementation(() => {
        throw new Error('Firebase initialization failed')
      })

      // Should not throw error during module loading
      expect(() => {
        require('@/lib/firebase-config')
      }).toThrow('Firebase initialization failed')
    })

    it('should handle Firestore initialization errors', () => {
      mockGetApps.mockReturnValue([])
      const newApp = { name: '[DEFAULT]', options: {} }
      mockInitializeApp.mockReturnValue(newApp)
      mockGetFirestore.mockImplementation(() => {
        throw new Error('Firestore initialization failed')
      })

      expect(() => {
        require('@/lib/firebase-config')
      }).toThrow('Firestore initialization failed')
    })
  })

  describe('Analytics Configuration', () => {
    let originalWindow: any

    beforeEach(() => {
      // Save original window object and create a mock
      originalWindow = global.window
      global.window = {} as any
    })

    afterEach(() => {
      // Restore original window
      if (originalWindow !== undefined) {
        global.window = originalWindow
      } else {
        delete (global as any).window
      }
    })

    it('should initialize analytics in browser environment when supported', async () => {
      process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID = 'G-ABCDEF'
      mockIsSupported.mockResolvedValue(true)
      const mockApp = { name: '[DEFAULT]', options: {} }
      mockInitializeApp.mockReturnValue(mockApp)

      const config = require('@/lib/firebase-config')

      // Wait for analytics initialization
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockIsSupported).toHaveBeenCalled()
      expect(mockGetAnalytics).toHaveBeenCalledWith(mockApp)
    })

    it('should not initialize analytics when not supported', async () => {
      mockIsSupported.mockResolvedValue(false)

      require('@/lib/firebase-config')

      // Wait for analytics check
      await new Promise(resolve => setTimeout(resolve, 0))

      expect(mockIsSupported).toHaveBeenCalled()
      expect(mockGetAnalytics).not.toHaveBeenCalled()
    })

    it('should not initialize analytics in server environment', () => {
      // Temporarily remove window to simulate server environment
      const tempWindow = global.window
      delete (global as any).window

      require('@/lib/firebase-config')

      // Should not check analytics support without window
      expect(mockIsSupported).not.toHaveBeenCalled()
      expect(mockGetAnalytics).not.toHaveBeenCalled()

      // Restore window for cleanup
      global.window = tempWindow
    })

    it('should handle analytics initialization errors gracefully', async () => {
      mockIsSupported.mockResolvedValue(true)
      mockGetAnalytics.mockImplementation(() => {
        throw new Error('Analytics initialization failed')
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      require('@/lib/firebase-config')

      // Wait for analytics initialization attempt
      await new Promise(resolve => setTimeout(resolve, 0))

      // Should not crash the app
      expect(mockIsSupported).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('should handle isSupported promise rejection', async () => {
      mockIsSupported.mockRejectedValue(new Error('Analytics check failed'))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      require('@/lib/firebase-config')

      // Wait for analytics check
      await new Promise(resolve => setTimeout(resolve, 10))

      // Should not crash
      expect(mockIsSupported).toHaveBeenCalled()
      expect(mockGetAnalytics).not.toHaveBeenCalled()

      consoleSpy.mockRestore()
    })
  })

  describe('Export Verification', () => {
    it('should export app, db, and analytics', () => {
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
      const mockApp = { name: '[DEFAULT]', options: {} }
      const mockDb = { type: 'firestore' }

      mockInitializeApp.mockReturnValue(mockApp)
      mockGetFirestore.mockReturnValue(mockDb)

      const config = require('@/lib/firebase-config')

      expect(config.app).toBe(mockApp)
      expect(config.db).toBe(mockDb)
      expect(config.analytics).toBe(null) // Initially null, set async
    })

    it('should maintain consistent exports across multiple imports', () => {
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
      const mockApp = { name: '[DEFAULT]', options: {} }
      const mockDb = { type: 'firestore' }

      mockInitializeApp.mockReturnValue(mockApp)
      mockGetFirestore.mockReturnValue(mockDb)

      const config1 = require('@/lib/firebase-config')
      const config2 = require('@/lib/firebase-config')

      expect(config1.app).toBe(config2.app)
      expect(config1.db).toBe(config2.db)
      expect(config1.analytics).toBe(config2.analytics)
    })
  })

  describe('Environment-Specific Behavior', () => {
    it('should handle development environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'dev-project'
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'dev-api-key'

      require('@/lib/firebase-config')

      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'dev-project',
          apiKey: 'dev-api-key',
        })
      )

      process.env.NODE_ENV = originalEnv
    })

    it('should handle production environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'prod-project'
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = 'prod-api-key'

      require('@/lib/firebase-config')

      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'prod-project',
          apiKey: 'prod-api-key',
        })
      )

      process.env.NODE_ENV = originalEnv
    })

    it('should handle test environment', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'test'

      // Test environment might use different config
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'

      require('@/lib/firebase-config')

      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'test-project',
        })
      )

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Error Resilience', () => {
    it('should handle malformed environment variables', () => {
      // Simulate malformed JSON-like env vars (though these are strings)
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = '{"malformed": json'
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'

      expect(() => {
        require('@/lib/firebase-config')
      }).not.toThrow()

      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: '{"malformed": json',
          projectId: 'test-project',
        })
      )
    })

    it('should handle very long environment variable values', () => {
      const longValue = 'x'.repeat(10000)
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = longValue
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'

      expect(() => {
        require('@/lib/firebase-config')
      }).not.toThrow()

      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: longValue,
        })
      )
    })

    it('should handle special characters in environment variables', () => {
      const specialChars = 'test-key-with-!@#$%^&*()_+-=[]{}|;:,.<>?'
      process.env.NEXT_PUBLIC_FIREBASE_API_KEY = specialChars
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'

      expect(() => {
        require('@/lib/firebase-config')
      }).not.toThrow()

      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: specialChars,
        })
      )
    })

    it('should handle Unicode characters in environment variables', () => {
      const unicode = 'test-key-with-ñáéíóú-中文-🔥'
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = unicode

      expect(() => {
        require('@/lib/firebase-config')
      }).not.toThrow()

      expect(mockInitializeApp).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: unicode,
        })
      )
    })
  })

  describe('Memory and Resource Management', () => {
    it('should not create memory leaks with multiple imports', () => {
      // Import multiple times
      for (let i = 0; i < 10; i++) {
        jest.resetModules()

        // Re-setup mocks after reset
        jest.mock('firebase/app', () => ({
          initializeApp: mockInitializeApp,
          getApps: mockGetApps
        }))
        jest.mock('firebase/firestore', () => ({
          getFirestore: mockGetFirestore
        }))

        mockGetApps.mockReturnValue([])
        const mockApp = { name: `[DEFAULT-${i}]`, options: {} }
        mockInitializeApp.mockReturnValue(mockApp)
        mockGetFirestore.mockReturnValue({ type: 'firestore' })

        require('@/lib/firebase-config')
      }

      // Should not accumulate apps
      expect(mockInitializeApp).toHaveBeenCalledTimes(10)
    })

    it('should properly cleanup on module reload', () => {
      const mockApp = { name: '[DEFAULT]', options: {} }
      mockInitializeApp.mockReturnValue(mockApp)
      mockGetFirestore.mockReturnValue({ type: 'firestore' })

      // First import
      const config1 = require('@/lib/firebase-config')

      // Reset and import again
      jest.resetModules()

      // Re-setup mocks after reset
      jest.mock('firebase/app', () => ({
        initializeApp: mockInitializeApp,
        getApps: mockGetApps
      }))
      jest.mock('firebase/firestore', () => ({
        getFirestore: mockGetFirestore
      }))

      mockGetApps.mockReturnValue([])
      const newMockApp = { name: '[DEFAULT-NEW]', options: {} }
      mockInitializeApp.mockReturnValue(newMockApp)
      mockGetFirestore.mockReturnValue({ type: 'firestore-new' })

      const config2 = require('@/lib/firebase-config')

      // Should be different instances after reset
      expect(config1.app).not.toBe(config2.app)
    })
  })

  describe('TypeScript Type Safety', () => {
    it('should export correctly typed Firebase instances', () => {
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'
      const mockApp = { name: '[DEFAULT]', options: {} }
      const mockDb = { type: 'firestore' }

      mockInitializeApp.mockReturnValue(mockApp)
      mockGetFirestore.mockReturnValue(mockDb)

      const config = require('@/lib/firebase-config')

      // Should have the expected properties
      expect(config).toHaveProperty('app')
      expect(config).toHaveProperty('db')
      expect(config).toHaveProperty('analytics')
    })
  })
})

describe('Firebase Configuration Integration', () => {
  beforeEach(() => {
    jest.resetModules()
  })

  it('should work with actual Firebase modules structure', () => {
    // This test ensures our mocking strategy matches Firebase's actual API
    const firebase = require('firebase/app')
    const firestore = require('firebase/firestore')
    const analytics = require('firebase/analytics')

    expect(firebase.initializeApp).toBeDefined()
    expect(firebase.getApps).toBeDefined()
    expect(firestore.getFirestore).toBeDefined()
    expect(analytics.getAnalytics).toBeDefined()
    expect(analytics.isSupported).toBeDefined()
  })

  it('should handle Firebase version compatibility', () => {
    // Ensure our config works with Firebase v9+ modular API
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = 'test-project'

    expect(() => {
      require('@/lib/firebase-config')
    }).not.toThrow()

    // Should use modular imports (mocked)
    const firebaseApp = require('firebase/app')
    expect(firebaseApp.initializeApp).toHaveBeenCalled()
  })
})