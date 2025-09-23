<template>
  <div class="book-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>图书管理</h2>
        <p>管理系统中的所有图书信息</p>
      </div>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="图书名称">
          <el-input
            v-model="searchForm.bookName"
            placeholder="请输入图书名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="作者">
          <el-input
            v-model="searchForm.bookAuthor"
            placeholder="请输入作者"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="出版社">
          <el-input
            v-model="searchForm.bookPublisher"
            placeholder="请输入出版社"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.bookStatus"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="在售" :value="0" />
            <el-option label="已预订" :value="1" />
            <el-option label="已售出" :value="2" />
            <el-option label="已下架" :value="3" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 图书表格 -->
    <el-card class="table-card">
      <el-table
        :data="bookList"
        :loading="loading"
        stripe
        style="width: 100%"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="imageUrl" label="封面" width="100">
          <template #default="{ row }">
            <el-image
              :src="row.imageUrl"
              :preview-src-list="[row.imageUrl]"
              fit="cover"
              style="width: 60px; height: 80px; border-radius: 4px;"
              :hide-on-click-modal="true"
            >
              <template #error>
                <div class="image-slot">
                  <el-icon><Picture /></el-icon>
                </div>
              </template>
            </el-image>
          </template>
        </el-table-column>
        <el-table-column prop="bookName" label="图书名称" width="200" show-overflow-tooltip />
        <el-table-column prop="bookAuthor" label="作者" width="120" show-overflow-tooltip />
        <el-table-column prop="bookPublisher" label="出版社" width="150" show-overflow-tooltip />
        <el-table-column prop="isbn" label="ISBN" width="150" show-overflow-tooltip />
        <el-table-column prop="bookPrice" label="价格" width="100">
          <template #default="{ row }">
            <span class="price">¥{{ (row.bookPrice / 100).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="bookStatus" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.bookStatus)" size="small">
              {{ getStatusText(row.bookStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="sellerId" label="卖家ID" width="100" />
        <el-table-column prop="buyerId" label="买家ID" width="100">
          <template #default="{ row }">
            {{ row.buyerId || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createTime" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.createTime) }}
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.updateTime) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 编辑图书对话框 -->
    <el-dialog
      v-model="dialogVisible"
      title="编辑图书"
      width="800px"
      @close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="图书名称" prop="bookName">
              <el-input
                v-model="formData.bookName"
                placeholder="请输入图书名称"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="作者" prop="bookAuthor">
              <el-input
                v-model="formData.bookAuthor"
                placeholder="请输入作者"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出版社" prop="bookPublisher">
              <el-input
                v-model="formData.bookPublisher"
                placeholder="请输入出版社"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="ISBN" prop="isbn">
              <el-input
                v-model="formData.isbn"
                placeholder="请输入ISBN"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="价格(元)" prop="bookPrice">
              <el-input-number
                v-model="formData.bookPrice"
                :min="0"
                :precision="2"
                :step="0.1"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="状态" prop="bookStatus">
              <el-select v-model="formData.bookStatus" placeholder="请选择状态" style="width: 100%">
                <el-option label="在售" :value="0" />
                <el-option label="已预订" :value="1" />
                <el-option label="已售出" :value="2" />
                <el-option label="已下架" :value="3" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="封面图片" prop="imageUrl">
          <el-input
            v-model="formData.imageUrl"
            placeholder="请输入图片URL"
          />
        </el-form-item>
        <el-form-item label="图书描述" prop="description">
          <el-input
            v-model="formData.description"
            type="textarea"
            :rows="4"
            placeholder="请输入图书描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmit" :loading="submitLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Search, Refresh, Picture } from '@element-plus/icons-vue'
import { request } from '@/utils/request'
import type { AdminBookListPageRequest } from '@/types/book'

// 响应式数据
const loading = ref(false)
const submitLoading = ref(false)
const dialogVisible = ref(false)
const selectedBooks = ref<any[]>([])

// 搜索表单
const searchForm = reactive({
  bookName: '',
  bookAuthor: '',
  bookPublisher: '',
  bookStatus: null as number | null
})

// 分页信息
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0
})

// 图书列表
const bookList = ref<any[]>([])

// 表单相关
const formRef = ref<FormInstance>()
const formData = reactive({
  id: null as number | null,
  bookName: '',
  bookAuthor: '',
  bookPublisher: '',
  isbn: '',
  bookPrice: 0,
  bookStatus: 0,
  imageUrl: '',
  description: ''
})

// 表单验证规则
const formRules: FormRules = {
  bookName: [
    { required: true, message: '请输入图书名称', trigger: 'blur' },
    { min: 1, max: 100, message: '图书名称长度为1-100位', trigger: 'blur' }
  ],
  bookAuthor: [
    { required: true, message: '请输入作者', trigger: 'blur' },
    { min: 1, max: 50, message: '作者长度为1-50位', trigger: 'blur' }
  ],
  bookPublisher: [
    { required: true, message: '请输入出版社', trigger: 'blur' },
    { min: 1, max: 50, message: '出版社长度为1-50位', trigger: 'blur' }
  ],
  isbn: [
    { required: true, message: '请输入ISBN', trigger: 'blur' }
  ],
  bookPrice: [
    { required: true, message: '请输入价格', trigger: 'blur' },
    { type: 'number', min: 0, message: '价格不能小于0', trigger: 'blur' }
  ],
  bookStatus: [
    { required: true, message: '请选择状态', trigger: 'change' }
  ],
  imageUrl: [
    { required: true, message: '请输入封面图片URL', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入图书描述', trigger: 'blur' },
    { min: 1, max: 500, message: '描述长度为1-500位', trigger: 'blur' }
  ]
}

// 获取图书列表
const fetchBookList = async () => {
  loading.value = true
  try {
    // 过滤空值参数
    const filteredSearchForm = Object.fromEntries(
      Object.entries(searchForm).filter(([_key, value]) => 
        value !== null && value !== undefined && value !== ''
      )
    )
    
    const requestData: AdminBookListPageRequest = {
      current: pagination.current,
      pageSize: pagination.pageSize,
      ...filteredSearchForm
    }
    
    const response = await request.post('/admin/book/list/page', requestData)
    
    if (response.code === 0) {
      // 根据后端返回的数据结构，数据直接在response.data中
      if (Array.isArray(response.data)) {
        bookList.value = response.data
        pagination.total = response.data.length
      } else {
        // 如果是分页对象结构
        bookList.value = response.data.records || []
        pagination.total = response.data.total || 0
      }
    } else {
      ElMessage.error(response.message || '获取图书列表失败')
    }
  } catch (error: any) {
    console.error('获取图书列表失败:', error)
    console.error('错误详情:', error.response?.data)
    console.error('请求配置:', error.config)
    const errorMsg = error.response?.data?.message || error.message || '获取图书列表失败'
    ElMessage.error(`获取图书列表失败: ${errorMsg}`)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
  fetchBookList()
}

// 重置搜索
const handleReset = () => {
  Object.assign(searchForm, {
    bookName: '',
    bookAuthor: '',
    bookPublisher: '',
    bookStatus: null
  })
  pagination.current = 1
  fetchBookList()
}

// 分页大小改变
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.current = 1
  fetchBookList()
}

// 当前页改变
const handleCurrentChange = (page: number) => {
  pagination.current = page
  fetchBookList()
}

// 选择改变
const handleSelectionChange = (selection: any[]) => {
  selectedBooks.value = selection
}

// 编辑图书
const handleEdit = (row: any) => {
  dialogVisible.value = true
  Object.assign(formData, {
    id: row.id,
    bookName: row.bookName,
    bookAuthor: row.bookAuthor,
    bookPublisher: row.bookPublisher,
    isbn: row.isbn,
    bookPrice: row.bookPrice / 100, // 转换为元
    bookStatus: row.bookStatus,
    imageUrl: row.imageUrl || '',
    description: row.description || ''
  })
}

// 删除图书
const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除图书 "${row.bookName}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const response = await request.post('/book/delete', { id: row.id })
    
    if (response.code === 0) {
      ElMessage.success('删除成功')
      fetchBookList()
    } else {
      ElMessage.error(response.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除图书失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitLoading.value = true
    
    const data: any = {
      ...formData,
      bookPrice: Math.round(formData.bookPrice * 100) // 转换为分
    }
    
    const response = await request.post('/admin/book/update', data)
    
    if (response.code === 0) {
      ElMessage.success('更新成功')
      dialogVisible.value = false
      fetchBookList()
    } else {
      ElMessage.error(response.message || '更新失败')
    }
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitLoading.value = false
  }
}

// 关闭对话框
const handleDialogClose = () => {
  resetForm()
}

// 重置表单
const resetForm = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(formData, {
    id: null,
    bookName: '',
    bookAuthor: '',
    bookPublisher: '',
    isbn: '',
    bookPrice: 0,
    bookStatus: 0,
    imageUrl: '',
    description: ''
  })
}

// 获取状态类型
const getStatusType = (status: number) => {
  const statusMap: Record<number, string> = {
    0: 'success', // 在售
    1: 'warning', // 已预订
    2: 'info',    // 已售出
    3: 'danger'   // 已下架
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: number) => {
  const statusMap: Record<number, string> = {
    0: '在售',
    1: '已预订',
    2: '已售出',
    3: '已下架'
  }
  return statusMap[status] || '未知'
}

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN')
}

// 初始化
onMounted(() => {
  fetchBookList()
})
</script>

<style scoped>
.book-management {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left h2 {
  margin: 0 0 8px 0;
  color: #262626;
  font-size: 20px;
  font-weight: 600;
}

.header-left p {
  margin: 0;
  color: #8c8c8c;
  font-size: 14px;
}

.search-card {
  margin-bottom: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.pagination-container {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.price {
  color: #f56c6c;
  font-weight: 600;
}

.image-slot {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  background: #f5f7fa;
  color: #909399;
  font-size: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>