<template>
  <div class="home-container">
    <!-- Logo和搜索区域 -->
    <div class="header-section">
      <div class="logo-section">
        <h1 class="logo-title">砚湖书影</h1>
      </div>
      
      <!-- 搜索框 -->
      <div class="search-section">

        
        <div class="search-input-container">
          <el-input
            v-model="searchKeyword"
            placeholder="按书名、作者名、ISBN、DOI、出版社、MD5等搜索..."
            size="large"
            class="search-input"
            @keyup.enter="handleSearch"
          >
            <template #append>
              <el-button 
                type="primary" 
                @click="handleSearch"
                :loading="bookStore.searchLoading"
              >
                搜索
              </el-button>
            </template>
          </el-input>
        </div>
        

      </div>
    </div>
    
    <!-- 搜索结果提示 -->
    <div v-if="bookStore.isSearchMode" class="search-info">
      <p>搜索"{{ bookStore.searchKeyword }}"的结果 - 共找到{{ bookStore.searchResults.length }}本图书</p>
      <el-button @click="clearSearch" type="text">返回首页</el-button>
    </div>
    
    <!-- 图书展示区域 -->
    <div class="books-section">
      <!-- 最受欢迎标题 -->
      <div v-if="!bookStore.isSearchMode" class="section-header">
        <h2>最受欢迎</h2>
      </div>
      
      <!-- 图书网格 -->
      <div class="books-grid" v-loading="bookStore.isSearchMode ? bookStore.searchLoading : bookStore.recommendLoading">
        <!-- 搜索结果 -->
        <template v-if="bookStore.isSearchMode">
          <div 
            v-for="book in bookStore.searchResults" 
            :key="book.id"
            class="book-card"
            @click="goToBookDetail(book.id)"
          >
            <div class="book-image">
              <img :src="book.imageUrl || '/placeholder-book.jpg'" :alt="book.bookName" />
            </div>
            <div class="book-info">
              <h3 class="book-title" v-html="book.highlightString || book.bookName"></h3>
              <p class="book-author">{{ book.bookAuthor }}</p>
              <div class="book-meta">
                <p class="book-description">{{ truncateDescription(book.description) }}</p>
                <span class="book-price">¥{{ formatPrice(book.bookPrice) }}</span>
              </div>
            </div>
          </div>
        </template>
        
        <!-- 推荐图书列表 -->
        <template v-else>
          <div 
            v-for="book in bookStore.recommendBooks" 
            :key="book.id"
            class="book-card"
            @click="goToBookDetail(book.id)"
          >
            <div class="book-image">
              <img :src="book.imageUrl || '/placeholder-book.jpg'" :alt="book.bookName" />
            </div>
            <div class="book-info">
              <h3 class="book-title">{{ book.bookName }}</h3>
              <p class="book-author">{{ book.bookAuthor }}</p>
              <div class="book-meta">
                <span class="book-price">¥{{ formatPrice(book.bookPrice) }}</span>
                <span class="book-status" :class="getStatusClass(book.bookStatus)">
                  {{ getStatusText(book.bookStatus) }}
                </span>
              </div>
            </div>
          </div>
        </template>
        
        <!-- 空状态 -->
        <div v-if="!bookStore.loading && getCurrentList().length === 0" class="empty-state">
          <el-empty :description="bookStore.isSearchMode ? '未找到相关图书' : '暂无图书数据'" />
        </div>
      </div>
      
      <!-- 加载更多 -->
      <div v-if="!bookStore.isSearchMode && bookStore.recommendBooks.length > 0" class="load-more">
        <el-button 
          @click="() => router.push('/search')" 
          size="large"
        >
          查看更多图书
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useBookStore } from '@/store/modules/book'
import type { BookSearchRequest } from '@/types/book'

const router = useRouter()
const bookStore = useBookStore()

// 搜索相关状态
const searchKeyword = ref('')
const selectedCategory = ref<number | ''>('')
const selectedPriceRange = ref('')
const selectedStatus = ref<number | ''>()

// 获取当前显示的图书列表
const getCurrentList = () => {
  return bookStore.isSearchMode ? bookStore.searchResults : bookStore.recommendBooks
}

// 搜索处理
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  
  const searchParams: BookSearchRequest = {
     searchText: searchKeyword.value,
     categoryId: selectedCategory.value || undefined,
     pageSize: 20,
     pageNum: 1
   }
  
  // 处理价格区间
  if (selectedPriceRange.value) {
    const [lowPrice, highPrice] = selectedPriceRange.value.split('-').map(Number)
    searchParams.lowPrice = lowPrice
    searchParams.highPrice = highPrice
  }
  
  try {
    await bookStore.searchBooks(searchParams)
  } catch (error) {
    ElMessage.error('搜索失败，请重试')
  }
}

// 清除搜索
const clearSearch = () => {
  searchKeyword.value = ''
  selectedCategory.value = ''
  selectedPriceRange.value = ''
  selectedStatus.value = ''
  bookStore.resetSearch()
}

