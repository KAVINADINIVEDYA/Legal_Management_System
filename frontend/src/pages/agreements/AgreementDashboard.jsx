/* Dashboard specialized for Agreements (Reviewers/Managers) */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Card, CardContent, Typography, Chip, Button, Alert, LinearProgress } from '@mui/material';
import { Description, Warning, TrendingUp, Add } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { getStatusColor } from '../utils/helpers';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Cell } from 'recharts';

const COLORS = ['#6C63FF', '#00D9A6', '#FF6B6B', '#FFB347', '#E879F9', '#4FC3F7', '#94A3B8'];

function StatCard({ title, value, subtitle, icon, color, onClick }) {
    return (
        <Card className="glass-card" sx={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
            <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography variant="overline" sx={{ color: '#94A3B8', fontSize: '0.7rem', letterSpacing: 1 }}>{title}</Typography>
                        <Typography variant="h3" sx={{
                            fontWeight: 800, mt: 0.5, background: `linear-gradient(135deg, ${color}, ${color}88)`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
                        }}>{value}</Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5 }}>{subtitle}</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${color}15` }}>{icon}</Box>
                </Box>
            </CardContent>
        </Card>
    );
}

function AlertItem({ alert }) {
    const severityColors = { high: '#FF6B6B', medium: '#FFB347', low: '#4FC3F7' };
    return (
        <Box sx={{
            display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: 2,
            background: `${severityColors[alert.severity]}08`, border: `1px solid ${severityColors[alert.severity]}20`, mb: 1
        }}>
            <Warning sx={{ color: severityColors[alert.severity], fontSize: 20 }} />
            <Box sx={{ flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{alert.message}</Typography>
            </Box>
            <Chip label={alert.severity} size="small" sx={{
                bgcolor: `${severityColors[alert.severity]}20`, color: severityColors[alert.severity],
                fontWeight: 600, fontSize: '0.65rem', height: 22,
            }} />
        </Box>
    );
}

export default function AgreementDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            api.get('/dashboard/stats'),
            api.get('/dashboard/alerts')
        ]).then(([statsRes, alertsRes]) => {
            setStats(statsRes.data.agreements || {});
            // Filter alerts down to just agreements
            setAlerts((alertsRes.data.alerts || []).filter(a => a.entity_type === 'agreement'));
        }).catch(() => { }).finally(() => setLoading(false));
    }, []);

    if (loading) return <Box sx={{ p: 4 }}><LinearProgress /></Box>;

    return (
        <Box className="fade-in">
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                    Welcome back, <span className="gradient-text">{user?.full_name || 'User'}</span>
                </Typography>
                <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                    Agreements Management Dashboard
                </Typography>
            </Box>

            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard title="Agreements" value={stats.total_agreements || 0} subtitle="All tracked agreements"
                        icon={<Description sx={{ color: '#00D9A6', fontSize: 28 }} />} color="#00D9A6" onClick={() => navigate('/agreements')} />
                </Grid>
                <Grid item xs={12} sm={6} md={4}>
                    <StatCard title="Expiring Soon" value={stats.expiring_soon || 0} subtitle="Next 30 days"
                        icon={<Warning sx={{ color: '#FFB347', fontSize: 28 }} />} color="#FFB347" />
                </Grid>
                <Grid item xs={12} sm={12} md={4}>
                    <StatCard title="Active Alerts" value={alerts.length} subtitle="Items requiring attention"
                        icon={<TrendingUp sx={{ color: '#FF6B6B', fontSize: 28 }} />} color="#FF6B6B" />
                </Grid>
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={7}>
                    <Card className="glass-card" sx={{ height: 400 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Agreement Status Breakdown</Typography>
                            <Box sx={{ height: 320, mt: 1 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={Object.entries(stats.by_status || {}).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)}
                                        layout="vertical"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#fff' }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {Object.entries(stats.by_status || {}).filter(([_, v]) => v > 0).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* List View / Alerts */}
                <Grid item xs={12} md={5}>
                    <Card className="glass-card" sx={{ height: 400, overflow: 'auto' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                    Active Alerts <Chip label={alerts.length} size="small" sx={{ ml: 1, bgcolor: '#FF6B6B20', color: '#FF6B6B' }} />
                                </Typography>
                            </Box>
                            {alerts.length === 0 ? (
                                <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', py: 6 }}>
                                    No active alerts — all looks good! ✅
                                </Typography>
                            ) : (
                                alerts.slice(0, 6).map((alert, i) => <AlertItem key={i} alert={alert} />)
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
