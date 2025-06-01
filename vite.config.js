import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  optimizeDeps: {
    include: ['pbf'],
    exclude: ['ol'] // 排除OpenLayers的优化
  },
  server: {
    host: '0.0.0.0', // 监听所有网络接口
    port: 5173, // 指定端口号
  }
})