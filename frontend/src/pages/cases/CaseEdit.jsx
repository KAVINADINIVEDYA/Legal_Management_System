/* Edit Legal Case page — Modify case details within 24 hours */
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Box, Card, CardContent, Typography, TextField, Button, Select, MenuItem,
    FormControl, InputLabel, Grid, CircularProgress, Chip, Alert, IconButton
} from '@mui/material';
import { Save, ArrowBack, AutoAwesome, Warning, CloudUpload } from '@mui/icons-material';
import api from '../../api/client';
import toast from 'react-hot-toast';

/* Case type options */
const CASE_TYPES = [
    { value: 'money_recovery', label: 'Money Recovery Cases' },
    { value: 'damages_recovery', label: 'Damages Recovery Cases' },
    { value: 'appeals', label: 'Appeals' },
    { value: 'land_cases', label: 'Land Cases' },
    { value: 'criminal_cases', label: 'Criminal Cases' },
    { value: 'other', label: 'Other Court / Legal Matters' },
];

export default function CaseEdit() {
    const navigate = useNavigate();
    const { id } = useParams();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [additionalDoc, setAdditionalDoc] = useState(null);
    const fileInputRef = React.useRef(null);

    /* Form fields */
    const [form, setForm] = useState({
        title: '', case_type: 'other', parties: '', court_authority: '',
        financial_exposure: 0, currency: 'LKR', nature_of_case: '',
        description: '', filed_date: '',
        claim_amount: 0, recovered_amount: 0, outstanding_amount: 0,
    });

    const update = (field, value) => setForm(prev => {
        const next = { ...prev, [field]: value };
        if (field === 'claim_amount' || field === 'recovered_amount') {
            const claim = parseFloat(next.claim_amount) || 0;
            const recovered = parseFloat(next.recovered_amount) || 0;
            next.outstanding_amount = claim - recovered;
        }
        return next;
    });

    /* Fetch case details */
    useEffect(() => {
        const fetchCase = async () => {
            try {
                const res = await api.get(`/cases/${id}`);
                const data = res.data;

                /* Check 24-hour edit window */
                const timeStr = data.created_at.endsWith('Z') ? data.created_at : `${data.created_at}Z`;
                const createdAt = new Date(timeStr);
                const now = new Date();
                const diffHours = (now - createdAt) / (1000 * 60 * 60);

                if (diffHours > 24) {
                    setError('This case can no longer be edited as 24 hours have passed since submission.');
                    setLoading(false);
                    return;
                }

                setForm({
                    title: data.title || '',
                    case_type: data.case_type || 'other',
                    parties: data.parties || '',
                    court_authority: data.court_authority || '',
                    financial_exposure: data.financial_exposure || 0,
                    currency: data.currency || 'LKR',
                    nature_of_case: data.nature_of_case || '',
                    description: data.description || '', // Use description as summary
                    filed_date: data.filed_date || '',
                    claim_amount: data.claim_amount || 0,
                    recovered_amount: data.recovered_amount || 0,
                    outstanding_amount: data.outstanding_amount || 0,
                });
            } catch (err) {
                toast.error('Failed to load case details');
                navigate('/cases');
            } finally {
                setLoading(false);
            }
        };
        fetchCase();
    }, [id, navigate]);

    /* Handle financial exposure input */
    const handleFinancialExposure = (rawValue) => {
        let cleaned = rawValue.replace(/^0+(?=\d)/, '');
        if (cleaned === '') cleaned = '0';
        const num = parseFloat(cleaned);
        if (isNaN(num) || num < 0) return;
        update('financial_exposure', num);
    };

    /* Submit updates */
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) {
            toast.error('Case title is required');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                financial_exposure: parseFloat(form.financial_exposure) || 0,
                claim_amount: parseFloat(form.claim_amount) || 0,
                recovered_amount: parseFloat(form.recovered_amount) || 0,
                outstanding_amount: parseFloat(form.outstanding_amount) || 0,
                filed_date: form.filed_date || null,
            };
            await api.put(`/cases/${id}`, payload);

            if (additionalDoc) {
                const formData = new FormData();
                formData.append('file', additionalDoc);
                formData.append('doc_type', 'supplementary_document');
                formData.append('case_id', id);
                await api.post('/documents/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            toast.success('Case updated successfully');
            navigate(`/cases/${id}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to update case');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Box className="fade-in">
                <Button startIcon={<ArrowBack />} onClick={() => navigate(`/cases/${id}`)} sx={{ mb: 2 }}>
                    Back to Case
                </Button>
                <Alert severity="error" variant="filled" sx={{ mt: 2, borderRadius: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">Edit Access Expired</Typography>
                    {error}
                </Alert>
            </Box>
        );
    }

    return (
        <Box className="fade-in">
            <Button startIcon={<ArrowBack />} onClick={() => navigate(`/cases/${id}`)} sx={{ mb: 2, color: '#94A3B8' }}>
                Back to Case
            </Button>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Edit Case Details</Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
                Make changes to case information. Note: Editing is only allowed within 24 hours of submission.
            </Typography>

            <form onSubmit={handleSubmit}>
                <Grid container spacing={3}>
                    {/* Case Information */}
                    <Grid item xs={12}>
                        <Card className="glass-card">
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AutoAwesome sx={{ color: '#00D9A6', fontSize: 20 }} />
                                    Case Information
                                </Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField fullWidth label="Case Title" required value={form.title}
                                            onChange={e => update('title', e.target.value)} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <FormControl fullWidth>
                                            <InputLabel>Case Type</InputLabel>
                                            <Select value={form.case_type} label="Case Type"
                                                onChange={e => update('case_type', e.target.value)}>
                                                {CASE_TYPES.map(t => (
                                                    <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth label="Date of Occurrence / Filing"
                                            type="date" value={form.filed_date || ''}
                                            onChange={e => update('filed_date', e.target.value)}
                                            InputLabelProps={{ shrink: true }} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField fullWidth label="Parties Involved" value={form.parties}
                                            onChange={e => update('parties', e.target.value)}
                                            placeholder="e.g., Mobitel PLC vs Vendor ABC" />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth label="Court / Authority" value={form.court_authority}
                                            onChange={e => update('court_authority', e.target.value)} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth label="Nature of the Case" value={form.nature_of_case}
                                            onChange={e => update('nature_of_case', e.target.value)} />
                                    </Grid>

                                    {/* Financial Exposure with Currency */}
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
                                    <Grid item xs={12} sm={9}>
                                        <TextField
                                            fullWidth
                                            label={`Financial Exposure (${form.currency})`}
                                            type="number"
                                            value={form.financial_exposure || ''}
                                            onChange={e => handleFinancialExposure(e.target.value)}
                                            inputProps={{ min: 0, step: '0.01' }}
                                            helperText="Must be a positive number"
                                        />
                                    </Grid>

                                    {form.case_type === 'money_recovery' && (
                                        <>
                                            <Grid item xs={12} sm={4}>
                                                <TextField fullWidth label="Claim Amount" type="number"
                                                    value={form.claim_amount}
                                                    onChange={e => update('claim_amount', e.target.value)}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField fullWidth label="Recovered Amount" type="number"
                                                    value={form.recovered_amount}
                                                    onChange={e => update('recovered_amount', e.target.value)}
                                                />
                                            </Grid>
                                            <Grid item xs={12} sm={4}>
                                                <TextField fullWidth label="Outstanding" type="number"
                                                    value={form.outstanding_amount}
                                                    InputProps={{ readOnly: true }}
                                                    sx={{ bgcolor: 'rgba(0, 217, 166, 0.05)' }}
                                                />
                                            </Grid>
                                        </>
                                    )}
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Summary of Facts (AI Generated — Editable) */}
                    <Grid item xs={12}>
                        <Card className="glass-card">
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <AutoAwesome sx={{ color: '#00D9A6', fontSize: 20 }} />
                                    Summary of Facts
                                </Typography>
                                <Alert severity="warning" sx={{ mb: 2 }} icon={<Warning />}>
                                    Modifying the summary usually requires careful review against the original document.
                                </Alert>
                                <TextField
                                    fullWidth
                                    multiline
                                    rows={5}
                                    value={form.description}
                                    onChange={e => update('description', e.target.value)}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            bgcolor: 'rgba(0, 217, 166, 0.04)',
                                            borderColor: 'rgba(0, 217, 166, 0.2)',
                                        }
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </Grid>

                </Grid>
            </form>

            {/* Upload Additional Document Card */}
            <Card className="glass-card" sx={{ mt: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <CloudUpload sx={{ color: '#6C63FF', fontSize: 20 }} />
                        Upload Additional Document
                    </Typography>
                    <Box
                        sx={{
                            border: '2px dashed rgba(108, 99, 255, 0.2)',
                            borderRadius: 3, p: 3, textAlign: 'center',
                            bgcolor: 'rgba(108, 99, 255, 0.02)',
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.05)', borderColor: '#6C63FF' }
                        }}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            hidden
                            onChange={e => setAdditionalDoc(e.target.files[0])}
                        />
                        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                            {additionalDoc ? `Selected: ${additionalDoc.name}` : 'Click to select an additional document for this case if needed'}
                        </Typography>
                    </Box>
                </CardContent>
            </Card>

            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate(`/cases/${id}`)}>Cancel</Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    startIcon={submitting ? <CircularProgress size={20} /> : <Save />}
                    disabled={submitting}
                    sx={{ background: 'linear-gradient(135deg, #00D9A6, #00AD85)' }}
                >
                    {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
            </Box>
        </Box>
    );
}
