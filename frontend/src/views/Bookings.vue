<template>
  <div class="bookings">
    <div class="bookings-container">
      <h1>Randevular</h1>

      <div class="tabs">
        <button
          :class="['tab-btn', { active: activeTab === 'upcoming' }]"
          @click="activeTab = 'upcoming'"
        >
          Yaklaşan Randevular
        </button>
        <button
          :class="['tab-btn', { active: activeTab === 'past' }]"
          @click="activeTab = 'past'"
        >
          Geçmiş Randevular
        </button>
      </div>

      <div class="bookings-list">
        <div v-if="loading" class="loading">
          Yükleniyor...
        </div>
        
        <div v-else-if="filteredBookings.length === 0" class="no-bookings">
          {{ activeTab === 'upcoming' ? 'Yaklaşan randevu bulunmuyor' : 'Geçmiş randevu bulunmuyor' }}
        </div>

        <div v-else class="booking-cards">
          <div v-for="booking in filteredBookings" :key="booking._id" class="booking-card">
            <div class="booking-header">
              <h3>{{ booking.guest.username }}</h3>
              <span :class="['status', booking.status]">
                {{ getStatusText(booking.status) }}
              </span>
            </div>

            <div class="booking-dates">
              <p>
                <strong>Başlangıç:</strong>
                {{ formatDate(booking.startDate) }}
              </p>
              <p>
                <strong>Bitiş:</strong>
                {{ formatDate(booking.endDate) }}
              </p>
            </div>

            <p class="booking-message">{{ booking.message }}</p>

            <div v-if="isHost && booking.status === 'pending'" class="booking-actions">
              <button
                class="btn approve"
                @click="updateBookingStatus(booking._id, 'approved')"
              >
                Onayla
              </button>
              <button
                class="btn reject"
                @click="updateBookingStatus(booking._id, 'rejected')"
              >
                Reddet
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="error" v-if="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '@/api'

const bookings = ref([])
const loading = ref(true)
const error = ref('')
const activeTab = ref('upcoming')
const isHost = ref(false)

const filteredBookings = computed(() => {
  const now = new Date()
  // Sort by createdAt (newest first), fallback to startDate if createdAt is missing
  const sorted = [...bookings.value].sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt) : new Date(a.startDate)
    const bTime = b.createdAt ? new Date(b.createdAt) : new Date(b.startDate)
    return bTime - aTime
  })
  return sorted.filter(booking => {
    const startDate = new Date(booking.startDate)
    return activeTab.value === 'upcoming'
      ? startDate >= now
      : startDate < now
  })
})

const fetchBookings = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await api.get('/bookings', {
      headers: { Authorization: `Bearer ${token}` }
    })

    bookings.value = response.data.bookings
    isHost.value = response.data.isHost
  } catch (err) {
    error.value = 'Randevular yüklenirken bir hata oluştu'
  } finally {
    loading.value = false
  }
}

const updateBookingStatus = async (bookingId, status) => {
  try {
    const token = localStorage.getItem('token')
    await api.patch(
      `/bookings/${bookingId}`,
      { status },
      { headers: { Authorization: `Bearer ${token}` } }
    )

    await fetchBookings()
  } catch (err) {
    error.value = 'Randevu durumu güncellenirken bir hata oluştu'
  }
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getStatusText = (status) => {
  const statusMap = {
    pending: 'Beklemede',
    approved: 'Onaylandı',
    rejected: 'Reddedildi'
  }
  return statusMap[status] || status
}

onMounted(fetchBookings)
</script>

<style scoped>
.bookings {
  min-height: 100vh;
  padding: 2rem 0;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.bookings-container {
  max-width: 600px;
  width: auto;
  background: #fff;
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  margin: 2rem auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 2rem;
  font-weight: 700;
}
.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  justify-content: center;
}
.tab-btn {
  flex: 1;
  padding: 0.85rem;
  border: none;
  border-radius: 6px;
  background: #f5f5f5;
  cursor: pointer;
  font-weight: bold;
  font-size: 1.1rem;
  transition: background-color 0.3s;
}
.tab-btn.active {
  background: #42b983;
  color: white;
}
.booking-cards {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}
.booking-card {
  background: #f8f9fa;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #dee2e6;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.booking-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.7rem;
}
.booking-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
}
.status {
  padding: 0.25rem 0.85rem;
  border-radius: 20px;
  font-size: 0.95rem;
  font-weight: bold;
}
.status.pending {
  background: #ffd700;
  color: #000;
}
.status.approved {
  background: #28a745;
  color: white;
}
.status.rejected {
  background: #dc3545;
  color: white;
}
.booking-dates {
  margin-bottom: 0.7rem;
  color: #666;
  font-size: 1rem;
}
.booking-message {
  color: #666;
  margin-bottom: 0.7rem;
  font-size: 1rem;
}
.booking-actions {
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
}
.btn {
  flex: 1;
  padding: 0.7rem;
  border: none;
  border-radius: 6px;
  font-weight: bold;
  font-size: 1.1rem;
  cursor: pointer;
  transition: opacity 0.3s, background 0.3s;
}
.btn:hover {
  opacity: 0.9;
}
.approve {
  background: #28a745;
  color: white;
}
.reject {
  background: #dc3545;
  color: white;
}
.loading,
.no-bookings {
  text-align: center;
  color: #666;
  padding: 2rem;
}
.error {
  color: #dc3545;
  text-align: center;
  margin-top: 1rem;
}
@media (max-width: 700px) {
  .bookings-container {
    max-width: 98vw;
    padding: 1.2rem 0.5rem 1.2rem 0.5rem;
    border-radius: 8px;
  }
  h1 {
    font-size: 1.3rem;
  }
  .btn {
    font-size: 1rem;
  }
}
</style> 