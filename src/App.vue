<script setup lang="ts">
import AppLayout from '@/components/Layout/AppLayout.vue'
import MessageNotification from '@/components/Common/MessageNotification.vue'
import { useIMStore } from '@/store/im'

const imStore = useIMStore()

const handleNotificationClose = () => {
  imStore.hideNotification()
}
</script>

<template>
  <AppLayout />
  
  <!-- 消息通知弹窗 -->
  <MessageNotification
    :notification="imStore.currentNotification"
    @close="handleNotificationClose"
  />
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background-color: #f5f7fa;
}

#app {
  min-height: 100vh;
}

/* Element Plus 主题定制 */
:root {
  --el-color-primary: #409eff;
  --el-color-primary-light-3: #79bbff;
  --el-color-primary-light-5: #a0cfff;
  --el-color-primary-light-7: #c6e2ff;
  --el-color-primary-light-8: #d9ecff;
  --el-color-primary-light-9: #ecf5ff;
  --el-color-primary-dark-2: #337ecc;
}

</style>
