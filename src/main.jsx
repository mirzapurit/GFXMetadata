import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App.jsx'
import './index.css'

const clientId = "326028909255-rp222bn3e835vn356ql0r9f13adof6hu.apps.googleusercontent.com";

console.log("Initializing Google OAuth with Client ID:", clientId);

if (!clientId) {
  console.error("Google Client ID is missing!");
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {clientId ? (
      <GoogleOAuthProvider clientId={clientId}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <div style={{ color: 'white', padding: '20px', textAlign: 'center' }}>
        <h2>Configuration Error</h2>
        <p>Google Client ID is missing. Please check your environment variables.</p>
      </div>
    )}
  </React.StrictMode>,
)
