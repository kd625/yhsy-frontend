import { SimpleConnectionManager } from './SimpleConnectionManager'
import { SessionManager } from './SessionManager'
import { HeartbeatManager } from '../utils/HeartbeatManager'
import { ReconnectManager, ReconnectState } from '../utils/ReconnectManager'
import { IMErrorHandler, IMErrorCode } from '../utils/ErrorHandler'
import { logger } from '../utils/Logger'
import { IMValidator } from '../utils/Validator'
import { ConnectionStatus } from '../types'
import type { 
  IMClientConfig, 
  ConnectionState, 
  ChatSendToOneRequest,
  ChatReceivedMessage,
  IMEventCallbacks,
  SessionVO,
  SessionCreateRequest,
  SessionGetRequest,
  HeartbeatRequest,
  HeartbeatResponse,
  HeartbeatConfig,
  ReconnectConfig
} from '../types'

/**
 * IM客户端主类
 */
export class IMClient {
  private connectionManager: SimpleConnectionManager
  private sessionManager: SessionManager
  private heartbeatManager: HeartbeatManager | null = null
  private reconnectManager: ReconnectManager | null = null
  private config: IMClientConfig
  private callbacks: IMEventCallbacks = {}
  private validator: IMValidator

  constructor(config: IMClientConfig) {
    this.config = config
    this.validator = new IMValidator()
    
    // 初始化连接管理器
    this.connectionManager = new SimpleConnectionManager(config)
    
    // 初始化会话管理器
    this.sessionManager = new SessionManager()
    
    // 初始化重连管理器
    this.setupReconnectManager()
    
    // 初始化心跳管理器
    this.setupHeartbeatManager()
    
    // 设置事件处理器
    this.setupEventHandlers()
  }

