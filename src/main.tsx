import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AppStoreProvider } from './store/AppStore'
import { AuthStoreProvider } from './store/AuthStore'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthStoreProvider>
        <AppStoreProvider>
          <App />
        </AppStoreProvider>
      </AuthStoreProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
