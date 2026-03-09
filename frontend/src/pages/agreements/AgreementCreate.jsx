/* Create Agreement page with Dual Mode: Manual & AI Extract */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Card, CardContent, Typography, TextField, Button, Select, MenuItem,
    FormControl, InputLabel, Grid, CircularProgress, Tabs, Tab, Alert, IconButton
} from '@mui/material';
import { Save, ArrowBack, CloudUpload, Description, AutoAwesome } from '@mui/icons-material';
import api from '../../api/client';
import toast from 'react-hot-toast';

export default function AgreementCreate() {
    const navigate = useNavigate();
    const [mode, setMode] = useState(0); // 0: Manual, 1: Extract
    const [loading, setLoading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [docId, setDocId] = useState(null);
    const [extractedFile, setExtractedFile] = useState(null);

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

    /* Handle File Extraction */
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setExtracting(true);
        // Clear previous state
        setExtractedFile(null);
        setDocId(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('doc_type', 'agreement_draft');

        try {
            // Step 1: Upload the document
            const uploadRes = await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const document_id = uploadRes.data.id;
            setDocId(document_id);

            // Step 2: Extract data from the uploaded document
            const res = await api.post('/agreements/extract', null, {
                params: { document_id }
            });
            const data = res.data;

            if (data.error) {
                throw new Error(data.error);
            }

            // Normalize agreement type to match our dropdown keys
            let type = data.agreement_type?.toLowerCase() || '';
            const validTypes = ['nda', 'sla', 'vendor', 'lease', 'employment', 'partnership'];
            if (!validTypes.includes(type)) type = 'other';

            setForm(prev => ({
                ...prev,
                title: data.title || '',
                agreement_type: type,
                parties: Array.isArray(data.parties) ? data.parties.join(', ') : (data.parties || ''),
                value: data.value || 0,
                currency: data.currency || 'LKR',
                effective_date: data.effective_date || '',
                expiry_date: data.expiry_date || '',
                duration_months: data.duration_months || '',
                description: data.description || ''
            }));

            setExtractedFile(file.name);
            toast.success('Agreement details extracted!');
            setMode(0); // Switch to manual/review mode
        } catch (err) {
            console.error('Extraction error:', err);
            const msg = err.response?.data?.detail || err.message || 'AI could not process the file.';
            toast.error(`Extraction failed: ${msg}`);
        } finally {
            setExtracting(false);
        }
    };

    /* Submit Agreement */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...form,
                value: parseFloat(form.value) || 0,
                duration_months: form.duration_months ? parseInt(form.duration_months) : null,
                effective_date: form.effective_date || null,
                expiry_date: form.expiry_date || null,
                document_id: docId
            };
            const res = await api.post('/agreements', payload);
            toast.success(`Agreement ${res.data.agreement_number} created!`);
            navigate(`/agreements/${res.data.id}`);
        } catch (err) {
            console.error('Create error:', err);
            toast.error(err.response?.data?.detail || 'Failed to create agreement');
        }
        setLoading(false);
    };

    return (
        <Box className="fade-in">
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/agreements')} sx={{ mb: 2, color: '#94A3B8' }}>Back</Button>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>Create New Agreement</Typography>
            <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>
                Draft a new agreement manually or extract details from an existing document.
            </Typography>

            <Card className="glass-card" sx={{ mb: 3 }}>
                <Tabs value={mode} onChange={(_, v) => setMode(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Manual Entry" icon={<Description />} iconPosition="start" />
                    <Tab label="Extract from Document" icon={<AutoAwesome />} iconPosition="start" />
                </Tabs>

                <CardContent sx={{ p: 3 }}>
                    {mode === 1 ? (
                        <Box sx={{ textAlign: 'center', py: 5, border: '2px dashed #64748B', borderRadius: 2, bgcolor: 'rgba(100, 116, 139, 0.05)' }}>
                            <CloudUpload sx={{ fontSize: 60, color: '#00D9A6', mb: 2 }} />
                            <Typography variant="h6" gutterBottom>Upload Agreement Document</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                                AI will analyze the file and auto-fill the details for you.
                            </Typography>

                            <Button variant="contained" component="label" disabled={extracting}
                                sx={{ background: 'linear-gradient(135deg, #6C63FF, #5A54D8)' }}>
                                {extracting ? 'Analyzing...' : 'Choose File'}
                                <input type="file" hidden accept=".pdf,.docx,.txt" onChange={handleFileUpload} />
                            </Button>

                            {extracting && <CircularProgress size={24} sx={{ ml: 2, verticalAlign: 'middle' }} />}
                        </Box>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {extractedFile && (
                                <Alert severity="info" sx={{ mb: 3 }} onClose={() => setExtractedFile(null)}>
                                    Data extracted from <strong>{extractedFile}</strong>. Please review and edit before saving.
                                </Alert>
                            )}

                            <Grid container spacing={3}>
                                <Grid item xs={12}>
                                    <TextField fullWidth label="Agreement Title" required value={form.title}
                                        onChange={e => update('title', e.target.value)} />
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel id="agreement-type-label">Agreement Type</InputLabel>
                                        <Select
                                            labelId="agreement-type-label"
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
                                        onChange={e => update('parties', e.target.value)}
                                        placeholder="e.g., Mobitel, Vendor Corp" />
                                </Grid>

                                {/* Value & Currency */}
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
                                        onChange={e => update('description', e.target.value)}
                                        placeholder="AI generated summary or manual description..." />
                                </Grid>
                            </Grid>

                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
                                <Button variant="outlined" onClick={() => navigate('/agreements')}>Cancel</Button>
                                <Button variant="contained" type="submit"
                                    startIcon={loading ? <CircularProgress size={20} /> : <Save />}
                                    disabled={loading} sx={{ background: 'linear-gradient(135deg, #00D9A6, #00AD85)' }}>
                                    {loading ? 'Creating...' : 'Create Agreement'}
                                </Button>
                            </Box>
                        </form>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
