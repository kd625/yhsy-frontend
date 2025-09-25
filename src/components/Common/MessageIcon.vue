<template>
  <div class="message-icon-container">
    <!-- 消息图标 -->
    <el-dropdown 
      trigger="click" 
      placement="bottom-end"
      @visible-change="handleDropdownVisibleChange"
    >
      <div class="message-icon" @click="handleIconClick">
        <el-icon :size="20">
          <ChatDotRound />
        </el-icon>
        <!-- 未读消息数量徽章 -->
        <el-badge 
          v-if="unreadCount > 0" 
          :value="unreadCount > 99 ? '99+' : unreadCount"
          class="message-badge"
        />
      </div>
      
      <template #dropdown>
        <el-dropdown-menu class="message-dropdown">
          <!-- 头部 -->
          <div class="message-header">
            <span class="title">消息中心</span>
            <el-button 
              v-if="hasUnreadMessages" 
              type="text" 
              size="small"
              @click="markAllAsRead"
            >
              全部已读
            </el-button>
          </div>
          
          <!-- 会话列表 -->
          <div class="message-list" v-loading="loading">
            <template v-if="conversations.length > 0">
              <div 
                v-for="conversation in conversations" 
                :key="conversation.id"
                class="message-item"
                @click="handleConversationClick(conversation)"
              >
                <!-- 用户头像 -->
                <div class="avatar-container">
                  <el-avatar 
                    :size="40"
                    :src="conversation.targetUserAvatar || undefined"
                    :icon="UserFilled"
                  />
                </div>
                
                <!-- 消息内容 -->
                <div class="message-content">
                  <div class="user-info">
                    <span class="username">{{ conversation.userName }}</span>
                    <span class="time">{{ formatTime(conversation.expireTime) }}</span>
                  </div>
                  <div class="message-preview">
                    点击查看会话详情
                  </div>
                </div>
                
                <!-- 未读标记 -->
                <div v-if="conversation.hasUnreadMsg" class="unread-indicator">
                  <div class="red-dot"></div>
                </div>
              </div>
            </template>
            
            <!-- 空状态 -->
            <div v-else class="empty-state">
              <el-icon :size="48" color="#c0c4cc">
                <ChatDotRound />
              </el-icon>
              <p>暂无消息</p>
            </div>
          </div>
          
          <!-- 底部 -->
          <div class="message-footer">
            <el-button type="text" size="small" @click="goToMessageCenter">
              查看全部消息
            </el-button>
          </div>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElIcon, ElBadge, ElDropdown, ElDropdownMenu, ElButton, ElAvatar } from 'element-plus'
import { ChatDotRound, UserFilled } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useIMStore } from '@/store/im'
import { request } from '@/utils/request'

// 接口类型定义 - 更新为新的数据结构
interface SessionVO {
  id: string
  hasUnreadMsg: boolean
  expireTime: string
  targetUserAvatar: string | null
  userName: string
}

interface GetCurUserSessionRequest {
  userId?: string  // 改为可选的string类型，与UserVO中的id类型保持一致
}

interface SessionCurrentResponse {
  code: number
  data: SessionVO[]
  message: string
}

// 路由和状态管理
const router = useRouter()
const userStore = useUserStore()
const imStore = useIMStore()

// 响应式数据
const loading = ref(false)
const conversations = ref<SessionVO[]>([])

// 计算属性 - 更新为基于hasUnreadMsg字段
const unreadCount = computed(() => {
  return conversations.value.filter(conv => conv.hasUnreadMsg).length
})

const hasUnreadMessages = computed(() => {
  return conversations.value.some(conv => conv.hasUnreadMsg)
})

// 获取当前会话列表
const getCurrentSessions = async () => {
  if (!userStore.isLogin) {
    return
  }
  
  try {
    loading.value = true
    const requestData: GetCurUserSessionRequest = {
      userId: Number(userStore.userInfo?.id) || 0
    }
    const response = await request.post('/im/session/getCurrent', requestData) as SessionCurrentResponse
    
    if (response.code === 0) {
      conversations.value = response.data || []
    } else {
      console.error('获取会话列表失败:', response.message)
    }
  } catch (error) {
    console.error('获取会话列表失败:', error)
  } finally {
    loading.value = false
  }
}

