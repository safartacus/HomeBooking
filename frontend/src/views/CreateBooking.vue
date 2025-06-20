<template>
  <div class="create-booking">
    <div class="create-booking-container">
      <h1>Randevu Oluştur</h1>
      <div class="form-group">
        <label for="user-search">Ev Sahibi Ara</label>
        <input
          id="user-search"
          v-model="searchQuery"
          @input="searchUsers"
          placeholder="İsim veya e-posta ile ara"
          autocomplete="off"
        >
        <ul v-if="searchResults.length && showResults" class="search-results">
          <li v-for="user in searchResults" :key="user._id" @click="selectUser(user)">
            <img :src="user.profilePicture || '/default-avatar.png'" class="avatar" />
            <span>{{ user.username }} ({{ user.email }})</span>
          </li>
        </ul>
        <div v-if="selectedUser" class="selected-user">
          <img :src="selectedUser.profilePicture || '/default-avatar.png'" class="avatar" />
          <span>{{ selectedUser.username }} ({{ selectedUser.email }})</span>
          <button class="btn small" @click="clearSelectedUser">Kaldır</button>
        </div>
      </div>
      <div v-if="selectedUser" class="form-group">
        <label>Tarih Seç</label>
        <Datepicker
          v-model="dateRange"
          :range="true"
          :min-date="new Date()"
          :disabled-dates="disabledDates"
          :locale="'tr'"
          :dayClass="getDayClass"
          @update:model-value="onDateChange"
        />
        <div class="legend">
          <span class="legend-item"><span class="legend-box busy"></span> Dolu</span>
          <span class="legend-item"><span class="legend-box free"></span> Müsait</span>
        </div>
        <div v-if="checkingAvailability" class="info">Müsaitlik kontrol ediliyor...</div>
        <div v-else-if="availability === true" class="success">Ev sahibi bu tarihlerde müsait.</div>
        <div v-else-if="availability === false" class="error">Ev sahibi bu tarihlerde MÜSAİT DEĞİL!</div>
      </div>
      <form v-if="selectedUser" @submit.prevent="handleCreateBooking">
        <div class="form-group">
          <label for="message">Mesaj</label>
          <textarea
            id="message"
            v-model="message"
            required
            placeholder="Ev sahibine mesajınız"
          ></textarea>
        </div>
        <div class="form-group">
          <label>Geliş Durumu</label>
          <div class="checkbox-group">
            <label><input type="radio" value="Elim boş geleceğim" v-model="arrivalType" required> Elim boş geleceğim</label>
            <label><input type="radio" value="Elim dolu geleceğim" v-model="arrivalType"> Elim dolu geleceğim</label>
          </div>
        </div>
        <div class="form-group">
          <label for="guestCount">Kaç Kişi Gelecek?</label>
          <input
            id="guestCount"
            type="number"
            v-model="guestCount"
            min="1"
            max="20"
            required
            placeholder="Misafir sayısı"
          >
        </div>
        <div class="error" v-if="error">{{ error }}</div>
        <div class="success" v-if="success">{{ success }}</div>
        <button type="submit" class="btn primary" :disabled="loading || !canSubmit">
          {{ loading ? 'Gönderiliyor...' : 'Randevu Oluştur' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import api from '@/api'
import Datepicker from '@vuepic/vue-datepicker'
import '@vuepic/vue-datepicker/dist/main.css'

const searchQuery = ref('')
const searchResults = ref([])
const showResults = ref(false)
const selectedUser = ref(null)
const message = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)
const checkingAvailability = ref(false)
const availability = ref(null)
const today = new Date()
const tomorrow = new Date()
tomorrow.setDate(today.getDate() + 1)
const dateRange = ref([today, tomorrow])
const highlightedDates = ref([])
const disabledDates = ref([])
const canSubmit = ref(false)
const arrivalType = ref('Elim boş geleceğim')
const guestCount = ref(1)

// Kullanıcı arama
const searchUsers = async () => {
  if (!searchQuery.value) {
    searchResults.value = []
    showResults.value = false
    return
  }
  try {
    const token = localStorage.getItem('token')
    const res = await api.get('/profiles/search', {
      params: { query: searchQuery.value },
      headers: { Authorization: `Bearer ${token}` }
    })
    searchResults.value = res.data.users
    showResults.value = true
  } catch {
    searchResults.value = []
    showResults.value = false
  }
}

const selectUser = (user) => {
  selectedUser.value = user
  showResults.value = false
  searchQuery.value = ''
  fetchUserBookings()
}

const clearSelectedUser = () => {
  selectedUser.value = null
  dateRange.value = [today, tomorrow]
  highlightedDates.value = []
  disabledDates.value = []
  availability.value = null
  canSubmit.value = false
  guestCount.value = 1
}

// Kullanıcının dolu günlerini çek
const fetchUserBookings = async () => {
  if (!selectedUser.value) return
  try {
    const token = localStorage.getItem('token')
    const res = await api.get('/bookings', {
      headers: { Authorization: `Bearer ${token}` }
    })
    // Sadece seçili kullanıcının host olduğu ve pending/approved olan randevular
    const bookings = res.data.bookings.filter(b => b.host._id === selectedUser.value._id && ['pending','approved'].includes(b.status))
    let busy = []
    bookings.forEach(b => {
      const start = new Date(b.startDate)
      const end = new Date(b.endDate)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        busy.push(new Date(d))
      }
    })
    busyDays.value = busy
    disabledDates.value = []
  } catch {
    busyDays.value = []
    disabledDates.value = []
  }
}

