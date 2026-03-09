/* User Management admin page */
import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, TextField, Select, MenuItem, FormControl, InputLabel, Grid, Chip, Dialog, DialogTitle, DialogContent, DialogActions, LinearProgress } from '@mui/material';
import { Add, People } from '@mui/icons-material';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function UserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const emptyForm = { username: '', password: '', full_name: '', email: '', role: 'legal_officer', department: 'Legal' };
    const [form, setForm] = useState(emptyForm);

    const load = () => { api.get('/auth/users').then(r => setUsers(r.data)).catch(() => { }).finally(() => setLoading(false)); };
    useEffect(load, []);

    const handleCreate = async () => {
        try {
            await api.post('/auth/users', form);
            toast.success('User created!'); setOpen(false); load();
            setForm({ username: '', password: '', full_name: '', email: '', role: 'legal_officer', department: 'Legal' });
        } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    };

    const roleColors = { admin: '#FF6B6B', supervisor: '#FFB347', legal_officer: '#6C63FF', reviewer: '#00D9A6', manager: '#4FC3F7' };

    if (loading) return <LinearProgress />;

    return (
        <Box className="fade-in">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>User Management</Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8' }}>Manage system users and roles</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ ...emptyForm }); setOpen(true); }}>Add User</Button>
            </Box>

            <Grid container spacing={2}>
                {users.map(u => (
                    <Grid item xs={12} sm={6} md={4} key={u.id}>
                        <Card className="glass-card">
                            <CardContent sx={{ p: 2.5 }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{u.full_name}</Typography>
                                <Typography variant="body2" sx={{ color: '#94A3B8' }}>@{u.username}</Typography>
                                <Box sx={{ mt: 1.5, display: 'flex', gap: 1 }}>
                                    <Chip label={u.role.replace('_', ' ')} size="small"
                                        sx={{ bgcolor: `${roleColors[u.role] || '#9E9E9E'}20`, color: roleColors[u.role] || '#9E9E9E', fontWeight: 600 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create New User</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} autoComplete="off" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} autoComplete="new-password" />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Full Name" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} autoComplete="off" />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField fullWidth label="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} autoComplete="off" />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl fullWidth><InputLabel>Role</InputLabel>
                                <Select value={form.role} label="Role" onChange={e => setForm({ ...form, role: e.target.value })}>
                                    {['admin', 'supervisor', 'legal_officer', 'reviewer', 'manager'].map(r => <MenuItem key={r} value={r}>{r.replace('_', ' ')}</MenuItem>)}
                                </Select></FormControl>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField fullWidth label="Department" value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions><Button onClick={() => { setForm({ ...emptyForm }); setOpen(false); }}>Cancel</Button><Button variant="contained" onClick={handleCreate}>Create</Button></DialogActions>
            </Dialog>
        </Box>
    );
}
