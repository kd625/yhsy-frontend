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

        <!-- 联系方式设置区域 -->
        <el-divider />
        
        <div class="contact-section">
          <div class="section-header">
            <h3 class="section-title">联系方式</h3>
            <el-button
              v-if="hasContactInfo && !isEditingContact"
              type="primary"
              size="small"
              @click="startEditContact"
            >
              修改
            </el-button>
          </div>
          
          <!-- 显示模式 -->
          <div v-if="hasContactInfo && !isEditingContact" class="contact-display">
            <div class="contact-item" v-if="contactForm.qqNumber">
              <span class="contact-label">QQ号：</span>
              <span class="contact-value">{{ contactForm.qqNumber }}</span>
            </div>
            <div class="contact-item" v-if="contactForm.wechatNumber">
              <span class="contact-label">微信号：</span>
              <span class="contact-value">{{ contactForm.wechatNumber }}</span>
            </div>
          </div>
          
          <!-- 编辑模式 -->
          <div v-if="!hasContactInfo || isEditingContact">
            <el-form
              ref="contactFormRef"
              :model="contactForm"
              :rules="contactRules"
              label-width="100px"
              class="contact-form"
            >
              <el-form-item label="QQ号" prop="qqNumber">
                <el-input
                  v-model="contactForm.qqNumber"
                  placeholder="请输入QQ号"
                  clearable
                  maxlength="15"
                  show-word-limit
                />
              </el-form-item>
              <el-form-item label="微信号" prop="wechatNumber">
                <el-input
                  v-model="contactForm.wechatNumber"
                  placeholder="请输入微信号"
                  clearable
                  maxlength="30"
                  show-word-limit
                />
              </el-form-item>
              <el-form-item>
                <el-button
                  type="primary"
                  @click="saveContactInfo"
                  :loading="contactLoading"
                >
                  保存联系方式
                </el-button>
                <el-button @click="cancelEditContact">
                  {{ hasContactInfo ? '取消' : '重置' }}
                </el-button>
              </el-form-item>
            </el-form>
          </div>
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
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { User } from '@element-plus/icons-vue'
import { useUserStore } from '@/store/modules/user'
import FileUpload from '@/components/Common/FileUpload.vue'
import { request } from '@/utils/request'
import type { UserUpdateRequest } from '@/types/user'

// 状态管理
const userStore = useUserStore()

// 表单引用
const formRef = ref<FormInstance>()
const contactFormRef = ref<FormInstance>()

// 加载状态
const saveLoading = ref(false)
const logoutLoading = ref(false)
const contactLoading = ref(false)

// 上传配置
const uploadAction = 'http://114.132.232.212:8080/file/upload'

// 编辑表单数据
const editForm = reactive({
  userName: '',
  userAvatar: ''
})

// 联系方式表单数据
const contactForm = reactive({
  qqNumber: '',
  wechatNumber: ''
})

// 表单验证规则
const formRules: FormRules = {
  userName: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ]
}

// 联系方式验证规则
const contactRules: FormRules = {
  qqNumber: [
    { pattern: /^[1-9][0-9]{4,14}$/, message: 'QQ号格式不正确', trigger: 'blur' }
  ],
  wechatNumber: [
    { pattern: /^[a-zA-Z][-_a-zA-Z0-9]{5,19}$/, message: '微信号格式不正确', trigger: 'blur' }
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
      '确定要退出登录吗？退出后将清除所有登录信息。',
      '退出登录确认',
      {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    )
    
    if (result === 'confirm') {
      logoutLoading.value = true
      // 使用store的logout方法，它会处理服务器端会话终止和客户端清理
      await userStore.logout(true)
      ElMessage.success('已安全退出登录')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('Logout error:', error)
      ElMessage.error('退出登录失败，但本地状态已清除')
      // 即使出错也要清除本地状态
      await userStore.logout(true)
    }
  } finally {
    logoutLoading.value = false
  }
}

// 保存联系方式
const saveContactInfo = async () => {
  if (!contactFormRef.value) return
  
  try {
    const valid = await contactFormRef.value.validate()
    if (!valid) return
    
    contactLoading.value = true
    
    const contactData = {
      qqNumber: contactForm.qqNumber,
      wechatNumber: contactForm.wechatNumber
    }
    
    // 根据是否已存在记录选择调用add或update接口
    const apiUrl = hasContactInfo.value ? '/user/userInfo/update' : '/user/userInfo/add'
    const response = await request.post(apiUrl, contactData)
    
    if (response.data.code === 0) {
      ElMessage.success('联系方式保存成功')
      hasContactInfo.value = true
      isEditingContact.value = false
      // 重新获取联系方式信息以确保数据同步
      await getContactInfo()
    } else {
      ElMessage.error(response.data.message || '保存失败')
    }
  } catch (error) {
    console.error('Save contact info error:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    contactLoading.value = false
  }
}

// 重置联系方式表单
const resetContactForm = () => {
  contactForm.qqNumber = ''
  contactForm.wechatNumber = ''
  contactFormRef.value?.clearValidate()
}

// 开始编辑联系方式
const startEditContact = () => {
  isEditingContact.value = true
}

// 取消编辑联系方式
const cancelEditContact = () => {
  if (hasContactInfo.value) {
    // 如果有联系方式，取消编辑并恢复原数据
    isEditingContact.value = false
    getContactInfo() // 重新获取数据
  } else {
    // 如果没有联系方式，重置表单
    resetContactForm()
  }
}

// 联系方式是否已存在
const hasContactInfo = ref(false)
// 是否正在编辑联系方式
const isEditingContact = ref(false)

// 获取联系方式信息
const getContactInfo = async () => {
  try {
    const userId = userStore.userInfo?.id
    if (!userId) {
      console.warn('User ID not found')
      return
    }
    
    const response = await request.get(`/user/userInfo/get?userId=${userId}`)
    if (response.data.code === 0 && response.data.data) {
      const contactData = response.data.data
      contactForm.qqNumber = contactData.qqNumber || ''
      contactForm.wechatNumber = contactData.wechatNumber || ''
      hasContactInfo.value = !!(contactData.qqNumber || contactData.wechatNumber)
    }
  } catch (error) {
    console.error('Get contact info error:', error)
    // 如果获取失败，保持默认空值
    hasContactInfo.value = false
  }
}

// 页面初始化
onMounted(() => {
  // 如果没有用户信息，尝试获取
  if (!userStore.userInfo) {
    userStore.getCurrentUser()
  }
  initForm()
  getContactInfo()
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

/* 联系方式区域 */
.contact-section {
  margin-bottom: 30px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.contact-display {
  max-width: 600px;
  padding: 20px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.contact-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.contact-item:last-child {
  margin-bottom: 0;
}

.contact-label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
}

.contact-value {
  color: #303133;
  font-size: 14px;
}

.contact-form {
  max-width: 600px;
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