import { EventEmitter } from '../utils/EventEmitter'
import { ReconnectManager } from './ReconnectManager'
import { MessageTypes } from '../constants/MessageTypes'
import { IMErrorHandler } from '../utils/ErrorHandler'
import { logger } from '../utils/Logger'
import { IMValidator } from '../utils/Validator'
import { 
  IMClientConfig, 
  ConnectionState, 
  ConnectionStatusType,
  ConnectionStatus,
  WebSocketMessage, 
  AuthRequest, 
  HeartbeatRequest 
} from '../types'

/**
 * WebSocket连接管理器
 */
export class ConnectionManager extends EventEmitter {
  private ws?: WebSocket
  private config: IMClientConfig
  private state: ConnectionState
  private reconnectManager: ReconnectManager
  private heartbeatTimer?: number
  private heartbeatTimeoutTimer?: number
  private errorHandler: IMErrorHandler
  private validator: IMValidator

  constructor(config: IMClientConfig) {
    super()
    
    // 设置配置
    this.config = config

    // 初始化连接状态
    this.state = {
      status: ConnectionStatus.DISCONNECTED,
      reconnectAttempts: 0
    }

    // 初始化工具类
    this.errorHandler = new IMErrorHandler()
    this.validator = new IMValidator()

    // 初始化重连管理器
    this.reconnectManager = new ReconnectManager(
      () => this.connect(),
      this.config.reconnect?.maxRetries || 5,
      this.config.reconnect?.initialDelay || 1000
    )

    this.setupReconnectEvents()
  }

  /**
   * 建立WebSocket连接
   */
  async connect(): Promise<void> {
    if (this.state.isConnected) {
      return
    }

    return new Promise((resolve, reject) => {
      try {
        this.updateState({ status: ConnectionStatus.CONNECTING })
        this.log('正在连接WebSocket服务器...')

        this.ws = new WebSocket(this.config.url)
        
        // 连接成功
        this.ws.onopen = () => {
          this.log('WebSocket连接已建立')
          this.updateState({ 
            status: ConnectionStatus.CONNECTED,
            isConnected: true 
          })
          this.emit('connected')
          this.authenticate()
          resolve()
        }

        // 接收消息
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data)
        }

        // 连接关闭
        this.ws.onclose = (event) => {
          this.log(`WebSocket连接已关闭: ${event.code} ${event.reason}`)
          this.handleDisconnect()
        }

        // 连接错误
        this.ws.onerror = (error) => {
          this.log('WebSocket连接错误:', error)
          this.emit('error', error)
          reject(error)
        }

      } catch (error) {
        this.log('创建WebSocket连接失败:', error)
        reject(error)
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopHeartbeat()
    this.reconnectManager.stopReconnect()
    
    if (this.ws) {
      this.ws.close()
      this.ws = undefined
    }
    
    this.updateState({
      status: ConnectionStatus.DISCONNECTED,
      isConnected: false,
      isAuthenticated: false
    })
  }

  /**
   * 发送消息
   */
  async sendMessage(message: WebSocketMessage): Promise<void> {
    if (!this.state.isConnected || !this.ws) {
      throw new Error('WebSocket未连接')
    }

    if (this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket连接状态异常')
    }

    try {
      const messageStr = JSON.stringify(message)
      this.ws.send(messageStr)
      this.log('发送消息:', message)
    } catch (error) {
      this.log('发送消息失败:', error)
      throw error
    }
  }

  /**
   * 用户认证
   */
  private async authenticate(): Promise<void> {
    try {
      const authMessage: AuthRequestMessage = {
        accessToken: this.config.accessToken
      }

      const message: WebSocketMessage = {
        type: MessageTypes.AUTH_REQUEST,
        message: JSON.stringify(authMessage)
      }

      await this.sendMessage(message)
      this.log('发送认证请求')
    } catch (error) {
      this.log('发送认证请求失败:', error)
      this.emit('authFailed', error)
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message: WebSocketMessage = JSON.parse(data)
      this.log('收到消息:', message)

      switch (message.type) {
        case MessageTypes.AUTH_RESPONSE:
          this.handleAuthResponse(message.message)
          break
        case MessageTypes.HEARTBEAT_RESPONSE:
          this.handleHeartbeatResponse()
          break
        case MessageTypes.CHAT_REDIRECT_TO_USER_REQUEST:
          this.emit('messageReceived', JSON.parse(message.message))
          break
        case MessageTypes.CHAT_SEND_RESPONSE:
          this.emit('messageSendResponse', JSON.parse(message.message))
          break
        default:
          this.log('未知消息类型:', message.type)
      }
    } catch (error) {
      this.log('解析消息失败:', error)
    }
  }

  /**
   * 处理认证响应
   */
  private handleAuthResponse(messageStr: string): void {
    try {
      const authResponse: AuthResponseMessage = JSON.parse(messageStr)
      
      if (authResponse.code === 0) {
        this.log('认证成功')
        this.updateState({ 
          status: ConnectionStatus.AUTHENTICATED,
          isAuthenticated: true 
        })
        this.emit('authenticated')
        this.startHeartbeat()
      } else {
        this.log('认证失败:', authResponse.message)
        this.emit('authFailed', new Error(authResponse.message))
      }
    } catch (error) {
      this.log('处理认证响应失败:', error)
      this.emit('authFailed', error)
    }
  }

  /**
   * 处理心跳响应
   */
  private handleHeartbeatResponse(): void {
    this.log('收到心跳响应')
    this.emit('heartbeatReceived')
    
    // 清除心跳超时定时器
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = undefined
    }
  }