// 跳转到图书详情
const goToBookDetail = (bookId: number) => {
  router.push(`/book/${bookId}`)
}

// 格式化价格
const formatPrice = (price: number) => {
  return (price / 100).toFixed(2)
}

// 截断描述文本
const truncateDescription = (description: string) => {
  if (!description) return '暂无描述'
  return description.length > 15 ? description.substring(0, 15) + '...' : description
}

// 获取状态样式类
const getStatusClass = (status: number) => {
  switch (status) {
    case 0: return 'status-available'
    case 1: return 'status-reserved'
    case 2: return 'status-sold'
    case 3: return 'status-offline'
    default: return ''
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

// 页面初始化
onMounted(async () => {
  try {
    // 获取推荐图书列表
    await bookStore.getRecommendBooks()
  } catch (error) {
    console.error('页面初始化失败:', error)
  }
})
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: #f8f9fa;
  padding: 0;
}

/* Header区域 */
.header-section {
  background: white;
  padding: 3rem 2rem;
  text-align: center;
  border-bottom: 1px solid #e9ecef;
}

/* Logo区域 */
.logo-section {
  margin-bottom: 2rem;
}

.logo-title {
  font-size: 3.5rem;
  font-weight: 300;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  letter-spacing: -1px;
}

.logo-subtitle {
  font-size: 1.5rem;
  color: #7f8c8d;
  margin: 0 0 1rem 0;
  font-weight: 300;
}

.logo-description {
  font-size: 1rem;
  color: #95a5a6;
  margin: 0;
  max-width: 600px;
  margin: 0 auto;
}

/* 搜索区域 */
.search-section {
  max-width: 800px;
  margin: 0 auto;
}

.search-tabs {
  display: flex;
  justify-content: center;
  gap: 0;
  margin-bottom: 1.5rem;
}

.search-tab {
  border-radius: 0;
  border: 1px solid #ddd;
  background: white;
}

.search-tab:first-child {
  border-top-left-radius: 6px;
  border-bottom-left-radius: 6px;
}

.search-tab:last-child {
  border-top-right-radius: 6px;
  border-bottom-right-radius: 6px;
  border-left: none;
}

.search-input-container {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
}

.search-input :deep(.el-input__wrapper) {
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-section {
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.filter-select {
  width: 150px;
}

/* 搜索信息 */
.search-info {
  background: #e3f2fd;
  padding: 1rem 2rem;
  border-bottom: 1px solid #bbdefb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.search-info p {
  margin: 0;
  color: #1976d2;
  font-weight: 500;
}

/* 图书展示区域 */
.books-section {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.section-header {
  margin-bottom: 2rem;
}

.section-header h2 {
  font-size: 1.8rem;
  color: #2c3e50;
  margin: 0;
  font-weight: 500;
}

/* 图书网格 */
.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.book-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  height: fit-content;
}

.book-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.book-image {
  width: 100%;
  height: 280px;
  overflow: hidden;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.book-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.book-card:hover .book-image img {
  transform: scale(1.05);
}

.book-info {
  padding: 1rem;
}

.book-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-author {
  font-size: 0.8rem;
  color: #7f8c8d;
  margin: 0 0 0.8rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.book-meta {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.book-description {
  font-size: 0.8rem;
  color: #666;
  margin: 0;
  line-height: 1.4;
}

.book-price {
  font-size: 1rem;
  font-weight: 600;
  color: #f56c6c;
  align-self: flex-start;
}

.book-status {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  border-radius: 12px;
  font-weight: 500;
}

.status-available {
  background: #d4edda;
  color: #155724;
}

.status-reserved {
  background: #fff3cd;
  color: #856404;
}

.status-sold {
  background: #f8d7da;
  color: #721c24;
}

.status-offline {
  background: #e2e3e5;
  color: #383d41;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 3rem;
}

/* 加载更多 */
.load-more {
  text-align: center;
  padding: 2rem 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .books-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  }
}

@media (max-width: 768px) {
  .header-section {
    padding: 2rem 1rem;
  }
  
  .logo-title {
    font-size: 2.5rem;
  }
  
  .search-section {
    max-width: 100%;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: center;
  }
  
  .filter-select {
    width: 200px;
  }
  
  .books-section {
    padding: 1rem;
  }
  
  .books-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
  }
  
  .book-image {
    height: 200px;
  }
  
  .search-info {
    flex-direction: column;
    gap: 0.5rem;
    text-align: center;
  }
}

@media (max-width: 480px) {
  .logo-title {
    font-size: 2rem;
  }
  
  .books-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  }
  
  .search-tabs {
    flex-direction: column;
    width: 200px;
    margin: 0 auto 1.5rem;
  }
  
  .search-tab {
    border-radius: 6px !important;
    border: 1px solid #ddd !important;
    margin-bottom: 0.5rem;
  }
  
  .search-tab:last-child {
    margin-bottom: 0;
  }
}
</style>