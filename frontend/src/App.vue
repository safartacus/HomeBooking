<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/api'
import socket from './socket'

const router = useRouter()
const isAuthenticated = computed(() => {
  return !!localStorage.getItem('token')
})
const profilePicture = ref('')
const unreadCount = ref(0)
const showProfileMenu = ref(false)
const userId = ref(null)

const fetchProfileAndNotifications = async () => {
  if (!isAuthenticated.value) return
  try {
    const token = localStorage.getItem('token')
    const [profileRes, notifRes] = await Promise.all([
      api.get('/profiles/me', {
        headers: { Authorization: `Bearer ${token}` }
      }),
      api.get('/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
    ])
    profilePicture.value = profileRes.data.profilePicture
    unreadCount.value = notifRes.data.notifications.filter(n => !n.isRead).length
    userId.value = profileRes.data._id
    // Kullanıcı login olduysa socket'e register et
    socket.emit('register', userId.value)
  } catch {}
}

onMounted(() => {
  fetchProfileAndNotifications()
  // Bildirim eventini dinle
  socket.on('notification', (notif) => {
    unreadCount.value++
    // İstersen burada toast veya başka bir gösterim ekleyebilirsin
    // örn: alert('Yeni bildirim: ' + notif.data.message)
  })
})

const handleLogout = () => {
  localStorage.removeItem('token')
  router.push('/login')
}

const handleProfileClick = () => {
  showProfileMenu.value = !showProfileMenu.value
}

const handleProfileMenuBlur = (e) => {
  // Menü dışına tıklanınca kapat
  if (!e.currentTarget.contains(e.relatedTarget)) {
    showProfileMenu.value = false
  }
}
</script>

<template>
  <nav class="navbar">
    <div class="nav-content">
      <div class="nav-brand">
        <router-link to="/">Ev Randevu</router-link>
      </div>
      <div class="nav-links" v-if="isAuthenticated">
        <router-link to="/create-booking">Randevu Oluştur</router-link>
        <router-link to="/bookings">Randevular</router-link>
        <router-link to="/profile">Profil</router-link>
        <div class="nav-right">
          <div class="notif-icon" @click="router.push('/notifications')">
            <span class="icon">🔔</span>
            <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount }}</span>
          </div>
          <div class="profile-menu-wrapper" tabindex="0" @blur="handleProfileMenuBlur">
            <img v-if="profilePicture" :src="profilePicture" class="profile-avatar" @click="handleProfileClick" />
            <div v-if="showProfileMenu" class="profile-menu">
              <button class="menu-item" @click="handleLogout">Çıkış Yap</button>
            </div>
          </div>
        </div>
      </div>
      <div class="nav-links" v-else>
        <router-link to="/login">Giriş Yap</router-link>
        <router-link to="/register">Kayıt Ol</router-link>
      </div>
    </div>
  </nav>
  <div class="main-content">
    <router-view />
  </div>
</template>

<style>
html, body, #app {
  display: flex;
  justify-content: center;
}

body {
  font-family: 'Segoe UI', Arial, sans-serif;
  background: #f7f9fb;
  color: #2c3e50;
}

.navbar {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  background: #2c3e50;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  z-index: 100;
  height: 64px;
  display: flex;
  align-items: center;
}

.nav-content {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 64px;
}

.nav-brand a {
  color: #fff;
  text-decoration: none;
  font-size: 1.6rem;
  font-weight: bold;
  letter-spacing: 1px;
}

.nav-links {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-links a {
  color: #fff;
  text-decoration: none;
  font-weight: 500;
  font-size: 1rem;
  transition: opacity 0.2s, color 0.2s;
}

.nav-links a:hover {
  color: #42b983;
  opacity: 0.85;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1.2rem;
}

.notif-icon {
  position: relative;
  cursor: pointer;
  font-size: 1.5rem;
  margin-right: 0.2rem;
}
.icon {
  font-size: 1.5rem;
}
.notif-badge {
  position: absolute;
  top: -7px;
  right: -10px;
  background: #dc3545;
  color: #fff;
  border-radius: 50%;
  font-size: 0.85rem;
  padding: 2px 7px;
  font-weight: bold;
  min-width: 22px;
  text-align: center;
  border: 2px solid #fff;
}
.profile-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #eee;
  cursor: pointer;
  margin-left: 0.2rem;
  transition: border 0.2s;
}
.profile-avatar:hover {
  border: 2px solid #42b983;
}
.profile-menu-wrapper {
  position: relative;
  display: inline-block;
  outline: none;
}
.profile-menu {
  position: absolute;
  right: 0;
  top: 110%;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
  min-width: 140px;
  z-index: 200;
  padding: 0.5rem 0;
  display: flex;
  flex-direction: column;
}
.menu-item {
  background: none;
  border: none;
  color: #2c3e50;
  font-size: 1rem;
  padding: 0.7rem 1.2rem;
  text-align: left;
  cursor: pointer;
  transition: background 0.2s;
}
.menu-item:hover {
  background: #f5f5f5;
}
.main-content {
  margin-top: 80px;
  min-height: calc(100vh - 80px);
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
@media (max-width: 700px) {
  .nav-content {
    padding: 0 1rem;
  }
  .nav-links {
    gap: 1rem;
  }
  .main-content {
    margin-top: 70px;
  }
}
</style>