  /**
   * 开始心跳检测
   */
  private startHeartbeat(): void {
    this.stopHeartbeat()
    
    this.heartbeatTimer = window.setInterval(() => {
      this.sendHeartbeat()
    }, this.config.heartbeatInterval)
    
    this.log(`心跳检测已启动，间隔: ${this.config.heartbeatInterval}ms`)
  }

  /**
   * 停止心跳检测
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
    
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer)
      this.heartbeatTimeoutTimer = undefined
    }
  }

  /**
   * 发送心跳包
   */
  private async sendHeartbeat(): Promise<void> {
    try {
      const message: WebSocketMessage = {
        type: MessageTypes.HEARTBEAT_REQUEST,
        message: '{}'
      }

      await this.sendMessage(message)
      this.log('发送心跳包')
      this.emit('heartbeatSent')

      // 设置心跳超时检测
      this.heartbeatTimeoutTimer = window.setTimeout(() => {
        this.log('心跳超时，准备重连')
        this.handleDisconnect()
      }, 10000) // 10秒超时

    } catch (error) {
      this.log('发送心跳包失败:', error)
    }
  }

  /**
   * 处理连接断开
   */
  private handleDisconnect(): void {
    this.stopHeartbeat()
    
    this.updateState({
      status: ConnectionStatus.DISCONNECTED,
      isConnected: false,
      isAuthenticated: false
    })
    
    this.emit('disconnected')
    
    // 启动重连
    if (this.config.maxReconnectAttempts > 0) {
      this.reconnectManager.startReconnect().catch(error => {
        this.log('重连失败:', error)
        this.emit('reconnectFailed', error)
      })
    }
  }

  /**
   * 设置重连事件监听
   */
  private setupReconnectEvents(): void {
    this.reconnectManager.on('reconnecting', (attempt: number, delay: number) => {
      this.updateState({ 
        status: ConnectionStatus.RECONNECTING,
        reconnectAttempts: attempt 
      })
      this.emit('reconnecting', attempt, delay)
    })

    this.reconnectManager.on('reconnected', (attempts: number) => {
      this.log(`重连成功，共尝试 ${attempts} 次`)
      this.emit('reconnected', attempts)
    })

    this.reconnectManager.on('reconnectFailed', (error: Error) => {
      this.log('重连失败:', error)
      this.emit('reconnectFailed', error)
    })
  }

  /**
   * 更新连接状态
   */
  private updateState(newState: Partial<ConnectionState>): void {
    this.state = { ...this.state, ...newState }
    this.emit('stateChanged', this.state)
  }

  /**
   * 日志输出
   */
  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[ConnectionManager]', ...args)
    }
  }

  /**
   * 获取连接状态
   */
  getState(): ConnectionState {
    return { ...this.state }
  }

  /**
   * 检查是否已连接
   */
  isConnected(): boolean {
    return this.state.isConnected
  }

  /**
   * 检查是否已认证
   */
  isAuthenticated(): boolean {
    return this.state.isAuthenticated
  }

  /**
   * 更新访问令牌
   */
  updateAccessToken(accessToken: string): void {
    this.config.accessToken = accessToken
  }
}