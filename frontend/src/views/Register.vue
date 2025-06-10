<template>
  <div class="register">
    <div class="register-container">
      <h1>Kayıt Ol</h1>
      <form @submit.prevent="handleRegister">
        <div class="form-group">
          <label for="username">Kullanıcı Adı</label>
          <input
            type="text"
            id="username"
            v-model="username"
            required
            placeholder="Kullanıcı adınızı girin"
          >
        </div>

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

        <div class="form-group">
          <label for="confirmPassword">Şifre Tekrar</label>
          <input
            type="password"
            id="confirmPassword"
            v-model="confirmPassword"
            required
            placeholder="Şifrenizi tekrar girin"
          >
        </div>

        <div class="form-group">
          <label for="phone">Telefon Numarası</label>
          <input
            type="tel"
            id="phone"
            v-model="phone"
            required
            placeholder="Telefon numaranızı girin"
          >
        </div>

        <div class="error" v-if="error">
          {{ error }}
        </div>

        <button type="submit" class="btn primary" :disabled="loading">
          {{ loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol' }}
        </button>
      </form>

      <p class="login-link">
        Zaten hesabınız var mı? <router-link to="/login">Giriş Yap</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'

const router = useRouter()
const username = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const phone = ref('')
const error = ref('')
const loading = ref(false)

const handleRegister = async () => {
  try {
    if (password.value !== confirmPassword.value) {
      error.value = 'Şifreler eşleşmiyor'
      return
    }

    loading.value = true
    error.value = ''
    
    const response = await api.post('/auth/register', {
      username: username.value,
      email: email.value,
      password: password.value,
      phone: phone.value
    })

    localStorage.setItem('token', response.data.token)
    router.push('/profile')
  } catch (err) {
    error.value = err.response?.data?.message || 'Kayıt olurken bir hata oluştu'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.register-container {
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

.login-link {
  text-align: center;
  margin-top: 1rem;
}

.login-link a {
  color: #42b983;
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}
</style> 