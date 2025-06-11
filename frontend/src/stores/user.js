import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const isAuthenticated = ref(!!localStorage.getItem('token'))
  const profilePicture = ref('')
  const username = ref('')

  function setUser({ token, profilePicture: pic, username: name }) {
    if (token) localStorage.setItem('token', token)
    isAuthenticated.value = !!token
    profilePicture.value = pic || ''
    username.value = name || ''
  }

  function logout() {
    localStorage.removeItem('token')
    isAuthenticated.value = false
    profilePicture.value = ''
    username.value = ''
  }

  return { isAuthenticated, profilePicture, username, setUser, logout }
}) 