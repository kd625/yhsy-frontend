import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { IMClient } from '@/im/IMClient'
import type { IncomingChatMessage } from '@/im/IMClient'
import { useUserStore } from '@/store/modules/user'
import { messageAPI } from '@/utils/request'
import type { MessagePageQueryRequest, HistoryMessage, MessageContent } from '@/types/common'

// 定义消息发送状态
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed'

// 定义消息接口
export interface ChatMessage {
  id: string
  fromUserId: string
  toUserId: string
  content: string
  timestamp: number
  type: 'sent' | 'received'
  status?: MessageStatus  // 发送状态，仅对发送的消息有效
  fromUserName?: string   // 发送者用户名
  fromUserAvatar?: string // 发送者头像
  toUserName?: string     // 接收者用户名
  toUserAvatar?: string   // 接收者头像
  msgId?: number          // 消息ID，用于状态跟踪
}

// 定义会话接口
export interface Conversation {
  userId: string
  userName?: string
  userAvatar?: string
  messages: ChatMessage[]
  unreadCount: number
  lastMessage?: ChatMessage
  lastActiveTime: number
  // 历史消息相关状态
  hasMoreHistory: boolean      // 是否还有更多历史消息
  isLoadingHistory: boolean    // 是否正在加载历史消息
  historyError: string | null  // 历史消息加载错误
  oldestMsgId: number | null   // 最早的消息ID，用于分页
}

// 定义IM Store状态接口
export interface IMState {
  client: IMClient | null
  isConnected: boolean
  isAuthenticated: boolean
  conversations: Map<string, Conversation>
  currentConversationId: string | null
}

