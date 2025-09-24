<template>
  <div class="file-upload-wrapper">
    <el-upload
      ref="uploadRef"
      :class="uploadClass"
      :action="uploadAction"
      :headers="uploadHeaders"
      :show-file-list="showFileList"
      :on-success="handleUploadSuccess"
      :on-error="handleUploadError"
      :before-upload="beforeUpload"
      :on-progress="handleProgress"
      :disabled="disabled || loading"
      :accept="accept"
      :multiple="multiple"
      :limit="limit"
      :on-exceed="handleExceed"
    >
      <slot name="trigger" :loading="loading">
        <div class="upload-trigger">
          <el-icon v-if="!loading" class="upload-icon">
            <component :is="triggerIcon" />
          </el-icon>
          <el-icon v-else class="upload-loading">
            <Loading />
          </el-icon>
          <div class="upload-text">{{ uploadText }}</div>
          <div v-if="tip" class="upload-tip">{{ tip }}</div>
        </div>
      </slot>
      
      <template #file="{ file }">
        <slot name="file" :file="file">
          <div class="file-item">
            <el-icon class="file-icon"><Document /></el-icon>
            <span class="file-name">{{ file.name }}</span>
            <el-button
              type="text"
              size="small"
              @click="handleRemove(file)"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </slot>
      </template>
    </el-upload>
    
    <!-- 进度条 -->
    <el-progress
      v-if="showProgress && progress > 0 && progress < 100"
      :percentage="progress"
      :status="progressStatus"
      class="upload-progress"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Plus,
  Loading,
  Document,
  Delete
} from '@element-plus/icons-vue'
import type { UploadProps, UploadUserFile, UploadFile } from 'element-plus'
import { getSaToken } from '@/utils/auth'

// Props 定义
interface Props {
  // 上传地址
  action?: string
  // 接受的文件类型
  accept?: string
  // 是否支持多选
  multiple?: boolean
  // 最大上传数量
  limit?: number
  // 文件大小限制 (MB)
  maxSize?: number
  // 是否显示文件列表
  showFileList?: boolean
  // 是否显示进度条
  showProgress?: boolean
  // 是否禁用
  disabled?: boolean
  // 上传按钮文本
  uploadText?: string
  // 提示文本
  tip?: string
  // 触发图标
  triggerIcon?: any
  // 自定义样式类
  uploadClass?: string
  // 已上传的文件列表
  fileList?: UploadUserFile[]
}

const props = withDefaults(defineProps<Props>(), {
  action: import.meta.env.VITE_API_BASE_URL + '/file/upload' || 'http://localhost:8080/file/upload',
  accept: '*',
  multiple: false,
  limit: 1,
  maxSize: 2,
  showFileList: true,
  showProgress: true,
  disabled: false,
  uploadText: '点击上传文件',
  tip: '',
  triggerIcon: Plus,
  uploadClass: 'default-uploader',
  fileList: () => []
})

// Emits 定义
interface Emits {
  (e: 'success', response: any, file: UploadFile): void
  (e: 'error', error: Error, file: UploadFile): void
  (e: 'progress', event: any, file: UploadFile): void
  (e: 'remove', file: UploadFile): void
  (e: 'exceed', files: File[], fileList: UploadUserFile[]): void
  (e: 'before-upload', file: File): boolean | Promise<boolean>
  (e: 'update:fileList', fileList: UploadUserFile[]): void
}

const emit = defineEmits<Emits>()

// 响应式数据
const uploadRef = ref()
const loading = ref(false)
const progress = ref(0)
const progressStatus = ref<'success' | 'exception' | 'warning' | undefined>()

// 计算属性
const uploadAction = computed(() => props.action)

const uploadHeaders = computed(() => {
  const token = getSaToken()
  return {
    'satoken': token || ''
  }
})

