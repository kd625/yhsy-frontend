import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ReconnectManager, ReconnectState } from '../../utils/ReconnectManager'
import type { ReconnectConfig, ReconnectCallbacks } from '../../utils/ReconnectManager'

describe('ReconnectManager', () => {
  let reconnectManager: ReconnectManager
  let config: ReconnectConfig
  let mockReconnect: ReturnType<typeof vi.fn>
  let mockCallbacks: ReconnectCallbacks

  beforeEach(() => {
    vi.useFakeTimers()
    
    mockReconnect = vi.fn().mockResolvedValue(undefined)
    
    config = {
      maxAttempts: 3,
      initialDelay: 100,
      maxDelay: 1000,
      strategy: 'exponential',
      factor: 2,
      jitter: false
    }
    
    mockCallbacks = {
      onReconnectStart: vi.fn(),
      onReconnectSuccess: vi.fn(),
      onReconnectFailed: vi.fn(),
      onReconnectGiveUp: vi.fn()
    }
    
    reconnectManager = new ReconnectManager(config, mockReconnect, mockCallbacks)
  })

  afterEach(() => {
    reconnectManager.stop()
    vi.useRealTimers()
  })

  describe('构造函数', () => {
    it('应该正确初始化配置', () => {
      expect(reconnectManager).toBeDefined()
      expect(reconnectManager.getState()).toBe(ReconnectState.IDLE)
    })

    it('应该使用默认配置', () => {
      const defaultConfig: ReconnectConfig = {
        maxAttempts: 5,
        initialDelay: 1000,
        maxDelay: 30000,
        strategy: 'exponential',
        factor: 2,
        jitter: true
      }
      const defaultManager = new ReconnectManager(defaultConfig, mockReconnect)
      expect(defaultManager).toBeDefined()
    })
  })

  describe('重连逻辑', () => {
    it('应该在开始时进入连接状态', () => {
      reconnectManager.start()
      expect(reconnectManager.getState()).toBe(ReconnectState.CONNECTING)
    })

    it('应该按延迟进行重连尝试', async () => {
      reconnectManager.start()
      
      // 第一次重连尝试
      vi.advanceTimersByTime(100)
      expect(mockReconnect).toHaveBeenCalledTimes(1)
      expect(mockCallbacks.onReconnectStart).toHaveBeenCalledWith(1)
    })

    it('应该在重连成功时停止', () => {
      reconnectManager.start()
      
      vi.advanceTimersByTime(100)
      expect(mockReconnect).toHaveBeenCalledTimes(1)
      
      // 模拟重连成功
      reconnectManager.onSuccess()
      
      expect(reconnectManager.getState()).toBe(ReconnectState.CONNECTED)
      expect(mockCallbacks.onReconnectSuccess).toHaveBeenCalledWith(1)
    })

    it('应该在重连失败时继续尝试', () => {
      mockReconnect.mockRejectedValue(new Error('Connection failed'))
      
      reconnectManager.start()
      
      // 第一次尝试失败
      vi.advanceTimersByTime(100)
      expect(mockReconnect).toHaveBeenCalledTimes(1)
      
      reconnectManager.onFailure(new Error('Connection failed'))
      
      // 应该安排下一次重连
      vi.advanceTimersByTime(200) // 指数退避，第二次延迟应该是200ms
      expect(mockReconnect).toHaveBeenCalledTimes(2)
    })

    it('应该在达到最大重连次数时放弃', () => {
      mockReconnect.mockRejectedValue(new Error('Connection failed'))
      
      reconnectManager.start()
      
      // 进行3次重连尝试
      for (let i = 0; i < 3; i++) {
        const delay = 100 * Math.pow(2, i) // 指数退避
        vi.advanceTimersByTime(delay)
        reconnectManager.onFailure(new Error('Connection failed'))
      }
      
      expect(reconnectManager.getState()).toBe(ReconnectState.GAVE_UP)
      expect(mockCallbacks.onReconnectGiveUp).toHaveBeenCalledWith(3)
    })
  })

  describe('重连策略', () => {
    it('应该使用固定延迟策略', () => {
      const fixedConfig: ReconnectConfig = {
        ...config,
        strategy: 'fixed'
      }
      
      reconnectManager = new ReconnectManager(fixedConfig, mockReconnect, mockCallbacks)
      reconnectManager.start()
      
      // 每次重连都应该使用相同的延迟
      vi.advanceTimersByTime(100)
      reconnectManager.onFailure(new Error('Failed'))
      
      vi.advanceTimersByTime(100)
      reconnectManager.onFailure(new Error('Failed'))
      
      expect(mockReconnect).toHaveBeenCalledTimes(2)
    })

    it('应该使用线性延迟策略', () => {
      const linearConfig: ReconnectConfig = {
        ...config,
        strategy: 'linear'
      }
      
      reconnectManager = new ReconnectManager(linearConfig, mockReconnect, mockCallbacks)
      reconnectManager.start()
      
      // 第一次尝试
      vi.advanceTimersByTime(100)
      reconnectManager.onFailure(new Error('Failed'))
      
      // 第二次尝试，延迟应该增加
      vi.advanceTimersByTime(200)
      reconnectManager.onFailure(new Error('Failed'))
      
      expect(mockReconnect).toHaveBeenCalledTimes(2)
    })

    it('应该使用指数退避策略', () => {
      reconnectManager.start()
      
      // 第一次尝试
      vi.advanceTimersByTime(100)
      reconnectManager.onFailure(new Error('Failed'))
      
      // 第二次尝试，延迟应该翻倍
      vi.advanceTimersByTime(200)
      reconnectManager.onFailure(new Error('Failed'))
      
      // 第三次尝试，延迟应该再次翻倍
      vi.advanceTimersByTime(400)
      
      expect(mockReconnect).toHaveBeenCalledTimes(3)
    })

    it('应该限制最大延迟', () => {
      const longDelayConfig: ReconnectConfig = {
        ...config,
        maxDelay: 500,
        factor: 10 // 很大的因子
      }
      
      reconnectManager = new ReconnectManager(longDelayConfig, mockReconnect, mockCallbacks)
      reconnectManager.start()
      
      // 第一次尝试
      vi.advanceTimersByTime(100)
      reconnectManager.onFailure(new Error('Failed'))
      
      // 第二次尝试，延迟应该被限制在maxDelay
      vi.advanceTimersByTime(500)
      
      expect(mockReconnect).toHaveBeenCalledTimes(2)
    })
  })

  describe('状态管理', () => {
    it('应该正确报告当前状态', () => {
      expect(reconnectManager.getState()).toBe(ReconnectState.IDLE)
      
      reconnectManager.start()
      expect(reconnectManager.getState()).toBe(ReconnectState.CONNECTING)
      
      reconnectManager.onSuccess()
      expect(reconnectManager.getState()).toBe(ReconnectState.CONNECTED)
    })

    it('应该提供重连统计信息', () => {
      reconnectManager.start()
      
      vi.advanceTimersByTime(100)
      reconnectManager.onFailure(new Error('Failed'))
      
      vi.advanceTimersByTime(200)
      reconnectManager.onSuccess()
      
      const stats = reconnectManager.getStats()
      expect(stats.currentAttempt).toBe(2)
      expect(stats.state).toBe(ReconnectState.CONNECTED)
    })
  })

  describe('配置更新', () => {
    it('应该能够更新配置', () => {
      const newConfig: Partial<ReconnectConfig> = {
        maxAttempts: 5,
        initialDelay: 200
      }
      
      reconnectManager.updateConfig(newConfig)
      
      const stats = reconnectManager.getStats()
      expect(stats).toBeDefined()
    })
  })

  describe('错误处理', () => {
    it('应该处理重连函数抛出的错误', () => {
      mockReconnect.mockRejectedValue(new Error('Network error'))
      
      reconnectManager.start()
      
      vi.advanceTimersByTime(100)
      reconnectManager.onFailure(new Error('Network error'))
      
      expect(mockCallbacks.onReconnectFailed).toHaveBeenCalledWith(1, expect.any(Error))
    })

    it('应该防止重复启动', () => {
      reconnectManager.start()
      reconnectManager.start() // 第二次启动应该被忽略
      
      expect(reconnectManager.getState()).toBe(ReconnectState.CONNECTING)
    })
  })

  describe('停止和清理', () => {
    it('应该能够停止重连', () => {
      reconnectManager.start()
      expect(reconnectManager.getState()).toBe(ReconnectState.CONNECTING)
      
      reconnectManager.stop()
      expect(reconnectManager.getState()).toBe(ReconnectState.IDLE)
    })

    it('应该在停止后不再进行重连尝试', () => {
      reconnectManager.start()
      
      vi.advanceTimersByTime(50) // 还没到重连时间
      reconnectManager.stop()
      
      vi.advanceTimersByTime(100) // 超过重连时间
      expect(mockReconnect).not.toHaveBeenCalled()
    })

    it('应该清理所有定时器', () => {
      reconnectManager.start()
      
      vi.advanceTimersByTime(100)
      reconnectManager.onFailure(new Error('Failed'))
      
      reconnectManager.stop()
      
      // 停止后不应该再有重连尝试
      vi.advanceTimersByTime(1000)
      expect(mockReconnect).toHaveBeenCalledTimes(1) // 只有第一次调用
    })
  })

  describe('边界情况', () => {
    it('应该处理maxAttempts为0的情况', () => {
      const zeroAttemptsConfig: ReconnectConfig = {
        ...config,
        maxAttempts: 0
      }
      
      reconnectManager = new ReconnectManager(zeroAttemptsConfig, mockReconnect, mockCallbacks)
      reconnectManager.start()
      
      expect(reconnectManager.getState()).toBe(ReconnectState.GAVE_UP)
      expect(mockCallbacks.onReconnectGiveUp).toHaveBeenCalledWith(0)
    })

    it('应该处理极小的延迟值', () => {
      const smallDelayConfig: ReconnectConfig = {
        ...config,
        initialDelay: 1,
        maxDelay: 10
      }
      
      reconnectManager = new ReconnectManager(smallDelayConfig, mockReconnect, mockCallbacks)
      reconnectManager.start()
      
      vi.advanceTimersByTime(1)
      expect(mockReconnect).toHaveBeenCalledTimes(1)
    })
  })
})