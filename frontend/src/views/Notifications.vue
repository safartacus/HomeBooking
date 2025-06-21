<template>
  <div class="notifications">
    <div class="notifications-container">
      <h1>Bildirimler</h1>
      <div v-if="loading" class="info">Yükleniyor...</div>
      <div v-else-if="notifications.length === 0" class="info">Hiç bildiriminiz yok.</div>
      <ul v-else class="notification-list">
        <li v-for="n in notifications" :key="n._id" :class="{ unread: !n.isRead }">
          <div class="message">{{ n.message }}</div>
          <div class="date">{{ formatDate(n.createdAt) }}</div>
          <div v-if="n.type === 'booking_request' && n.booking && n.booking.status === 'pending'" class="actions">
            <button class="btn approve" @click="handleAction(n, 'approved')" :disabled="actionLoading">Onayla</button>
            <button class="btn reject" @click="handleAction(n, 'rejected')" :disabled="actionLoading">Reddet</button>
          </div>
          <div v-else-if="n.booking">
            <span class="status" :class="n.booking.status">Randevu: {{ getStatusText(n.booking.status) }}</span>
          </div>
          <button v-if="!n.isRead" class="btn small" @click="markAsRead(n)">Okundu</button>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'

const notifications = ref([])
const loading = ref(true)
const actionLoading = ref(false)

const fetchNotifications = async () => {
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    const res = await api.get('/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    })
    notifications.value = res.data.notifications
  } catch {}
  loading.value = false
}

const markAsRead = async (n) => {
  try {
    const token = localStorage.getItem('token')
    await api.patch(`/notifications/${n._id}/read`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    })
    n.isRead = true
  } catch {}
}

const handleAction = async (n, action) => {
  actionLoading.value = true
  try {
    const token = localStorage.getItem('token')
    await api.post(`/notifications/${n._id}/booking-action`, { action }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    n.isRead = true
    if (n.booking) n.booking.status = action
  } catch {}
  actionLoading.value = false
}

const formatDate = (date) => {
  return new Date(date).toLocaleString('tr-TR')
}

const getStatusText = (status) => {
  const map = { pending: 'Beklemede', approved: 'Onaylandı', rejected: 'Reddedildi', cancelled_by_guest: 'Misafir İptal Etti', cancelled_by_host: 'Ev Sahibi İptal Etti' }
  return map[status] || status
}

onMounted(fetchNotifications)
</script>

<style scoped>
.notifications {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 2rem;
}
.notifications-container {
  max-width: 700px;
  margin: 0 auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
  padding: 2rem;
}
h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
}
.notification-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.notification-list li {
  border-bottom: 1px solid #eee;
  padding: 1rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.notification-list li.unread {
  background: #eaf6ff;
}
.message {
  font-size: 1.1rem;
  color: #2c3e50;
}
.date {
  color: #888;
  font-size: 0.95rem;
}
.actions {
  display: flex;
  gap: 1rem;
}
.btn {
  padding: 0.5rem 1.2rem;
  border: none;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}
.btn.approve {
  background: #28a745;
  color: #fff;
}
.btn.reject {
  background: #dc3545;
  color: #fff;
}
.btn.small {
  background: #eee;
  color: #333;
  font-size: 0.9rem;
  padding: 0.3rem 0.8rem;
  margin-left: auto;
}
.status {
  padding: 0.2rem 0.8rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: bold;
}
.status.pending {
  background: #ffd700;
  color: #000;
}
.status.approved {
  background: #28a745;
  color: #fff;
}
.status.rejected {
  background: #dc3545;
  color: #fff;
}
.status.cancelled_by_guest {
  background: #dc3545;
  color: #fff;
}
.status.cancelled_by_host {
  background: #dc3545;
  color: #fff;
}
.info {
  color: #007bff;
  text-align: center;
  margin: 2rem 0;
}
</style> 