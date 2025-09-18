<template>
  <div class="chat-page">
    <div class="chat-container">
      <!-- 会话列表 -->
      <div class="session-panel">
        <SessionList
          :sessions="sessions"
          :active-session-id="activeSession?.id"
          :current-user-id="currentUserId"
          :loading="sessionsLoading"
          :unread-counts="unreadCounts"
          @select-session="handleSelectSession"
          @create-session="handleCreateSession"
          @refresh="loadSessions"
        />
      </div>

      <!-- 聊天窗口 -->
      <div class="chat-panel">
        <ChatWindow
          v-if="activeSession"
          :session-info="activeSession"
          :current-user-id="currentUserId"
          :im-client="imClient"
          @close="handleCloseChat"
          @error="handleChatError"
        />
        
        <!-- 空状态 -->
        <div v-else class="empty-chat">
          <el-empty description="请选择一个会话开始聊天" />
        </div>
      </div>
    </div>

    <!-- 创建会话对话框 -->
    <el-dialog
      v-model="createSessionVisible"
      title="创建新会话"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="createFormRef"
        :model="createSessionForm"
        :rules="createSessionRules"
        label-width="80px"
      >
        <el-form-item label="图书ID" prop="bookId">
          <el-input
            v-model.number="createSessionForm.bookId"
            type="number"
            placeholder="请输入图书ID"
          />
        </el-form-item>
        <el-form-item label="对方用户" prop="otherUserId">
          <el-input
            v-model.number="createSessionForm.otherUserId"
            type="number"
            placeholder="请输入对方用户ID"
          />
        </el-form-item>
        <el-form-item label="身份" prop="role">
          <el-radio-group v-model="createSessionForm.role">
            <el-radio label="buyer">买家</el-radio>
            <el-radio label="seller">卖家</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="createSessionVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleConfirmCreateSession"
          :loading="createSessionLoading"
        >
          创建
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import SessionList from '../../components/Chat/SessionList.vue'
import ChatWindow from '../../components/Chat/ChatWindow.vue'
import { IMClient } from '../../im/client/IMClient'
import type { SessionVO, IMClientConfig } from '../../im/types'
import { useUserStore } from '@/store/modules/user'

// 用户信息
const userStore = useUserStore()
const currentUserId = ref(userStore.userInfo?.id || 0)

// 响应式数据
const sessions = ref<SessionVO[]>([])
const activeSession = ref<SessionVO | null>(null)
const sessionsLoading = ref(false)
const unreadCounts = ref<Record<string, number>>({})

// IM客户端
const imClient = ref<IMClient | null>(null)

// 创建会话相关
const createSessionVisible = ref(false)
const createSessionLoading = ref(false)
const createFormRef = ref<FormInstance>()
const createSessionForm = reactive({
  bookId: 0,
  otherUserId: 0,
  role: 'buyer' as 'buyer' | 'seller'
})

const createSessionRules: FormRules = {
  bookId: [
    { required: true, message: '请输入图书ID', trigger: 'blur' },
    { type: 'number', min: 1, message: '图书ID必须大于0', trigger: 'blur' }
  ],
  otherUserId: [
    { required: true, message: '请输入对方用户ID', trigger: 'blur' },
    { type: 'number', min: 1, message: '用户ID必须大于0', trigger: 'blur' }
  ],
  role: [
    { required: true, message: '请选择身份', trigger: 'change' }
  ]
}

