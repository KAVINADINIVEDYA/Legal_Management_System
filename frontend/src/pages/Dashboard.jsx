/* Dashboard with stats, alerts, and quick actions */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Card, CardContent, Typography, Chip, Button, Alert, LinearProgress, IconButton } from '@mui/material';
import { Gavel, Description, Warning, TrendingUp, Add, Search, SmartToy, Security } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/client';
import { getStatusColor, getRiskColor } from '../utils/helpers';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

const COLORS = ['#6C63FF', '#00D9A6', '#FF6B6B', '#FFB347', '#E879F9', '#4FC3F7', '#94A3B8'];

function StatCard({ title, value, subtitle, icon, color, onClick }) {
    return (
        <Card className="glass-card" sx={{
            height: '100%',
            cursor: onClick ? 'pointer' : 'default',
            transition: 'transform 0.2s, box-shadow 0.2s',
            '&:hover': {
                transform: onClick ? 'translateY(-4px)' : 'none',
                boxShadow: onClick ? `0 8px 24px ${color}20` : 'none',
                borderColor: `${color}40`
            }
        }} onClick={onClick}>
            <CardContent sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="overline" sx={{ color: '#94A3B8', fontSize: '0.7rem', letterSpacing: 1 }}>{title}</Typography>
                        <Typography variant="h3" sx={{
                            fontWeight: 800, mt: 0.5, background: `linear-gradient(135deg, ${color}, ${color}88)`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                            lineHeight: 1
                        }}>{value}</Typography>
                        <Typography variant="body2" sx={{ color: '#64748B', mt: 0.5, fontSize: '0.8rem' }}>{subtitle}</Typography>
                    </Box>
                    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</Box>
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

export default function Dashboard() {
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
            setStats(statsRes.data);
            const isRestricted = user?.role === 'manager' || user?.role === 'reviewer';
            let formattedAlerts = alertsRes.data.alerts || [];
            if (isRestricted) {
                formattedAlerts = formattedAlerts.filter(a => a.entity_type === 'agreement');
            }
            setAlerts(formattedAlerts);
        }).catch(() => { }).finally(() => setLoading(false));
    }, [user?.role]);

    if (loading) return <Box sx={{ p: 4 }}><LinearProgress /></Box>;

    const caseStats = stats?.cases || {};
    const agrStats = stats?.agreements || {};
    const isAgreementOnlyUser = user?.role === 'manager' || user?.role === 'reviewer';

    return (
        <Box className="fade-in">
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                    Welcome back, <span className="gradient-text">{user?.full_name || 'User'}</span>
                </Typography>
                <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                    Mobitel Legal Management System Dashboard
                </Typography>
            </Box>

            {/* Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }} alignItems="stretch">
                {!isAgreementOnlyUser && (
                    <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
                        <StatCard title="Total Cases" value={caseStats.total_cases || 0} subtitle="All legal cases"
                            icon={<Gavel sx={{ color: '#6C63FF', fontSize: 28 }} />} color="#6C63FF" onClick={() => navigate('/cases')} />
                    </Grid>
                )}
                <Grid item xs={12} sm={6} md={isAgreementOnlyUser ? 4 : 3} sx={{ display: 'flex' }}>
                    <StatCard title="Agreements" value={agrStats.total_agreements || 0} subtitle="All agreements"
                        icon={<Description sx={{ color: '#00D9A6', fontSize: 28 }} />} color="#00D9A6" onClick={() => navigate('/agreements')} />
                </Grid>
                <Grid item xs={12} sm={6} md={isAgreementOnlyUser ? 4 : 3} sx={{ display: 'flex' }}>
                    {isAgreementOnlyUser ? (
                        <StatCard title="Expiring Soon" value={agrStats.expiring_soon || 0} subtitle="Next 30 days"
                            icon={<Warning sx={{ color: '#FFB347', fontSize: 28 }} />} color="#FFB347" />
                    ) : (
                        <StatCard title="High Risk" value={(caseStats.high_risk_cases || 0) + (agrStats.high_risk_agreements || 0)}
                            subtitle="Items needing attention" icon={<Warning sx={{ color: '#FF6B6B', fontSize: 28 }} />} color="#FF6B6B"
                            onClick={() => navigate(caseStats.high_risk_cases > 0 ? '/cases' : '/agreements')} />
                    )}
                </Grid>
                <Grid item xs={12} sm={6} md={isAgreementOnlyUser ? 4 : 3} sx={{ display: 'flex' }}>
                    <StatCard title="Active Alerts" value={alerts.length} subtitle="Pending notifications"
                        icon={<TrendingUp sx={{ color: '#FFB347', fontSize: 28 }} />} color="#FFB347" />
                </Grid>
            </Grid>

            {/* Charts Row */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={6}>
                    {isAgreementOnlyUser ? (
                        <Card className="glass-card" sx={{ height: 400 }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Agreement Type Distribution</Typography>
                                <Box sx={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={Object.entries(agrStats.by_type || {}).map(([name, value]) => ({
                                                    name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                                    value
                                                })).filter(d => d.value > 0)}
                                                innerRadius={60} outerRadius={100} paddingAngle={5}
                                                dataKey="value" nameKey="name" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                            >
                                                {Object.entries(agrStats.by_type || {}).filter(([_, v]) => v > 0).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="glass-card" sx={{ height: 400 }}>
                            <CardContent>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Case Distribution by Type</Typography>
                                <Box sx={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={Object.entries(caseStats.by_type || {}).map(([name, value]) => ({
                                                    name: name.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                                                    value
                                                })).filter(d => d.value > 0)}
                                                innerRadius={60} outerRadius={100} paddingAngle={5}
                                                dataKey="value" nameKey="name" label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                                            >
                                                {Object.entries(caseStats.by_type || {}).filter(([_, v]) => v > 0).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            </CardContent>
                        </Card>
                    )}
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card className="glass-card" sx={{ height: 400 }}>
                        <CardContent>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Agreement Status Breakdown</Typography>
                            <Box sx={{ height: 320, mt: 1 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={Object.entries(agrStats.by_status || {}).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)}
                                        layout="vertical"
                                    >
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.05)" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#94A3B8', fontSize: 12 }} />
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                            {Object.entries(agrStats.by_status || {}).filter(([_, v]) => v > 0).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Grid container spacing={3}>
                {/* Quick Actions */}
                {!isAgreementOnlyUser && (
                    <Grid item xs={12} md={4}>
                        <Card className="glass-card">
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Quick Actions</Typography>
                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                                    <Button variant="contained" startIcon={<Add />} fullWidth onClick={() => navigate('/cases/new')}>
                                        New Legal Case
                                    </Button>
                                    <Button variant="outlined" startIcon={<Add />} fullWidth onClick={() => navigate('/agreements/new')}
                                        sx={{ borderColor: '#00D9A6', color: '#00D9A6', '&:hover': { borderColor: '#00D9A6', bgcolor: '#00D9A610' } }}>
                                        New Agreement
                                    </Button>
                                    <Button variant="outlined" startIcon={<SmartToy />} fullWidth onClick={() => navigate('/ai/chat')}
                                        sx={{ borderColor: '#6C63FF', color: '#6C63FF', '&:hover': { bgcolor: '#6C63FF10' } }}>
                                        Ask Legal AI
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* Alerts */}
                <Grid item xs={12} md={isAgreementOnlyUser ? 12 : 8}>
                    <Card className="glass-card">
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                                Active Alerts <Chip label={alerts.length} size="small" sx={{ ml: 1, bgcolor: '#FF6B6B20', color: '#FF6B6B' }} />
                            </Typography>
                            {alerts.length === 0 ? (
                                <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', py: 3 }}>
                                    No active alerts — all looks good! ✅
                                </Typography>
                            ) : (
                                alerts.slice(0, 6).map((alert, i) => <AlertItem key={i} alert={alert} />)
                            )}
                        </CardContent>
                    </Card>
                </Grid>

                {/* Case Status Breakdown */}
                {!isAgreementOnlyUser && (
                    <Grid item xs={12} md={6}>
                        <Card className="glass-card">
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Case Status Overview</Typography>
                                {Object.entries(caseStats.by_status || {}).map(([status, count]) => (
                                    <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                        <Chip label={status} size="small" sx={{ bgcolor: `${getStatusColor(status)}20`, color: getStatusColor(status), fontWeight: 600 }} />
                                        <Typography variant="h6" sx={{ fontWeight: 700 }}>{count}</Typography>
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    </Grid>
                )}

                {/* Agreement Status Breakdown */}
                <Grid item xs={12} md={isAgreementOnlyUser ? 12 : 6}>
                    <Card className="glass-card">
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Agreement Status Overview</Typography>
                            {Object.entries(agrStats.by_status || {}).filter(([_, c]) => c > 0).map(([status, count]) => (
                                <Box key={status} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Chip label={status} size="small" sx={{ bgcolor: `${getStatusColor(status)}20`, color: getStatusColor(status), fontWeight: 600 }} />
                                    <Typography variant="h6" sx={{ fontWeight: 700 }}>{count}</Typography>
                                </Box>
                            ))}
                            {Object.values(agrStats.by_status || {}).every(v => v === 0) && (
                                <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', py: 2 }}>No agreements yet</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}
