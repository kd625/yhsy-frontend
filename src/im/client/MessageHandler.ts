import { EventEmitter } from '../utils/EventEmitter'
import { MessageQueue } from '../utils/MessageQueue'
import type { 
  WebSocketMessage,
  ChatSendRequest,
  ChatSendResponse,
  ChatReceiveMessage,
  MessageQueueItem
} from '../types'
import { MessageTypes } from '../constants/MessageTypes'

/**
 * 消息处理器
 */
export class MessageHandler extends EventEmitter {
  private messageQueue: MessageQueue
  private sendMessage: (message: WebSocketMessage) => Promise<void>

  constructor(sendMessage: (message: WebSocketMessage) => Promise<void>) {
    super()
    this.sendMessage = sendMessage
    
    // 初始化消息队列
    this.messageQueue = new MessageQueue(
      this.sendMessage,
      (error) => this.emit('error', error)
    )
  }

  /**
   * 发送单聊消息
   */
  async sendChatMessage(request: ChatSendRequest): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: MessageTypes.CHAT_SEND_REQUEST,
        message: JSON.stringify(request)
      }

      // 添加到消息队列
      const queueItem: MessageQueueItem = {
        id: this.generateMessageId(),
        message,
        timestamp: Date.now(),
        retryCount: 0
      }

      await this.messageQueue.enqueue(queueItem)
      this.emit('messageSent', request)
      
    } catch (error) {
      this.emit('error', error)
      throw error
    }
  }

  /**
   * 处理接收到的聊天消息
   */
  handleChatMessage(messageData: ChatReceiveMessage): void {
    try {
      this.emit('messageReceived', messageData)
    } catch (error) {
      this.emit('error', error)
    }
  }

  /**
   * 处理消息发送响应
   */
  handleSendResponse(response: ChatSendResponse): void {
    try {
      if (response.code === 0) {
        this.emit('messageSendSuccess', response)
      } else {
        this.emit('messageSendError', new Error(response.message))
      }
    } catch (error) {
      this.emit('error', error)
    }
  }

  /**
   * 重新发送失败的消息
   */
  async retryFailedMessages(): Promise<void> {
    try {
      await this.messageQueue.processQueue()
    } catch (error) {
      this.emit('error', error)
    }
  }

  /**
   * 清空消息队列
   */
  clearMessageQueue(): void {
    this.messageQueue.clear()
  }

  /**
   * 生成消息ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取队列状态
   */
  getQueueStatus(): { pending: number; processing: boolean } {
    return {
      pending: this.messageQueue.getQueueLength(),
      processing: this.messageQueue.isProcessing()
    }
  }
}