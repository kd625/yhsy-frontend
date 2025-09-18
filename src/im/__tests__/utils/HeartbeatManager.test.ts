import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HeartbeatManager } from '../../utils/HeartbeatManager'
import type { HeartbeatConfig, HeartbeatCallbacks } from '../../utils/HeartbeatManager'
import type { HeartbeatResponse } from '../../types'

describe('HeartbeatManager', () => {
  let heartbeatManager: HeartbeatManager
  let mockSendHeartbeat: ReturnType<typeof vi.fn>
  let mockCallbacks: HeartbeatCallbacks
  let config: HeartbeatConfig
  let mockOnTimeout: ReturnType<typeof vi.fn>
  let mockOnConnectionLost: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    mockSendHeartbeat = vi.fn().mockResolvedValue(undefined)
    mockOnTimeout = vi.fn()
    mockOnConnectionLost = vi.fn()
    mockCallbacks = {
      onTimeout: mockOnTimeout,
      onConnectionLost: mockOnConnectionLost,
    }
    config = {
      interval: 1000,
      timeout: 500,
      maxMissed: 3
    }
    heartbeatManager = new HeartbeatManager(config, mockSendHeartbeat, mockCallbacks)
  })

  afterEach(() => {
    vi.useRealTimers()
    heartbeatManager?.stop()
  })

  describe('构造函数', () => {
    it('应该正确初始化配置', () => {
      expect(heartbeatManager).toBeDefined()
      const stats = heartbeatManager.getStats()
      expect(stats.isRunning).toBe(false)
    })

    it('应该使用默认配置', () => {
      const defaultConfig: HeartbeatConfig = {
        interval: 30000,
        timeout: 5000,
        maxMissed: 3
      }
      const defaultManager = new HeartbeatManager(defaultConfig, mockSendHeartbeat, mockCallbacks)
      expect(defaultManager).toBeDefined()
    })
  })

  describe('启动和停止', () => {
    it('应该能够启动心跳', () => {
      heartbeatManager.start()
      const stats = heartbeatManager.getStats()
      expect(stats.isRunning).toBe(true)
    })

    it('应该能够停止心跳', () => {
      heartbeatManager.start()
      heartbeatManager.stop()
      const stats = heartbeatManager.getStats()
      expect(stats.isRunning).toBe(false)
    })

    it('应该防止重复启动', () => {
      heartbeatManager.start()
      heartbeatManager.start() // 第二次启动应该被忽略
      const stats = heartbeatManager.getStats()
      expect(stats.isRunning).toBe(true)
    })

    it('应该能够安全地多次停止', () => {
      heartbeatManager.start()
      heartbeatManager.stop()
      heartbeatManager.stop() // 第二次停止应该安全
      const stats = heartbeatManager.getStats()
      expect(stats.isRunning).toBe(false)
    })
  })

  describe('心跳发送', () => {
    it('应该按间隔发送心跳', () => {
      heartbeatManager.start()
      
      // 快进到第一个心跳间隔
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(1)
      
      // 快进到第二个心跳间隔
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(2)
    })

    it('应该在停止后不再发送心跳', () => {
      heartbeatManager.start()
      
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(1)
      
      heartbeatManager.stop()
      
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(1) // 不应该增加
    })
  })

  describe('心跳响应', () => {
    it('应该处理心跳响应', () => {
      heartbeatManager.start()
      
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(1)
      
      // 模拟收到心跳响应
      const response: HeartbeatResponse = {
        timestamp: Date.now(),
        serverTime: Date.now()
      }
      heartbeatManager.handleHeartbeatResponse(response)
      
      // 应该不会触发超时
      vi.advanceTimersByTime(500)
      expect(mockOnTimeout).not.toHaveBeenCalled()
    })

    it('应该在超时时触发回调', () => {
      heartbeatManager.start()
      
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(1)
      
      // 不发送心跳响应，等待超时
      vi.advanceTimersByTime(500)
      expect(mockOnTimeout).toHaveBeenCalledTimes(1)
    })

    it('应该在收到响应后重置超时计时器', () => {
      heartbeatManager.start()
      
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(1)
      
      // 在超时前收到响应
      vi.advanceTimersByTime(300)
      const response: HeartbeatResponse = {
        timestamp: Date.now(),
        serverTime: Date.now()
      }
      heartbeatManager.handleHeartbeatResponse(response)
      
      // 继续等待，不应该超时
      vi.advanceTimersByTime(300)
      expect(mockOnTimeout).not.toHaveBeenCalled()
    })
  })

  describe('配置更新', () => {
    it('应该能够更新配置', () => {
      const newConfig: Partial<HeartbeatConfig> = {
        interval: 2000,
        timeout: 1000
      }
      
      heartbeatManager.updateConfig(newConfig)
      heartbeatManager.start()
      
      // 使用新的间隔时间
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(1)
    })

    it('应该在运行时更新配置', () => {
      heartbeatManager.start()
      
      const newConfig: Partial<HeartbeatConfig> = {
        interval: 500,
        timeout: 250
      }
      
      heartbeatManager.updateConfig(newConfig)
      
      // 应该使用新的配置
      vi.advanceTimersByTime(500)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(1)
    })
  })

  describe('错误处理', () => {
    it('应该处理发送心跳时的错误', () => {
      mockSendHeartbeat.mockRejectedValue(new Error('Network error'))
      
      heartbeatManager.start()
      vi.advanceTimersByTime(1000)
      
      expect(mockOnTimeout).toHaveBeenCalledWith()
    })

    it('应该在错误后继续运行', () => {
      let callCount = 0
      mockSendHeartbeat.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.reject(new Error('First call error'))
        }
        return Promise.resolve()
      })
      
      heartbeatManager.start()
      
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(1)
      
      vi.advanceTimersByTime(1000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(2)
    })
  })

  describe('状态查询', () => {
    it('应该正确报告运行状态', () => {
      let stats = heartbeatManager.getStats()
      expect(stats.isRunning).toBe(false)
      
      heartbeatManager.start()
      stats = heartbeatManager.getStats()
      expect(stats.isRunning).toBe(true)
      
      heartbeatManager.stop()
      stats = heartbeatManager.getStats()
      expect(stats.isRunning).toBe(false)
    })

    it('应该提供心跳统计信息', () => {
      heartbeatManager.start()
      
      vi.advanceTimersByTime(3000)
      expect(mockSendHeartbeat).toHaveBeenCalledTimes(3)
      
      const stats = heartbeatManager.getStats()
      expect(stats.missedCount).toBe(3)
      expect(stats.lastSentTime).toBeGreaterThan(0)
      
      // 模拟收到一个响应
      const response: HeartbeatResponse = {
        timestamp: Date.now(),
        serverTime: Date.now()
      }
      heartbeatManager.handleHeartbeatResponse(response)
      
      const updatedStats = heartbeatManager.getStats()
      expect(updatedStats.lastReceivedTime).toBeGreaterThan(0)
    })
  })

  describe('连接丢失检测', () => {
    it('应该在超过最大丢失次数时触发连接丢失', () => {
      heartbeatManager.start()
      
      // 模拟连续超时
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(1000) // 发送心跳
        vi.advanceTimersByTime(500)  // 等待超时
      }
      
      expect(mockOnConnectionLost).toHaveBeenCalledTimes(1)
      
      const stats = heartbeatManager.getStats()
      expect(stats.isRunning).toBe(false)
    })
  })
})