<template>
  <div class="reset-password-container">
    <h2>Şifre Sıfırla</h2>
    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label for="email">E-posta adresiniz</label>
        <input id="email" v-model="email" type="email" required placeholder="E-posta adresinizi girin" />
      </div>
      <div class="form-group">
        <label for="otp">Doğrulama Kodu</label>
        <input id="otp" v-model="otp" type="text" required placeholder="E-posta ile gelen kod" />
      </div>
      <div class="form-group">
        <label for="newPassword">Yeni Şifre</label>
        <input id="newPassword" v-model="newPassword" type="password" required placeholder="Yeni şifreniz" />
      </div>
      <div v-if="success" class="success">{{ success }}</div>
      <div v-if="error" class="error">{{ error }}</div>
      <button type="submit" class="btn primary" :disabled="loading">
        {{ loading ? 'Şifre Sıfırlanıyor...' : 'Şifreyi Sıfırla' }}
      </button>
    </form>
    <router-link to="/login" class="back-link">Girişe Dön</router-link>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import api from '@/api'
import { useRouter, useRoute } from 'vue-router'

const email = ref('')
const otp = ref('')
const newPassword = ref('')
const error = ref('')
const success = ref('')
const loading = ref(false)
const router = useRouter()
const route = useRoute()

onMounted(() => {
  if (route.query.email) {
    email.value = route.query.email
  }
})

const handleSubmit = async () => {
  error.value = ''
  success.value = ''
  loading.value = true
  try {
    await api.post('/auth/reset-password', {
      email: email.value,
      otp: otp.value,
      newPassword: newPassword.value
    })
    success.value = 'Şifreniz başarıyla güncellendi. Giriş sayfasına yönlendiriliyorsunuz.'
    setTimeout(() => router.push('/login'), 1500)
  } catch (err) {
    error.value = err.response?.data?.message || 'Bir hata oluştu.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-password-container {
  max-width: 400px;
  margin: 60px auto;
  background: #fff;
  padding: 2rem 2.5rem;
  border-radius: 12px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}
h2 {
  text-align: center;
  margin-bottom: 1.2rem;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
input {
  padding: 0.8rem 1rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 1rem;
}
.btn.primary {
  background: #42b983;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 0.8rem;
  font-size: 1.1rem;
  font-weight: bold;
  cursor: pointer;
  margin-top: 1rem;
}
.success {
  color: #28a745;
  text-align: center;
}
.error {
  color: #dc3545;
  text-align: center;
}
.back-link {
  display: block;
  text-align: center;
  margin-top: 1.2rem;
  color: #2c3e50;
  text-decoration: underline;
  font-size: 0.98rem;
}
</style> 