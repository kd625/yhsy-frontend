import type { MessageQueueItem, WebSocketMessage } from '../types'

/**
 * 消息队列管理器
 */
export class MessageQueue {
  private queue: MessageQueueItem[] = []
  private processing = false
  private maxRetries = 3
  private retryDelay = 1000
  private sendMessage: (message: WebSocketMessage) => Promise<void>
  private onError: (error: any) => void

  constructor(
    sendMessage: (message: WebSocketMessage) => Promise<void>,
    onError: (error: any) => void
  ) {
    this.sendMessage = sendMessage
    this.onError = onError
  }

  /**
   * 添加消息到队列
   */
  async enqueue(item: MessageQueueItem): Promise<void> {
    this.queue.push(item)
    await this.process()
  }

  /**
   * 处理队列中的消息
   */
  private async process(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()!
      
      try {
        await this.sendMessage(item.message)
        // 发送成功，继续处理下一条
      } catch (error) {
        // 发送失败，重新入队并增加重试次数
        item.retryCount++
        if (item.retryCount < this.maxRetries) {
          // 延迟后重新入队
          setTimeout(() => {
            this.queue.unshift(item)
            this.process()
          }, this.retryDelay * item.retryCount)
        } else {
          this.onError(new Error(`消息发送失败，已达到最大重试次数: ${error}`))
        }
        break // 停止处理，等待下次重试
      }
    }

    this.processing = false
  }

  /**
   * 处理队列中的消息（公共方法）
   */
  async processQueue(): Promise<void> {
    await this.process()
  }

  /**
   * 清空队列
   */
  clear(): void {
    this.queue = []
    this.processing = false
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * 检查是否正在处理
   */
  isProcessing(): boolean {
    return this.processing
  }

  /**
   * 获取队列大小
   */
  size(): number {
    return this.queue.length
  }

  /**
   * 检查队列是否为空
   */
  isEmpty(): boolean {
    return this.queue.length === 0
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 设置最大重试次数
   */
  setMaxRetries(maxRetries: number): void {
    this.maxRetries = maxRetries
  }

  /**
   * 设置重试延迟
   */
  setRetryDelay(delay: number): void {
    this.retryDelay = delay
  }
}