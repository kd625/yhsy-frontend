import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { IMClient } from '@/im/IMClient'
import type { ChatMessage as IMChatMessage } from '@/im/IMClient'

// 定义消息接口
export interface ChatMessage {
  id: string
  fromUserId: string
  toUserId: string
  content: string
  timestamp: number
  type: 'sent' | 'received'
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
  const isReady = computed(() => isConnected.value && isAuthenticated.value)
  const currentConversation = computed(() => {
    if (!currentConversationId.value) return null
    return conversations.value.get(currentConversationId.value) || null
  })
  const totalUnreadCount = computed(() => {
    let total = 0
    conversations.value.forEach(conv => {
      total += conv.unreadCount
    })
    return total
  })

  // 初始化IM客户端
  const initialize = (accessToken: string): void => {
    if (client.value) {
      console.warn('IM客户端已经初始化')
      return
    }

    // 创建IMClient实例
    client.value = new IMClient({
      url: 'ws://localhost:8888/websocket',
      accessToken,
      heartbeatInterval: 30000,
      reconnectDelay: 5000,
      maxReconnectAttempts: 5
    })

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

    client.value.on('authFailed', (error: any) => {
      console.error('IM客户端认证失败:', error)
      isAuthenticated.value = false
    })

    // 订阅消息事件
    client.value.on('messageReceived', (data: { content: string }) => {
      handleIncomingMessage(data)
    })

    client.value.on('messageSent', (data: { msgId: number }) => {
      handleSentMessage(data)
    })

    // 订阅重连事件
    client.value.on('reconnecting', (data: { attempt: number }) => {
      console.log(`IM客户端正在重连，第${data.attempt}次尝试`)
    })

    client.value.on('reconnected', () => {
      console.log('IM客户端重连成功')
    })

    // 订阅心跳事件
    client.value.on('heartbeatSent', () => {
      console.log('心跳已发送')
    })

    client.value.on('heartbeatReceived', () => {
      console.log('心跳响应已接收')
    })
  }

  // 连接IM服务器
  const connectIM = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!client.value) {
        reject(new Error('IM客户端未初始化，请先调用initialize方法'))
        return
      }

      if (isConnected.value) {
        if (isAuthenticated.value) {
          resolve()
        } else {
          reject(new Error('已连接但未认证'))
        }
        return
      }

      // 设置一次性事件监听器
      const onAuthenticated = () => {
        client.value?.off('authenticated', onAuthenticated)
        client.value?.off('authFailed', onAuthFailed)
        client.value?.off('disconnected', onDisconnected)
        resolve()
      }

      const onAuthFailed = (error: any) => {
        client.value?.off('authenticated', onAuthenticated)
        client.value?.off('authFailed', onAuthFailed)
        client.value?.off('disconnected', onDisconnected)
        reject(new Error(`认证失败: ${error}`))
      }

      const onDisconnected = () => {
        client.value?.off('authenticated', onAuthenticated)
        client.value?.off('authFailed', onAuthFailed)
        client.value?.off('disconnected', onDisconnected)
        reject(new Error('连接断开'))
      }

      client.value.on('authenticated', onAuthenticated)
      client.value.on('authFailed', onAuthFailed)
      client.value.on('disconnected', onDisconnected)

      // 开始连接
      client.value.connect()
    })
  }

  // 发送消息
  const sendMessage = async (toUserId: string, content: string): Promise<void> => {
    if (!client.value || !isReady.value) {
      throw new Error('IM客户端未就绪')
    }

    try {
      await client.value.sendPrivateMessage(parseInt(toUserId), content)
    } catch (error) {
      console.error('发送消息失败:', error)
      throw error
    }
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

  // 处理接收到的消息
  const handleIncomingMessage = (data: { content: string }): void => {
    // 由于当前IMClient的messageReceived事件只提供content，我们需要从content中解析消息信息
    // 这里假设content是JSON格式的消息数据
    try {
      const messageData = JSON.parse(data.content)
      const fromUserId = messageData.fromUserId || messageData.fromUser || 'unknown'
      const toUserId = messageData.toUserId || messageData.toUser || 'unknown'
      const msgId = messageData.msgId || Date.now().toString()
      const content = messageData.content || data.content
      
      // 创建聊天消息对象
      const chatMessage: ChatMessage = {
        id: msgId.toString(),
        fromUserId: fromUserId.toString(),
        toUserId: toUserId.toString(),
        content: content,
        timestamp: Date.now(),
        type: 'received'
      }

      // 获取或创建会话
      let conversation = conversations.value.get(fromUserId.toString())
      if (!conversation) {
        conversation = {
          userId: fromUserId.toString(),
          messages: [],
          unreadCount: 0,
          lastActiveTime: Date.now()
        }
        conversations.value.set(fromUserId.toString(), conversation)
      }

      // 添加消息到会话
      conversation.messages.push(chatMessage)
      conversation.lastMessage = chatMessage
      conversation.lastActiveTime = Date.now()
      
      // 如果不是当前会话，增加未读计数
      if (currentConversationId.value !== fromUserId.toString()) {
        conversation.unreadCount++
      }
    } catch (error) {
      console.error('解析接收消息失败:', error)
    }
  }

  // 处理发送的消息
  const handleSentMessage = (data: { msgId: number }): void => {
    // 由于当前IMClient的messageSent事件只提供msgId，我们需要从本地缓存中获取消息详情
    // 这里可以根据msgId查找之前发送的消息，或者在发送时缓存消息信息
    console.log('消息发送成功，msgId:', data.msgId)
  }

  // 设置当前会话
  const setCurrentConversation = (userId: string): void => {
    currentConversationId.value = userId
    
    // 清除该会话的未读计数
    const conversation = conversations.value.get(userId)
    if (conversation) {
      conversation.unreadCount = 0
    }
  }

  // 获取会话列表（按最后活跃时间排序）
  const getConversationList = computed(() => {
    return Array.from(conversations.value.values())
      .sort((a, b) => b.lastActiveTime - a.lastActiveTime)
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
    connectIM,
    sendMessage,
    disconnect,
    setCurrentConversation,
    clearConversation,
    updateConversationUserInfo
  }
})