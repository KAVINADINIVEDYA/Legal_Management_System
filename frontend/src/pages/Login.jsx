/* Login page with branded design */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, TextField, Button, Typography, Paper, Alert, CircularProgress } from '@mui/material';
import { Security, Login as LoginIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await login(username, password);
            toast.success('Welcome to MobiLex!');
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed');
        }
        setLoading(false);
    };

    return (
        <Box sx={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse at 20% 50%, rgba(108, 99, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse at 80% 50%, rgba(0, 217, 166, 0.1) 0%, transparent 50%), #0A0E1A',
        }}>
            <Paper className="fade-in" sx={{
                p: 5, width: 420, borderRadius: 4, background: 'rgba(17, 24, 39, 0.9)',
                border: '1px solid rgba(108, 99, 255, 0.2)', backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            }}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Security sx={{ fontSize: 48, color: '#6C63FF', mb: 1 }} />
                    <Typography variant="h4" sx={{
                        fontWeight: 800, background: 'linear-gradient(135deg, #6C63FF, #00D9A6)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5,
                    }}>
                        MobiLex
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                        Integrated Legal Management System
                    </Typography>
                </Box>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                <form onSubmit={handleSubmit} autoComplete="off">
                    <TextField fullWidth label="Username" value={username} onChange={(e) => setUsername(e.target.value)}
                        sx={{ mb: 2 }} required autoFocus autoComplete="off" placeholder="Enter username"
                        InputLabelProps={{ shrink: true }} />
                    <TextField fullWidth label="Password" type="password" value={password}
                        onChange={(e) => setPassword(e.target.value)} sx={{ mb: 3 }} required
                        autoComplete="new-password" placeholder="Enter password"
                        InputLabelProps={{ shrink: true }} />
                    <Button fullWidth variant="contained" type="submit" size="large" disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : <LoginIcon />}
                        sx={{ py: 1.5, fontSize: '1rem' }}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </form>

            </Paper>
        </Box>
    );
}
