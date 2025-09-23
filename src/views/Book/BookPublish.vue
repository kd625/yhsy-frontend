<template>
  <div class="book-publish-container">
    <div class="publish-header">
      <h1>发布图书</h1>
      <p>分享您的二手书，让知识传递下去</p>
    </div>

    <el-card class="publish-form-card">
      <el-form
        ref="formRef"
        :model="bookForm"
        :rules="formRules"
        label-width="120px"
        size="large"
        @submit.prevent="handleSubmit"
      >
        <!-- 图书封面上传 -->
        <el-form-item label="图书封面" prop="imageUrl" required>
          <div class="upload-section">
            <div class="cover-upload-container">
              <ImagePreview
                v-if="bookForm.imageUrl"
                :image-url="bookForm.imageUrl"
                :width="200"
                :height="280"
                alt="图书封面"
                :show-delete="true"
                :show-preview="true"
                @delete="handleDeleteCover"
              />
              <FileUpload
                v-else
                ref="uploadRef"
                :action="uploadAction"
                accept="image/*"
                :max-size="2"
                :show-file-list="false"
                upload-text="点击上传封面"
                tip="支持 JPG、PNG 格式，大小不超过 2MB"
                upload-class="cover-uploader"
                @success="handleUploadSuccess"
                @error="handleUploadError"
              >
                <template #trigger="{ loading }">
                  <div class="upload-placeholder">
                    <el-icon class="upload-icon">
                      <Loading v-if="loading" />
                      <Plus v-else />
                    </el-icon>
                    <div class="upload-text">
                      {{ loading ? '上传中...' : '点击上传封面' }}
                    </div>
                    <div class="upload-tip">支持 JPG、PNG 格式，大小不超过 2MB</div>
                  </div>
                </template>
              </FileUpload>
            </div>
          </div>
        </el-form-item>

        <!-- 基本信息 -->
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="书名" prop="bookName">
              <el-input
                v-model="bookForm.bookName"
                placeholder="请输入图书名称"
                maxlength="100"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="作者" prop="bookAuthor">
              <el-input
                v-model="bookForm.bookAuthor"
                placeholder="请输入作者姓名"
                maxlength="50"
                show-word-limit
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="出版社" prop="bookPublisher">
              <el-input
                v-model="bookForm.bookPublisher"
                placeholder="请输入出版社名称"
                maxlength="50"
                show-word-limit
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="ISBN" prop="isbn">
              <el-input
                v-model="bookForm.isbn"
                placeholder="请输入ISBN号码"
                maxlength="20"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">

          <el-col :span="12">
            <el-form-item label="价格" prop="bookPrice">
              <el-input-number
                v-model="bookForm.bookPrice"
                :min="0.01"
                :max="9999.99"
                :precision="2"
                :step="0.1"
                placeholder="请输入价格"
                style="width: 100%"
              >
                <template #append>元</template>
              </el-input-number>
            </el-form-item>
          </el-col>
        </el-row>

        <!-- 图书描述 -->
        <el-form-item label="图书描述" prop="description">
          <el-input
            v-model="bookForm.description"
            type="textarea"
            :rows="6"
            placeholder="请详细描述图书的状况、内容简介等信息，让买家更好地了解这本书"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item>
          <div class="submit-section">
            <el-button size="large" @click="handleReset">重置</el-button>
            <el-button
              type="primary"
              size="large"
              :loading="submitLoading"
              @click="handleSubmit"
            >
              {{ submitLoading ? '发布中...' : '发布图书' }}
            </el-button>
          </div>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Loading } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { useBookStore } from '@/store/modules/book'
import type { BookAddRequest } from '@/types/book'
import FileUpload from '@/components/Common/FileUpload.vue'
import ImagePreview from '@/components/Common/ImagePreview.vue'

// 路由和状态管理
const router = useRouter()
const bookStore = useBookStore()

// 表单引用
const formRef = ref<FormInstance>()
const uploadRef = ref()

// 状态管理
const submitLoading = ref(false)

// 上传配置
const uploadAction = ref('http://localhost:8080/file/upload')

// 表单数据
const bookForm = reactive<BookAddRequest>({
  categoryId: 1, // 默认分类ID
  bookName: '',
  imageUrl: '',
  description: '',
  isbn: '',
  bookAuthor: '',
  bookPublisher: '',
  bookPrice: 0
})

