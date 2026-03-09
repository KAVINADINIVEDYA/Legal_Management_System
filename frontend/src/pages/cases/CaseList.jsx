/* Legal Case List page */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Chip, Button, TextField, Select, MenuItem, FormControl, InputLabel, Grid, IconButton, LinearProgress } from '@mui/material';
import { Add, Gavel, FilterList, Visibility } from '@mui/icons-material';
import api from '../../api/client';
import { getStatusColor, getRiskColor, formatDate, truncate } from '../../utils/helpers';

export default function CaseList() {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        let url = '/cases?';
        if (statusFilter) url += `status_filter=${statusFilter}&`;
        if (typeFilter) url += `case_type=${typeFilter}&`;
        api.get(url).then(res => setCases(res.data)).catch(() => { }).finally(() => setLoading(false));
    }, [statusFilter, typeFilter]);

    return (
        <Box className="fade-in">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Legal Cases</Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8' }}>Manage and track all legal cases</Typography>
                </Box>
                <Button variant="contained" startIcon={<Add />} onClick={() => navigate('/cases/new')}>New Case</Button>
            </Box>

            {/* Filters */}
            <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {['NEW', 'ACTIVE', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ARCHIVED'].map(s =>
                            <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Type</InputLabel>
                    <Select value={typeFilter} label="Type" onChange={e => setTypeFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {[
                            { value: 'money_recovery', label: 'Money Recovery' },
                            { value: 'damages_recovery', label: 'Damages Recovery' },
                            { value: 'appeals', label: 'Appeals' },
                            { value: 'land_cases', label: 'Land Cases' },
                            { value: 'criminal_cases', label: 'Criminal Cases' },
                            { value: 'other', label: 'Other' },
                        ].map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                    </Select>
                </FormControl>
            </Box>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* Case Cards */}
            <Grid container spacing={2}>
                {cases.map(c => (
                    <Grid item xs={12} md={6} lg={4} key={c.id}>
                        <Card className="glass-card" sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.id}`)}>
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Chip label={c.case_number} size="small" sx={{ bgcolor: '#6C63FF20', color: '#6C63FF', fontWeight: 600 }} />
                                    <Chip label={c.status} size="small" sx={{ bgcolor: `${getStatusColor(c.status)}20`, color: getStatusColor(c.status), fontWeight: 600 }} />
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>{truncate(c.title, 60)}</Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                                    <Chip label={c.case_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                                    {c.currency && c.financial_exposure > 0 && (
                                        <Chip label={`${c.currency} ${c.financial_exposure?.toLocaleString()}`} size="small" sx={{ bgcolor: '#FF6B6B20', color: '#FF6B6B', fontSize: '0.7rem' }} />
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, color: '#64748B', fontSize: '0.75rem' }}>
                                    <Typography variant="caption">Filed: {formatDate(c.filed_date)}</Typography>
                                    {c.risk_score > 0 && (
                                        <Typography variant="caption" sx={{ color: getRiskColor(c.risk_score), fontWeight: 600 }}>
                                            Risk: {c.risk_score}
                                        </Typography>
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {!loading && cases.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 8 }}>
                    <Gavel sx={{ fontSize: 64, color: '#1E293B', mb: 2 }} />
                    <Typography variant="h6" sx={{ color: '#64748B' }}>No cases found</Typography>
                    <Button variant="contained" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => navigate('/cases/new')}>
                        Create First Case
                    </Button>
                </Box>
            )}
        </Box>
    );
}
