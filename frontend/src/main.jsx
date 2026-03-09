import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// Mobitel branded dark theme
const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: { main: '#6C63FF', light: '#8B83FF', dark: '#4A42CC' },
        secondary: { main: '#00D9A6', light: '#33E3BB', dark: '#00AD85' },
        error: { main: '#FF6B6B' },
        warning: { main: '#FFB347' },
        info: { main: '#4FC3F7' },
        success: { main: '#66BB6A' },
        background: { default: '#0A0E1A', paper: '#111827' },
        text: { primary: '#F1F5F9', secondary: '#94A3B8' },
    },
    typography: {
        fontFamily: '"Inter", "Segoe UI", sans-serif',
        h4: { fontWeight: 700 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    border: '1px solid rgba(108, 99, 255, 0.15)',
                    backdropFilter: 'blur(10px)',
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: { textTransform: 'none', fontWeight: 600, borderRadius: 8 },
                containedPrimary: {
                    background: 'linear-gradient(135deg, #6C63FF 0%, #8B83FF 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #5A52E0 0%, #7A73FF 100%)' },
                }
            }
        },
        MuiChip: {
            styleOverrides: { root: { fontWeight: 500 } }
        }
    }
})

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <App />
            </BrowserRouter>
            <Toaster position="top-right" toastOptions={{
                style: { background: '#1E293B', color: '#F1F5F9', border: '1px solid rgba(108, 99, 255, 0.3)' }
            }} />
        </ThemeProvider>
    </React.StrictMode>,
)
