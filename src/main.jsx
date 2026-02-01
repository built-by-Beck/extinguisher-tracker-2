import React from 'react'
import ReactDOM from 'react-dom/client'
import Router from './Router.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import { SubscriptionProvider } from './contexts/SubscriptionContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <SubscriptionProvider>
        <Router />
      </SubscriptionProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