  /**
   * 连接到服务器
   */
  async connect(): Promise<void> {
    try {
      await this.connectionManager.connect()
    } catch (error) {
      const imError = IMErrorHandler.createError(IMErrorCode.CONNECTION_FAILED)
      logger.error('连接失败:', imError)
      throw imError
    }
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      await this.connectionManager.disconnect()
    } catch (error) {
      logger.error('断开连接失败:', error)
    }
  }

  /**
   * 发送单聊消息
   */
  async sendMessage(request: ChatSendToOneRequest): Promise<void> {
    try {
      // 简单验证请求参数
      if (!request.toUserId || !request.content) {
        throw IMErrorHandler.createError(IMErrorCode.MESSAGE_SEND_FAILED)
      }

      await this.connectionManager.sendMessage(request)
    } catch (error) {
      logger.error('发送消息失败:', error)
      throw error
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionState(): ConnectionState {
    return this.connectionManager.getState()
  }

  /**
   * 更新访问令牌
   */
  updateAccessToken(token: string): void {
    this.config.token = token
    // 如果连接已建立，需要重新认证
    if (this.connectionManager.getState().status === ConnectionStatus.CONNECTED) {
      // 重新连接以使用新token
      this.connectionManager.disconnect()
      this.connectionManager.connect()
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    // 连接事件
    this.connectionManager.on('connected', () => {
      logger.info('IM客户端已连接')
      
      // 连接成功后启动心跳
      this.heartbeatManager?.start()
      
      // 通知重连管理器连接成功
      this.reconnectManager?.onSuccess()
      
      this.callbacks.connected?.()
    })

    this.connectionManager.on('authenticated', () => {
      logger.info('IM客户端认证成功')
      this.callbacks.authenticated?.()
    })

    this.connectionManager.on('disconnected', () => {
      logger.info('IM客户端已断开连接')
      
      // 停止心跳
      this.heartbeatManager?.stop()
      
      this.callbacks.disconnected?.()
      
      // 开始重连（如果不是主动断开）
      this.handleConnectionLost()
    })

    this.connectionManager.on('error', (error: Error) => {
      logger.error('IM客户端连接错误:', error)
      
      // 通知重连管理器连接失败
      this.reconnectManager?.onFailure(error)
      
      this.callbacks.error?.(error)
    })

    // 消息接收
    this.connectionManager.on('message', (message: ChatReceivedMessage) => {
      logger.debug('收到消息:', message)
      this.callbacks.messageReceived?.(message)
    })

    // 心跳响应处理
    this.connectionManager.on('heartbeat', (response: HeartbeatResponse) => {
      this.heartbeatManager?.handleHeartbeatResponse(response)
    })
  }

  /**
   * 设置事件回调
   */
  setCallbacks(callbacks: Partial<IMEventCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks }
  }

  // 会话管理相关方法

  /**
   * 获取会话信息
   */
  async getSession(params: SessionGetRequest): Promise<SessionVO | null> {
    return await this.sessionManager.getSession(params)
  }

  /**
   * 创建新会话
   */
  async addSession(params: SessionCreateRequest): Promise<SessionVO> {
    return await this.sessionManager.addSession(params)
  }

  /**
   * 获取或创建会话
   */
  async getOrCreateSession(bookId: number, buyerId: number, sellerId: number): Promise<SessionVO> {
    return await this.sessionManager.getOrCreateSession(bookId, buyerId, sellerId)
  }

  /**
   * 获取本地缓存的会话
   */
  getCachedSession(sessionId: string): SessionVO | undefined {
    return this.sessionManager.getCachedSession(sessionId)
  }

  /**
   * 获取所有缓存的会话
   */
  getAllCachedSessions(): SessionVO[] {
    return this.sessionManager.getAllCachedSessions()
  }

  /**
   * 销毁客户端
   */
  destroy(): void {
    // 停止心跳和重连
    this.heartbeatManager?.stop()
    this.reconnectManager?.stop()
    
    // 清理会话缓存
    this.sessionManager.clearCache()
    
    // 断开连接
    this.connectionManager.disconnect()
    
    logger.info('IM客户端已销毁')
  }

  /**
   * 设置重连管理器
   */
  private setupReconnectManager(): void {
    const reconnectConfig: ReconnectConfig = {
      maxAttempts: this.config.reconnect?.maxRetries || 5,
      initialDelay: this.config.reconnect?.initialDelay || 1000,
      maxDelay: this.config.reconnect?.maxDelay || 30000,
      strategy: 'exponential',
      factor: 2,
      jitter: true
    }

    this.reconnectManager = new ReconnectManager(
      reconnectConfig,
      async () => {
        await this.connectionManager.connect()
      },
      {
        onReconnectStart: (attempt) => {
          logger.info(`开始第${attempt}次重连`)
          this.callbacks.reconnecting?.(attempt)
        },
        onReconnectSuccess: (attempt) => {
          logger.info(`第${attempt}次重连成功`)
          this.callbacks.reconnected?.()
        },
        onReconnectFailed: (attempt, error) => {
          logger.warn(`第${attempt}次重连失败:`, error)
        },
        onReconnectGiveUp: (totalAttempts) => {
          logger.error(`重连失败，已尝试${totalAttempts}次`)
          this.callbacks.error?.(new Error('重连失败'))
        }
      }
    )
  }

  /**
   * 设置心跳管理器
   */
  private setupHeartbeatManager(): void {
    const heartbeatConfig: HeartbeatConfig = {
      interval: this.config.heartbeat?.interval || 30000,
      timeout: this.config.heartbeat?.timeout || 5000,
      maxMissed: 3
    }

    this.heartbeatManager = new HeartbeatManager(
      heartbeatConfig,
      async (request: HeartbeatRequest) => {
        await this.connectionManager.sendMessage({
          type: 'heartbeat',
          id: `heartbeat_${Date.now()}`,
          timestamp: request.timestamp,
          data: request
        })
      },
      {
        onSend: () => {
          this.callbacks.heartbeatSent?.()
        },
        onReceive: (response: HeartbeatResponse) => {
          this.callbacks.heartbeatReceived?.()
        },
        onTimeout: () => {
          logger.warn('心跳超时')
        },
        onConnectionLost: () => {
          logger.error('心跳检测到连接丢失')
          this.handleConnectionLost()
        }
      }
    )
  }

  /**
   * 处理连接丢失
   */
  private handleConnectionLost(): void {
    // 停止心跳
    this.heartbeatManager?.stop()
    
    // 开始重连
    if (this.reconnectManager?.getState() !== ReconnectState.CONNECTING) {
      this.reconnectManager?.start()
    }
  }
}