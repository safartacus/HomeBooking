<template>
  <div class="profile">
    <div class="profile-container">
      <h1>Profil</h1>
      
      <div class="profile-header">
        <div class="profile-picture">
          <img :src="profilePicture || '/default-avatar.png'" alt="Profil resmi">
          <input
            type="file"
            ref="fileInput"
            @change="handleFileUpload"
            accept="image/*"
            style="display: none"
          >
          <button class="btn secondary" @click="$refs.fileInput.click()">
            Resim Değiştir
          </button>
        </div>
        
        <div class="profile-info">
          <h2>{{ username }}</h2>
          <p>{{ email }}</p>
          <div class="phone-group">
            <label>Telefon:</label>
            <input v-model="phone" type="tel" class="phone-input" />
            <button class="btn small" @click="updatePhone" :disabled="phoneLoading">Kaydet</button>
          </div>
        </div>
      </div>

      <div class="profile-actions">
        <button class="btn primary" @click="handleLogout">
          Çıkış Yap
        </button>
      </div>

      <div class="error" v-if="error">
        {{ error }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()
const username = ref('')
const email = ref('')
const profilePicture = ref('')
const error = ref('')
const fileInput = ref(null)
const phone = ref('')
const phoneLoading = ref(false)

const fetchProfile = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    const response = await api.get('/profiles/me', {
      headers: { Authorization: `Bearer ${token}` }
    })

    username.value = response.data.username
    email.value = response.data.email
    profilePicture.value = response.data.profilePicture
    phone.value = response.data.phone
  } catch (err) {
    error.value = 'Profil bilgileri yüklenirken bir hata oluştu'
  }
}

const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  const formData = new FormData()
  formData.append('profilePicture', file)

  try {
    const token = localStorage.getItem('token')
    const response = await api.post(
      '/profiles/picture',
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    )

    profilePicture.value = response.data.profilePicture
  } catch (err) {
    error.value = 'Profil resmi yüklenirken bir hata oluştu'
  }
}

const handleLogout = () => {
  localStorage.removeItem('token')
  router.push('/login')
}

const updatePhone = async () => {
  phoneLoading.value = true
  try {
    const token = localStorage.getItem('token')
    await api.patch('/profiles/phone', { phone: phone.value }, {
      headers: { Authorization: `Bearer ${token}` }
    })
  } catch {}
  phoneLoading.value = false
}

onMounted(fetchProfile)
</script>

<style scoped>
.profile {
  min-height: 100vh;
  padding: 2rem 0;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
}
.profile-container {
  max-width: 520px;
  width: auto;
  margin: 0 auto;
  background: white;
  padding: 2.5rem 2.5rem 2rem 2.5rem;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0,0,0,0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}
h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 1.5rem;
  font-size: 2rem;
  font-weight: 700;
}
.profile-header {
  display: flex;
  align-items: center;
  gap: 2rem;
  margin-bottom: 2rem;
  width: 100%;
  justify-content: center;
}
.profile-picture {
  text-align: center;
}
.profile-picture img {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1rem;
  border: 3px solid #eee;
}
.profile-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  align-items: flex-start;
}
.profile-info h2 {
  color: #2c3e50;
  margin-bottom: 0.5rem;
  font-size: 1.3rem;
  font-weight: 600;
}
.profile-info p {
  color: #666;
  font-size: 1.05rem;
}
.phone-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}
.phone-input {
  padding: 0.6rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
  background: #fafbfc;
  width: 170px;
  transition: border 0.2s;
}
.phone-input:focus {
  border: 1.5px solid #42b983;
  outline: none;
}
.btn {
  padding: 0.7rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s, color 0.3s;
}
.primary {
  background: #42b983;
  color: white;
  margin-top: 1.5rem;
  width: 100%;
}
.secondary {
  background: #2c3e50;
  color: white;
  margin-bottom: 1rem;
  width: 100%;
}
.btn.small {
  width: auto;
  padding: 0.3rem 1rem;
  font-size: 0.95rem;
  margin-left: 1rem;
  background: #42b983;
  color: #fff;
}
.profile-actions {
  text-align: center;
  margin-top: 2rem;
  width: 100%;
}
.error {
  color: #dc3545;
  margin-top: 1rem;
  text-align: center;
}
@media (max-width: 700px) {
  .profile-container {
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
  .profile-picture img {
    width: 90px;
    height: 90px;
  }
  .phone-input {
    width: 110px;
  }
}
</style> 