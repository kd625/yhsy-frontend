<template>
  <div class="image-preview-wrapper">
    <!-- 图片预览 -->
    <div v-if="imageUrl" class="image-container" @click="handlePreview">
      <img :src="imageUrl" :alt="alt" class="preview-image" />
      <div class="image-overlay">
        <div class="overlay-actions">
          <el-button
            v-if="showPreview"
            type="primary"
            :icon="ZoomIn"
            circle
            size="small"
            @click.stop="openPreviewDialog"
          />
          <el-button
            v-if="showDelete"
            type="danger"
            :icon="Delete"
            circle
            size="small"
            @click.stop="handleDelete"
          />
        </div>
      </div>
    </div>
    
    <!-- 占位符 -->
    <div v-else class="placeholder" @click="handleClick">
      <el-icon class="placeholder-icon">
        <component :is="placeholderIcon" />
      </el-icon>
      <div class="placeholder-text">{{ placeholderText }}</div>
      <div v-if="tip" class="placeholder-tip">{{ tip }}</div>
    </div>
    
    <!-- 图片预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      :title="dialogTitle"
      width="80%"
      :before-close="closePreviewDialog"
      append-to-body
      class="image-preview-dialog"
    >
      <div class="dialog-image-container">
        <img :src="imageUrl" :alt="alt" class="dialog-image" />
      </div>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closePreviewDialog">关闭</el-button>
          <el-button v-if="showDownload" type="primary" @click="downloadImage">
            <el-icon><Download /></el-icon>
            下载图片
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ZoomIn,
  Delete,
  Download,
  Picture,
  Plus
} from '@element-plus/icons-vue'

// Props 定义
interface Props {
  // 图片URL
  imageUrl?: string
  // 图片alt属性
  alt?: string
  // 宽度
  width?: string | number
  // 高度
  height?: string | number
  // 是否显示预览按钮
  showPreview?: boolean
  // 是否显示删除按钮
  showDelete?: boolean
  // 是否显示下载按钮
  showDownload?: boolean
  // 占位符图标
  placeholderIcon?: any
  // 占位符文本
  placeholderText?: string
  // 提示文本
  tip?: string
  // 对话框标题
  dialogTitle?: string
  // 是否可点击
  clickable?: boolean
  // 图片适应方式
  fit?: 'fill' | 'contain' | 'cover' | 'none' | 'scale-down'
  // 边框圆角
  borderRadius?: string
}

const props = withDefaults(defineProps<Props>(), {
  imageUrl: '',
  alt: '图片预览',
  width: '200px',
  height: '280px',
  showPreview: true,
  showDelete: true,
  showDownload: true,
  placeholderIcon: Picture,
  placeholderText: '暂无图片',
  tip: '',
  dialogTitle: '图片预览',
  clickable: true,
  fit: 'cover',
  borderRadius: '8px'
})

// Emits 定义
interface Emits {
  (e: 'click'): void
  (e: 'delete'): void
  (e: 'preview'): void
}

const emit = defineEmits<Emits>()

// 响应式数据
const previewVisible = ref(false)

// 计算属性
const containerStyle = computed(() => ({
  width: typeof props.width === 'number' ? `${props.width}px` : props.width,
  height: typeof props.height === 'number' ? `${props.height}px` : props.height,
  borderRadius: props.borderRadius
}))

const imageStyle = computed(() => ({
  objectFit: props.fit
}))

// 方法
const handleClick = () => {
  if (props.clickable) {
    emit('click')
  }
}

const handlePreview = () => {
  if (props.clickable && props.imageUrl) {
    emit('preview')
    if (props.showPreview) {
      openPreviewDialog()
    }
  }
}

const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      '确认删除这张图片吗？',
      '确认删除',
      {
        confirmButtonText: '确认',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    emit('delete')
  } catch {
    // 用户取消
  }
}

const openPreviewDialog = () => {
  if (props.imageUrl) {
    previewVisible.value = true
  }
}

const closePreviewDialog = () => {
  previewVisible.value = false
}

const downloadImage = () => {
  if (!props.imageUrl) {
    ElMessage.error('没有可下载的图片')
    return
  }
  
  try {
    const link = document.createElement('a')
    link.href = props.imageUrl
    link.download = `image_${Date.now()}.jpg`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('图片下载成功')
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('图片下载失败')
  }
}
</script>

<style scoped>
.image-preview-wrapper {
  display: inline-block;
}

.image-container {
  position: relative;
  cursor: pointer;
  overflow: hidden;
  border: 1px solid #e4e7ed;
  transition: all 0.3s;
}

.image-container:hover {
  border-color: #409eff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.image-container:hover .image-overlay {
  opacity: 1;
}

.preview-image {
  width: 100%;
  height: 100%;
  display: block;
  transition: transform 0.3s;
}

.image-container:hover .preview-image {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.overlay-actions {
  display: flex;
  gap: 12px;
}

.placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background-color: #fafafa;
  border: 2px dashed #d9d9d9;
  cursor: pointer;
  transition: all 0.3s;
}

.placeholder:hover {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.placeholder-icon {
  font-size: 48px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.placeholder-text {
  color: #606266;
  font-size: 14px;
  margin-bottom: 8px;
}

.placeholder-tip {
  color: #909399;
  font-size: 12px;
  text-align: center;
  line-height: 1.4;
}

/* 对话框样式 */
.image-preview-dialog {
  .dialog-image-container {
    text-align: center;
    max-height: 70vh;
    overflow: auto;
  }
  
  .dialog-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  .dialog-footer {
    text-align: center;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .overlay-actions {
    gap: 8px;
  }
  
  .placeholder-icon {
    font-size: 36px;
  }
  
  .placeholder-text {
    font-size: 12px;
  }
  
  .placeholder-tip {
    font-size: 10px;
  }
}
</style>