import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  Book, 
  BookSearchRequest, 
  BookSearchResult, 
  BookListPageRequest, 
  BookCard, 
  SearchFilters, 
  PageResponse,
  BookAddRequest
} from '@/types/book'
import { request } from '@/utils/request'
import { ElMessage } from 'element-plus'

export const useBookStore = defineStore('book', () => {
  // 状态定义
  const bookList = ref<BookCard[]>([])
  const searchResults = ref<BookSearchResult[]>([])
  const recommendBooks = ref<BookCard[]>([])
  const currentBook = ref<Book | null>(null)

  const loading = ref(false)
  const searchLoading = ref(false)
  const recommendLoading = ref(false)
  
  // 分页信息
  const pagination = ref({
    current: 1,
    pageSize: 12,
    total: 0,
    pages: 0
  })
  
  // 搜索筛选条件
  const searchFilters = ref<SearchFilters>({})
  const searchKeyword = ref('')
  
  // 计算属性
  const hasMore = computed(() => {
    return pagination.value.current < pagination.value.pages
  })
  
  const isSearchMode = computed(() => {
    return searchKeyword.value.trim() !== '' || Object.keys(searchFilters.value).length > 0
  })
  
  // 获取图书列表（分页）
  const getBookList = async (params?: Partial<BookListPageRequest>) => {
    try {
      loading.value = true
      const requestParams: BookListPageRequest = {
        current: params?.current || pagination.value.current,
        pageSize: params?.pageSize || pagination.value.pageSize,
        categoryId: params?.categoryId,
        bookStatus: 0 // 只获取在售图书
      }
      
      const response = await request.post<PageResponse<Book>>('/book/list/page', requestParams)
      
      if (response.code === 0 && response.data) {
        const { records, total, current, pages, size } = response.data
        
        // 转换为卡片显示格式
        const bookCards: BookCard[] = records.map(book => ({
          id: book.id,
          bookName: book.bookName,
          bookAuthor: book.bookAuthor,
          bookPrice: book.bookPrice,
          imageUrl: book.imageUrl,
          bookStatus: book.bookStatus
        }))
        
        if (params?.current === 1) {
          // 首次加载或刷新
          bookList.value = bookCards
        } else {
          // 分页加载更多
          bookList.value.push(...bookCards)
        }
        
        pagination.value = {
          current,
          pageSize: size,
          total,
          pages
        }
        
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error: any) {
      console.error('获取图书列表失败:', error)
      ElMessage.error('获取图书列表失败')
      return { success: false, message: error.message || '获取图书列表失败' }
    } finally {
      loading.value = false
    }
  }
  
  // 搜索图书
  const searchBooks = async (searchParams: BookSearchRequest) => {
    try {
      searchLoading.value = true
      
      const response = await request.post<BookSearchResult[]>('/book/search', searchParams)
      
      if (response.code === 0 && response.data) {
        searchResults.value = response.data
        searchKeyword.value = searchParams.searchText
        
        // 更新筛选条件
        searchFilters.value = {
          categoryId: searchParams.categoryId,
          lowPrice: searchParams.lowPrice,
          highPrice: searchParams.highPrice
        }
        
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error: any) {
      console.error('搜索图书失败:', error)
      ElMessage.error('搜索图书失败')
      return { success: false, message: error.message || '搜索图书失败' }
    } finally {
      searchLoading.value = false
    }
  }
  
  // 获取图书详情
  const getBookDetail = async (id: number) => {
    try {
      loading.value = true
      
      const response = await request.get<Book>(`/book/get`, {
        params: { id }
      })
      
      if (response.code === 0 && response.data) {
        currentBook.value = response.data
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error: any) {
      console.error('获取图书详情失败:', error)
      ElMessage.error('获取图书详情失败')
      return { success: false, message: error.message || '获取图书详情失败' }
    } finally {
      loading.value = false
    }
  }
  

  
  // 加载更多图书
  const loadMore = async () => {
    if (hasMore.value && !loading.value) {
      await getBookList({
        current: pagination.value.current + 1
      })
    }
  }
  
  // 重置搜索
  const resetSearch = () => {
    searchResults.value = []
    searchKeyword.value = ''
    searchFilters.value = {}
  }
  
  // 刷新列表
  const refreshList = async () => {
    pagination.value.current = 1
    await getBookList({ current: 1 })
  }
  
  // 获取推荐图书
  const getRecommendBooks = async () => {
    try {
      recommendLoading.value = true
      
      const response = await request.get<Book[]>('/book/recommend/list')
      
      if (response.code === 0 && response.data) {
        // 转换为卡片显示格式
        const bookCards: BookCard[] = response.data.map(book => ({
          id: book.id,
          bookName: book.bookName,
          bookAuthor: book.bookAuthor,
          bookPrice: book.bookPrice,
          imageUrl: book.imageUrl,
          bookStatus: book.bookStatus
        }))
        
        recommendBooks.value = bookCards
        return { success: true, data: response.data }
      }
      return { success: false, message: response.message }
    } catch (error: any) {
      console.error('获取推荐图书失败:', error)
      ElMessage.error('获取推荐图书失败')
      return { success: false, message: error.message || '获取推荐图书失败' }
    } finally {
      recommendLoading.value = false
    }
  }

  // 添加图书
  const addBook = async (bookData: BookAddRequest) => {
    try {
      loading.value = true
      
      const response = await request.post<Book>('/book/add', bookData)
      
      if (response.code === 0 && response.data) {
        ElMessage.success('图书发布成功')
        return { success: true, data: response.data }
      }
      ElMessage.error(response.message || '图书发布失败')
      return { success: false, message: response.message }
    } catch (error: any) {
      console.error('添加图书失败:', error)
      ElMessage.error('图书发布失败')
      return { success: false, message: error.message || '图书发布失败' }
    } finally {
      loading.value = false
    }
  }

  // 清空当前图书详情
  const clearCurrentBook = () => {
    currentBook.value = null
  }
  
  return {
    // 状态
    bookList,
    searchResults,
    recommendBooks,
    currentBook,
    loading,
    searchLoading,
    recommendLoading,
    pagination,
    searchFilters,
    searchKeyword,
    
    // 计算属性
    hasMore,
    isSearchMode,
    
    // 方法
    getBookList,
    searchBooks,
    getBookDetail,
    getRecommendBooks,
    addBook,
    loadMore,
    resetSearch,
    refreshList,
    clearCurrentBook
  }
})