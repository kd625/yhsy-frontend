<template>
  <div class="orders-container">
    <el-card class="page-card">
      <template #header>
        <div class="card-header">
          <h2>我预订的图书</h2>
          <el-button type="primary" @click="$router.push('/')">
            <el-icon><Search /></el-icon>
            浏览更多图书
          </el-button>
        </div>
      </template>
      
      <div class="orders-content">
        <!-- 加载状态 -->
        <div v-if="loading" class="loading-container">
          <el-skeleton :rows="3" animated />
        </div>
        
        <!-- 空状态 -->
        <el-empty 
          v-else-if="!loading && bookList.length === 0" 
          description="您还没有预订任何图书"
          class="empty-state"
        >
          <el-button type="primary" @click="$router.push('/')">
            去首页看看
          </el-button>
        </el-empty>
        
        <!-- 图书列表 -->
        <div v-else class="book-grid">
          <div 
            v-for="book in bookList" 
            :key="book.id" 
            class="book-card"
            @click="handleBookClick(book.id)"
          >
            <div class="book-image">
              <el-image 
                :src="book.imageUrl" 
                fit="cover"
                class="book-cover"
                :preview-src-list="[book.imageUrl]"
                @click.stop
              >
                <template #error>
                  <div class="image-slot">
                    <el-icon><Picture /></el-icon>
                  </div>
                </template>
              </el-image>
              
              <!-- 图书状态标签 -->
              <div class="book-status">
                <el-tag 
                  :type="getStatusType(book.bookStatus)"
                  size="small"
                >
                  {{ getStatusText(book.bookStatus) }}
                </el-tag>
              </div>
            </div>
            
            <div class="book-info">
              <h3 class="book-title" :title="book.bookName">{{ book.bookName }}</h3>
              <p class="book-author">作者：{{ book.bookAuthor }}</p>
              <p class="book-publisher">出版社：{{ book.bookPublisher }}</p>
              <div class="book-price">
                <span class="price">¥{{ (book.bookPrice / 100).toFixed(2) }}</span>
              </div>
              <div class="book-time">
                <span class="order-time">预订于 {{ formatDate(book.updateTime) }}</span>
              </div>
            </div>
            
            <!-- 操作按钮 -->
            <div class="book-actions">
              <el-button 
                v-if="book.bookStatus === 1"
                size="small" 
                type="success"
                @click.stop="startChat(book)"
              >
                聊一聊
              </el-button>
              <el-button 
                size="small" 
                type="primary"
                @click.stop="handleContact(book)"
                :disabled="book.bookStatus === 2"
              >
                联系卖家
              </el-button>
              <el-button 
                size="small" 
                type="warning" 
                @click.stop="handleCancel(book.id)"
                :disabled="book.bookStatus === 2"
              >
                取消预订
              </el-button>
            </div>
          </div>
        </div>
        
        <!-- 分页 -->
        <div v-if="bookList.length > 0" class="pagination-container">
          <el-pagination
            v-model:current-page="pagination.current"
            v-model:page-size="pagination.pageSize"
            :page-sizes="[8, 16, 24, 32]"
            :total="pagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>
    
    <!-- 联系卖家对话框 -->
    <el-dialog
      v-model="contactDialogVisible"
      title="联系卖家"
      width="500px"
      :before-close="handleContactClose"
    >
      <div v-if="selectedBook" class="contact-info">
        <div class="book-summary">
          <el-image 
            :src="selectedBook.imageUrl" 
            fit="cover"
            class="dialog-book-cover"
          >
            <template #error>
              <div class="image-slot">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-image>
          <div class="book-details">
            <h4>{{ selectedBook.bookName }}</h4>
            <p>作者：{{ selectedBook.bookAuthor }}</p>
            <p class="price">价格：¥{{ (selectedBook.bookPrice / 100).toFixed(2) }}</p>
          </div>
        </div>
        
        <el-divider />
        
        <div class="contact-tips">
          <h4>联系方式</h4>
          <p>请通过以下方式联系卖家完成交易：</p>
          <ul>
            <li>站内私信（开发中）</li>
            <li>电话联系（需要卖家提供）</li>
            <li>线下面交</li>
          </ul>
          <el-alert
            title="温馨提示"
            type="info"
            description="为了您的安全，建议选择安全的交易方式，避免提前转账。"
            show-icon
            :closable="false"
          />
        </div>
      </div>
      
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="contactDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="handleConfirmContact">
            我已联系卖家
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Picture } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import { useIMStore } from '@/store/im'
import { request } from '@/utils/request'
import type { Book, UserOrderedBooksRequest } from '@/types/book'

// 路由和状态管理
const router = useRouter()
const userStore = useUserStore()
const imStore = useIMStore()

// 响应式数据
const loading = ref(false)
const bookList = ref<Book[]>([])
const contactDialogVisible = ref(false)
const selectedBook = ref<Book | null>(null)

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 8,
  total: 0
})

// 获取图书状态文本
const getStatusText = (status: number) => {
  switch (status) {
    case 0:
      return '在售'
    case 1:
      return '已预订'
    case 2:
      return '已售出'
    case 3:
      return '已下架'
    default:
      return '未知'
  }
}

