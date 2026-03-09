/* Admin Landing Page */
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Card, CardContent, Typography, Button } from '@mui/material';
import { Dashboard as DashboardIcon, People, Assessment, Security } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function AdminHome() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <Box className="fade-in">
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                    Welcome back, <span className="gradient-text">{user?.full_name || 'Admin'}</span>
                </Typography>
                <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                    System Administration Home
                </Typography>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <Card className="glass-card" sx={{ cursor: 'pointer', height: '100%' }} onClick={() => navigate('/admin/users')}>
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <People sx={{ fontSize: 60, color: '#6C63FF', mb: 2 }} />
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>User Management</Typography>
                            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                                Manage system users, roles, and access controls.
                            </Typography>
                            <Button variant="outlined" sx={{ mt: 3, color: '#6C63FF', borderColor: '#6C63FF' }}>Enter Management</Button>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card className="glass-card" sx={{ cursor: 'pointer', height: '100%' }} onClick={() => navigate('/dashboard')}>
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <Assessment sx={{ fontSize: 60, color: '#00D9A6', mb: 2 }} />
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>System Dashboard</Typography>
                            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                                View comprehensive system statistics and all active alerts.
                            </Typography>
                            <Button variant="outlined" sx={{ mt: 3, color: '#00D9A6', borderColor: '#00D9A6' }}>View Full Metrics</Button>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card className="glass-card" sx={{ cursor: 'pointer', height: '100%' }} onClick={() => navigate('/admin/audit')}>
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <Security sx={{ fontSize: 60, color: '#94A3B8', mb: 2 }} />
                            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>Security Audit Logs</Typography>
                            <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                                Monitor system activity, user actions, and full event traceability.
                            </Typography>
                            <Button variant="outlined" sx={{ mt: 3, color: '#94A3B8', borderColor: '#94A3B8' }}>View Audit Trail</Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
