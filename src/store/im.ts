import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { IMClient } from '@/im/IMClient'
import type { ChatMessage as IMChatMessage, IncomingChatMessage } from '@/im/IMClient'
import { useUserStore } from '@/store/modules/user'

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
      url: 'ws://localhost:8888/websocket'
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
    
    if (!client.value || !isReady.value) {
      throw new Error('IM客户端未就绪')
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
        lastActiveTime: Date.now()
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
          lastActiveTime: Date.now()
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
    updateConversationUserInfo
  }
})