// 获取状态标签类型
const getStatusType = (status: number) => {
  switch (status) {
    case 0:
      return 'success'
    case 1:
      return 'warning'
    case 2:
      return 'info'
    case 3:
      return 'danger'
    default:
      return ''
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 获取预订的图书列表
const fetchOrderedBooks = async () => {
  if (!userStore.userInfo?.id) {
    ElMessage.error('用户信息获取失败')
    return
  }
  
  try {
    loading.value = true
    
    const requestData: UserOrderedBooksRequest = {
      buyerId: userStore.userInfo.id,
      current: pagination.current,
      pageSize: pagination.pageSize
    }
    
    const response = await request.post('/book/list/page', requestData)
    
    if (response.code === 0) {
      bookList.value = response.data.records || []
      pagination.total = response.data.total || 0
    } else {
      ElMessage.error(response.message || '获取图书列表失败')
    }
  } catch (error) {
    console.error('获取图书列表失败:', error)
    ElMessage.error('获取图书列表失败')
  } finally {
    loading.value = false
  }
}

// 处理图书点击
const handleBookClick = (bookId: number) => {
  router.push(`/book/${bookId}`)
}

// 处理联系卖家
const handleContact = (book: Book) => {
  selectedBook.value = book
  contactDialogVisible.value = true
}

// 处理联系对话框关闭
const handleContactClose = () => {
  contactDialogVisible.value = false
  selectedBook.value = null
}

// 确认已联系卖家
const handleConfirmContact = () => {
  ElMessage.success('感谢您的确认，祝您交易愉快！')
  contactDialogVisible.value = false
  selectedBook.value = null
}

// 处理取消预订
const handleCancel = async (bookId: number) => {
  try {
    await ElMessageBox.confirm(
      '确定要取消预订这本图书吗？取消后其他用户可以预订。',
      '取消预订',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await request.post('/book/cancel-order', { id: bookId })
    
    if (response.code === 0) {
      ElMessage.success('取消预订成功')
      fetchOrderedBooks()
    } else {
      ElMessage.error(response.message || '取消预订失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消预订失败:', error)
      ElMessage.error('取消预订失败')
    }
  }
}

// 处理页面大小变化
const handleSizeChange = (val: number) => {
  pagination.pageSize = val
  pagination.current = 1
  fetchOrderedBooks()
}

// 处理当前页变化
const handleCurrentChange = (val: number) => {
  pagination.current = val
  fetchOrderedBooks()
}

// 开始聊天
const startChat = async (book: Book) => {
  try {
    // 确保用户已登录
    if (!userStore.isLogin || !userStore.token) {
      ElMessage.error('请先登录')
      router.push('/login')
      return
    }

    // 初始化IM客户端（如果还没有初始化）
    if (!imStore.client) {
      imStore.initialize(userStore.token)
    }

    // 确保WebSocket连接成功
    if (!imStore.isReady) {
      await imStore.connectIM()
    }
    
    // 调用后端接口开始会话
    const response = await request.post('/im/session/startChat', {
      bookId: book.id,
      buyerId: userStore.userInfo?.id,
      sellerId: book.sellerId
    })
    
    if (response.code === 0) {
      const sessionVO = response.data
      // 跳转到聊天页面，通过路由状态传递SessionVO信息
      router.push({
        path: `/chat/${sessionVO.id}`,
        state: { sessionVO }
      })
    } else {
      ElMessage.error(response.message || '创建会话失败')
    }
  } catch (error) {
    console.error('开始聊天失败:', error)
    ElMessage.error('开始聊天失败，请稍后重试')
  }
}

// 页面初始化
onMounted(() => {
  fetchOrderedBooks()
})
</script>

<style scoped>
.orders-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-header h2 {
  margin: 0;
  color: #303133;
}

.orders-content {
  padding: 20px 0;
}

.loading-container {
  padding: 40px 0;
}

.empty-state {
  padding: 60px 0;
}

.book-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.book-card {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s;
  cursor: pointer;
  background: #fff;
}

.book-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.book-image {
  position: relative;
  height: 200px;
  overflow: hidden;
}

.book-cover {
  width: 100%;
  height: 100%;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 30px;
}

.book-status {
  position: absolute;
  top: 8px;
  right: 8px;
}

.book-info {
  padding: 16px;
}

.book-title {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-author,
.book-publisher {
  margin: 4px 0;
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-price {
  margin: 8px 0;
}

.price {
  font-size: 18px;
  font-weight: 600;
  color: #f56c6c;
}

.book-time {
  margin: 8px 0;
}

.order-time {
  font-size: 12px;
  color: #909399;
}

.book-actions {
  padding: 0 16px 16px;
  display: flex;
  gap: 8px;
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

/* 联系卖家对话框样式 */
.contact-info {
  padding: 10px 0;
}

.book-summary {
  display: flex;
  gap: 15px;
  align-items: flex-start;
}

.dialog-book-cover {
  width: 80px;
  height: 100px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
}

.book-details {
  flex: 1;
}

.book-details h4 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #303133;
}

.book-details p {
  margin: 4px 0;
  font-size: 14px;
  color: #606266;
}

.book-details .price {
  color: #f56c6c;
  font-weight: 600;
}

.contact-tips h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.contact-tips p {
  margin: 8px 0;
  color: #606266;
}

.contact-tips ul {
  margin: 10px 0;
  padding-left: 20px;
}

.contact-tips li {
  margin: 5px 0;
  color: #606266;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .orders-container {
    padding: 10px;
  }
  
  .book-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 15px;
  }
  
  .card-header {
    flex-direction: column;
    gap: 15px;
    align-items: flex-start;
  }
  
  .book-summary {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .book-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }
  
  .book-image {
    height: 160px;
  }
  
  .book-actions {
    flex-direction: column;
    gap: 8px;
  }
}
</style>