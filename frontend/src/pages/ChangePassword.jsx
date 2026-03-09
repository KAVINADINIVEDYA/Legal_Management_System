import React, { useState } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Grid, Paper } from '@mui/material';
import { LockReset, Save } from '@mui/icons-material';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function ChangePassword() {
    const [form, setForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (form.new_password !== form.confirm_password) {
            toast.error('New passwords do not match');
            return;
        }

        setLoading(true);
        try {
            await api.post('/auth/change-password', {
                current_password: form.current_password,
                new_password: form.new_password
            });
            toast.success('Password updated successfully!');
            setForm({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', mt: 4 }} className="fade-in">
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 3 }}>Change Password</Typography>

            <Card className="glass-card">
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                        <Box sx={{
                            p: 2, borderRadius: 2,
                            background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.1), rgba(0, 217, 166, 0.1))',
                            mr: 2, display: 'flex'
                        }}>
                            <LockReset sx={{ color: '#6C63FF', fontSize: 32 }} />
                        </Box>
                        <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>Security Settings</Typography>
                            <Typography variant="body2" sx={{ color: '#94A3B8' }}>Update your account password</Typography>
                        </Box>
                    </Box>

                    <form onSubmit={handleSubmit} autoComplete="off">
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Current Password"
                                    type="password"
                                    value={form.current_password}
                                    onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                                    required
                                    autoComplete="off"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="New Password"
                                    type="password"
                                    value={form.new_password}
                                    onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                                    required
                                    autoComplete="new-password"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    fullWidth
                                    label="Confirm New Password"
                                    type="password"
                                    value={form.confirm_password}
                                    onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                                    required
                                    autoComplete="off"
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sx={{ mt: 2 }}>
                                <Button
                                    fullWidth
                                    variant="contained"
                                    type="submit"
                                    size="large"
                                    startIcon={<Save />}
                                    disabled={loading}
                                    sx={{ py: 1.5 }}
                                >
                                    {loading ? 'Updating...' : 'Update Password'}
                                </Button>
                            </Grid>
                        </Grid>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
}
