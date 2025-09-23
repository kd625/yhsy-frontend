<template>
  <div class="dashboard">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20" justify="center">
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon user-icon">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ totalUsers.toLocaleString() }}</div>
                <div class="stat-label">总用户数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="8">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon book-icon">
                <el-icon><Reading /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ totalBooks.toLocaleString() }}</div>
                <div class="stat-label">总图书数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 新用户变化曲线 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="chart-header">
                <span class="chart-title">新用户变化趋势</span>
                <el-select v-model="userChartPeriod" @change="fetchUserData" style="width: 120px">
                  <el-option label="最近7天" value="7" />
                  <el-option label="最近30天" value="30" />
                </el-select>
              </div>
            </template>
            <div class="chart-container">
              <v-chart 
                ref="userChart" 
                :option="userChartOption" 
                :loading="userChartLoading"
                style="height: 300px;"
              />
            </div>
          </el-card>
        </el-col>

        <!-- 图书状态分布 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span class="chart-title">图书状态分布</span>
            </template>
            <div class="chart-container">
              <v-chart 
                ref="bookChart" 
                :option="bookChartOption" 
                :loading="bookChartLoading"
                style="height: 300px;"
              />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 最近活动 -->
    <div class="recent-activities">
      <el-card>
        <template #header>
          <span class="chart-title">最近活动</span>
        </template>
        <el-timeline>
          <el-timeline-item
            v-for="activity in recentActivities"
            :key="activity.id"
            :timestamp="activity.time"
            placement="top"
          >
            <el-card>
              <h4>{{ activity.title }}</h4>
              <p>{{ activity.description }}</p>
            </el-card>
          </el-timeline-item>
        </el-timeline>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import VChart from 'vue-echarts'
import { request } from '@/utils/request'
import { User, Reading } from '@element-plus/icons-vue'

// 注册 ECharts 组件
use([
  CanvasRenderer,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
])

// 统计数据
const totalUsers = ref(0)
const totalBooks = ref(0)

// 用户图表相关
const userChartPeriod = ref('7')
const userChartLoading = ref(false)
const userChartOption = ref({})

// 图书图表相关
const bookChartLoading = ref(false)
const bookChartOption = ref({})

// 最近活动
const recentActivities = ref([
  {
    id: 1,
    title: '新用户注册',
    description: '用户 张三 完成注册',
    time: '2024-01-20 10:30'
  },
  {
    id: 2,
    title: '图书发布',
    description: '用户 李四 发布了《Vue.js设计与实现》',
    time: '2024-01-20 09:15'
  },
  {
    id: 3,
    title: '订单完成',
    description: '订单 #12345 已完成交易',
    time: '2024-01-20 08:45'
  }
])

// 获取用户数据
const fetchUserData = async () => {
  userChartLoading.value = true
  try {
    const days = parseInt(userChartPeriod.value)
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)
    
    const params = {
      begin: startDate.toISOString().split('T')[0],
      end: endDate.toISOString().split('T')[0]
    }
    
    const response = await request.get('/admin/user', params)
    
    if (response.code === 0 && response.data) {
        const data = response.data
        // 处理后端返回的字符串格式数据
        const dates = data.dateList ? data.dateList.split(',') : []
        const totalUsersList = data.totalUserList ? data.totalUserList.split(',').map((item: string) => parseInt(item)) : []
        const newUsers = data.newUserList ? data.newUserList.split(',').map((item: string) => parseInt(item)) : []
        
        // 更新顶部统计数据中的总用户数
        if (totalUsersList.length > 0) {
          totalUsers.value = totalUsersList[totalUsersList.length - 1]
        }
      
      userChartOption.value = {
        title: {
          text: '用户变化趋势',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'normal'
          }
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'cross'
          }
        },
        legend: {
          data: ['总用户数', '新增用户'],
          top: 30
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '3%',
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: dates,
          axisLabel: {
            formatter: (value: string) => {
              return value.split('-').slice(1).join('/')
            }
          }
        },
        yAxis: {
          type: 'value',
          minInterval: 1
        },
        series: [
          {
            name: '总用户数',
            type: 'line',
            data: totalUsersList,
            smooth: true,
            itemStyle: {
              color: '#1890ff'
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [{
                  offset: 0, color: 'rgba(24, 144, 255, 0.3)'
                }, {
                  offset: 1, color: 'rgba(24, 144, 255, 0.1)'
                }]
              }
            }
          },
          {
            name: '新增用户',
            type: 'line',
            data: newUsers,
            smooth: true,
            itemStyle: {
              color: '#67C23A'
            },
            lineStyle: {
              type: 'dashed'
            }
          }
        ]
      }
    } else {
      // 如果API调用失败，使用模拟数据
      generateMockUserData()
    }
  } catch (error) {
    console.error('获取用户数据失败:', error)
    // 使用模拟数据
    generateMockUserData()
  } finally {
    userChartLoading.value = false
  }
}

