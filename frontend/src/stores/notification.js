import { defineStore } from 'pinia'
import api from '@/api'

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    unreadCount: 0,
    notifications: []
  }),
  actions: {
    async fetchNotifications() {
      try {
        console.log('📥 Bildirimler çekiliyor...')
        const token = localStorage.getItem('token')
        if (!token) {
          console.log('❌ Token bulunamadı')
          return
        }
        const res = await api.get('/notifications', {
          headers: { Authorization: `Bearer ${token}` }
        })
        console.log('📋 Gelen bildirimler:', res.data.notifications)
        this.notifications = res.data.notifications
        this.unreadCount = this.notifications.filter(n => !n.isRead).length
        console.log('📊 Bildirimler güncellendi, okunmamış sayısı:', this.unreadCount)
      } catch (error) {
        console.error('❌ Bildirimler yüklenirken hata:', error)
      }
    },
    incrementUnread() {
      this.unreadCount++
      console.log('➕ Bildirim sayısı artırıldı:', this.unreadCount)
    },
    markAllRead() {
      this.unreadCount = 0
      console.log('✅ Tüm bildirimler okundu olarak işaretlendi')
      // İstersen backend'e okundu olarak işaretleme isteği de atabilirsin
    }
  }
}) 