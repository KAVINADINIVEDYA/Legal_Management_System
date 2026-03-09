/* Agreement List page */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Chip, Button, Select, MenuItem, FormControl, InputLabel, Grid, LinearProgress } from '@mui/material';
import { Add, Description } from '@mui/icons-material';
import api from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import { getStatusColor, getRiskColor, formatDate, truncate } from '../../utils/helpers';

export default function AgreementList() {
    const [agreements, setAgreements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const navigate = useNavigate();
    const { user } = useAuth();

    useEffect(() => {
        let url = '/agreements?';
        if (statusFilter) url += `status_filter=${statusFilter}&`;
        if (typeFilter) url += `agreement_type=${typeFilter}&`;
        api.get(url).then(res => setAgreements(res.data)).catch(() => { }).finally(() => setLoading(false));
    }, [statusFilter, typeFilter]);

    return (
        <Box className="fade-in">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Agreements</Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8' }}>Manage agreements and approval workflows</Typography>
                </Box>
                {user?.role !== 'supervisor' && (
                    <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/agreements/new')}
                        sx={{ background: 'linear-gradient(135deg, #00D9A6, #00AD85)' }}>New Agreement</Button>
                )}
            </Box>

            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {['DRAFT', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SIGNED', 'ACTIVE', 'EXPIRED', 'REVISION'].map(s =>
                            <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Type</InputLabel>
                    <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {['NDA', 'SLA', 'vendor', 'lease', 'employment', 'partnership'].map(t =>
                            <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            <Grid container spacing={2}>
                {agreements.map(a => (
                    <Grid item xs={12} md={6} lg={4} key={a.id}>
                        <Card className="glass-card" sx={{ cursor: 'pointer' }} onClick={() => navigate(`/agreements/${a.id}`)}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Chip label={a.agreement_number} size="small" sx={{ bgcolor: '#00D9A620', color: '#00D9A6', fontWeight: 600 }} />
                                    <Chip label={a.status} size="small" sx={{ bgcolor: `${getStatusColor(a.status)}20`, color: getStatusColor(a.status), fontWeight: 600 }} />
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{truncate(a.title, 60)}</Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                    <Chip label={a.agreement_type} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                    {a.governing_law && <Chip label={a.governing_law} size="small" variant="outlined" sx={{ fontSize: '0.65rem' }} />}
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, color: '#64748B', fontSize: '0.75rem' }}>
                                    <Typography variant="caption">Value: {a.currency} {a.value?.toLocaleString()}</Typography>
                                    {a.risk_score > 0 && (
                                        <Typography variant="caption" sx={{ color: getRiskColor(a.risk_score), fontWeight: 600 }}>
                                            Risk: {a.risk_score}
                                        </Typography>
                                    )}
                                </Box>
                                {a.expiry_date && (
                                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
                                        Expires: {formatDate(a.expiry_date)}
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {!loading && agreements.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Description sx={{ fontSize: 64, color: '#1E293B', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#64748B' }}>No agreements found</Typography>
                    {user?.role !== 'supervisor' && (
                        <Button variant="contained" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => navigate('/agreements/new')}>
                            Create First Agreement
                        </Button>
                    )}
                </Box>
            )}
        </Box>
    );
}
