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

        <template v-if="activeTab === 'upcoming'">
          <div class="sub-tabs">
            <button
              :class="['sub-tab-btn', { active: upcomingTab === 'asHost' }]"
              @click="upcomingTab = 'asHost'"
            >
              Bana Gelecekler
            </button>
            <button
              :class="['sub-tab-btn', { active: upcomingTab === 'asGuest' }]"
              @click="upcomingTab = 'asGuest'"
            >
              Benim Gideceklerim
            </button>
          </div>

          <div v-if="upcomingTab === 'asHost'">
            <div v-if="asHost.length === 0" class="no-bookings">Hiç yaklaşan randevu yok.</div>
            <div v-for="booking in asHost" :key="booking._id" class="booking-card">
              <div class="booking-header">
                <h3>{{ booking.guest.username }}</h3>
                <span :class="['status', booking.status]">
                  {{ getStatusText(booking.status) }}
                </span>
              </div>
              <div class="booking-dates">
                <p><strong>Başlangıç:</strong> {{ formatDate(booking.startDate) }}</p>
                <p><strong>Bitiş:</strong> {{ formatDate(booking.endDate) }}</p>
              </div>
              <p class="booking-message">{{ booking.message }}</p>
              <p class="booking-arrival"><strong>Geliş Durumu:</strong> {{ booking.arrivalType }}</p>
              <p class="booking-guest-count"><strong>Misafir Sayısı:</strong> {{ booking.guestCount }} kişi</p>
              <div v-if="booking.status === 'pending'" class="booking-actions">
                <button class="btn approve" @click="updateBookingStatus(booking._id, 'approved')">Onayla</button>
                <button class="btn reject" @click="updateBookingStatus(booking._id, 'rejected')">Reddet</button>
              </div>
              <!-- Host iptal butonu (sadece onaylanmış ve 24+ saat kaldıysa) -->
              <div v-else-if="booking.status === 'approved' && canCancelBooking(booking)" class="booking-actions">
                <button class="btn cancel" @click="showCancelModal(booking)">
                  ❌ Randevu İptali (Ev Sahibi)
                </button>
              </div>
              <div v-else-if="booking.status === 'approved' && !canCancelBooking(booking)" class="info">
                <small>❌ İptal süresi geçti (son 24 saat kala iptal edilemez)</small>
              </div>
            </div>
          </div>

          <div v-else>
            <div v-if="asGuest.length === 0" class="no-bookings">Hiç yaklaşan randevu yok.</div>
            

            
            <div v-for="booking in asGuest" :key="booking._id" class="booking-card">
              <div class="booking-header">
                <h3>{{ booking.host.username }}</h3>
                <span :class="['status', booking.status]">
                  {{ getStatusText(booking.status) }}
                </span>
              </div>
              <div class="booking-dates">
                <p><strong>Başlangıç:</strong> {{ formatDate(booking.startDate) }}</p>
                <p><strong>Bitiş:</strong> {{ formatDate(booking.endDate) }}</p>
                <p v-if="booking.status === 'approved'" class="time-info">
                  <strong>{{ getTimeUntilStart(booking.startDate) }}</strong>
                </p>
              </div>
              <p class="booking-message">{{ booking.message }}</p>
              <p class="booking-arrival"><strong>Geliş Durumu:</strong> {{ booking.arrivalType }}</p>
              <p class="booking-guest-count"><strong>Misafir Sayısı:</strong> {{ booking.guestCount }} kişi</p>
              

              
              <!-- İptal butonu (sadece onaylanmış ve 24+ saat kaldıysa) -->
              <div v-if="booking.status === 'approved' && canCancelBooking(booking)" class="booking-actions">
                <button class="btn cancel" @click="showCancelModal(booking)">
                  ❌ Randevu İptali (Misafir)
                </button>
              </div>
              <div v-else-if="booking.status === 'approved' && !canCancelBooking(booking)" class="info">
                <small>❌ İptal süresi geçti (son 24 saat kala iptal edilemez)</small>
              </div>
            </div>
          </div>
        </template>

        <template v-else>
          <!-- Geçmiş randevular eski haliyle kalsın -->
          <div class="no-bookings">Geçmiş randevu bulunmuyor</div>
        </template>
      </div>

      <div class="error" v-if="error">
        {{ error }}
      </div>
    </div>

    <!-- İptal Modal -->
    <div v-if="cancelModal.show" class="modal-overlay" @click="closeCancelModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Randevu İptali</h3>
          <button class="close-btn" @click="closeCancelModal">×</button>
        </div>
        <div class="modal-body">
          <p><strong>Dikkat:</strong> Bu randevuyu iptal etmek üzeresiniz.</p>
          <p><strong>Randevu:</strong> {{ formatDate(cancelModal.booking?.startDate) }} - {{ formatDate(cancelModal.booking?.endDate) }}</p>
          <p><strong>Ev Sahibi:</strong> {{ cancelModal.booking?.host?.username }}</p>
          
          <div class="form-group">
            <label for="cancelReason">İptal Nedeni (zorunlu, min 10 karakter)</label>
            <textarea
              id="cancelReason"
              v-model="cancelModal.reason"
              placeholder="Lütfen iptal nedeninizi açıklayın..."
              required
              :disabled="cancelModal.loading"
            ></textarea>
            <small class="char-count">{{ cancelModal.reason.length }}/10 minimum</small>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn secondary" @click="closeCancelModal" :disabled="cancelModal.loading">
            Vazgeç
          </button>
          <button 
            class="btn cancel" 
            @click="confirmCancel" 
            :disabled="cancelModal.loading || cancelModal.reason.length < 10"
          >
            {{ cancelModal.loading ? 'İptal Ediliyor...' : 'Randevuyu İptal Et' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import api from '@/api'

const asHost = ref([])
const asGuest = ref([])
const loading = ref(true)
const error = ref('')
const activeTab = ref('upcoming')
const upcomingTab = ref('asHost')

const cancelModal = reactive({
  show: false,
  booking: null,
  reason: '',
  loading: false
})

const fetchBookings = async () => {
  try {
    const token = localStorage.getItem('token')
    const response = await api.get('/bookings', {
      headers: { Authorization: `Bearer ${token}` }
    })
    asHost.value = response.data.asHost
    asGuest.value = response.data.asGuest
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

// İptal edilebilir mi kontrolü (24 saatten fazla kaldıysa)
const canCancelBooking = (booking) => {
  const now = new Date()
  const startDate = new Date(booking.startDate)
  const timeDiff = startDate.getTime() - now.getTime()
  const hoursDiff = timeDiff / (1000 * 3600)
  
  return hoursDiff > 24 // 24 saatten fazla kaldıysa iptal edilebilir
}

// Başlangıca kadar kalan süre
const getTimeUntilStart = (startDate) => {
  const now = new Date()
  const start = new Date(startDate)
  const timeDiff = start.getTime() - now.getTime()
  const hoursDiff = Math.floor(timeDiff / (1000 * 3600))
  
  if (hoursDiff < 0) return 'Başlamış'
  if (hoursDiff < 24) return `${hoursDiff} saat kaldı`
  
  const daysDiff = Math.floor(hoursDiff / 24)
  return `${daysDiff} gün kaldı`
}

// İptal modal'ını göster
const showCancelModal = (booking) => {
  cancelModal.show = true
  cancelModal.booking = booking
  cancelModal.reason = ''
  cancelModal.loading = false
}

// İptal modal'ını kapat
const closeCancelModal = () => {
  cancelModal.show = false
  cancelModal.booking = null
  cancelModal.reason = ''
  cancelModal.loading = false
}

// İptal işlemini onayla
const confirmCancel = async () => {
  if (cancelModal.reason.length < 10) {
    error.value = 'İptal nedeni en az 10 karakter olmalıdır'
    return
  }

  cancelModal.loading = true
  error.value = ''

  try {
    const token = localStorage.getItem('token')
    await api.patch(
      `/bookings/${cancelModal.booking._id}/cancel`,
      { reason: cancelModal.reason },
      { headers: { Authorization: `Bearer ${token}` } }
    )
    
    closeCancelModal()
    await fetchBookings()
    
    // Başarı mesajı göster
    const successDiv = document.createElement('div')
    successDiv.className = 'success-toast'
    successDiv.textContent = 'Randevu başarıyla iptal edildi!'
    document.body.appendChild(successDiv)
    setTimeout(() => successDiv.remove(), 3000)
    
  } catch (err) {
    error.value = err.response?.data?.message || 'Randevu iptal edilirken bir hata oluştu'
  } finally {
    cancelModal.loading = false
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
    rejected: 'Reddedildi',
    cancelled_by_guest: 'Misafir İptal Etti',
    cancelled_by_host: 'Ev Sahibi İptal Etti'
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
.sub-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  justify-content: center;
}
.sub-tab-btn {
  flex: 1;
  padding: 0.7rem;
  border: none;
  border-radius: 6px;
  background: #f5f5f5;
  cursor: pointer;
  font-weight: bold;
  font-size: 1rem;
  transition: background-color 0.3s;
}
.sub-tab-btn.active {
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
.booking-arrival {
  color: #666;
  margin-bottom: 0.7rem;
  font-size: 1rem;
}
.booking-guest-count {
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
.time-info {
  color: #007bff;
  font-weight: 500;
  font-size: 0.9rem;
}
.btn.cancel {
  background: #dc3545;
  color: white;
  font-size: 0.9rem;
  padding: 0.5rem 1rem;
}
.btn.cancel:hover {
  background: #c82333;
}
.info {
  color: #6c757d;
  font-style: italic;
}
/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow: hidden;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #dee2e6;
  background: #f8f9fa;
}
.modal-header h3 {
  margin: 0;
  color: #dc3545;
  font-size: 1.3rem;
}
.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6c757d;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn:hover {
  color: #000;
}
.modal-body {
  padding: 1.5rem;
}
.modal-body p {
  margin-bottom: 1rem;
}
.form-group {
  margin-bottom: 1rem;
}
.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
}
.form-group textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  resize: vertical;
  font-family: inherit;
}
.form-group textarea:focus {
  border-color: #dc3545;
  outline: none;
}
.char-count {
  display: block;
  text-align: right;
  color: #6c757d;
  font-size: 0.85rem;
  margin-top: 0.25rem;
}
.modal-footer {
  display: flex;
  gap: 1rem;
  padding: 1.5rem;
  border-top: 1px solid #dee2e6;
  background: #f8f9fa;
  justify-content: flex-end;
}
.btn.secondary {
  background: #6c757d;
  color: white;
}
.btn.secondary:hover {
  background: #545b62;
}
.success-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  background: #28a745;
  color: white;
  padding: 1rem 1.5rem;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  font-weight: 500;
}
@media (max-width: 600px) {
  .modal {
    width: 95%;
    margin: 0 2.5%;
  }
  
  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 1rem;
  }
  
  .modal-footer {
    flex-direction: column;
  }
  
  .modal-footer .btn {
    width: 100%;
  }
}
</style> 