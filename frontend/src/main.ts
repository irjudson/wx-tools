import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router' // Import the router
import { createPinia } from 'pinia' // Import createPinia

const app = createApp(App)
const pinia = createPinia()

app.use(pinia) // Use Pinia
app.use(router)
app.mount('#app')