// 上传前验证
const beforeUpload: UploadProps['beforeUpload'] = async (file) => {
  // 文件大小验证
  const isLtMaxSize = file.size / 1024 / 1024 < props.maxSize
  if (!isLtMaxSize) {
    ElMessage.error(`文件大小不能超过 ${props.maxSize}MB!`)
    return false
  }

  // 文件类型验证
  if (props.accept !== '*') {
    const acceptTypes = props.accept.split(',')
    const fileType = file.type
    const fileName = file.name
    const fileExt = fileName.substring(fileName.lastIndexOf('.'))
    
    const isAcceptType = acceptTypes.some(type => {
      if (type.includes('*')) {
        return fileType.startsWith(type.replace('*', ''))
      }
      return type === fileType || type === fileExt
    })
    
    if (!isAcceptType) {
      ElMessage.error(`不支持的文件类型: ${fileType}`)
      return false
    }
  }

  // 自定义验证
  const customResult = emit('before-upload', file)
  if (customResult === false) {
    return false
  }
  if (customResult instanceof Promise) {
    try {
      await customResult
    } catch {
      return false
    }
  }

  loading.value = true
  progress.value = 0
  progressStatus.value = undefined
  return true
}

// 上传进度
const handleProgress: UploadProps['onProgress'] = (event, file) => {
  progress.value = Math.round(event.percent || 0)
  emit('progress', event, file)
}

// 上传成功
const handleUploadSuccess: UploadProps['onSuccess'] = (response, file) => {
  loading.value = false
  progress.value = 100
  progressStatus.value = 'success'
  
  if (response.code === 0) {
    ElMessage.success('文件上传成功')
    emit('success', response, file)
  } else {
    progressStatus.value = 'exception'
    ElMessage.error(response.message || '上传失败')
    emit('error', new Error(response.message || '上传失败'), file)
  }
  
  // 延迟隐藏进度条
  setTimeout(() => {
    progress.value = 0
    progressStatus.value = undefined
  }, 2000)
}

// 上传失败
const handleUploadError: UploadProps['onError'] = (error, file) => {
  loading.value = false
  progress.value = 0
  progressStatus.value = 'exception'
  ElMessage.error('上传失败，请重试')
  emit('error', error, file)
}

// 移除文件
const handleRemove = (file: UploadFile) => {
  uploadRef.value?.handleRemove(file)
  emit('remove', file)
}

// 超出限制
const handleExceed: UploadProps['onExceed'] = (files, fileList) => {
  ElMessage.warning(`最多只能上传 ${props.limit} 个文件`)
  emit('exceed', files, fileList)
}

// 清空文件列表
const clearFiles = () => {
  uploadRef.value?.clearFiles()
}

// 手动上传
const submit = () => {
  uploadRef.value?.submit()
}

// 暴露方法
defineExpose({
  clearFiles,
  submit,
  uploadRef
})
</script>

<style scoped>
.file-upload-wrapper {
  width: 100%;
}

.default-uploader {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.default-uploader:hover {
  border-color: #409eff;
}

.upload-trigger {
  padding: 40px 20px;
  text-align: center;
  background-color: #fafafa;
}

.upload-icon {
  font-size: 28px;
  color: #8c939d;
  margin-bottom: 16px;
}

.upload-loading {
  font-size: 28px;
  color: #409eff;
  margin-bottom: 16px;
  animation: rotate 2s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.upload-text {
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
  line-height: 1.4;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 8px;
  background-color: #f5f7fa;
}

.file-icon {
  color: #909399;
  margin-right: 8px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.upload-progress {
  margin-top: 12px;
}

/* 图片上传样式 */
.image-uploader {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
}

.image-uploader:hover {
  border-color: #409eff;
}

/* 拖拽上传样式 */
.drag-uploader {
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.3s;
  background-color: #fafafa;
}

.drag-uploader:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.drag-uploader.is-dragover {
  border-color: #409eff;
  background-color: #f0f9ff;
}
</style>