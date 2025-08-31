<template>
  <div class="book-management-container">
    <el-card class="management-card">
      <template #header>
        <div class="card-header">
          <h2>图书管理</h2>
        </div>
      </template>
      
      <div class="management-content">
        <el-empty description="图书管理功能开发中..." />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 图书管理页面
</script>

<style scoped>
.book-management-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.management-card {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  text-align: center;
}

.card-header h2 {
  color: #303133;
  margin: 0;
}

.management-content {
  padding: 40px 20px;
  text-align: center;
}
</style>