// 生成模拟用户数据
const generateMockUserData = () => {
  const days = parseInt(userChartPeriod.value)
  const dates: string[] = []
  const totalUsers: number[] = []
  const newUsers: number[] = []
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    dates.push(date.toISOString().split('T')[0])
    totalUsers.push(Math.floor(Math.random() * 50) + 100)
    newUsers.push(Math.floor(Math.random() * 20) + 5)
  }
  
  userChartOption.value = {
    title: {
      text: '用户变化趋势',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['总用户数', '新增用户'],
      top: 30
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLabel: {
        formatter: (value: string) => {
          return value.split('-').slice(1).join('/')
        }
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1
    },
    series: [
      {
        name: '总用户数',
        type: 'line',
        data: totalUsers,
        smooth: true,
        itemStyle: {
          color: '#1890ff'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [{
              offset: 0, color: 'rgba(24, 144, 255, 0.3)'
            }, {
              offset: 1, color: 'rgba(24, 144, 255, 0.1)'
            }]
          }
        }
      },
      {
        name: '新增用户',
        type: 'line',
        data: newUsers,
        smooth: true,
        itemStyle: {
          color: '#67C23A'
        },
        lineStyle: {
          type: 'dashed'
        }
      }
    ]
  }
}

// 获取图书状态数据
const fetchBookStatusData = async () => {
  bookChartLoading.value = true
  try {
    const response = await request.get('/admin/book/status')
    
    if (response.code === 0 && response.data) {
      const data = response.data
      const chartData = [
        { value: data.sellingCount || 0, name: '在售' },
        { value: data.orderedCount || 0, name: '已预订' },
        { value: data.soldCount || 0, name: '已售出' },
        { value: data.unsoldCount || 0, name: '已下架' }
      ]
      
      // 更新顶部统计数据中的总图书数
      totalBooks.value = (data.sellingCount || 0) + (data.orderedCount || 0) + (data.soldCount || 0) + (data.unsoldCount || 0)
      
      bookChartOption.value = {
        title: {
          text: '图书状态分布',
          left: 'center',
          textStyle: {
            fontSize: 16,
            fontWeight: 'normal'
          }
        },
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        legend: {
          orient: 'vertical',
          left: 'left',
          data: ['在售', '已预订', '已售出', '已下架']
        },
        series: [{
          name: '图书状态',
          type: 'pie',
          radius: '50%',
          data: chartData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          itemStyle: {
            color: (params: any) => {
              const colors = ['#52c41a', '#faad14', '#1890ff', '#f5222d']
              return colors[params.dataIndex]
            }
          }
        }]
      }
    } else {
      // 如果API调用失败，使用模拟数据
      generateMockBookData()
    }
  } catch (error) {
    console.error('获取图书状态数据失败:', error)
    // 使用模拟数据
    generateMockBookData()
  } finally {
    bookChartLoading.value = false
  }
}

// 生成模拟图书数据
const generateMockBookData = () => {
  const chartData = [
    { value: 1200, name: '在售' },
    { value: 300, name: '已预订' },
    { value: 800, name: '已售出' },
    { value: 150, name: '已下架' }
  ]
  
  bookChartOption.value = {
    title: {
      text: '图书状态分布',
      left: 'center',
      textStyle: {
        fontSize: 16,
        fontWeight: 'normal'
      }
    },
    tooltip: {
      trigger: 'item',
      formatter: '{a} <br/>{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      left: 'left',
      data: ['在售', '已预订', '已售出', '已下架']
    },
    series: [{
      name: '图书状态',
      type: 'pie',
      radius: '50%',
      data: chartData,
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      },
      itemStyle: {
        color: (params: any) => {
          const colors = ['#52c41a', '#faad14', '#1890ff', '#f5222d']
          return colors[params.dataIndex]
        }
      }
    }]
  }
}

// 初始化
onMounted(() => {
  fetchUserData()
  fetchBookStatusData()
})
</script>

<style scoped>
.dashboard {
  padding: 0;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.stat-content {
  display: flex;
  align-items: center;
  padding: 8px 0;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.user-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.book-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.order-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.revenue-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #262626;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #8c8c8c;
}

.charts-section {
  margin-bottom: 24px;
}

.chart-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-title {
  font-size: 16px;
  font-weight: 500;
  color: #262626;
}

.chart-container {
  padding: 16px 0;
}

.recent-activities {
  margin-bottom: 24px;
}

.recent-activities .el-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recent-activities .el-timeline-item .el-card {
  margin: 0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.recent-activities .el-timeline-item .el-card h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 500;
  color: #262626;
}

.recent-activities .el-timeline-item .el-card p {
  margin: 0;
  font-size: 12px;
  color: #8c8c8c;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .charts-section .el-col {
    margin-bottom: 20px;
  }
}

@media (max-width: 768px) {
  .stats-cards .el-col {
    margin-bottom: 16px;
  }
  
  .chart-container {
    padding: 8px 0;
  }
}
</style>