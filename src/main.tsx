import React from 'react'
import { createRoot } from 'react-dom/client'
import { MantineProvider } from '@mantine/core'
// L'ordre des imports CSS est important : le vôtre doit être après celui de Mantine
import '@mantine/core/styles.css' 
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* On retire les props obsolètes car le fichier styles.css fait déjà le travail */}
    <MantineProvider forceColorScheme="light" theme={{ fontFamily: "'Outfit', sans-serif" }}>
      <App />
    </MantineProvider>
  </React.StrictMode>
)