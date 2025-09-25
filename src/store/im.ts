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

// 定义消息通知接口
export interface MessageNotification {
  id: string
  senderName: string
  senderAvatar?: string
  senderId: string
  content: string
  timestamp: number
  sessionId: string
}

// 定义IM Store状态接口
export interface IMState {
  client: IMClient | null
  isConnected: boolean
  isAuthenticated: boolean
  conversations: Map<string, Conversation>
  currentConversationId: string | null
  // 消息通知相关状态
  currentNotification: MessageNotification | null
  notificationQueue: MessageNotification[]
}

export const useIMStore = defineStore('im', () => {
  // 状态定义
  const client = ref<IMClient | null>(null)
  const isConnected = ref<boolean>(false)
  const isAuthenticated = ref<boolean>(false)
  const conversations = ref<Map<string, Conversation>>(new Map())
  const currentConversationId = ref<string | null>(null)
  
  // 消息通知状态
  const currentNotification = ref<MessageNotification | null>(null)
  const notificationQueue = ref<MessageNotification[]>([])
  const isCurrentPageChat = ref<boolean>(false) // 当前是否在聊天页面

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

    // 获取或创建会话 - 使用sessionId作为会话ID（与历史消息加载保持一致）
    let conversation = conversations.value.get(sessionId)
    if (!conversation) {
      conversation = {
        userId: sessionId,
        messages: [],
        unreadCount: 0,
        lastActiveTime: Date.now(),
        hasMoreHistory: true,
        isLoadingHistory: false,
        historyError: null,
        oldestMsgId: null
      }
      conversations.value.set(sessionId, conversation)
      console.log('IM Store: 创建新会话用于发送消息，sessionId:', sessionId)
    }

    // 立即添加消息到会话（显示为pending状态）
    conversation.messages.push(chatMessage)
    conversation.lastMessage = chatMessage
    conversation.lastActiveTime = Date.now()
    console.log('IM Store: 消息已添加到会话，sessionId:', sessionId, '消息内容:', content)

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

  // 解析消息内容的统一函数
  const parseMessageContent = (content: string): string => {
    if (typeof content !== 'string') {
      return String(content || '')
    }
    
    try {
      const contentObj = JSON.parse(content)
      // 检查是否是嵌套的JSON结构
      if (contentObj.content) {
        return String(contentObj.content)
      } else {
        return content
      }
    } catch (e) {
      // 如果解析失败，使用原始内容
      return content
    }
  }

  // 检查消息是否已存在的函数
  const isMessageExists = (conversation: Conversation, msgId: string | number): boolean => {
    const messageId = String(msgId)
    return conversation.messages.some(msg => msg.id === messageId || String(msg.msgId) === messageId)
  }

  // 处理接收到的消息
  const handleMessageReceived = (data: IncomingChatMessage): void => {
    try {
      console.log('接收到消息:', data)
      
      // 获取当前用户ID
      const currentUserId = getCurrentUserId()
      
      // 根据sessionId匹配当前会话ID来确定是否显示消息
      if (!currentConversationId.value) {
        console.log('当前没有选中的会话，忽略消息')
        return
      }
      
      // 获取当前会话的用户ID（对方用户ID）
      let targetUserId = currentConversationId.value
      
      console.log('消息sessionId:', data.sessionId, '当前会话ID:', currentConversationId.value)
      
      const normalizedMsgId = String(data.msgId || Date.now())
      
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

      // 检查消息是否已存在，避免重复显示
      if (isMessageExists(conversation, normalizedMsgId)) {
        console.log('消息已存在，跳过添加:', normalizedMsgId)
        return
      }
      
      const parsedContent = parseMessageContent(data.content || '')
      
      // 实时消息统一处理为接收的消息（从对方发送给当前用户）
      const chatMessage: ChatMessage = {
        id: normalizedMsgId,
        fromUserId: targetUserId, // 发送者是对方用户
        toUserId: currentUserId,  // 接收者是当前用户
        content: parsedContent,
        timestamp: Date.now(),
        type: 'received',
        status: 'sent',
        msgId: data.msgId || Date.now(),
        fromUserAvatar: getUserAvatar(targetUserId)
      }

      // 添加消息到会话
      conversation.messages.push(chatMessage)
      conversation.lastMessage = chatMessage
      conversation.lastActiveTime = Date.now()
      
      // 只有当消息不是发送给当前选中会话时才增加未读计数
      if (currentConversationId.value !== targetUserId) {
        conversation.unreadCount++
      }
      
      // 触发消息通知（仅当不在当前聊天页面或不是当前会话时）
      if (!isCurrentPageChat.value || currentConversationId.value !== targetUserId) {
        const notification = createNotificationFromMessage(chatMessage, data.sessionId || targetUserId)
        showNotification(notification)
      }
      
      console.log('消息已添加到会话:', targetUserId, '消息内容:', chatMessage.content)
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
      console.log('IM Store: convertHistoryMessageToChatMessage - 输入参数:', {
        historyMsg,
        currentUserId,
        sessionId,
        index
      })
      
      // 后端返回的content已经是直接的字符串，不需要JSON解析
      const content = historyMsg.content || ''
      
      // 使用时间戳和索引生成消息ID
      const messageId = `history_${sessionId}_${index}_${new Date(historyMsg.sendTime).getTime()}`
      
      // 根据senderId判断消息发送者
      const senderId = historyMsg.senderId || 'unknown'
      const isFromCurrentUser = senderId === currentUserId
      
      // 获取对方用户ID - 这里需要根据实际业务逻辑调整
      // 如果sessionId就是对方用户ID，则使用sessionId
      // 否则需要从会话中解析出对方用户ID
      const otherUserId = sessionId
      
      const chatMessage: ChatMessage = {
        id: messageId,
        fromUserId: isFromCurrentUser ? currentUserId : senderId,
        toUserId: isFromCurrentUser ? otherUserId : currentUserId,
        content: content, // 直接使用content，不需要解析
        timestamp: new Date(historyMsg.sendTime).getTime(),
        type: isFromCurrentUser ? 'sent' : 'received',
        status: 'sent',
        msgId: parseInt(String(historyMsg.msgId || '0')) || Date.now(), // 使用历史消息的msgId
        fromUserAvatar: ''
      }
      
      console.log('IM Store: convertHistoryMessageToChatMessage - 转换结果:', chatMessage)
      return chatMessage
    } catch (error) {
      console.error('IM Store: 转换历史消息失败:', error, historyMsg)
      // 如果转换失败，创建一个默认消息
      const messageId = `history_error_${sessionId}_${index}_${Date.now()}`
      const otherUserId = sessionId
      
      const errorMessage: ChatMessage = {
        id: messageId,
        fromUserId: otherUserId,
        toUserId: currentUserId,
        content: historyMsg.content || '消息解析失败',
        timestamp: new Date(historyMsg.sendTime).getTime(),
        type: 'received',
        status: 'sent',
        msgId: Date.now(),
        fromUserAvatar: ''
      }
      
      console.log('IM Store: convertHistoryMessageToChatMessage - 错误恢复消息:', errorMessage)
      return errorMessage
    }
  }

  // 加载历史消息
  const loadMessageHistory = async (sessionId: string, pageSize: number = 10, startMsgId?: number): Promise<any> => {
    const currentUserId = getCurrentUserId()
    // 使用sessionId作为会话ID，而不是currentUserId
    const conversationId = sessionId
    
    console.log('IM Store: loadMessageHistory - sessionId:', sessionId, 'currentUserId:', currentUserId)
    
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
      console.log('IM Store: 创建新会话，conversationId:', conversationId)
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

      console.log('IM Store: 发送历史消息请求:', request)
      const response = await messageAPI.getMessageHistory(request)
      console.log('IM Store: 收到历史消息响应:', response)
      
      if (response.code === 0 && response.data) {
        // API返回的data就是消息数组
        const historyMessages = Array.isArray(response.data) ? response.data : []
        console.log('IM Store: 解析到历史消息数量:', historyMessages.length)
        
        // 转换消息格式 - 使用新的历史消息转换函数
        const chatMessages = historyMessages.map((msg, index) => {
          console.log('IM Store: 转换历史消息', index, ':', msg)
          return convertHistoryMessageToChatMessage(msg, currentUserId, sessionId, index)
        })
        
        console.log('IM Store: 转换后的聊天消息数量:', chatMessages.length)

        if (chatMessages.length > 0) {
          // 按时间排序（最新的在后面）
          chatMessages.sort((a, b) => a.timestamp - b.timestamp)
          
          // 去重处理：过滤掉已存在的消息
          const newMessages = chatMessages.filter(msg => !isMessageExists(conversation!, msg.id))
          console.log('IM Store: 去重后的新消息数量:', newMessages.length)
          
          // 如果是首次加载，直接设置消息
          if (!startMsgId) {
            conversation.messages = newMessages
          } else {
            // 如果是加载更多，将新消息插入到开头
            conversation.messages = [...newMessages, ...conversation.messages]
          }

          // 更新oldestMsgId为最早消息的msgId
          if (chatMessages.length > 0) {
            // 获取最早消息的msgId
            const oldestMessage = chatMessages.reduce((oldest, current) => 
              current.timestamp < oldest.timestamp ? current : oldest
            )
            conversation.oldestMsgId = oldestMessage.msgId || null
          }
          
          // 检查是否还有更多历史消息
          conversation.hasMoreHistory = historyMessages.length === pageSize
          
          console.log('IM Store: 会话最终消息数量:', conversation.messages.length)
        } else {
          conversation.hasMoreHistory = false
          console.log('IM Store: 没有历史消息')
        }
      } else {
        throw new Error(response.message || '加载历史消息失败')
      }
      
      return response // 返回响应数据用于调试
    } catch (error) {
      console.error('IM Store: 加载历史消息失败:', error)
      conversation.historyError = error instanceof Error ? error.message : '加载历史消息失败'
      throw error // 重新抛出错误
    } finally {
      conversation.isLoadingHistory = false
    }
  }

  // 加载更多历史消息
  const loadMoreHistory = async (sessionId: string): Promise<any> => {
    const conversationId = sessionId
    const conversation = conversations.value.get(conversationId)
    
    if (!conversation || !conversation.hasMoreHistory || conversation.isLoadingHistory) {
      return null
    }

    const response = await loadMessageHistory(sessionId, 10, conversation.oldestMsgId || undefined)
    return response
  }

  // 初始化会话历史消息
  const initConversationHistory = async (sessionId: string): Promise<void> => {
    console.log('IM Store: 开始初始化会话历史消息，sessionId:', sessionId)
    
    if (!sessionId) {
      console.warn('IM Store: sessionId为空，跳过历史消息初始化')
      return
    }

    // 使用sessionId作为会话ID
    const conversationId = sessionId
    
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
      console.log('IM Store: 创建新会话，conversationId:', conversationId)
    }
    
    console.log('IM Store: 获取会话成功，当前消息数量:', conversation.messages.length)
    
    // 如果已经有消息，跳过初始化
    if (conversation.messages.length > 0) {
      console.log('IM Store: 会话已有消息，跳过历史消息初始化')
      return
    }
    
    try {
      console.log('IM Store: 开始加载初始历史消息')
      await loadMessageHistory(sessionId, 20) // 增加初始加载数量
      console.log('IM Store: 历史消息初始化完成，最终消息数量:', conversation.messages.length)
    } catch (error) {
      console.error('IM Store: 初始化历史消息失败:', error)
      conversation.historyError = error instanceof Error ? error.message : '初始化历史消息失败'
    }
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

  // 消息通知相关方法
  const showNotification = (notification: MessageNotification): void => {
    // 如果当前正在聊天页面且是同一个会话，不显示通知
    if (isCurrentPageChat.value && currentConversationId.value === notification.senderId) {
      return
    }
    
    // 如果已有通知在显示，加入队列
    if (currentNotification.value) {
      notificationQueue.value.push(notification)
      return
    }
    
    currentNotification.value = notification
    console.log('显示消息通知:', notification)
  }

  const hideNotification = (): void => {
    currentNotification.value = null
    
    // 显示队列中的下一个通知
    if (notificationQueue.value.length > 0) {
      const nextNotification = notificationQueue.value.shift()
      if (nextNotification) {
        setTimeout(() => {
          currentNotification.value = nextNotification
        }, 300) // 延迟显示，避免动画冲突
      }
    }
  }

  const clearNotificationQueue = (): void => {
    currentNotification.value = null
    notificationQueue.value = []
  }

  const setCurrentPageChat = (isChat: boolean): void => {
    isCurrentPageChat.value = isChat
  }

  const createNotificationFromMessage = (message: ChatMessage, sessionId: string): MessageNotification => {
    return {
      id: message.id,
      senderName: message.fromUserName || `用户${message.fromUserId}`,
      senderAvatar: message.fromUserAvatar,
      senderId: message.fromUserId,
      content: message.content,
      timestamp: message.timestamp,
      sessionId
    }
  }

  return {
    // 状态
    client: computed(() => client.value),
    isConnected: computed(() => isConnected.value),
    isAuthenticated: computed(() => isAuthenticated.value),
    conversations: computed(() => conversations.value),
    currentConversationId: computed(() => currentConversationId.value),
    
    // 通知状态
    currentNotification: computed(() => currentNotification.value),
    notificationQueue: computed(() => notificationQueue.value),
    isCurrentPageChat: computed(() => isCurrentPageChat.value),
    
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
    getOrCreateConversation,
    
    // 通知相关方法
    showNotification,
    hideNotification,
    clearNotificationQueue,
    setCurrentPageChat,
    createNotificationFromMessage
  }
})