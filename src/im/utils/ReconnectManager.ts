import { logger } from './Logger'

/**
 * 重连策略类型
 */
export type ReconnectStrategy = 'fixed' | 'exponential' | 'linear'

/**
 * 重连管理器配置
 */
export interface ReconnectConfig {
  maxAttempts: number           // 最大重连次数
  initialDelay: number          // 初始重连延迟（毫秒）
  maxDelay: number             // 最大重连延迟（毫秒）
  strategy: ReconnectStrategy   // 重连策略
  factor: number               // 指数退避因子（仅用于exponential策略）
  jitter: boolean              // 是否添加随机抖动
}

/**
 * 重连事件回调
 */
export interface ReconnectCallbacks {
  onReconnectStart?: (attempt: number) => void
  onReconnectSuccess?: (attempt: number) => void
  onReconnectFailed?: (attempt: number, error: Error) => void
  onReconnectGiveUp?: (totalAttempts: number) => void
}

/**
 * 重连状态
 */
export const ReconnectState = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  FAILED: 'failed',
  GAVE_UP: 'gave_up'
} as const

export type ReconnectState = typeof ReconnectState[keyof typeof ReconnectState]

/**
 * 断线重连管理器
 * 负责在连接断开时自动重连
 */
export class ReconnectManager {
  private config: ReconnectConfig
  private callbacks: ReconnectCallbacks
  private reconnectFunction: () => Promise<void>
  
  private state: ReconnectState = ReconnectState.IDLE
  private currentAttempt = 0
  private reconnectTimer: number | null = null
  private startTime = 0

  constructor(
    config: ReconnectConfig,
    reconnectFunction: () => Promise<void>,
    callbacks: ReconnectCallbacks = {}
  ) {
    this.config = {
      maxAttempts: config.maxAttempts || 5,
      initialDelay: config.initialDelay || 1000,
      maxDelay: config.maxDelay || 30000,
      strategy: config.strategy || 'exponential',
      factor: config.factor || 2,
      jitter: config.jitter !== false
    }
    this.reconnectFunction = reconnectFunction
    this.callbacks = callbacks
  }

  /**
   * 开始重连
   */
  start(): void {
    if (this.state === ReconnectState.CONNECTING) {
      logger.warn('重连管理器已在运行')
      return
    }

    this.state = ReconnectState.CONNECTING
    this.currentAttempt = 0
    this.startTime = Date.now()
    
    logger.info('开始自动重连', {
      maxAttempts: this.config.maxAttempts,
      strategy: this.config.strategy
    })

    this.scheduleReconnect()
  }

  /**
   * 停止重连
   */
  stop(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.state === ReconnectState.CONNECTING) {
      this.state = ReconnectState.IDLE
      logger.info('重连已停止')
    }
  }

  /**
   * 重连成功
   */
  onSuccess(): void {
    if (this.state !== ReconnectState.CONNECTING) {
      return
    }

    const totalTime = Date.now() - this.startTime
    this.state = ReconnectState.CONNECTED
    
    logger.info('重连成功', {
      attempt: this.currentAttempt,
      totalTime: totalTime
    })

    // 触发成功回调
    this.callbacks.onReconnectSuccess?.(this.currentAttempt)

    // 重置状态
    this.reset()
  }

  /**
   * 重连失败
   */
  onFailure(error: Error): void {
    if (this.state !== ReconnectState.CONNECTING) {
      return
    }

    logger.warn('重连失败', {
      attempt: this.currentAttempt,
      error: error.message
    })

    // 触发失败回调
    this.callbacks.onReconnectFailed?.(this.currentAttempt, error)

    // 检查是否还有重连机会
    if (this.currentAttempt >= this.config.maxAttempts) {
      this.giveUp()
    } else {
      this.scheduleReconnect()
    }
  }

  /**
   * 获取当前状态
   */
  getState(): ReconnectState {
    return this.state
  }

  /**
   * 获取重连统计信息
   */
  getStats() {
    return {
      state: this.state,
      currentAttempt: this.currentAttempt,
      maxAttempts: this.config.maxAttempts,
      startTime: this.startTime,
      isReconnecting: this.state === ReconnectState.CONNECTING
    }
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<ReconnectConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * 安排下一次重连
   */
  private scheduleReconnect(): void {
    if (this.state !== ReconnectState.CONNECTING) {
      return
    }

    this.currentAttempt++
    
    if (this.currentAttempt > this.config.maxAttempts) {
      this.giveUp()
      return
    }

    const delay = this.calculateDelay()
    
    logger.info('安排重连', {
      attempt: this.currentAttempt,
      delay: delay,
      strategy: this.config.strategy
    })

    this.reconnectTimer = setTimeout(() => {
      this.attemptReconnect()
    }, delay)
  }

  /**
   * 尝试重连
   */
  private async attemptReconnect(): Promise<void> {
    if (this.state !== ReconnectState.CONNECTING) {
      return
    }

    logger.info('尝试重连', { attempt: this.currentAttempt })

    // 触发开始回调
    this.callbacks.onReconnectStart?.(this.currentAttempt)

    try {
      await this.reconnectFunction()
      // 注意：成功后应该由外部调用 onSuccess()
    } catch (error) {
      this.onFailure(error as Error)
    }
  }

  /**
   * 计算重连延迟
   */
  private calculateDelay(): number {
    let delay: number

    switch (this.config.strategy) {
      case 'fixed':
        delay = this.config.initialDelay
        break
      
      case 'linear':
        delay = this.config.initialDelay * this.currentAttempt
        break
      
      case 'exponential':
      default:
        delay = this.config.initialDelay * Math.pow(this.config.factor, this.currentAttempt - 1)
        break
    }

    // 限制最大延迟
    delay = Math.min(delay, this.config.maxDelay)

    // 添加随机抖动
    if (this.config.jitter) {
      const jitterRange = delay * 0.1 // 10% 抖动
      const jitter = (Math.random() - 0.5) * 2 * jitterRange
      delay += jitter
    }

    return Math.max(delay, 0)
  }

  /**
   * 放弃重连
   */
  private giveUp(): void {
    this.state = ReconnectState.GAVE_UP
    
    const totalTime = Date.now() - this.startTime
    
    logger.error('重连失败，已放弃', {
      totalAttempts: this.currentAttempt,
      totalTime: totalTime
    })

    // 触发放弃回调
    this.callbacks.onReconnectGiveUp?.(this.currentAttempt)

    this.reset()
  }

  /**
   * 重置状态
   */
  private reset(): void {
    this.currentAttempt = 0
    this.startTime = 0
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
  }
}