// 方法
const initIMClient = async () => {
  try {
    const config: IMClientConfig = {
      wsUrl: 'ws://localhost:8080/websocket',
      token: userStore.token || '',
      userId: currentUserId.value,
      reconnect: {
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 30000
      },
      heartbeat: {
        interval: 30000,
        timeout: 5000
      }
    }

    imClient.value = new IMClient(config)
    
    // 设置事件回调
    imClient.value.setCallbacks({
      connected: () => {
        console.log('IM连接成功')
        ElMessage.success('连接成功')
      },
      disconnected: () => {
        console.log('IM连接断开')
        ElMessage.warning('连接已断开')
      },
      reconnecting: (attempt: number) => {
        console.log(`正在重连... 第${attempt}次尝试`)
      },
      reconnected: () => {
        console.log('重连成功')
        ElMessage.success('重连成功')
      },
      error: (error) => {
        console.error('IM连接错误:', error)
        ElMessage.error('连接错误')
      }
    })

    // 连接
    await imClient.value.connect()
    
  } catch (error) {
    console.error('初始化IM客户端失败:', error)
    ElMessage.error('初始化聊天功能失败')
  }
}

const loadSessions = async () => {
  if (!imClient.value) return
  
  try {
    sessionsLoading.value = true
    
    // 获取所有缓存的会话
    const cachedSessions = await imClient.value.getAllCachedSessions()
    sessions.value = cachedSessions
    
    // 如果没有缓存的会话，尝试从服务器获取
    if (cachedSessions.length === 0) {
      // 这里可以调用API获取用户的会话列表
      // const userSessions = await api.getUserSessions(currentUserId.value)
      // sessions.value = userSessions
    }
    
  } catch (error) {
    console.error('加载会话列表失败:', error)
    ElMessage.error('加载会话列表失败')
  } finally {
    sessionsLoading.value = false
  }
}

const handleSelectSession = (session: SessionVO) => {
  activeSession.value = session
  
  // 清除该会话的未读消息数
  if (unreadCounts.value[session.id]) {
    unreadCounts.value[session.id] = 0
  }
}

const handleCloseChat = () => {
  activeSession.value = null
}

const handleChatError = (error: any) => {
  console.error('聊天错误:', error)
  ElMessage.error('聊天功能出现错误')
}

const handleCreateSession = () => {
  createSessionVisible.value = true
  
  // 重置表单
  createSessionForm.bookId = 0
  createSessionForm.otherUserId = 0
  createSessionForm.role = 'buyer'
}

const handleConfirmCreateSession = async () => {
  if (!createFormRef.value || !imClient.value) return
  
  try {
    // 验证表单
    await createFormRef.value.validate()
    
    createSessionLoading.value = true
    
    // 构建会话创建请求
    const buyerId = createSessionForm.role === 'buyer' 
      ? currentUserId.value 
      : createSessionForm.otherUserId
    const sellerId = createSessionForm.role === 'seller' 
      ? currentUserId.value 
      : createSessionForm.otherUserId
    
    // 创建会话
    const newSession = await imClient.value.addSession({
      bookId: createSessionForm.bookId,
      buyerId,
      sellerId
    })
    
    // 添加到会话列表
    sessions.value.unshift(newSession)
    
    // 选中新创建的会话
    activeSession.value = newSession
    
    // 关闭对话框
    createSessionVisible.value = false
    
    ElMessage.success('会话创建成功')
    
  } catch (error) {
    console.error('创建会话失败:', error)
    ElMessage.error('创建会话失败')
  } finally {
    createSessionLoading.value = false
  }
}

// 生命周期
onMounted(async () => {
  if (!userStore.isLogin) {
    ElMessage.error('请先登录')
    return
  }
  
  await initIMClient()
  await loadSessions()
})

onUnmounted(() => {
  if (imClient.value) {
    imClient.value.destroy()
  }
})
</script>

<style scoped>
.chat-page {
  height: 100vh;
  background-color: #f5f7fa;
}

.chat-container {
  height: 100%;
  display: flex;
}

.session-panel {
  width: 300px;
  min-width: 300px;
  background: white;
  border-right: 1px solid #e4e7ed;
}

.chat-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
}

.empty-chat {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-container {
    flex-direction: column;
  }
  
  .session-panel {
    width: 100%;
    height: 40%;
  }
  
  .chat-panel {
    height: 60%;
  }
}
</style>