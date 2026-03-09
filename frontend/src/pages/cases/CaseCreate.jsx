/* Case Creation Wizard: Select Type -> Select Mode -> Proceed */
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box, Card, CardContent, Typography, TextField, Button, Select, MenuItem,
    FormControl, InputLabel, Grid, CircularProgress, LinearProgress,
    IconButton, Paper, Divider, Stack
} from '@mui/material';
import {
    Save, ArrowBack, CloudUpload, Description, Delete,
    AutoAwesome, AppRegistration, FactCheck, ArrowForward
} from '@mui/icons-material';
import api from '../../api/client';
import toast from 'react-hot-toast';

const CASE_TYPES = [
    { value: 'money_recovery', label: 'Money Recovery Cases' },
    { value: 'damages_recovery', label: 'Damages Recovery Cases' },
    { value: 'appeals', label: 'Appeals' },
    { value: 'land_cases', label: 'Land Cases' },
    { value: 'criminal_cases', label: 'Criminal Cases' },
    { value: 'inquiries', label: 'Inquiries / Disciplinary' },
    { value: 'other', label: 'Other Court / Legal Matters' },
];

export default function CaseCreate() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    /* Wizard steps: 'type_selection', 'mode_selection', 'form' */
    const [step, setStep] = useState('type_selection');
    const [mode, setMode] = useState(null); // 'manual' or 'upload'

    /* Loading states */
    const [uploading, setUploading] = useState(false);
    const [extracting, setExtracting] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    /* Data states */
    const [uploadedDoc, setUploadedDoc] = useState(null);
    const [form, setForm] = useState({
        title: '', case_type: 'other', parties: '', court_authority: '',
        financial_exposure: 0, currency: 'LKR', nature_of_case: '',
        description: '', filed_date: '',
        claim_amount: 0, recovered_amount: 0, outstanding_amount: 0,
    });
    const [details, setDetails] = useState({});

    const update = (field, value) => setForm(prev => {
        const next = { ...prev, [field]: value };
        // Auto-calculate outstanding for money recovery
        if (field === 'claim_amount' || field === 'recovered_amount') {
            const claim = parseFloat(next.claim_amount) || 0;
            const recovered = parseFloat(next.recovered_amount) || 0;
            next.outstanding_amount = claim - recovered;
        }
        return next;
    });
    const updateDetail = (field, value) => setDetails(prev => ({ ...prev, [field]: value }));

    /* Actions */
    const handleTypeSelect = (type) => {
        update('case_type', type);
        setStep('mode_selection');
    };

    const handleModeSelect = (m) => {
        setMode(m);
        if (m === 'manual') {
            setStep('form');
        } else {
            setStep('upload');
        }
    };

    const handleBack = () => {
        if (step === 'mode_selection') setStep('type_selection');
        else if (step === 'form' || step === 'upload') setStep('mode_selection');
    };

    /* File Handlers */
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('doc_type', 'case_document');
            const uploadRes = await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setUploadedDoc({
                id: uploadRes.data.id,
                filename: uploadRes.data.filename,
                original_filename: file.name,
            });

            setUploading(false);
            setExtracting(true);
            const extractRes = await api.post(`/cases/extract?document_id=${uploadRes.data.id}`);
            const data = extractRes.data;

            setForm(prev => ({
                ...prev,
                title: data.title || '',
                parties: data.parties || '',
                court_authority: data.court_authority || '',
                financial_exposure: data.financial_exposure || 0,
                currency: data.currency || 'LKR',
                nature_of_case: data.nature_of_case || '',
                description: data.summary_of_facts || '',
                filed_date: data.filed_date || '',
                claim_amount: data.claim_amount || 0,
                recovered_amount: data.recovered_amount || 0,
                outstanding_amount: (data.claim_amount || 0) - (data.recovered_amount || 0),
            }));
            setDetails(data.case_details || {});
            setStep('form');
            toast.success('AI extracted data successfully!');
        } catch (err) {
            toast.error('Failed to process document');
        }
        setUploading(false);
        setExtracting(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title.trim()) return toast.error('Title is required');

        setSubmitting(true);
        try {
            // Normalize payload: handle empty dates and numeric strings
            const payload = {
                ...form,
                filed_date: form.filed_date || null,
                financial_exposure: parseFloat(form.financial_exposure) || 0,
                claim_amount: parseFloat(form.claim_amount) || 0,
                recovered_amount: parseFloat(form.recovered_amount) || 0,
                outstanding_amount: parseFloat(form.outstanding_amount) || 0,
                document_id: uploadedDoc?.id || null, // null triggers PDF generation on backend
                case_details: details,
            };
            const res = await api.post('/cases', payload);
            toast.success(`Case created! ${mode === 'manual' ? 'Summary PDF generated.' : ''}`);
            navigate(`/cases/${res.data.id}`);
        } catch (err) {
            toast.error('Failed to create case');
        }
        setSubmitting(false);
    };

    /* Sub-renders */
    const renderTypeSelection = () => (
        <Grid container spacing={2}>
            {CASE_TYPES.map(t => (
                <Grid item xs={12} sm={6} md={4} key={t.value}>
                    <Card
                        className="glass-card clickable-card"
                        onClick={() => handleTypeSelect(t.value)}
                        sx={{ textAlign: 'center', p: 2, height: '100%', '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.1)' } }}
                    >
                        <CardContent>
                            <AppRegistration sx={{ fontSize: 40, color: '#6C63FF', mb: 1 }} />
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>{t.label}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    const renderModeSelection = () => (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={3} justifyContent="center" sx={{ mt: 4 }}>
            <Card
                className="glass-card clickable-card"
                onClick={() => handleModeSelect('upload')}
                sx={{ p: 4, width: 300, textAlign: 'center', '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.1)' } }}
            >
                <CloudUpload sx={{ fontSize: 60, color: '#6C63FF', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Automated Extraction</Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>Upload a document and let AI fill the details for you.</Typography>
            </Card>

            <Card
                className="glass-card clickable-card"
                onClick={() => handleModeSelect('manual')}
                sx={{ p: 4, width: 300, textAlign: 'center', '&:hover': { bgcolor: 'rgba(0, 217, 166, 0.1)' } }}
            >
                <FactCheck sx={{ fontSize: 60, color: '#00D9A6', mb: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Manual Form Entry</Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8' }}>Type the details manually. A summary PDF will be generated.</Typography>
            </Card>
        </Stack>
    );

    const renderUpload = () => (
        <Card className="glass-card" sx={{ maxWidth: 600, mx: 'auto', mt: 4 }}>
            <CardContent sx={{ p: 5, textAlign: 'center' }}>
                {uploading || extracting ? (
                    <Box>
                        <AutoAwesome sx={{ fontSize: 60, color: '#00D9A6', mb: 2, animation: 'spin 2s linear infinite' }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                            {uploading ? 'Uploading Document...' : 'AI is Extracting Details...'}
                        </Typography>
                        <LinearProgress sx={{ borderRadius: 2 }} />
                    </Box>
                ) : (
                    <Box>
                        <CloudUpload sx={{ fontSize: 80, color: '#6C63FF', mb: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>Upload Document</Typography>
                        <Typography variant="body2" sx={{ color: '#94A3B8', mb: 4 }}>
                            Select a PDF, DOCX, or TXT file to start the automated extraction.
                        </Typography>
                        <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} />
                        <Button
                            variant="contained" size="large" onClick={() => fileInputRef.current?.click()}
                            sx={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)', px: 5 }}
                        >
                            Select File
                        </Button>
                    </Box>
                )}
            </CardContent>
        </Card>
    );

    const renderFormSection = () => {
        const t = CASE_TYPES.find(x => x.value === form.case_type);
        return (
            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <Grid container spacing={3}>
                    {/* Header Info */}
                    <Grid item xs={12}>
                        <Paper sx={{ p: 2, bgcolor: mode === 'manual' ? 'rgba(0, 217, 166, 0.05)' : 'rgba(108, 99, 255, 0.05)', borderRadius: 2 }}>
                            <Typography variant="subtitle2" sx={{ color: mode === 'manual' ? '#00D9A6' : '#6C63FF', fontWeight: 700 }}>
                                {mode === 'manual' ? 'MANUAL ENTRY MODE' : 'AI EXTRACTION MODE'} : {t?.label}
                            </Typography>
                        </Paper>
                    </Grid>

                    {/* Main Fields */}
                    <Grid item xs={12} md={8}>
                        <Card className="glass-card">
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Case Information</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField fullWidth label="Case Title" required value={form.title} onChange={e => update('title', e.target.value)} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField fullWidth label="Parties Involved" value={form.parties} onChange={e => update('parties', e.target.value)} placeholder="e.g., John Doe vs. XYZ Corp" />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth label="Court / Authority" value={form.court_authority} onChange={e => update('court_authority', e.target.value)} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth label="Nature of the Case" value={form.nature_of_case} onChange={e => update('nature_of_case', e.target.value)} />
                                    </Grid>
                                    <Grid item xs={12} sm={6}>
                                        <TextField fullWidth label="Date of Filing" type="date" InputLabelProps={{ shrink: true }} value={form.filed_date} onChange={e => update('filed_date', e.target.value)} />
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <FormControl fullWidth>
                                            <InputLabel>Currency</InputLabel>
                                            <Select value={form.currency} label="Currency" onChange={e => update('currency', e.target.value)}>
                                                <MenuItem value="LKR">LKR</MenuItem>
                                                <MenuItem value="USD">USD</MenuItem>
                                            </Select>
                                        </FormControl>
                                    </Grid>
                                    <Grid item xs={12} sm={3}>
                                        <TextField fullWidth label="Exposure" type="number" value={form.financial_exposure} onChange={e => update('financial_exposure', e.target.value)} />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <TextField fullWidth multiline rows={4} label="Summary of Facts / Description" value={form.description} onChange={e => update('description', e.target.value)} />
                                    </Grid>
                                </Grid>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Type Specific Fields */}
                    <Grid item xs={12} md={4}>
                        <Card className="glass-card" sx={{ border: '1px solid rgba(108, 99, 255, 0.3)' }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, color: '#6C63FF' }}>Type-Specific Data</Typography>
                                <Grid container spacing={2}>
                                    {form.case_type === 'money_recovery' && (
                                        <>
                                            <Grid item xs={12}>
                                                <TextField fullWidth label="Claim Amount" type="number"
                                                    value={form.claim_amount}
                                                    onChange={e => update('claim_amount', e.target.value)}
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField fullWidth label="Recovered Amount" type="number"
                                                    value={form.recovered_amount}
                                                    onChange={e => update('recovered_amount', e.target.value)}
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <TextField fullWidth label="Outstanding" type="number"
                                                    value={form.outstanding_amount}
                                                    InputProps={{ readOnly: true }}
                                                    sx={{ bgcolor: 'rgba(0, 217, 166, 0.05)' }}
                                                />
                                            </Grid>
                                        </>
                                    )}
                                    {form.case_type === 'land_cases' && (
                                        <>
                                            <Grid item xs={12}><TextField fullWidth label="Survey Plan No" value={details.survey_plan_no || ''} onChange={e => updateDetail('survey_plan_no', e.target.value)} /></Grid>
                                            <Grid item xs={12}><TextField fullWidth label="Deed No" value={details.deed_no || ''} onChange={e => updateDetail('deed_no', e.target.value)} /></Grid>
                                            <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Ownership History" value={details.ownership_history || ''} onChange={e => updateDetail('ownership_history', e.target.value)} /></Grid>
                                        </>
                                    )}
                                    {form.case_type === 'criminal_cases' && (
                                        <>
                                            <Grid item xs={12}><TextField fullWidth multiline rows={3} label="Charges" value={details.charges || ''} onChange={e => updateDetail('charges', e.target.value)} /></Grid>
                                            <Grid item xs={12}><TextField fullWidth label="Statutes" value={details.statutes || ''} onChange={e => updateDetail('statutes', e.target.value)} /></Grid>
                                        </>
                                    )}
                                    {/* Default case attributes for others */}
                                    {!['money_recovery', 'land_cases', 'criminal_cases'].includes(form.case_type) && (
                                        <Grid item xs={12}><TextField fullWidth multiline rows={5} label="Additional Attributes" value={details.other_info || ''} onChange={e => updateDetail('other_info', e.target.value)} /></Grid>
                                    )}
                                </Grid>
                            </CardContent>
                        </Card>

                        <Button
                            fullWidth variant="contained" type="submit" size="large"
                            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <Save />}
                            disabled={submitting}
                            sx={{ mt: 3, background: 'linear-gradient(135deg, #00D9A6, #00AD85)', py: 1.5 }}
                        >
                            {submitting ? 'Creating...' : 'Submit Case'}
                        </Button>
                    </Grid>
                </Grid>
            </Box>
        );
    };

    return (
        <Box className="fade-in">
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                {step !== 'type_selection' && (
                    <IconButton onClick={handleBack} sx={{ mr: 2, color: '#94A3B8' }}><ArrowBack /></IconButton>
                )}
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>Create Legal Case</Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                        {step === 'type_selection' && 'Step 1: Select the category of the case'}
                        {step === 'mode_selection' && 'Step 2: Choose how to input the data'}
                        {step === 'upload' && 'Step 3: Upload your document for analysis'}
                        {step === 'form' && 'Step 3: Enter case details'}
                    </Typography>
                </Box>
            </Box>

            {step === 'type_selection' && renderTypeSelection()}
            {step === 'mode_selection' && renderModeSelection()}
            {step === 'upload' && renderUpload()}
            {step === 'form' && renderFormSection()}
        </Box>
    );
}
