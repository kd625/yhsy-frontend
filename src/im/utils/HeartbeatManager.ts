import { logger } from './Logger'
import type { HeartbeatRequest, HeartbeatResponse } from '../types'

/**
 * 心跳管理器配置
 */
export interface HeartbeatConfig {
  interval: number    // 心跳间隔（毫秒）
  timeout: number     // 心跳超时时间（毫秒）
  maxMissed: number   // 最大丢失心跳次数
}

/**
 * 心跳事件回调
 */
export interface HeartbeatCallbacks {
  onSend?: (request: HeartbeatRequest) => void
  onReceive?: (response: HeartbeatResponse) => void
  onTimeout?: () => void
  onConnectionLost?: () => void
}

/**
 * 心跳管理器
 * 负责定时发送心跳包，检测连接状态
 */
export class HeartbeatManager {
  private config: HeartbeatConfig
  private callbacks: HeartbeatCallbacks
  private sendHeartbeat: (request: HeartbeatRequest) => Promise<void>
  
  private heartbeatTimer: number | null = null
  private timeoutTimer: number | null = null
  private isRunning = false
  private missedCount = 0
  private lastSentTime = 0
  private lastReceivedTime = 0

  constructor(
    config: HeartbeatConfig,
    sendHeartbeat: (request: HeartbeatRequest) => Promise<void>,
    callbacks: HeartbeatCallbacks = {}
  ) {
    this.config = {
      interval: config.interval || 30000,    // 默认30秒
      timeout: config.timeout || 5000,       // 默认5秒超时
      maxMissed: config.maxMissed || 3       // 默认最多丢失3次
    }
    this.sendHeartbeat = sendHeartbeat
    this.callbacks = callbacks
  }

  /**
   * 启动心跳检测
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('心跳管理器已在运行')
      return
    }

    this.isRunning = true
    this.missedCount = 0
    this.scheduleNextHeartbeat()
    
    logger.info('心跳管理器已启动', {
      interval: this.config.interval,
      timeout: this.config.timeout,
      maxMissed: this.config.maxMissed
    })
  }

  /**
   * 停止心跳检测
   */
  stop(): void {
    if (!this.isRunning) {
      return
    }

    this.isRunning = false
    this.clearTimers()
    
    logger.info('心跳管理器已停止')
  }

  /**
   * 处理心跳响应
   */
  handleHeartbeatResponse(response: HeartbeatResponse): void {
    if (!this.isRunning) {
      return
    }

    this.lastReceivedTime = Date.now()
    this.missedCount = 0
    
    // 清除超时定时器
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }

    // 计算延迟
    const latency = this.lastReceivedTime - this.lastSentTime
    
    logger.debug('收到心跳响应', {
      serverTime: response.serverTime,
      clientTime: response.timestamp,
      latency: latency
    })

    // 触发回调
    this.callbacks.onReceive?.(response)

    // 安排下一次心跳
    this.scheduleNextHeartbeat()
  }

  /**
   * 获取心跳统计信息
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      missedCount: this.missedCount,
      lastSentTime: this.lastSentTime,
      lastReceivedTime: this.lastReceivedTime,
      latency: this.lastReceivedTime > 0 ? this.lastReceivedTime - this.lastSentTime : 0
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<HeartbeatConfig>): void {
    this.config = { ...this.config, ...config }
    
    // 如果正在运行，重启以应用新配置
    if (this.isRunning) {
      this.stop()
      this.start()
    }
  }

  /**
   * 安排下一次心跳
   */
  private scheduleNextHeartbeat(): void {
    if (!this.isRunning) {
      return
    }

    this.heartbeatTimer = setTimeout(() => {
      this.sendHeartbeatPacket()
    }, this.config.interval)
  }

  /**
   * 发送心跳包
   */
  private async sendHeartbeatPacket(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    try {
      this.lastSentTime = Date.now()
      
      const request: HeartbeatRequest = {
        timestamp: this.lastSentTime
      }

      // 发送心跳
      await this.sendHeartbeat(request)
      
      logger.debug('发送心跳包', { timestamp: request.timestamp })
      
      // 触发回调
      this.callbacks.onSend?.(request)

      // 设置超时定时器
      this.timeoutTimer = setTimeout(() => {
        this.handleHeartbeatTimeout()
      }, this.config.timeout)

    } catch (error) {
      logger.error('发送心跳包失败:', error)
      this.handleHeartbeatTimeout()
    }
  }

  /**
   * 处理心跳超时
   */
  private handleHeartbeatTimeout(): void {
    if (!this.isRunning) {
      return
    }

    this.missedCount++
    
    logger.warn('心跳超时', {
      missedCount: this.missedCount,
      maxMissed: this.config.maxMissed
    })

    // 触发超时回调
    this.callbacks.onTimeout?.()

    // 检查是否超过最大丢失次数
    if (this.missedCount >= this.config.maxMissed) {
      logger.error('心跳丢失次数过多，连接可能已断开', {
        missedCount: this.missedCount,
        maxMissed: this.config.maxMissed
      })
      
      // 触发连接丢失回调
      this.callbacks.onConnectionLost?.()
      
      // 停止心跳检测
      this.stop()
    } else {
      // 继续下一次心跳
      this.scheduleNextHeartbeat()
    }
  }

  /**
   * 清除所有定时器
   */
  private clearTimers(): void {
    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    
    if (this.timeoutTimer) {
      clearTimeout(this.timeoutTimer)
      this.timeoutTimer = null
    }
  }
}