import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { IMClient } from '../client/IMClient'
import type { IMClientConfig, ChatSendToOneRequest } from '../types'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {
    // 模拟异步连接
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    // 模拟发送消息
    console.log('Mock WebSocket send:', data)
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.(new CloseEvent('close'))
  }
}

// 设置全局WebSocket mock
global.WebSocket = MockWebSocket as any

describe('IMClient', () => {
  let imClient: IMClient
  let config: IMClientConfig

  beforeEach(() => {
    config = {
      wsUrl: 'ws://localhost:8080/ws',
      token: 'test-token',
      userId: 123,
      reconnect: {
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 1000
      },
      heartbeat: {
        interval: 1000,
        timeout: 500
      }
    }
    
    imClient = new IMClient(config)
  })

  afterEach(async () => {
    if (imClient) {
      await imClient.disconnect()
      imClient.destroy()
    }
  })

  describe('构造函数', () => {
    it('应该正确初始化配置', () => {
      expect(imClient).toBeDefined()
      expect(imClient.getConnectionState().status).toBe('DISCONNECTED')
    })

    it('应该验证必需的配置参数', () => {
      expect(() => {
        new IMClient({} as IMClientConfig)
      }).toThrow()
    })
  })

  describe('连接管理', () => {
    it('应该能够成功连接', async () => {
      const connectSpy = vi.fn()
      imClient.setCallbacks({ connected: connectSpy })

      await imClient.connect()
      
      // 等待异步连接完成
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(connectSpy).toHaveBeenCalled()
      expect(imClient.getConnectionState().status).toBe('CONNECTED')
    })

    it('应该能够断开连接', async () => {
      const disconnectSpy = vi.fn()
      imClient.setCallbacks({ disconnected: disconnectSpy })

      await imClient.connect()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      await imClient.disconnect()
      
      expect(disconnectSpy).toHaveBeenCalled()
      expect(imClient.getConnectionState().status).toBe('DISCONNECTED')
    })

    it('应该处理连接错误', async () => {
      const errorSpy = vi.fn()
      imClient.setCallbacks({ error: errorSpy })

      // 模拟连接错误
      const originalWebSocket = global.WebSocket
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          setTimeout(() => {
            this.onerror?.(new Event('error'))
          }, 10)
        }
      } as any

      try {
        await imClient.connect()
        await new Promise(resolve => setTimeout(resolve, 50))
        
        expect(errorSpy).toHaveBeenCalled()
      } finally {
        global.WebSocket = originalWebSocket
      }
    })
  })

  describe('消息发送', () => {
    beforeEach(async () => {
      await imClient.connect()
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    it('应该能够发送消息', async () => {
      const request: ChatSendToOneRequest = {
        toUserId: 456,
        content: 'Hello, World!',
        messageType: 'text'
      }

      await expect(imClient.sendMessage(request)).resolves.not.toThrow()
    })

    it('应该验证消息参数', async () => {
      const invalidRequest = {
        toUserId: 0, // 无效的用户ID
        content: '',  // 空内容
      } as ChatSendToOneRequest

      await expect(imClient.sendMessage(invalidRequest)).rejects.toThrow()
    })

    it('应该处理发送失败', async () => {
      const messageFailed = vi.fn()
      imClient.setCallbacks({ messageFailed })

      // 先断开连接
      await imClient.disconnect()

      const request: ChatSendToOneRequest = {
        toUserId: 456,
        content: 'Hello, World!'
      }

      await expect(imClient.sendMessage(request)).rejects.toThrow()
    })
  })

  describe('事件回调', () => {
    it('应该能够设置和触发回调', async () => {
      const callbacks = {
        connected: vi.fn(),
        disconnected: vi.fn(),
        messageReceived: vi.fn(),
        error: vi.fn()
      }

      imClient.setCallbacks(callbacks)

      await imClient.connect()
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(callbacks.connected).toHaveBeenCalled()

      await imClient.disconnect()
      expect(callbacks.disconnected).toHaveBeenCalled()
    })

    it('应该能够更新回调', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      imClient.setCallbacks({ connected: callback1 })
      imClient.setCallbacks({ connected: callback2 })

      // 第二个回调应该覆盖第一个
      expect(imClient['callbacks'].connected).toBe(callback2)
    })
  })

  describe('会话管理', () => {
    beforeEach(async () => {
      await imClient.connect()
      await new Promise(resolve => setTimeout(resolve, 50))
    })

    it('应该能够获取或创建会话', async () => {
      const session = await imClient.getOrCreateSession(1, 123, 456)
      
      expect(session).toBeDefined()
      expect(session.bookId).toBe(1)
      expect(session.buyerId).toBe(123)
      expect(session.sellerId).toBe(456)
    })

    it('应该能够缓存会话', async () => {
      const session = await imClient.getOrCreateSession(1, 123, 456)
      
      // 从缓存获取会话
      const cachedSession = imClient.getCachedSession(session.id)
      expect(cachedSession).toEqual(session)
    })

    it('应该能够获取所有缓存的会话', async () => {
      await imClient.getOrCreateSession(1, 123, 456)
      await imClient.getOrCreateSession(2, 123, 789)
      
      const allSessions = imClient.getAllCachedSessions()
      expect(allSessions).toHaveLength(2)
    })
  })

  describe('令牌管理', () => {
    it('应该能够更新访问令牌', () => {
      const newToken = 'new-test-token'
      
      expect(() => {
        imClient.updateAccessToken(newToken)
      }).not.toThrow()
    })

    it('应该验证令牌格式', () => {
      expect(() => {
        imClient.updateAccessToken('')
      }).toThrow()
    })
  })

  describe('连接状态', () => {
    it('应该正确报告连接状态', () => {
      const initialState = imClient.getConnectionState()
      expect(initialState.status).toBe('DISCONNECTED')
      expect(initialState.reconnectAttempts).toBe(0)
    })

    it('应该在连接后更新状态', async () => {
      await imClient.connect()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const connectedState = imClient.getConnectionState()
      expect(connectedState.status).toBe('CONNECTED')
      expect(connectedState.lastConnectTime).toBeDefined()
    })
  })

  describe('资源清理', () => {
    it('应该能够正确销毁客户端', async () => {
      await imClient.connect()
      await new Promise(resolve => setTimeout(resolve, 50))
      
      expect(() => {
        imClient.destroy()
      }).not.toThrow()
      
      const finalState = imClient.getConnectionState()
      expect(finalState.status).toBe('DISCONNECTED')
    })
  })
})

describe('IMClient 集成测试', () => {
  let imClient: IMClient
  let config: IMClientConfig

  beforeEach(() => {
    config = {
      wsUrl: 'ws://localhost:8080/ws',
      token: 'test-token',
      userId: 123
    }
    
    imClient = new IMClient(config)
  })

  afterEach(async () => {
    if (imClient) {
      await imClient.disconnect()
      imClient.destroy()
    }
  })

  it('应该完成完整的连接-发送消息-断开流程', async () => {
    const events: string[] = []
    
    imClient.setCallbacks({
      connected: () => events.push('connected'),
      authenticated: () => events.push('authenticated'),
      messageSent: () => events.push('messageSent'),
      disconnected: () => events.push('disconnected')
    })

    // 连接
    await imClient.connect()
    await new Promise(resolve => setTimeout(resolve, 50))

    // 发送消息
    await imClient.sendMessage({
      toUserId: 456,
      content: 'Integration test message'
    })

    // 断开连接
    await imClient.disconnect()

    expect(events).toContain('connected')
    expect(events).toContain('disconnected')
  })
})