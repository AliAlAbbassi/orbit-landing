import { POST, GET } from '@/app/api/subscribe/route'

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: any, init?: ResponseInit) => ({
      status: init?.status || 200,
      json: () => Promise.resolve(body),
    }),
  },
}))

// Create a helper to create NextRequest-like objects
const createMockRequest = (url: string, options: any = {}) => {
  const headers = new Map(Object.entries(options.headers || {}))
  return {
    url,
    method: options.method || 'GET',
    headers: {
      get: (name: string) => headers.get(name.toLowerCase()) || null,
    },
    json: () => Promise.resolve(JSON.parse(options.body || '{}')),
  } as any
}

// Mock firebase-admin
jest.mock('firebase-admin/app', () => ({
  initializeApp: jest.fn(),
  getApps: jest.fn(() => []),
  cert: jest.fn(),
}))

jest.mock('firebase-admin/firestore', () => {
  const mockAdd = jest.fn()
  const mockGet = jest.fn()
  const mockWhere = jest.fn()
  const mockLimit = jest.fn()

  const mockCollection = {
    where: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    get: mockGet,
    add: mockAdd,
  }

  return {
    getFirestore: jest.fn(() => ({
      collection: jest.fn(() => mockCollection),
    })),
  }
})

describe('/api/subscribe', () => {
  let mockFirestore: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Get the mocked Firestore instance
    const { getFirestore } = require('firebase-admin/firestore')
    mockFirestore = getFirestore()
  })

  describe('POST', () => {
    it('should successfully subscribe a new email', async () => {
      // Mock no existing subscriber
      const mockCollection = mockFirestore.collection()
      mockCollection.get.mockResolvedValueOnce({ empty: true })
      mockCollection.add.mockResolvedValueOnce({ id: 'new-subscriber-id' })

      const request = createMockRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          source: 'test',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe('Successfully subscribed!')
      expect(data.email).toBe('test@example.com')
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
          source: 'test',
          status: 'active',
          subscribedAt: expect.any(String),
        })
      )
    })

    it('should reject duplicate email subscriptions', async () => {
      // Mock existing subscriber
      const mockCollection = mockFirestore.collection()
      mockCollection.get.mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'existing-subscriber' }]
      })

      const request = createMockRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'existing@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.message).toBe('Email already subscribed')
      expect(mockCollection.add).not.toHaveBeenCalled()
    })

    it('should validate email format', async () => {
      const request = createMockRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid email format')
      expect(data.errors).toBeDefined()
    })

    it('should handle missing email field', async () => {
      const request = createMockRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toBe('Invalid email format')
    })

    it('should convert email to lowercase', async () => {
      const mockCollection = mockFirestore.collection()
      mockCollection.get.mockResolvedValueOnce({ empty: true })
      mockCollection.add.mockResolvedValueOnce({ id: 'new-subscriber-id' })

      const request = createMockRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'TeSt@ExAmPlE.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.email).toBe('test@example.com')
      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@example.com',
        })
      )
    })

    it('should include IP address and user agent', async () => {
      const mockCollection = mockFirestore.collection()
      mockCollection.get.mockResolvedValueOnce({ empty: true })
      mockCollection.add.mockResolvedValueOnce({ id: 'new-subscriber-id' })

      const request = createMockRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await POST(request)
      await response.json()

      expect(mockCollection.add).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0 Test Browser',
        })
      )
    })

    it('should handle database errors gracefully', async () => {
      const mockCollection = mockFirestore.collection()
      mockCollection.get.mockRejectedValueOnce(new Error('Database connection failed'))

      const request = createMockRequest('http://localhost:3000/api/subscribe', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.message).toBe('Failed to subscribe. Please try again.')
    })
  })

  describe('GET', () => {
    it('should return method not allowed', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(405)
      expect(data.message).toBe('Method not allowed')
    })
  })
})