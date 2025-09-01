<template>
  <div class="book-detail">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-skeleton :rows="8" animated />
    </div>

    <!-- 错误状态 -->
    <div v-else-if="error" class="error-container">
      <el-result
        icon="error"
        title="加载失败"
        :sub-title="error"
      >
        <template #extra>
          <el-button type="primary" @click="fetchBookDetail">重新加载</el-button>
        </template>
      </el-result>
    </div>

    <!-- 图书详情内容 -->
    <div v-else-if="book" class="book-content">
      <div class="book-header">
        <div class="book-cover">
          <el-image
            :src="book.imageUrl"
            :alt="book.bookName"
            fit="cover"
            class="cover-image"
          >
            <template #error>
              <div class="image-slot">
                <el-icon><Picture /></el-icon>
                <span>暂无封面</span>
              </div>
            </template>
          </el-image>
        </div>

        <div class="book-info">
          <h1 class="book-title">{{ book.bookName }}</h1>
          
          <div class="book-meta">
            <div class="meta-item">
              <span class="label">作者：</span>
              <span class="value">{{ book.bookAuthor }}</span>
            </div>
            <div class="meta-item">
              <span class="label">出版社：</span>
              <span class="value">{{ book.bookPublisher }}</span>
            </div>
            <div class="meta-item">
              <span class="label">ISBN：</span>
              <span class="value">{{ book.isbn }}</span>
            </div>
            <div class="meta-item">
              <span class="label">价格：</span>
              <span class="price">¥{{ (book.bookPrice / 100).toFixed(2) }}</span>
            </div>
            <div class="meta-item">
              <span class="label">状态：</span>
              <el-tag :type="getStatusType(book.bookStatus)">{{ getStatusText(book.bookStatus) }}</el-tag>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="action-buttons">
            <el-button
              v-if="canOrder"
              type="primary"
              size="large"
              :loading="ordering"
              @click="handleOrder"
            >
              立即预订
            </el-button>
            <el-button
              v-else-if="book.bookStatus === 1"
              type="warning"
              size="large"
              disabled
            >
              已被预订
            </el-button>
            <el-button
              v-else-if="book.bookStatus === 2"
              type="info"
              size="large"
              disabled
            >
              已售出
            </el-button>
            <el-button
              v-else-if="book.bookStatus === 3"
              type="info"
              size="large"
              disabled
            >
              已下架
            </el-button>
          </div>
        </div>
      </div>

      <!-- 图书描述 -->
      <div class="book-description">
        <h3>图书描述</h3>
        <div class="description-content">
          {{ book.description || '暂无描述' }}
        </div>
      </div>

      <!-- 卖家信息 -->
      <div v-if="seller" class="seller-info">
        <h3>卖家信息</h3>
        <div class="seller-card">
          <el-avatar :src="seller.userAvatar" :size="60">
            {{ seller.userName?.charAt(0) }}
          </el-avatar>
          <div class="seller-details">
            <div class="seller-name">{{ seller.userName }}</div>
            <div class="seller-account">账号：{{ seller.userAccount }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Picture } from '@element-plus/icons-vue'
import { useBookStore } from '@/store/modules/book'
import { useUserStore } from '@/store/modules/user'
import type { Book } from '@/types/book'
import type { UserVO } from '@/types/user'
import request from '@/utils/request'
import type { BaseResponse } from '@/types/common'

const route = useRoute()
const router = useRouter()
const bookStore = useBookStore()
const userStore = useUserStore()

// 响应式数据
const loading = ref(true)
const error = ref('')
const book = ref<Book | null>(null)
const seller = ref<UserVO | null>(null)
const ordering = ref(false)

// 计算属性
const canOrder = computed(() => {
  if (!book.value || !userStore.userInfo) return false
  
  // 不能预订自己的书
  if (book.value.sellerId === userStore.userInfo.id) return false
  
  // 只有在售状态才能预订
  return book.value.bookStatus === 0
})