// 处理图标点击
const handleIconClick = () => {
  if (!userStore.isLogin) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  
  // 获取最新的会话列表
  getCurrentSessions()
}

// 处理下拉框显示状态变化
const handleDropdownVisibleChange = (visible: boolean) => {
  // 移除自动调用接口的逻辑，避免频繁调用
  // 只有点击图标时才会调用 getCurrentSessions()
}

// 处理会话点击
const handleConversationClick = (conversation: SessionVO) => {
  // 跳转到单聊界面
  router.push(`/chat/${conversation.id}`)
}

// 标记所有消息为已读
const markAllAsRead = async () => {
  try {
    // 这里可以调用标记已读的API
    // await request.post('/im/session/markAllRead')
    
    // 临时处理：清除本地未读状态
    conversations.value.forEach(conv => {
      conv.hasUnreadMsg = false
    })
    
    ElMessage.success('已标记全部消息为已读')
  } catch (error) {
    console.error('标记已读失败:', error)
    ElMessage.error('操作失败')
  }
}

// 跳转到消息中心
const goToMessageCenter = () => {
  router.push('/messages')
}

// 格式化时间
const formatTime = (timeStr: string) => {
  if (!timeStr) return ''
  
  const time = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - time.getTime()
  
  // 小于1分钟
  if (diff < 60 * 1000) {
    return '刚刚'
  }
  
  // 小于1小时
  if (diff < 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 1000))}分钟前`
  }
  
  // 小于1天
  if (diff < 24 * 60 * 60 * 1000) {
    return `${Math.floor(diff / (60 * 60 * 1000))}小时前`
  }
  
  // 大于1天，显示具体日期
  const month = time.getMonth() + 1
  const day = time.getDate()
  return `${month}月${day}日`
}

// 监听IM消息，实时更新未读状态
const handleNewMessage = () => {
  // 移除自动刷新会话列表的逻辑，避免频繁调用接口
  // 当收到新消息时，可以通过其他方式更新未读状态
  // 例如：通过 WebSocket 推送或者用户主动点击消息图标时刷新
}

// 组件挂载时初始化
onMounted(() => {
  // 移除自动调用接口的逻辑，避免频繁调用
  // 只有在用户主动点击消息图标时才会调用 getCurrentSessions()
  
  // 监听IM消息事件
  if (imStore.client) {
    // 这里可以监听IM消息事件来实时更新
    // imStore.client.on('messageReceived', handleNewMessage)
  }
})

// 组件卸载时清理
onUnmounted(() => {
  // 清理事件监听
  if (imStore.client) {
    // imStore.client.off('messageReceived', handleNewMessage)
  }
})
</script>

<style scoped>
.message-icon-container {
  position: relative;
  display: inline-block;
}

.message-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: background-color 0.3s;
  position: relative;
}

.message-icon:hover {
  background-color: #f5f7fa;
}

.message-badge {
  position: absolute;
  top: -5px;
  right: -5px;
}

.message-dropdown {
  width: 320px;
  max-height: 400px;
  padding: 0;
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
  background-color: #fafafa;
}

.message-header .title {
  font-weight: 600;
  color: #303133;
}

.message-list {
  max-height: 300px;
  overflow-y: auto;
}

.message-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.3s;
  border-bottom: 1px solid #f0f0f0;
}

.message-item:hover {
  background-color: #f5f7fa;
}

.message-item:last-child {
  border-bottom: none;
}

.avatar-container {
  margin-right: 12px;
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.username {
  font-weight: 500;
  color: #303133;
  font-size: 14px;
}

.time {
  font-size: 12px;
  color: #909399;
}

.message-preview {
  font-size: 12px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.unread-indicator {
  margin-left: 8px;
  flex-shrink: 0;
}

.red-dot {
  width: 8px;
  height: 8px;
  background-color: #f56c6c;
  border-radius: 50%;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  color: #909399;
}

.empty-state p {
  margin: 12px 0 0 0;
  font-size: 14px;
}

.message-footer {
  padding: 8px 16px;
  border-top: 1px solid #ebeef5;
  background-color: #fafafa;
  text-align: center;
}
</style>