<template>
  <div class="profile-container">
    <el-card class="profile-card">
      <template #header>
        <div class="card-header">
          <h2>个人中心</h2>
        </div>
      </template>
      
      <div class="profile-content">
        <el-empty description="个人中心功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 个人中心页面
</script>

<style scoped>
.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.profile-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  color: #303133;
  margin: 0;
}

.profile-content {
  padding: 40px 20px;
  text-align: center;
}
</style>