const onDateChange = async (range) => {
  // Kullanıcı dolu gün seçerse uyarı ver
  if (range[0] && highlightedDates.value.some(h => sameDay(new Date(range[0]), h.date))) {
    error.value = 'Başlangıç tarihi dolu! Lütfen başka bir gün seçin.'
    dateRange.value = [null, null]
    return
  }
  if (range[1] && highlightedDates.value.some(h => sameDay(new Date(range[1]), h.date))) {
    error.value = 'Bitiş tarihi dolu! Lütfen başka bir gün seçin.'
    dateRange.value = [range[0], null]
    return
  }
  error.value = ''
  dateRange.value = range
  canSubmit.value = false
  availability.value = null
  if (!selectedUser.value || !range[0] || !range[1]) return
  try {
    checkingAvailability.value = true
    const token = localStorage.getItem('token')
    const availRes = await api.get(`/bookings/availability`, {
      params: {
        hostId: selectedUser.value._id,
        startDate: range[0],
        endDate: range[1]
      },
      headers: { Authorization: `Bearer ${token}` }
    })
    availability.value = availRes.data.available
    canSubmit.value = availRes.data.available
  } catch {
    availability.value = null
    canSubmit.value = false
  } finally {
    checkingAvailability.value = false
  }
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

const handleCreateBooking = async () => {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    const token = localStorage.getItem('token')
    await api.post('/bookings', {
      hostId: selectedUser.value._id,
      startDate: dateRange.value[0],
      endDate: dateRange.value[1],
      message: message.value,
      arrivalType: arrivalType.value,
      guestCount: guestCount.value
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    success.value = 'Randevu talebiniz gönderildi!'
    dateRange.value = [today, tomorrow]
    message.value = ''
    arrivalType.value = 'Elim boş geleceğim'
    canSubmit.value = false
    fetchUserBookings()
  } catch (err) {
    error.value = err.response?.data?.message || 'Bir hata oluştu.'
  } finally {
    loading.value = false
  }
}

// busy-day ve free-day için günlere class ekle
function getDayClass({ date }) {
  // busy-day: dolu günler
  const isBusy = busyDays.value.some(d => sameDay(new Date(date), d))
  if (isBusy) return 'busy-day'
  // free-day: bugünden sonraki ve dolu olmayan günler
  if (selectedUser.value && new Date(date) > today) return 'free-day'
  return ''
}

// busyDays arrayini doldur
const busyDays = ref([])
</script>

<style scoped>
@import '@vuepic/vue-datepicker/dist/main.css';
.create-booking {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 2rem 0;
}
.create-booking-container {
  background: white;
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  width: auto;
  max-width: 520px;
  min-width: 320px;
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
.form-group {
  margin-bottom: 1.2rem;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
label {
  color: #2c3e50;
  font-weight: 500;
  margin-bottom: 0.2rem;
}
input, textarea {
  width: 100%;
  padding: 0.85rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  background: #fafbfc;
  transition: border 0.2s;
}
input:focus, textarea:focus {
  border: 1.5px solid #42b983;
  outline: none;
}
textarea {
  min-height: 90px;
  resize: vertical;
}
.btn {
  width: 100%;
  padding: 0.85rem;
  border: none;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
  margin-top: 0.5rem;
}
.btn.primary {
  background: #42b983;
  color: white;
}
.btn.primary:disabled {
  background: #b2e5d0;
  color: #fff;
  cursor: not-allowed;
}
.btn.small {
  width: auto;
  padding: 0.3rem 1rem;
  font-size: 0.95rem;
  margin-left: 1rem;
  background: #dc3545;
  color: #fff;
}
.error {
  color: #dc3545;
  margin-bottom: 1rem;
  text-align: center;
}
.success {
  color: #28a745;
  margin-bottom: 1rem;
  text-align: center;
}
.info {
  color: #007bff;
  margin-bottom: 1rem;
  text-align: center;
}
.search-results {
  position: absolute;
  left: 0;
  right: 0;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  z-index: 10;
  max-height: 220px;
  overflow-y: auto;
  margin-top: 2px;
  list-style: none;
  padding: 0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}
.search-results li {
  display: flex;
  align-items: center;
  padding: 0.7rem 1rem;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 1rem;
}
.search-results li:hover {
  background: #f0f0f0;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 0.75rem;
}
.selected-user {
  display: flex;
  align-items: center;
  margin-top: 0.5rem;
  gap: 0.5rem;
}
.busy-day {
  background: #dc3545 !important;
  color: #fff !important;
  border-radius: 50% !important;
}
.free-day {
  background: #28a745 !important;
  color: #fff !important;
  border-radius: 50% !important;
}
.legend {
  display: flex;
  gap: 1.5rem;
  margin: 0.5rem 0 1.5rem 0;
  font-size: 1rem;
  align-items: center;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}
.legend-box {
  width: 18px;
  height: 18px;
  border-radius: 4px;
  display: inline-block;
  border: 1px solid #ccc;
}
.legend-box.busy {
  background: #dc3545;
}
.legend-box.free {
  background: #42b983;
}
.dp__cell.busy-day .dp__cell_inner {
  background: #dc3545 !important;
  color: #fff !important;
  border-radius: 50% !important;
}
.dp__cell.free-day .dp__cell_inner {
  background: #28a745 !important;
  color: #fff !important;
  border-radius: 50% !important;
}
@media (max-width: 700px) {
  .create-booking-container {
    max-width: 98vw;
    min-width: 0;
    padding: 1.2rem 0.5rem 1.2rem 0.5rem;
    border-radius: 8px;
  }
  h1 {
    font-size: 1.3rem;
  }
  .btn {
    font-size: 1rem;
  }
  .avatar {
    width: 28px;
    height: 28px;
  }
}
.checkbox-group {
  display: flex;
  gap: 2rem;
  margin-top: 0.5rem;
}
.checkbox-group label {
  font-weight: 400;
  color: #2c3e50;
  font-size: 1rem;
}
</style> 