export const useIMStore = defineStore('im', () => {
  // 状态定义
  const client = ref<IMClient | null>(null)
  const isConnected = ref<boolean>(false)
  const isAuthenticated = ref<boolean>(false)
  const conversations = ref<Map<string, Conversation>>(new Map())
  const currentConversationId = ref<string | null>(null)

  // 计算属性
  const isReady = computed(() => {
    return client.value && isConnected.value && isAuthenticated.value
  })

  const currentConversation = computed(() => {
    if (!currentConversationId.value) return null
    return conversations.value.get(currentConversationId.value) || null
  })

  const totalUnreadCount = computed(() => {
    let total = 0
    for (const conversation of conversations.value.values()) {
      total += conversation.unreadCount
    }
    return total
  })

  // 初始化IM客户端
  const initialize = (accessToken: string): void => {
    if (client.value) {
      client.value.disconnect()
    }

    client.value = new IMClient({
      accessToken,
      url: import.meta.env.VITE_WS_BASE_URL || 'ws://localhost:8999/websocket'
    })
  }

  // 初始化客户端事件监听
  const initClient = (): void => {
    if (!client.value) return

    // 订阅连接事件
    client.value.on('connected', () => {
      console.log('IM客户端已连接')
      isConnected.value = true
    })

    client.value.on('disconnected', () => {
      console.log('IM客户端已断开连接')
      isConnected.value = false
      isAuthenticated.value = false
    })

    // 订阅认证事件
    client.value.on('authenticated', () => {
      console.log('IM客户端认证成功')
      isAuthenticated.value = true
    })

    client.value.on('authFailed', (data: { error: string }) => {
      console.error('IM客户端认证失败:', data.error)
      isAuthenticated.value = false
    })

    // 订阅消息事件
    client.value.on('messageReceived', (data: IncomingChatMessage) => {
      handleMessageReceived(data)
    })

    // 订阅消息发送成功事件
    client.value.on('messageSent', (data: { msgId: number }) => {
      handleMessageSent(data)
    })

    // 订阅消息发送失败事件
    client.value.on('messageFailed', (data: { msgId: number; error: string }) => {
      handleMessageFailed(data)
    })
  }

  // 连接IM服务
  const connectIM = async (): Promise<void> => {
    if (!client.value) {
      throw new Error('IM客户端未初始化')
    }

    try {
      await client.value.connect()
      await client.value.authenticate()
    } catch (error) {
      console.error('连接IM服务失败:', error)
      throw error
    }
  }

  // 发送消息
  const sendMessage = async (toUserId: string, sessionId: string, content: string): Promise<void> => {
    console.log('IM Store 发送消息参数:', { toUserId, sessionId, content });
    console.log('sessionId类型:', typeof sessionId, 'sessionId值:', sessionId);
    
    // 检查客户端是否存在，如果不存在则尝试初始化
    if (!client.value) {
      console.log('IM客户端不存在，尝试初始化...')
      const userStore = useUserStore()
      if (userStore.token) {
        initialize(userStore.token)
        initClient()
      } else {
        throw new Error('用户未登录，无法初始化IM客户端')
      }
    }

    // 如果客户端未就绪，尝试连接
    if (!isReady.value) {
      console.log('IM客户端未就绪，尝试连接...')
      try {
        await connectIM()
        // 等待一小段时间确保连接和认证完成
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('连接IM服务失败:', error)
        throw new Error('IM客户端连接失败，请刷新页面重试')
      }
    }

    // 再次检查客户端状态
    if (!client.value || !isReady.value) {
      throw new Error('IM客户端未就绪，请稍后重试')
    }

    // 生成临时消息ID
    const tempMsgId = Date.now()
    
    // 获取当前用户ID（从userStore或其他方式获取）
    const currentUserId = getCurrentUserId()
    
    // 创建待发送的消息对象
    const chatMessage: ChatMessage = {
      id: tempMsgId.toString(),
      fromUserId: currentUserId,
      toUserId: toUserId,
      content: content,
      timestamp: Date.now(),
      type: 'sent',
      status: 'pending',
      msgId: tempMsgId,
      fromUserAvatar: getUserAvatar(currentUserId)
    }

    // 获取或创建会话
    let conversation = conversations.value.get(toUserId)
    if (!conversation) {
      conversation = {
        userId: toUserId,
        messages: [],
        unreadCount: 0,
        lastActiveTime: Date.now(),
        hasMoreHistory: true,
        isLoadingHistory: false,
        historyError: null,
        oldestMsgId: null
      }
      conversations.value.set(toUserId, conversation)
    }

    // 立即添加消息到会话（显示为pending状态）
    conversation.messages.push(chatMessage)
    conversation.lastMessage = chatMessage
    conversation.lastActiveTime = Date.now()

    try {
      await client.value.sendPrivateMessage(toUserId, sessionId, content)
      // 发送成功后更新消息状态
      const messageIndex = conversation.messages.findIndex(msg => msg.msgId === tempMsgId)
      if (messageIndex !== -1) {
        conversation.messages[messageIndex].status = 'sent'
      }
    } catch (error) {
      console.error('发送消息失败:', error)
      // 发送失败后更新消息状态
      const messageIndex = conversation.messages.findIndex(msg => msg.msgId === tempMsgId)
      if (messageIndex !== -1) {
        conversation.messages[messageIndex].status = 'failed'
      }
      throw error
    }
  }

  // 获取当前用户ID的辅助函数
  const getCurrentUserId = (): string => {
    // 从userStore获取当前用户ID
    const userStore = useUserStore()
    if (userStore.userInfo?.id) {
      return userStore.userInfo.id.toString()
    }
    
    // 如果userStore中没有，尝试从localStorage获取
    if (typeof window !== 'undefined' && window.localStorage) {
      const userInfo = localStorage.getItem('userInfo')
      if (userInfo) {
        try {
          const user = JSON.parse(userInfo)
          return user.id?.toString() || 'unknown'
        } catch (e) {
          console.error('解析用户信息失败:', e)
        }
      }
    }
    return 'unknown'
  }

  // 获取用户头像的辅助函数
  const getUserAvatar = (userId: string): string => {
    // 从userStore获取当前用户头像
    const userStore = useUserStore()
    if (userStore.userInfo?.id === userId) {
      return userStore.userInfo.userAvatar || ''
    }
    
    // TODO: 这里可以添加获取其他用户头像的逻辑
    // 比如从缓存中获取或调用API获取
    return ''
  }

  // 断开连接
  const disconnect = (): void => {
    if (client.value) {
      client.value.disconnect()
      client.value = null
    }
    
    // 重置状态
    isConnected.value = false
    isAuthenticated.value = false
    conversations.value.clear()
    currentConversationId.value = null
  }

  // 处理消息发送成功
  const handleMessageSent = (data: { msgId: number }): void => {
    console.log('消息发送成功:', data.msgId)
    
    // 遍历所有会话，找到对应的消息并更新状态
    for (const conversation of conversations.value.values()) {
      const messageIndex = conversation.messages.findIndex(msg => msg.msgId === data.msgId)
      if (messageIndex !== -1) {
        conversation.messages[messageIndex].status = 'sent'
        break
      }
    }
  }

  // 处理消息发送失败
  const handleMessageFailed = (data: { msgId: number; error: string }): void => {
    console.error('消息发送失败:', data.msgId, data.error)
    
    // 遍历所有会话，找到对应的消息并更新状态
    for (const conversation of conversations.value.values()) {
      const messageIndex = conversation.messages.findIndex(msg => msg.msgId === data.msgId)
      if (messageIndex !== -1) {
        conversation.messages[messageIndex].status = 'failed'
        break
      }
    }
  }

  // 处理接收到的消息
  const handleMessageReceived = (data: IncomingChatMessage): void => {
    try {
      console.log('接收到消息:', data)
      
      // 获取当前用户ID
      const currentUserId = getCurrentUserId()
      
      // 根据sessionId匹配当前会话ID来确定是否显示消息
      // 只有当接收到的消息的sessionId与当前选中的会话ID一致时，才显示消息
      if (!currentConversationId.value) {
        console.log('当前没有选中的会话，忽略消息')
        return
      }
      
      // 检查sessionId是否与当前会话ID匹配
      // 注意：这里需要建立sessionId与前端会话ID的映射关系
      // 暂时使用当前会话的用户ID作为发送者，后续可以根据实际需求调整
      let targetUserId = currentConversationId.value
      
      console.log('消息sessionId:', data.sessionId, '当前会话ID:', currentConversationId.value)
      console.log('将消息添加到当前会话中')
      
      const chatMessage: ChatMessage = {
        id: data.msgId?.toString() || Date.now().toString(),
        fromUserId: targetUserId, // 使用当前会话的用户ID作为发送者
        toUserId: currentUserId,
        content: data.content || '',
        timestamp: Date.now(),
        type: 'received',
        status: 'sent',
        msgId: data.msgId || Date.now(),
        fromUserAvatar: getUserAvatar(targetUserId)
      }

      // 获取或创建会话
      let conversation = conversations.value.get(targetUserId)
      if (!conversation) {
        conversation = {
          userId: targetUserId,
          messages: [],
          unreadCount: 0,
          lastActiveTime: Date.now(),
          hasMoreHistory: true,
          isLoadingHistory: false,
          historyError: null,
          oldestMsgId: null
        }
        conversations.value.set(targetUserId, conversation)
      }

      // 添加消息到会话
      conversation.messages.push(chatMessage)
      conversation.lastMessage = chatMessage
      conversation.lastActiveTime = Date.now()
      
      // 只有当消息不是发送给当前选中会话时才增加未读计数
      if (currentConversationId.value !== targetUserId) {
        conversation.unreadCount++
      }
      
      console.log('消息已添加到会话:', targetUserId, '消息内容:', chatMessage.content)
      console.log('当前会话列表:', Array.from(conversations.value.keys()))
      console.log('当前选中会话ID:', currentConversationId.value)
      console.log('消息添加到的会话ID:', targetUserId)
    } catch (error) {
      console.error('处理接收消息失败:', error)
    }
  }

  // 设置当前会话
  const setCurrentConversation = (userId: string): void => {
    currentConversationId.value = userId
    
    // 清除未读计数
    const conversation = conversations.value.get(userId)
    if (conversation) {
      conversation.unreadCount = 0
    }
  }

  // 获取会话列表（按最后活跃时间排序）
  const getConversationList = computed(() => {
    return Array.from(conversations.value.values()).sort((a, b) => b.lastActiveTime - a.lastActiveTime)
  })

  // 清除会话
  const clearConversation = (userId: string): void => {
    conversations.value.delete(userId)
    if (currentConversationId.value === userId) {
      currentConversationId.value = null
    }
  }

  // 更新会话用户信息
  const updateConversationUserInfo = (userId: string, userName?: string, userAvatar?: string): void => {
    const conversation = conversations.value.get(userId)
    if (conversation) {
      if (userName) conversation.userName = userName
      if (userAvatar) conversation.userAvatar = userAvatar
    }
  }

  // 将历史消息转换为前端消息格式
  const convertHistoryMessageToChatMessage = (
    historyMsg: HistoryMessage, 
    currentUserId: string, 
    sessionId: string,
    index: number
  ): ChatMessage => {
    try {
      // 解析content字段中的JSON字符串
      const messageContent: MessageContent = JSON.parse(historyMsg.content)
      
      // 使用解析后的msgId作为消息ID
      const messageId = messageContent.msgId?.toString() || `history_${sessionId}_${index}_${new Date(historyMsg.sendTime).getTime()}`
      
      // 根据sessionId判断消息类型（这里需要根据实际业务逻辑调整）
      // 暂时通过比较sessionId和当前用户ID来判断
      const isFromCurrentUser = messageContent.sessionId === currentUserId
      
      return {
        id: messageId,
        fromUserId: isFromCurrentUser ? currentUserId : messageContent.sessionId,
        toUserId: isFromCurrentUser ? messageContent.sessionId : currentUserId,
        content: messageContent.content, // 使用解析后的实际消息内容
        timestamp: new Date(historyMsg.sendTime).getTime(),
        type: isFromCurrentUser ? 'sent' : 'received',
        status: 'sent',
        msgId: messageContent.msgId,
        fromUserAvatar: ''
      }
    } catch (error) {
      console.error('解析历史消息content失败:', error, historyMsg.content)
      // 如果解析失败，使用原始content
      const messageId = `history_${sessionId}_${index}_${new Date(historyMsg.sendTime).getTime()}`
      return {
        id: messageId,
        fromUserId: 'unknown',
        toUserId: currentUserId,
        content: historyMsg.content, // 使用原始content
        timestamp: new Date(historyMsg.sendTime).getTime(),
        type: 'received',
        status: 'sent',
        fromUserAvatar: ''
      }
    }
  }

  // 加载历史消息
  const loadMessageHistory = async (sessionId: string, pageSize: number = 10, startMsgId?: number): Promise<void> => {
    const currentUserId = getCurrentUserId()
    const conversationId = currentUserId // 这里需要根据实际情况调整会话ID的映射
    
    // 获取或创建会话
    let conversation = conversations.value.get(conversationId)
    if (!conversation) {
      conversation = {
        userId: conversationId,
        messages: [],
        unreadCount: 0,
        lastActiveTime: Date.now(),
        hasMoreHistory: true,
        isLoadingHistory: false,
        historyError: null,
        oldestMsgId: null
      }
      conversations.value.set(conversationId, conversation)
    }

    // 设置加载状态
    conversation.isLoadingHistory = true
    conversation.historyError = null

    try {
      const request: MessagePageQueryRequest = {
        sessionId: sessionId,
        current: 1,
        pageSize: pageSize,
        startMsgId: startMsgId
      }

      const response = await messageAPI.getMessageHistory(request)
      
      if (response.code === 0 && response.data) {
        // 接口返回的是数组，直接使用
        const historyMessages = Array.isArray(response.data) ? response.data : []
        
        // 转换消息格式 - 使用新的历史消息转换函数
        const chatMessages = historyMessages.map((msg, index) => 
          convertHistoryMessageToChatMessage(msg, currentUserId, sessionId, index)
        )

        if (chatMessages.length > 0) {
          // 按时间排序（最新的在后面）
          chatMessages.sort((a, b) => a.timestamp - b.timestamp)
          
          // 如果是首次加载，直接设置消息
          if (!startMsgId) {
            conversation.messages = chatMessages
          } else {
            // 如果是加载更多，将新消息插入到开头
            conversation.messages = [...chatMessages, ...conversation.messages]
          }

          // 由于历史消息没有msgId，我们使用时间戳作为标识
          const oldestTimestamp = Math.min(...chatMessages.map(msg => msg.timestamp))
          conversation.oldestMsgId = oldestTimestamp
          
          // 检查是否还有更多历史消息
          conversation.hasMoreHistory = historyMessages.length === pageSize
        } else {
          conversation.hasMoreHistory = false
        }
      } else {
        throw new Error(response.message || '加载历史消息失败')
      }
    } catch (error) {
      console.error('加载历史消息失败:', error)
      conversation.historyError = error instanceof Error ? error.message : '加载历史消息失败'
    } finally {
      conversation.isLoadingHistory = false
    }
  }

  // 加载更多历史消息
  const loadMoreHistory = async (sessionId: string): Promise<void> => {
    const currentUserId = getCurrentUserId()
    const conversationId = currentUserId
    const conversation = conversations.value.get(conversationId)
    
    if (!conversation || !conversation.hasMoreHistory || conversation.isLoadingHistory) {
      return
    }

    await loadMessageHistory(sessionId, 10, conversation.oldestMsgId || undefined)
  }

  // 初始化会话历史消息
  const initConversationHistory = async (sessionId: string): Promise<void> => {
    await loadMessageHistory(sessionId, 10)
  }

  // 获取或创建会话 - 更新版本
  const getOrCreateConversation = (userId: string): Conversation => {
    let conversation = conversations.value.get(userId)
    if (!conversation) {
      conversation = {
        userId: userId,
        messages: [],
        unreadCount: 0,
        lastActiveTime: Date.now(),
        hasMoreHistory: true,
        isLoadingHistory: false,
        historyError: null,
        oldestMsgId: null
      }
      conversations.value.set(userId, conversation)
    }
    return conversation
  }

  return {
    // 状态
    client: computed(() => client.value),
    isConnected: computed(() => isConnected.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    conversations: computed(() => conversations.value),
    currentConversationId: computed(() => currentConversationId.value),
    
    // 计算属性
    isReady,
    currentConversation,
    totalUnreadCount,
    getConversationList,
    
    // 方法
    initialize,
    initClient,
    connectIM,
    sendMessage,
    disconnect,
    setCurrentConversation,
    clearConversation,
    updateConversationUserInfo,
    
    // 历史消息相关方法
    loadMessageHistory,
    loadMoreHistory,
    initConversationHistory,
    getOrCreateConversation
  }
})