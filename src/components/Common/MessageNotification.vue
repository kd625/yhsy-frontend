<template>
  <Teleport to="body">
    <Transition
      name="notification"
      enter-active-class="notification-enter-active"
      leave-active-class="notification-leave-active"
      enter-from-class="notification-enter-from"
      leave-to-class="notification-leave-to"
    >
      <div
        v-if="visible"
        class="message-notification"
        @click="handleClick"
      >
        <div class="notification-content">
          <div class="notification-header">
            <div class="user-info">
              <el-avatar
                :size="32"
                :src="notification?.senderAvatar"
                class="user-avatar"
              >
                {{ notification?.senderName?.charAt(0) }}
              </el-avatar>
              <span class="user-name">{{ notification?.senderName }}</span>
            </div>
            <el-button
              type="text"
              size="small"
              @click.stop="close"
              class="close-btn"
            >
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <div class="notification-body">
            <p class="message-content">{{ notification?.content }}</p>
            <span class="message-time">{{ notification ? formatTime(notification.timestamp) : '' }}</span>
          </div>
          <div class="notification-actions">
            <el-button size="small" @click.stop="close">忽略</el-button>
            <el-button type="primary" size="small" @click.stop="reply">立即回复</el-button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { ElAvatar, ElButton, ElIcon } from 'element-plus'
import { Close } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'

interface MessageNotification {
  id: string
  senderName: string
  senderAvatar?: string
  senderId: string
  content: string
  timestamp: number
  sessionId: string
}

interface Props {
  notification: MessageNotification | null
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  duration: 5000
})

const emit = defineEmits<{
  close: []
}>()

const router = useRouter()
const visible = ref(false)
let timer: number | null = null

watch(
  () => props.notification,
  (newNotification) => {
    if (newNotification) {
      show()
    }
  },
  { immediate: true }
)

const show = () => {
  visible.value = true
  
  // 自动关闭定时器
  if (timer) {
    clearTimeout(timer)
  }
  
  if (props.duration > 0) {
    timer = setTimeout(() => {
      close()
    }, props.duration)
  }
}

const close = () => {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  emit('close')
}

const handleClick = () => {
  // 点击通知区域也可以跳转到聊天页面
  reply()
}

const reply = () => {
  if (props.notification) {
    // 跳转到聊天页面
    router.push(`/chat/${props.notification.senderId}`)
    close()
  }
}

const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
  
  if (diff < 60000) { // 1分钟内
    return '刚刚'
  } else if (diff < 3600000) { // 1小时内
    return `${Math.floor(diff / 60000)}分钟前`
  } else if (diff < 86400000) { // 24小时内
    return `${Math.floor(diff / 3600000)}小时前`
  } else {
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}月${date.getDate()}日`
  }
}

onMounted(() => {
  if (props.notification) {
    show()
  }
})
</script>

<style scoped>
.message-notification {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 320px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  border: 1px solid #e4e7ed;
  z-index: 9999;
  cursor: pointer;
  transition: all 0.3s ease;
}

.message-notification:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.notification-content {
  padding: 16px;
}

.notification-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  flex-shrink: 0;
}

.user-name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}

.close-btn {
  color: #909399;
  padding: 4px;
}

.close-btn:hover {
  color: #606266;
}

.notification-body {
  margin-bottom: 12px;
}

.message-content {
  color: #606266;
  font-size: 14px;
  line-height: 1.4;
  margin: 0 0 8px 0;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.message-time {
  color: #c0c4cc;
  font-size: 12px;
}

.notification-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 动画效果 */
.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.notification-enter-from {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}

.notification-leave-to {
  opacity: 0;
  transform: translateX(100%) scale(0.8);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .message-notification {
    width: calc(100vw - 40px);
    right: 20px;
    left: 20px;
  }
}

/* 深色模式支持 */
@media (prefers-color-scheme: dark) {
  .message-notification {
    background: #2d2d2d;
    border-color: #4c4d4f;
    color: #e5eaf3;
  }
  
  .user-name {
    color: #e5eaf3;
  }
  
  .message-content {
    color: #a3a6ad;
  }
}
</style>