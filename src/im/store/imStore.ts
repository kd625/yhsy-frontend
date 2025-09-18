import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { IMClient } from '../client/IMClient'
import { getSaToken } from '@/utils/auth'
import type { 
  ConnectionState, 
  ChatReceiveMessage, 
  ChatSendRequest,
  ChatSendResponse
} from '../types'
import type { SessionVO } from '../api/session'

/**
 * 聊天消息
 */
export interface ChatMessage {
  id: string
  fromUserId: number
  toUserId: number
  content: string
  messageType: string
  timestamp: number
  isSelf: boolean
  status: 'sending' | 'sent' | 'failed'
}

/**
 * 会话信息
 */
export interface ChatSession {
  sessionId: number
  userId: number
  bookId: number
  messages: ChatMessage[]
  unreadCount: number
  lastMessage?: ChatMessage
  lastActiveTime: number
}

export const useIMStore = defineStore('im', () => {
  // 状态
  const client = ref<IMClient | null>(null)
  const connectionState = ref<ConnectionState>({
    status: 'DISCONNECTED',
    isConnected: false,
    isAuthenticated: false,
    reconnectAttempts: 0
  })
  const sessions = ref<Map<string, ChatSession>>(new Map())
  const currentSessionKey = ref<string>('')
  const isInitialized = ref(false)

  // 计算属性
  const isConnected = computed(() => connectionState.value.isConnected)
  const isAuthenticated = computed(() => connectionState.value.isAuthenticated)
  const currentSession = computed(() => {
    if (!currentSessionKey.value) return null
    return sessions.value.get(currentSessionKey.value) || null
  })
  const totalUnreadCount = computed(() => {
    let count = 0
    sessions.value.forEach(session => {
      count += session.unreadCount
    })
    return count
  })

  /**
   * 初始化IM客户端
   */
  const initClient = async (): Promise<void> => {
    if (isInitialized.value) {
      return
    }

    const token = getSaToken()
    if (!token) {
      throw new Error('用户未登录')
    }

    try {
      client.value = new IMClient({
        url: 'ws://localhost:8888/websocket',
        accessToken: token,
        debug: true
      })

      setupEventHandlers()
      await client.value.connect()
      isInitialized.value = true
    } catch (error) {
      console.error('初始化IM客户端失败:', error)
      throw error
    }
  }

  /**
   * 设置事件处理器
   */
  const setupEventHandlers = (): void => {
    if (!client.value) return

    // 连接状态变化
    client.value.on('stateChanged', (state: ConnectionState) => {
      connectionState.value = state
    })

    // 接收消息
    client.value.on('messageReceived', (message: ChatReceiveMessage) => {
      handleReceivedMessage(message)
    })

    // 消息发送成功
    client.value.on('messageSendSuccess', (response: ChatSendResponse) => {
      handleMessageSendSuccess(response)
    })

    // 消息发送失败
    client.value.on('messageSendError', (error: Error) => {
      handleMessageSendError(error)
    })

    // 连接事件
    client.value.on('connected', () => {
      console.log('IM客户端已连接')
    })

    client.value.on('authenticated', () => {
      console.log('IM客户端认证成功')
    })

    client.value.on('disconnected', () => {
      console.log('IM客户端已断开')
    })

    client.value.on('error', (error: Error) => {
      console.error('IM客户端错误:', error)
    })
  }

  /**
   * 发送消息
   */
  const sendMessage = async (
    toUserId: number, 
    content: string, 
    bookId: number,
    messageType = 'text'
  ): Promise<void> => {
    if (!client.value || !isAuthenticated.value) {
      throw new Error('IM客户端未连接或未认证')
    }

    const sessionKey = getSessionKey(toUserId, bookId)
    const messageId = generateMessageId()
    
    // 创建消息对象
    const message: ChatMessage = {
      id: messageId,
      fromUserId: getCurrentUserId(),
      toUserId,
      content,
      messageType,
      timestamp: Date.now(),
      isSelf: true,
      status: 'sending'
    }

    // 添加到会话
    addMessageToSession(sessionKey, toUserId, bookId, message)

    try {
      await client.value.sendMessage(toUserId, content, messageType)
    } catch (error) {
      // 更新消息状态为失败
      updateMessageStatus(sessionKey, messageId, 'failed')
      throw error
    }
  }

  /**
   * 处理接收到的消息
   */
  const handleReceivedMessage = (message: ChatReceiveMessage): void => {
    const sessionKey = getSessionKey(message.fromUserId, 0) // bookId暂时用0，实际应该从会话中获取
    
    const chatMessage: ChatMessage = {
      id: generateMessageId(),
      fromUserId: message.fromUserId,
      toUserId: message.toUserId,
      content: message.content,
      messageType: message.messageType,
      timestamp: message.timestamp,
      isSelf: false,
      status: 'sent'
    }

    addMessageToSession(sessionKey, message.fromUserId, 0, chatMessage)
    
    // 如果不是当前会话，增加未读数
    if (currentSessionKey.value !== sessionKey) {
      const session = sessions.value.get(sessionKey)
      if (session) {
        session.unreadCount++
      }
    }
  }

  /**
   * 处理消息发送成功
   */
  const handleMessageSendSuccess = (response: ChatSendResponse): void => {
    // 这里可以根据response中的信息更新对应消息的状态
    console.log('消息发送成功:', response)
  }

  /**
   * 处理消息发送失败
   */
  const handleMessageSendError = (error: Error): void => {
    console.error('消息发送失败:', error)
  }

  /**
   * 创建或获取会话
   */
  const createOrGetSession = (userId: number, bookId: number): ChatSession => {
    const sessionKey = getSessionKey(userId, bookId)
    
    if (!sessions.value.has(sessionKey)) {
      const session: ChatSession = {
        sessionId: 0, // 实际应该从API获取
        userId,
        bookId,
        messages: [],
        unreadCount: 0,
        lastActiveTime: Date.now()
      }
      sessions.value.set(sessionKey, session)
    }
    
    return sessions.value.get(sessionKey)!
  }

  /**
   * 设置当前会话
   */
  const setCurrentSession = (userId: number, bookId: number): void => {
    const sessionKey = getSessionKey(userId, bookId)
    currentSessionKey.value = sessionKey
    
    // 清除未读数
    const session = sessions.value.get(sessionKey)
    if (session) {
      session.unreadCount = 0
    }
  }

  /**
   * 添加消息到会话
   */
  const addMessageToSession = (
    sessionKey: string, 
    userId: number, 
    bookId: number, 
    message: ChatMessage
  ): void => {
    let session = sessions.value.get(sessionKey)
    if (!session) {
      session = createOrGetSession(userId, bookId)
    }
    
    session.messages.push(message)
    session.lastMessage = message
    session.lastActiveTime = Date.now()
  }

  /**
   * 更新消息状态
   */
  const updateMessageStatus = (
    sessionKey: string, 
    messageId: string, 
    status: ChatMessage['status']
  ): void => {
    const session = sessions.value.get(sessionKey)
    if (session) {
      const message = session.messages.find(m => m.id === messageId)
      if (message) {
        message.status = status
      }
    }
  }

  /**
   * 生成会话键
   */
  const getSessionKey = (userId: number, bookId: number): string => {
    return `${userId}_${bookId}`
  }

  /**
   * 生成消息ID
   */
  const generateMessageId = (): string => {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 获取当前用户ID
   */
  const getCurrentUserId = (): number => {
    // 这里应该从用户store中获取当前用户ID
    // 暂时返回0，实际使用时需要修改
    return 0
  }

  /**
   * 断开连接
   */
  const disconnect = (): void => {
    if (client.value) {
      client.value.disconnect()
    }
  }

  /**
   * 销毁客户端
   */
  const destroy = (): void => {
    if (client.value) {
      client.value.destroy()
      client.value = null
    }
    sessions.value.clear()
    currentSessionKey.value = ''
    isInitialized.value = false
  }

  /**
   * 重试失败的消息
   */
  const retryFailedMessages = async (): Promise<void> => {
    if (client.value) {
      await client.value.retryFailedMessages()
    }
  }

  return {
    // 状态
    connectionState,
    sessions,
    currentSession,
    isInitialized,
    
    // 计算属性
    isConnected,
    isAuthenticated,
    totalUnreadCount,
    
    // 方法
    initClient,
    sendMessage,
    createOrGetSession,
    setCurrentSession,
    disconnect,
    destroy,
    retryFailedMessages
  }
})