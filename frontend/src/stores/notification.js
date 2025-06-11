import { defineStore } from 'pinia'
import api from '@/api'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    unreadCount: 0,
    notifications: []
  }),
  actions: {
    async fetchNotifications() {
      const token = localStorage.getItem('token')
      if (!token) return
      const res = await api.get('/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
      this.notifications = res.data.notifications
      this.unreadCount = this.notifications.filter(n => !n.isRead).length
    },
    incrementUnread() {
      this.unreadCount++
    },
    markAllRead() {
      this.unreadCount = 0
      // İstersen backend'e okundu olarak işaretleme isteği de atabilirsin
    }
  }
}) 