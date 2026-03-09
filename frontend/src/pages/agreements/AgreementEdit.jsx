/* Edit Agreement page */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Card, CardContent, Typography, TextField, Button, Select, MenuItem,
    FormControl, InputLabel, Grid, CircularProgress, Alert
} from '@mui/material';
import { Save, ArrowBack } from '@mui/icons-material';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

export default function AgreementEdit() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [agr, setAgr] = useState(null);

    const [form, setForm] = useState({
        title: '',
        agreement_type: '',
        parties: '',
        currency: 'LKR',
        value: 0,
        effective_date: '',
        expiry_date: '',
        duration_months: '',
        description: '',
    });

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

    useEffect(() => {
        api.get(`/agreements/${id}`)
            .then(res => {
                const data = res.data;
                setAgr(data);
                setForm({
                    title: data.title || '',
                    agreement_type: data.agreement_type || '',
                    parties: data.parties || '',
                    currency: data.currency || 'LKR',
                    value: data.value || 0,
                    effective_date: data.effective_date ? data.effective_date.split('T')[0] : '',
                    expiry_date: data.expiry_date ? data.expiry_date.split('T')[0] : '',
                    duration_months: data.duration_months || '',
                    description: data.description || '',
                });
            })
            .catch(() => toast.error('Agreement not found'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                value: parseFloat(form.value) || 0,
                duration_months: form.duration_months ? parseInt(form.duration_months) : null,
                effective_date: form.effective_date || null,
                expiry_date: form.expiry_date || null,
            };
            await api.put(`/agreements/${id}`, payload);
            toast.success('Agreement updated successfully');
            navigate(`/agreements/${id}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update agreement');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>;

    if (user?.role !== 'admin' && user?.role !== 'owner') {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="h5" color="error">Access Denied</Typography>
                <Typography variant="body1" sx={{ mt: 2 }}>You do not have permission to edit this agreement.</Typography>
                <Button variant="outlined" sx={{ mt: 3 }} onClick={() => navigate(`/agreements/${id}`)}>Back to Agreement</Button>
            </Box>
        );
    }

    const revisionNote = agr?.approval_steps?.filter(s => s.status === 'rejected').sort((a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at))[0]?.comments;

    return (
        <Box className="fade-in">
            <Button startIcon={<ArrowBack />} onClick={() => navigate(`/agreements/${id}`)} sx={{ mb: 2, color: '#94A3B8' }}>Back</Button>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Edit Agreement</Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
                Update the details for agreement <strong>{agr?.agreement_number}</strong>.
            </Typography>

            {agr?.status === 'REVISION' && revisionNote && (
                <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Revision Notes:</Typography>
                    <Typography variant="body2">{revisionNote}</Typography>
                </Alert>
            )}

            <Card className="glass-card">
                <CardContent sx={{ p: 3 }}>
                    <form onSubmit={handleSubmit}>
                        <Grid container spacing={3}>
                            <Grid item xs={12}>
                                <TextField fullWidth label="Agreement Title" required value={form.title}
                                    onChange={e => update('title', e.target.value)} />
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Agreement Type</InputLabel>
                                    <Select
                                        value={form.agreement_type}
                                        label="Agreement Type"
                                        onChange={e => update('agreement_type', e.target.value)}
                                    >
                                        <MenuItem value=""><em>None</em></MenuItem>
                                        {['NDA', 'SLA', 'vendor', 'lease', 'employment', 'partnership', 'other'].map(t =>
                                            <MenuItem key={t} value={t}>{t.toUpperCase()}</MenuItem>)}
                                    </Select>
                                </FormControl>
                            </Grid>

                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Parties Involved" value={form.parties}
                                    onChange={e => update('parties', e.target.value)} />
                            </Grid>

                            <Grid item xs={12} sm={3}>
                                <FormControl fullWidth>
                                    <InputLabel>Currency</InputLabel>
                                    <Select value={form.currency} label="Currency"
                                        onChange={e => update('currency', e.target.value)}>
                                        <MenuItem value="LKR">LKR</MenuItem>
                                        <MenuItem value="USD">USD</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={5}>
                                <TextField fullWidth label={`Value (${form.currency})`} type="number"
                                    value={form.value}
                                    onChange={e => update('value', e.target.value)}
                                    inputProps={{ min: 0 }} />
                            </Grid>
                            <Grid item xs={12} sm={4}>
                                <TextField fullWidth label="Duration (Months)" type="number"
                                    value={form.duration_months}
                                    onChange={e => update('duration_months', e.target.value)} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Effective Date" type="date"
                                    value={form.effective_date}
                                    onChange={e => update('effective_date', e.target.value)}
                                    InputLabelProps={{ shrink: true }} />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField fullWidth label="Expiry Date" type="date"
                                    value={form.expiry_date}
                                    onChange={e => update('expiry_date', e.target.value)}
                                    InputLabelProps={{ shrink: true }} />
                            </Grid>

                            <Grid item xs={12}>
                                <TextField fullWidth label="Description" value={form.description} multiline rows={4}
                                    onChange={e => update('description', e.target.value)} />
                            </Grid>
                        </Grid>

                        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
                            <Button variant="outlined" onClick={() => navigate(`/agreements/${id}`)}>Cancel</Button>
                            <Button variant="contained" type="submit"
                                startIcon={submitting ? <CircularProgress size={20} /> : <Save />}
                                disabled={submitting} sx={{ background: 'linear-gradient(135deg, #00D9A6, #00AD85)' }}>
                                {submitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </Box>
                    </form>
                </CardContent>
            </Card>
        </Box>
    );
}
