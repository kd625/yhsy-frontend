import { EventEmitter } from '../utils/EventEmitter'

/**
 * 重连管理器
 */
export class ReconnectManager extends EventEmitter {
  private attempts = 0
  private maxAttempts = 5
  private baseDelay = 1000
  private reconnectTimer?: number
  private isReconnecting = false
  private connectFn: () => Promise<void>

  constructor(
    connectFn: () => Promise<void>,
    maxAttempts = 5,
    baseDelay = 1000
  ) {
    super()
    this.connectFn = connectFn
    this.maxAttempts = maxAttempts
    this.baseDelay = baseDelay
  }

  /**
   * 开始重连
   */
  async startReconnect(): Promise<void> {
    if (this.isReconnecting) {
      return
    }

    this.isReconnecting = true
    this.attempts = 0
    
    try {
      await this.reconnect()
    } catch (error) {
      this.isReconnecting = false
      throw error
    }
  }

  /**
   * 执行重连
   */
  private async reconnect(): Promise<void> {
    if (this.attempts >= this.maxAttempts) {
      this.isReconnecting = false
      const error = new Error(`重连失败：超过最大重连次数 ${this.maxAttempts}`)
      this.emit('reconnectFailed', error)
      throw error
    }

    this.attempts++
    const delay = this.calculateDelay()
    
    this.emit('reconnecting', this.attempts, delay)
    console.log(`第${this.attempts}次重连，${delay}ms后开始...`)
    
    await this.sleep(delay)
    
    try {
      await this.connectFn()
      this.onReconnectSuccess()
    } catch (error) {
      console.error(`第${this.attempts}次重连失败:`, error)
      this.emit('reconnectAttemptFailed', this.attempts, error)
      
      // 递归重连
      return this.reconnect()
    }
  }

  /**
   * 重连成功处理
   */
  private onReconnectSuccess(): void {
    console.log(`重连成功，共尝试 ${this.attempts} 次`)
    this.reset()
    this.emit('reconnected', this.attempts)
  }

  /**
   * 停止重连
   */
  stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
    this.isReconnecting = false
    this.emit('reconnectStopped')
  }

  /**
   * 重置重连状态
   */
  reset(): void {
    this.attempts = 0
    this.isReconnecting = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }
  }

  /**
   * 计算重连延迟（指数退避）
   */
  private calculateDelay(): number {
    // 指数退避算法：baseDelay * 2^(attempts-1)
    // 最大延迟不超过30秒
    const delay = this.baseDelay * Math.pow(2, this.attempts - 1)
    return Math.min(delay, 30000)
  }

  /**
   * 延迟函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => {
      this.reconnectTimer = window.setTimeout(resolve, ms)
    })
  }

  /**
   * 获取当前重连状态
   */
  getStatus() {
    return {
      isReconnecting: this.isReconnecting,
      attempts: this.attempts,
      maxAttempts: this.maxAttempts
    }
  }

  /**
   * 设置最大重连次数
   */
  setMaxAttempts(maxAttempts: number): void {
    this.maxAttempts = maxAttempts
  }

  /**
   * 设置基础延迟时间
   */
  setBaseDelay(baseDelay: number): void {
    this.baseDelay = baseDelay
  }
}