<template>
  <div class="login">
    <div class="login-container">
      <h1>Giriş Yap</h1>
      <form @submit.prevent="handleLogin" v-if="!showOtpForm">
        <div class="form-group">
          <label for="email">E-posta</label>
          <input
            type="email"
            id="email"
            v-model="email"
            required
            placeholder="E-posta adresinizi girin"
          >
        </div>
        
        <div class="form-group">
          <label for="password">Şifre</label>
          <input
            type="password"
            id="password"
            v-model="password"
            required
            placeholder="Şifrenizi girin"
          >
        </div>

        <div class="forgot-password-link">
          <router-link to="/forgot-password">Şifremi Unuttum</router-link>
        </div>

        <div class="error" v-if="error">
          {{ error }}
        </div>

        <button type="submit" class="btn primary" :disabled="loading">
          {{ loading ? 'Giriş yapılıyor...' : 'Giriş Yap' }}
        </button>
      </form>

      <form @submit.prevent="handleOtpVerification" v-else>
        <div class="form-group">
          <label for="otp">Doğrulama Kodu</label>
          <input
            type="text"
            id="otp"
            v-model="otp"
            required
            placeholder="E-posta adresinize gönderilen kodu girin"
            maxlength="6"
          >
        </div>

        <div class="error" v-if="error">
          {{ error }}
        </div>

        <button type="submit" class="btn primary" :disabled="loading">
          {{ loading ? 'Doğrulanıyor...' : 'Doğrula' }}
        </button>

        <button type="button" class="btn secondary" @click="resendOtp" :disabled="loading">
          Kodu Tekrar Gönder
        </button>
      </form>

      <p class="register-link">
        Hesabınız yok mu? <router-link to="/register">Kayıt Ol</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const email = ref('')
const password = ref('')
const otp = ref('')
const error = ref('')
const loading = ref(false)
const showOtpForm = ref(false)
const userStore = useUserStore()

const handleLogin = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const response = await api.post('/auth/login', {
      email: email.value,
      password: password.value
    })

    showOtpForm.value = true
  } catch (err) {
    error.value = err.response?.data?.message || 'Giriş yapılırken bir hata oluştu'
  } finally {
    loading.value = false
  }
}

const handleOtpVerification = async () => {
  try {
    loading.value = true
    error.value = ''
    
    const response = await api.post('/auth/verify-otp', {
      email: email.value,
      otp: otp.value
    })

    localStorage.setItem('token', response.data.token)

    // PROFİLİ ÇEK VE STORE'A YAZ
    const profileRes = await api.get('/profiles/me', {
      headers: { Authorization: `Bearer ${response.data.token}` }
    })
    userStore.setUser({
      token: response.data.token,
      profilePicture: profileRes.data.profilePicture,
      username: profileRes.data.username
    })

    router.push('/profile')
  } catch (err) {
    error.value = err.response?.data?.message || 'Doğrulama sırasında bir hata oluştu'
  } finally {
    loading.value = false
  }
}

const resendOtp = async () => {
  try {
    loading.value = true
    error.value = ''
    
    await api.post('/auth/login', {
      email: email.value,
      password: password.value
    })

    error.value = 'Yeni doğrulama kodu gönderildi'
  } catch (err) {
    error.value = err.response?.data?.message || 'Kod gönderilirken bir hata oluştu'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.login-container {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  color: #2c3e50;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.btn {
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: bold;
  cursor: pointer;
  transition: background-color 0.3s;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.primary {
  background: #42b983;
  color: white;
}

.error {
  color: #dc3545;
  margin-bottom: 1rem;
  text-align: center;
}

.register-link {
  text-align: center;
  margin-top: 1rem;
}

.register-link a {
  color: #42b983;
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}

.forgot-password-link {
  text-align: right;
  margin-top: -1rem;
  margin-bottom: 1.2rem;
}

.forgot-password-link a {
  color: #42b983;
  font-size: 0.95rem;
  text-decoration: none;
}

.forgot-password-link a:hover {
  text-decoration: underline;
}

.secondary {
  background: #6c757d;
  color: white;
  margin-top: 1rem;
}
</style> 