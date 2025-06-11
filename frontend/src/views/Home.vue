<template>
  <div class="home">
    <header class="hero">
      
      <h1>Ev Randevu</h1>
      <p>Arkadaşlarınız ve ailenizle randevu almanın en kolay yolu</p>
    </header>

    <main class="features">
      <div class="feature-card">
        <h2>Kolay Randevu</h2>
        <p>Birkaç tıklama ile randevu oluşturun</p>
      </div>
      <div class="feature-card">
        <h2>Anlık Bildirimler</h2>
        <p>Randevu durumundaki değişikliklerden anında haberdar olun</p>
      </div>
      <div class="feature-card">
        <h2>Güvenli Sistem</h2>
        <p>Güvenli ve şifreli iletişim</p>
      </div>
    </main>

    <div class="cta-section" v-if="!isAuthenticated">
      <router-link to="/register" class="btn primary">Hemen Başla</router-link>
      <router-link to="/login" class="btn secondary">Giriş Yap</router-link>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const isAuthenticated = computed(() => {
  return !!localStorage.getItem('token')
})
</script>

<style scoped>
.home {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.hero {
  text-align: center;
  padding: 4rem 0;
}

.hero h1 {
  font-size: 3rem;
  color: #2c3e50;
  margin-bottom: 1rem;
}

.hero p {
  font-size: 1.5rem;
  color: #666;
}

.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
  margin: 4rem 0;
}

.feature-card {
  background: #fff;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  text-align: center;
}

.feature-card h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
}

.cta-section {
  text-align: center;
  margin-top: 4rem;
}

.btn {
  display: inline-block;
  padding: 1rem 2rem;
  border-radius: 4px;
  text-decoration: none;
  font-weight: bold;
  margin: 0 1rem;
}

.primary {
  background: #42b983;
  color: white;
}

.secondary {
  background: #2c3e50;
  color: white;
}


</style> 