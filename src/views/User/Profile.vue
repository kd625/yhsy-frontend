<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <h2>个人中心</h2>
        </div>
      </template>
      
      <div class="profile-content">
        <!-- 用户信息展示区域 -->
        <div class="user-info-section">
          <div class="avatar-section">
            <el-avatar :size="120" :src="userStore.userInfo?.userAvatar" class="user-avatar">
              <el-icon size="60"><User /></el-icon>
            </el-avatar>
            <div class="user-basic-info">
              <h3 class="username">{{ userStore.userInfo?.userName }}</h3>
              <p class="user-account">账号：{{ userStore.userInfo?.userAccount }}</p>
              <p class="user-role">角色：{{ getRoleText(userStore.userInfo?.userRole) }}</p>
              <p class="join-time">注册时间：{{ formatDate(userStore.userInfo?.createTime) }}</p>
            </div>
          </div>
        </div>

        <!-- 编辑表单 -->
        <el-divider />
        
        <div class="edit-section">
          <h3 class="section-title">编辑个人信息</h3>
          
          <el-form
            ref="formRef"
            :model="editForm"
            :rules="formRules"
            label-width="100px"
            class="edit-form"
          >
            <el-form-item label="用户名" prop="userName">
              <el-input
                v-model="editForm.userName"
                placeholder="请输入用户名"
                maxlength="20"
                show-word-limit
              />
            </el-form-item>
            
            <el-form-item label="头像" prop="userAvatar">
              <div class="avatar-upload-section">
                <div class="current-avatar">
                  <el-avatar :size="80" :src="editForm.userAvatar">
                    <el-icon size="40"><User /></el-icon>
                  </el-avatar>
                </div>
                <div class="upload-controls">
                  <FileUpload
                    :action="uploadAction"
                    accept="image/*"
                    :max-size="2"
                    :show-file-list="false"
                    upload-text="上传新头像"
                    tip="支持 jpg、png 格式，文件大小不超过 2MB"
                    @success="handleAvatarUpload"
                    @error="handleUploadError"
                  />
                </div>
              </div>
            </el-form-item>
            
            <el-form-item>
              <el-button
                type="primary"
                @click="handleSave"
                :loading="saveLoading"
              >
                保存修改
              </el-button>
              <el-button @click="resetForm">重置</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 退出登录区域 -->
        <el-divider />
        
        <div class="logout-section">
          <h3 class="section-title">账户操作</h3>
          <el-button
            type="danger"
            @click="handleLogout"
            :loading="logoutLoading"
          >
            退出登录
          </el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import FileUpload from '@/components/Common/FileUpload.vue'
import { request } from '@/utils/request'
import type { UserUpdateRequest } from '@/types/user'

// 路由和状态管理
const router = useRouter()
const userStore = useUserStore()

// 表单引用
const formRef = ref<FormInstance>()

// 加载状态
const saveLoading = ref(false)
const logoutLoading = ref(false)

// 上传配置
const uploadAction = '/file/upload'

// 编辑表单数据
const editForm = reactive({
  userName: '',
  userAvatar: ''
})

// 表单验证规则
const formRules: FormRules = {
  userName: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

// 初始化表单数据
const initForm = () => {
  if (userStore.userInfo) {
    editForm.userName = userStore.userInfo.userName
    editForm.userAvatar = userStore.userInfo.userAvatar || ''
  }
}

// 重置表单
const resetForm = () => {
  initForm()
  formRef.value?.clearValidate()
}

// 格式化日期
const formatDate = (dateStr?: string) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// 获取角色文本
const getRoleText = (role?: string) => {
  switch (role) {
    case 'admin':
      return '管理员'
    case 'user':
      return '普通用户'
    default:
      return '未知'
  }
}

// 处理头像上传成功
const handleAvatarUpload = (response: any) => {
  if (response.code === 0 && response.data) {
    editForm.userAvatar = response.data
    ElMessage.success('头像上传成功')
  } else {
    ElMessage.error(response.message || '头像上传失败')
  }
}

// 处理上传错误
const handleUploadError = (error: Error) => {
  ElMessage.error('头像上传失败，请重试')
  console.error('Upload error:', error)
}

// 保存用户信息
const handleSave = async () => {
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
    
    saveLoading.value = true
    
    const updateData: UserUpdateRequest = {
      id: userStore.userInfo?.id!,
      userName: editForm.userName,
      userAvatar: editForm.userAvatar
    }
    
    const response = await request.post('/user/update', updateData)
    
    if (response.code === 0) {
      // 更新本地用户信息
      await userStore.getCurrentUser()
      ElMessage.success('个人信息更新成功')
    } else {
      ElMessage.error(response.message || '更新失败')
    }
  } catch (error) {
    console.error('Update user info error:', error)
    ElMessage.error('更新失败，请重试')
  } finally {
    saveLoading.value = false
  }
}

// 退出登录
const handleLogout = async () => {
  try {
    const result = await ElMessageBox.confirm(
      '确定要退出登录吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    if (result === 'confirm') {
      logoutLoading.value = true
      await userStore.logoutApi()
      ElMessage.success('已退出登录')
      router.push('/login')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Logout error:', error)
      ElMessage.error('退出登录失败')
    }
  } finally {
    logoutLoading.value = false
  }
}

// 页面初始化
onMounted(() => {
  // 如果没有用户信息，尝试获取
  if (!userStore.userInfo) {
    userStore.getCurrentUser()
  }
  initForm()
})
</script>

<style scoped>
.profile-container {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.profile-card {
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

.profile-content {
  padding: 20px 0;
}

/* 用户信息展示区域 */
.user-info-section {
  margin-bottom: 30px;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 30px;
}

.user-avatar {
  border: 3px solid #f0f0f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.user-basic-info {
  flex: 1;
}

.username {
  margin: 0 0 15px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.user-account,
.user-role,
.join-time {
  margin: 8px 0;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.user-account {
  font-weight: 500;
}

/* 编辑区域 */
.edit-section {
  margin-bottom: 30px;
}

.section-title {
  margin: 0 0 20px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.edit-form {
  max-width: 600px;
}

.avatar-upload-section {
  display: flex;
  align-items: center;
  gap: 20px;
}

.current-avatar {
  flex-shrink: 0;
}

.upload-controls {
  flex: 1;
}

/* 退出登录区域 */
.logout-section {
  padding-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .profile-container {
    padding: 10px;
  }
  
  .avatar-section {
    flex-direction: column;
    text-align: center;
    gap: 20px;
  }
  
  .user-basic-info {
    text-align: center;
  }
  
  .username {
    font-size: 20px;
  }
  
  .edit-form {
    max-width: 100%;
  }
  
  .avatar-upload-section {
    flex-direction: column;
    align-items: center;
    gap: 15px;
  }
}

@media (max-width: 480px) {
  .user-avatar {
    width: 100px !important;
    height: 100px !important;
  }
  
  .username {
    font-size: 18px;
  }
  
  .user-account,
  .user-role,
  .join-time {
    font-size: 13px;
  }
}
</style>