// 表单验证规则
const formRules: FormRules = {
  bookName: [
    { required: true, message: '请输入图书名称', trigger: 'blur' },
    { min: 1, max: 100, message: '图书名称长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  bookAuthor: [
    { required: true, message: '请输入作者姓名', trigger: 'blur' },
    { min: 1, max: 50, message: '作者姓名长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  bookPublisher: [
    { required: true, message: '请输入出版社名称', trigger: 'blur' },
    { min: 1, max: 50, message: '出版社名称长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  isbn: [
    { required: true, message: '请输入ISBN号码', trigger: 'blur' },
    { pattern: /^[0-9X-]+$/, message: 'ISBN格式不正确', trigger: 'blur' }
  ],

  bookPrice: [
    { required: true, message: '请输入价格', trigger: 'blur' },
    { type: 'number', min: 0.01, max: 9999.99, message: '价格范围在 0.01 到 9999.99 元', trigger: 'blur' }
  ],
  description: [
    { required: true, message: '请输入图书描述', trigger: 'blur' },
    { min: 10, max: 500, message: '图书描述长度在 10 到 500 个字符', trigger: 'blur' }
  ],
  imageUrl: [
    { required: true, message: '请上传图书封面', trigger: 'change' }
  ]
}

// 上传成功回调
const handleUploadSuccess = (response: any) => {
  if (response.code === 0) {
    bookForm.imageUrl = response.data
    ElMessage.success('封面上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

// 上传失败回调
const handleUploadError = (error: Error) => {
  console.error('上传失败:', error)
  ElMessage.error('上传失败，请重试')
}

// 删除封面
const handleDeleteCover = () => {
  bookForm.imageUrl = ''
  ElMessage.success('封面已删除')
}



// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    // 表单验证
    await formRef.value.validate()
    
    submitLoading.value = true
    
    // 构建请求数据
    const requestData: BookAddRequest = {
      categoryId: bookForm.categoryId,
      bookName: bookForm.bookName,
      imageUrl: bookForm.imageUrl,
      description: bookForm.description,
      isbn: bookForm.isbn,
      bookAuthor: bookForm.bookAuthor,
      bookPublisher: bookForm.bookPublisher,
      bookPrice: Math.round(bookForm.bookPrice * 100) // 转换为分
    }
    
    // 调用store方法
    const result = await bookStore.addBook(requestData)
    
    if (result.success) {
      // 询问是否继续发布
      const confirmResult = await ElMessageBox.confirm(
        '图书发布成功！是否继续发布其他图书？',
        '发布成功',
        {
          confirmButtonText: '继续发布',
          cancelButtonText: '返回首页',
          type: 'success'
        }
      ).catch(() => 'cancel')
      
      if (confirmResult === 'confirm') {
        // 重置表单
        handleReset()
      } else {
        // 返回首页
        router.push('/')
      }
    }
  } catch (error: any) {
    console.error('发布图书失败:', error)
    if (error.message !== 'cancel') {
      ElMessage.error('发布失败，请重试')
    }
  } finally {
    submitLoading.value = false
  }
}

// 重置表单
const handleReset = () => {
  if (!formRef.value) return
  
  ElMessageBox.confirm(
    '确认重置表单吗？所有已填写的信息将被清空。',
    '确认重置',
    {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    formRef.value?.resetFields()
    bookForm.imageUrl = ''
  }).catch(() => {
    // 用户取消
  })
}


</script>

<style scoped>
.book-publish-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.publish-header {
  text-align: center;
  margin-bottom: 30px;
}

.publish-header h1 {
  font-size: 28px;
  color: #303133;
  margin-bottom: 10px;
}

.publish-header p {
  font-size: 16px;
  color: #909399;
  margin: 0;
}

.publish-form-card {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.upload-section {
  display: flex;
  justify-content: flex-start;
}

.cover-upload-container {
  display: flex;
  align-items: center;
  gap: 20px;
}

.cover-uploader {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.cover-uploader:hover {
  border-color: #409eff;
}

.upload-placeholder {
  width: 200px;
  height: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
}

.upload-icon {
  font-size: 28px;
  color: #8c939d;
  margin-bottom: 16px;
}

.upload-text {
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
  text-align: center;
  line-height: 1.4;
}

.submit-section {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 30px;
}

.submit-section .el-button {
  min-width: 120px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .book-publish-container {
    padding: 10px;
  }
  
  .publish-header h1 {
    font-size: 24px;
  }
  
  .upload-placeholder {
    width: 150px;
    height: 210px;
  }
  
  .cover-upload-container {
    flex-direction: column;
    align-items: center;
  }
  
  .submit-section {
    flex-direction: column;
    align-items: center;
  }
  
  .submit-section .el-button {
    width: 100%;
    max-width: 200px;
  }
}
</style>