// 获取图书详情
const fetchBookDetail = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const bookId = route.params.id as string
    if (!bookId) {
      throw new Error('图书ID不能为空')
    }

    // 调用获取图书详情接口
    const response = await request.get<BaseResponse<Book>>(`/book/get`, {
      params: { id: bookId }
    })

    if (response.data.code === 0) {
      book.value = response.data.data
      
      // 获取卖家信息
      if (book.value?.sellerId) {
        await fetchSellerInfo(book.value.sellerId)
      }
    } else {
      throw new Error(response.data.message || '获取图书详情失败')
    }
  } catch (err: any) {
    console.error('获取图书详情失败:', err)
    error.value = err.message || '获取图书详情失败'
  } finally {
    loading.value = false
  }
}

// 获取卖家信息
const fetchSellerInfo = async (sellerId: number) => {
  try {
    const response = await request.get<BaseResponse<UserVO>>(`/user/get`, {
      params: { id: sellerId }
    })

    if (response.data.code === 0) {
      seller.value = response.data.data
    }
  } catch (err) {
    console.error('获取卖家信息失败:', err)
  }
}

// 处理预订
const handleOrder = async () => {
  if (!book.value) return

  try {
    await ElMessageBox.confirm(
      `确定要预订《${book.value.bookName}》吗？`,
      '确认预订',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    ordering.value = true
    
    const response = await request.post<BaseResponse<any>>('/book/order', {
      bookId: book.value.id
    })

    if (response.data.code === 0) {
      ElMessage.success('预订成功！')
      // 重新获取图书详情以更新状态
      await fetchBookDetail()
    } else {
      throw new Error(response.data.message || '预订失败')
    }
  } catch (err: any) {
    if (err !== 'cancel') {
      console.error('预订失败:', err)
      ElMessage.error(err.message || '预订失败')
    }
  } finally {
    ordering.value = false
  }
}

// 获取状态类型
const getStatusType = (status: number) => {
  switch (status) {
    case 0: return 'success'
    case 1: return 'warning'
    case 2: return 'info'
    case 3: return 'info'
    default: return 'info'
  }
}

// 获取状态文本
const getStatusText = (status: number) => {
  switch (status) {
    case 0: return '在售'
    case 1: return '已预订'
    case 2: return '已售出'
    case 3: return '已下架'
    default: return '未知'
  }
}

// 组件挂载时获取数据
onMounted(() => {
  fetchBookDetail()
})
</script>

<style scoped>
.book-detail {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.loading-container {
  padding: 40px;
}

.error-container {
  padding: 40px;
}

.book-content {
  background: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.book-header {
  display: flex;
  gap: 30px;
  padding: 30px;
  border-bottom: 1px solid #ebeef5;
}

.book-cover {
  flex-shrink: 0;
}

.cover-image {
  width: 200px;
  height: 280px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.image-slot {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 14px;
}

.image-slot .el-icon {
  font-size: 30px;
  margin-bottom: 8px;
}

.book-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.book-title {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px 0;
  line-height: 1.4;
}

.book-meta {
  flex: 1;
}

.meta-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 16px;
}

.meta-item .label {
  color: #606266;
  font-weight: 500;
  min-width: 80px;
}

.meta-item .value {
  color: #303133;
}

.meta-item .price {
  color: #f56c6c;
  font-size: 24px;
  font-weight: 600;
}

.action-buttons {
  margin-top: 30px;
}

.action-buttons .el-button {
  min-width: 120px;
}

.book-description {
  padding: 30px;
  border-bottom: 1px solid #ebeef5;
}

.book-description h3 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.description-content {
  font-size: 16px;
  line-height: 1.6;
  color: #606266;
  white-space: pre-wrap;
}

.seller-info {
  padding: 30px;
}

.seller-info h3 {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px 0;
}

.seller-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.seller-details {
  flex: 1;
}

.seller-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.seller-account {
  font-size: 14px;
  color: #909399;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .book-detail {
    padding: 10px;
  }

  .book-header {
    flex-direction: column;
    gap: 20px;
    padding: 20px;
  }

  .cover-image {
    width: 150px;
    height: 210px;
    align-self: center;
  }

  .book-title {
    font-size: 24px;
  }

  .meta-item {
    font-size: 14px;
  }

  .meta-item .price {
    font-size: 20px;
  }

  .book-description,
  .seller-info {
    padding: 20px;
  }
}
</style>