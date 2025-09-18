import { EventEmitter } from '../utils/EventEmitter'
import { IMErrorHandler, IMErrorCode } from '../utils/ErrorHandler'
import { logger } from '../utils/Logger'
import { IMValidator } from '../utils/Validator'
import type { IMClientConfig, ConnectionState, WebSocketMessage } from '../types'
import { ConnectionStatus } from '../types'

/**
 * 简化版WebSocket连接管理器
 */
export class SimpleConnectionManager extends EventEmitter {
  private ws?: WebSocket
  private config: IMClientConfig
  private state: ConnectionState
  private heartbeatTimer?: number
  private reconnectTimer?: number
  private errorHandler: IMErrorHandler
  private validator: IMValidator

  constructor(config: IMClientConfig) {
    super()
    
    this.config = config
    this.state = {
      status: ConnectionStatus.DISCONNECTED,
      reconnectAttempts: 0
    }
    
    this.errorHandler = new IMErrorHandler()
    this.validator = new IMValidator()
  }

  /**
   * 连接WebSocket
   */
  async connect(): Promise<void> {
    if (this.state.status === ConnectionStatus.CONNECTING || 
        this.state.status === ConnectionStatus.CONNECTED) {
      return
    }

    try {
      this.updateState({ status: ConnectionStatus.CONNECTING })
      
      this.ws = new WebSocket(this.config.wsUrl)
      
      this.ws.onopen = () => {
        logger.info('WebSocket连接已建立')
        this.updateState({ 
          status: ConnectionStatus.CONNECTED,
          lastConnectTime: Date.now(),
          reconnectAttempts: 0
        })
        this.emit('connected')
        this.authenticate()
      }

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data)
      }

      this.ws.onclose = () => {
        logger.info('WebSocket连接已关闭')
        this.handleDisconnect()
      }

      this.ws.onerror = (error) => {
        logger.error('WebSocket连接错误:', error)
        this.emit('error', error)
      }

    } catch (error) {
      const imError = IMErrorHandler.createError(IMErrorCode.CONNECTION_FAILED)
      logger.error('连接失败:', imError)
      this.emit('error', imError)
      throw imError
    }
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = undefined
    }

    if (this.ws) {
      this.ws.close()
      this.ws = undefined
    }

    this.updateState({ 
      status: ConnectionStatus.DISCONNECTED,
      lastDisconnectTime: Date.now()
    })
    this.emit('disconnected')
  }

  /**
   * 发送消息
   */
  async sendMessage(message: any): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw IMErrorHandler.createError(IMErrorCode.CONNECTION_LOST)
    }

    try {
      const messageStr = JSON.stringify(message)
      this.ws.send(messageStr)
      logger.debug('消息已发送:', message)
    } catch (error) {
      const imError = IMErrorHandler.createError(IMErrorCode.MESSAGE_SEND_FAILED)
      logger.error('发送消息失败:', imError)
      throw imError
    }
  }

  /**
   * 认证
   */
  private async authenticate(): Promise<void> {
    try {
      const authMessage = {
        type: 'auth',
        data: {
          token: this.config.token,
          userId: this.config.userId
        }
      }
      
      await this.sendMessage(authMessage)
      logger.info('认证消息已发送')
    } catch (error) {
      logger.error('认证失败:', error)
      this.emit('authFailed', error)
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data)
      logger.debug('收到消息:', message)

      switch (message.type) {
        case 'auth_response':
          this.handleAuthResponse(message)
          break
        case 'heartbeat_response':
          this.handleHeartbeatResponse()
          break
        case 'chat_message':
          this.emit('messageReceived', message.data)
          break
        default:
          logger.warn('未知消息类型:', message.type)
      }
    } catch (error) {
      logger.error('解析消息失败:', error)
      this.emit('error', error)
    }
  }

  /**
   * 处理认证响应
   */
  private handleAuthResponse(message: any): void {
    if (message.data?.success) {
      this.updateState({ status: ConnectionStatus.AUTHENTICATED })
      this.emit('authenticated')
      this.startHeartbeat()
      logger.info('认证成功')
    } else {
      logger.error('认证失败:', message.data?.message)
      this.emit('authFailed', message.data)
    }
  }

  /**
   * 处理心跳响应
   */
  private handleHeartbeatResponse(): void {
    logger.debug('收到心跳响应')
    this.emit('heartbeatReceived')
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    const interval = this.config.heartbeat?.interval || 30000
    
    this.heartbeatTimer = window.setInterval(() => {
      this.sendHeartbeat()
    }, interval)
  }

  /**
   * 发送心跳
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      const heartbeatMessage = {
        type: 'heartbeat',
        data: {
          timestamp: Date.now()
        }
      }
      
      await this.sendMessage(heartbeatMessage)
      this.emit('heartbeatSent')
    } catch (error) {
      logger.error('发送心跳失败:', error)
    }
  }

  /**
   * 处理断开连接
   */
  private handleDisconnect(): void {
    this.updateState({ 
      status: ConnectionStatus.DISCONNECTED,
      lastDisconnectTime: Date.now()
    })
    
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }

    this.emit('disconnected')
    
    // 自动重连
    this.attemptReconnect()
  }

  /**
   * 尝试重连
   */
  private attemptReconnect(): void {
    const maxRetries = this.config.reconnect?.maxRetries || 5
    
    if (this.state.reconnectAttempts >= maxRetries) {
      logger.error('重连次数已达上限')
      this.emit('reconnectFailed')
      return
    }

    const delay = Math.min(
      (this.config.reconnect?.initialDelay || 1000) * Math.pow(2, this.state.reconnectAttempts),
      this.config.reconnect?.maxDelay || 30000
    )

    logger.info(`${delay}ms后尝试重连 (${this.state.reconnectAttempts + 1}/${maxRetries})`)
    
    this.updateState({ 
      status: ConnectionStatus.RECONNECTING,
      reconnectAttempts: this.state.reconnectAttempts + 1
    })
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect()
    }, delay)
  }

  /**
   * 更新状态
   */
  private updateState(newState: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...newState }
    this.emit('stateChanged', this.state)
  }

  /**
   * 获取当前状态
   */
  getState(): ConnectionState {
    return { ...this.state }
  }

  /**
   * 是否已连接
   */
  isConnected(): boolean {
    return this.state.status === ConnectionStatus.CONNECTED || 
           this.state.status === ConnectionStatus.AUTHENTICATED
  }

  /**
   * 是否已认证
   */
  isAuthenticated(): boolean {
    return this.state.status === ConnectionStatus.AUTHENTICATED
  }
}