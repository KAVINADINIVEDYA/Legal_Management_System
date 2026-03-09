/* Agreement Detail page with AI features */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Chip, Button, Grid, Divider, Tab, Tabs, TextField, LinearProgress, CircularProgress, Paper, Stack, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ArrowBack, Upload, SmartToy, Assessment, CheckCircle, Cancel, History, Create } from '@mui/icons-material';
import api from '../../api/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { getStatusColor, getRiskColor, getRiskLabel, formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import AuditTimeline from '../../components/AuditTimeline';

export default function AgreementDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [agr, setAgr] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(0);
    const [aiResult, setAiResult] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [chatQ, setChatQ] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [revisionDialogOpen, setRevisionDialogOpen] = useState(false);
    const [signingDialogOpen, setSigningDialogOpen] = useState(false);
    const [revisionComment, setRevisionComment] = useState('');
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [dialogAction, setDialogAction] = useState('reject'); // 'reject' or 'approve'

    const hasActed = agr?.approval_steps?.some(s => s.reviewer_id === user?.id && s.status !== 'pending');
    const isPending = agr?.approval_steps?.some(s => s.reviewer_id === user?.id && s.status === 'pending');
    const isStage1 = agr?.approval_steps?.some(s => s.reviewer_id === user?.id && s.status === 'pending' && s.step_order === 1);

    const load = () => {
        api.get(`/agreements/${id}`).then(r => setAgr(r.data)).catch(() => toast.error('Not found')).finally(() => setLoading(false));
    };
    useEffect(load, [id]);

    const loadAudit = async () => {
        setAuditLoading(true);
        try {
            const res = await api.get(`/agreements/${id}/audit`);
            setAuditLogs(res.data);
        } catch { toast.error('Failed to load audit trail'); }
        setAuditLoading(false);
    };

    useEffect(() => {
        if (tab === 3) loadAudit();
    }, [tab]);

    const handleUpload = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append('file', file); fd.append('doc_type', 'agreement_draft'); fd.append('agreement_id', id);
        try { await api.post('/documents/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('Uploaded!'); load(); } catch { toast.error('Failed'); }
        setUploading(false);
    };

    const handleAI = async (action) => {
        setAiLoading(true); setAiResult(null);
        try {
            const doc = agr?.documents?.[0];
            // If no document, use description as fallback text
            const payload = doc ? { document_id: doc.id } : { text: agr?.description || agr?.parties || '' };

            const params = {
                doc_type: 'agreement',
                agreement_type: agr?.agreement_type || 'General'
            };

            const r = await api.post(`/ai/${action}`, payload, { params });
            setAiResult({ action, data: r.data });
            toast.success('AI Analysis Complete');
        } catch (err) {
            console.error('AI Error:', err);
            toast.error(err.response?.data?.detail || 'AI analysis failed. Please ensure a document is uploaded.');
        }
        setAiLoading(false);
    };

    const handleChat = async () => {
        if (!chatQ.trim()) return; setAiLoading(true); setAiResult(null);
        try {
            const doc = agr?.documents?.[0];
            const r = await api.post('/ai/chat', { question: chatQ, document_id: doc?.id });
            setAiResult({ action: 'chat', data: r.data }); setChatQ('');
        } catch { toast.error('Failed'); }
        setAiLoading(false);
    };

    const handleStatus = async (action) => {
        setActionLoading(true);
        try {
            if (action === 'submit') {
                await api.post(`/agreements/${id}/submit`, {
                    reviewer_ids: [5], // Default reviewer
                    comments: 'Submitted for review'
                });
            } else if (action === 'approve') {
                if (['manager', 'supervisor'].includes(user?.role)) {
                    await api.post(`/agreements/${id}/approve`, { comments: 'Manager/Supervisor approval' });
                } else {
                    handleOpenDialog('approve');
                    setActionLoading(false);
                    return;
                }
            } else {
                handleOpenDialog('reject');
                setActionLoading(false);
                return;
            }
            toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)} successful!`);

            if (['manager', 'supervisor'].includes(user?.role)) {
                navigate('/agreements');
            } else {
                setTimeout(load, 500);
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || `Failed to ${action}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleSign = async () => {
        if (!canvasRef.current) return;
        const signature_data = canvasRef.current.toDataURL('image/png');
        setActionLoading(true);
        try {
            // Updated to use the approval endpoint with signature_data for Stage 2
            await api.post(`/agreements/${id}/approve`, {
                comments: 'Manager approval with signature.',
                signature_data
            });
            toast.success('Agreement Signed and Approved!');
            navigate('/agreements');
        } catch { toast.error('Signing failed'); }
        setActionLoading(false);
    };

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e) => {
        const { x, y } = getCoordinates(e.nativeEvent || e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.beginPath();
        ctx.moveTo(x, y);
        setIsDrawing(true);
        if (e.touches) e.preventDefault();
    };

    const draw = (e) => {
        if (!isDrawing) return;
        const { x, y } = getCoordinates(e.nativeEvent || e);
        const ctx = canvasRef.current.getContext('2d');
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineTo(x, y);
        ctx.stroke();
        if (e.touches) e.preventDefault();
    };

    const stopDrawing = () => setIsDrawing(false);

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const handleOpenDialog = (action) => {
        setDialogAction(action);
        setRevisionComment('');
        setRevisionDialogOpen(true);
    };

    const handleConfirmAction = async () => {
        if (!revisionComment.trim() && dialogAction === 'reject') {
            toast.error('Please enter a reason for the revision');
            return;
        }
        setRevisionDialogOpen(false);
        setActionLoading(true);
        try {
            if (dialogAction === 'reject') {
                await api.post(`/agreements/${id}/reject`, { comments: revisionComment });
                toast.success('Revision requested successfully!');
            } else {
                await api.post(`/agreements/${id}/approve`, { comments: revisionComment || 'Review completed' });
                toast.success('Review completed successfully!');
            }
            setTimeout(load, 500);
        } catch (e) {
            toast.error(e.response?.data?.detail || `Failed to ${dialogAction}`);
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevert = async () => {
        if (!window.confirm('Are you sure you want to revert this approval? All review steps will become pending again.')) return;
        setActionLoading(true);
        try {
            await api.post(`/agreements/${id}/revert`);
            toast.success('Approval reverted successfully!');
            load();
        } catch (e) {
            toast.error(e.response?.data?.detail || 'Failed to revert approval');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <LinearProgress />;
    if (!agr) return <Typography>Not found</Typography>;

    return (
        <Box className="fade-in">
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/agreements')} sx={{ mb: 2, color: '#94A3B8' }}>Back</Button>
            {agr.status === 'UNDER_REVIEW' && agr.risk_score >= 70 && (
                <Paper sx={{ p: 2, mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Cancel sx={{ color: '#EF4444' }} />
                    <Box>
                        <Typography variant="subtitle2" sx={{ color: '#EF4444', fontWeight: 700 }}>HIGH RISK ALERT</Typography>
                        <Typography variant="body2" sx={{ color: '#FCA5A5' }}>This agreement has a high risk score ({agr.risk_score}). Reviewers should proceed with caution.</Typography>
                    </Box>
                </Paper>
            )}

            {agr.status === 'REVISION' && (
                <Alert severity="error" variant="filled" sx={{ mb: 3, borderRadius: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>REVISION REQUESTED</Typography>
                    <Typography variant="body2">
                        {agr.approval_steps?.filter(s => s.status === 'rejected').sort((a, b) => new Date(b.reviewed_at) - new Date(a.reviewed_at))[0]?.comments || "No specific comments provided."}
                    </Typography>
                </Alert>
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Box>
                    <Box sx={{ display: 'flex', gap: 1.5, mb: 1 }}>
                        <Chip label={agr.agreement_number} sx={{ bgcolor: '#00D9A620', color: '#00D9A6', fontWeight: 700 }} />
                        <Chip label={agr.status} sx={{ bgcolor: `${getStatusColor(agr.status)}20`, color: getStatusColor(agr.status), fontWeight: 600 }} />
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{agr.title}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {(agr.status === 'DRAFT' || agr.status === 'REVISION') && (user?.role === 'admin' || user?.role === 'owner') && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="contained" onClick={() => handleStatus('submit')} disabled={actionLoading}>
                                {agr.status === 'REVISION' ? 'Resubmit for Review' : 'Submit for Review'}
                            </Button>
                            <Button variant="outlined" color="primary" startIcon={<Create />} onClick={() => navigate(`/agreements/${id}/edit`)}>
                                Edit Agreement
                            </Button>
                        </Box>
                    )}

                    {(agr.status === 'UNDER_REVIEW' || agr.status === 'REVIEWED') && (
                        <>
                            {isStage1 && (
                                <>
                                    <Button variant="contained" color="secondary" startIcon={<SmartToy />}
                                        onClick={() => handleStatus('approve')} disabled={actionLoading}>
                                        Complete Review
                                    </Button>
                                    <Button variant="outlined" color="error" startIcon={<History />}
                                        onClick={() => handleStatus('reject')} disabled={actionLoading} sx={{ ml: 1 }}>
                                        Request Revision
                                    </Button>
                                </>
                            )}

                            {['manager', 'supervisor'].includes(user?.role) && (
                                <>
                                    {agr.status === 'REVIEWED' && (
                                        <Button variant="contained" color="success" startIcon={<CheckCircle />}
                                            onClick={() => setSigningDialogOpen(true)} disabled={actionLoading}>
                                            Sign & Approve
                                        </Button>
                                    )}
                                    <Button variant="outlined" color="error" startIcon={<Cancel />}
                                        onClick={() => handleStatus('reject')} disabled={actionLoading}>
                                        Reject
                                    </Button>
                                </>
                            )}

                            {(!isPending && !['manager', 'supervisor'].includes(user?.role) && (user?.role === 'reviewer' || user?.role === 'legal_officer')) && (
                                <Chip label={hasActed ? "Action Recorded" : "Awaiting Review/Approval"} color="warning" variant="outlined" />
                            )}
                        </>
                    )}

                    {agr.status === 'APPROVED' && (
                        <>
                            <Chip label="Agreement Approved" color="success" variant="filled" startIcon={<CheckCircle />} sx={{ height: 40 }} />
                            {['manager', 'supervisor'].includes(user?.role) && !agr.signature_data && (
                                <Button variant="contained" color="primary" startIcon={<Create />} onClick={() => setSigningDialogOpen(true)}>
                                    Go to Signing
                                </Button>
                            )}
                            {user?.role === 'admin' && (
                                <Button variant="outlined" color="warning" startIcon={<History />} onClick={handleRevert} disabled={actionLoading}>
                                    Revert to Review
                                </Button>
                            )}
                        </>
                    )}
                    {agr.status === 'SIGNED' && (
                        <Chip label="Agreement Signed" sx={{ bgcolor: '#00D9A6', color: '#fff', fontWeight: 700, height: 40 }} startIcon={<CheckCircle />} />
                    )}
                    {agr.status === 'REVISION' && (
                        <Chip label="Revision Requested" color="error" variant="filled" startIcon={<Cancel />} sx={{ height: 40 }} />
                    )}
                </Box>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
                <Tab label="Overview" /><Tab label="Documents" /><Tab label="AI Analysis" /><Tab label="Audit" />
            </Tabs>

            {tab === 0 && <Card className="glass-card"><CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Details</Typography>
                {[['Type', agr.agreement_type?.toUpperCase()], ['Parties', agr.parties],
                ['Value', `${agr.currency} ${agr.value?.toLocaleString()}`], ['Duration', `${agr.duration_months} months`],
                ['Expires', formatDate(agr.expiry_date)]].map(([l, v]) => (
                    <Box key={l} sx={{ display: 'flex', py: 1.2, borderBottom: '1px solid rgba(108,99,255,0.08)' }}>
                        <Typography variant="body2" sx={{ color: '#94A3B8', width: 180, fontWeight: 500 }}>{l}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{v || 'N/A'}</Typography>
                    </Box>
                ))}
                {agr.risk_score > 0 && <Box sx={{ mt: 2, textAlign: 'center' }}>
                    <Typography variant="h3" sx={{ fontWeight: 800, color: getRiskColor(agr.risk_score) }}>{agr.risk_score}</Typography>
                    <Chip label={getRiskLabel(agr.risk_score)} sx={{ bgcolor: `${getRiskColor(agr.risk_score)}20`, color: getRiskColor(agr.risk_score) }} />
                </Box>}

                {(agr.signature_data || agr.status === 'SIGNED') && (
                    <Box sx={{ mt: 4, p: 2, border: '2px solid #00D9A6', borderRadius: 2, bgcolor: 'rgba(0,217,166,0.05)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#00D9A6', display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CheckCircle fontSize="small" /> Digital Signature Applied
                            </Typography>
                            <Chip label="VERIFIED" size="small" sx={{ bgcolor: '#00D9A620', color: '#00D9A6', fontWeight: 700, fontSize: '0.6rem' }} />
                        </Box>
                        {agr.signature_data ? (
                            <img src={agr.signature_data} alt="Signature" style={{ maxWidth: '300px', height: 'auto', backgroundColor: '#fff', borderRadius: 4, padding: '10px' }} />
                        ) : (
                            <Typography variant="body2" sx={{ color: '#94A3B8', fontStyle: 'italic' }}>Signature recorded in system.</Typography>
                        )}
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#94A3B8' }}>
                            Signed on: {formatDate(agr.signed_at || agr.updated_at)}
                        </Typography>
                    </Box>
                )}

                {(agr.approval_steps?.length > 0) && (
                    <Box sx={{ mt: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <History sx={{ fontSize: 20 }} /> Review History
                        </Typography>
                        <Stack spacing={2}>
                            {agr.approval_steps.map((s, i) => (
                                <Paper key={i} sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(108,99,255,0.05)' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#6C63FF' }}>
                                            Step {s.step_order}: {s.step_order === 1 && s.status === 'approved' ? 'REVIEWED' : s.status.toUpperCase()}
                                        </Typography>
                                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>{formatDate(s.reviewed_at)}</Typography>
                                    </Box>
                                    <Typography variant="body2" sx={{ fontStyle: 'italic', color: s.comments ? '#F1F5F9' : '#64748B' }}>
                                        {s.comments || 'No comments provided'}
                                    </Typography>
                                </Paper>
                            ))}
                        </Stack>
                    </Box>
                )}
            </CardContent></Card>}

            {tab === 3 && (
                <Card className="glass-card">
                    <CardContent sx={{ p: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Agreement Activity History</Typography>
                        <AuditTimeline logs={auditLogs} loading={auditLoading} />
                    </CardContent>
                </Card>
            )}

            {tab === 1 && <Card className="glass-card"><CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Documents</Typography>
                {(agr.documents || []).map(d => (
                    <Box key={d.id} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, borderRadius: 2, border: '1px solid rgba(108,99,255,0.1)', mb: 1 }}>
                        <Box><Typography variant="body2" sx={{ fontWeight: 500 }}>{d.filename}</Typography>
                            <Typography variant="caption" sx={{ color: '#64748B' }}>v{d.version} · {formatDate(d.created_at)}</Typography></Box>
                        <Button size="small" onClick={async () => {
                            try {
                                const res = await api.get(`/documents/${d.id}/download`, { responseType: 'blob' });
                                const url = window.URL.createObjectURL(new Blob([res.data]));
                                const link = document.createElement('a');
                                link.href = url;
                                link.setAttribute('download', d.filename);
                                document.body.appendChild(link);
                                link.click();
                                link.remove();
                            } catch (err) { toast.error('Download failed'); }
                        }}>Download</Button>
                    </Box>
                ))}
            </CardContent></Card>}

            {tab === 2 && <Card className="glass-card"><CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>AI Analysis Tools</Typography>
                <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>Use these tools to analyze the agreement document for risks, clauses, and summaries.</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', mb: 3 }}>
                    {[
                        { id: 'summarize', label: 'Summarize Key Terms' },
                        { id: 'clauses', label: 'Extract Clauses' },
                        { id: 'risk-score', label: 'Risk Assessment' },
                        { id: 'template/renewal', label: 'Generate Renewal Draft' }
                    ].map(a =>
                        <Button key={a.id} variant={aiResult?.action === a.id ? "contained" : "outlined"}
                            onClick={() => handleAI(a.id)} disabled={aiLoading}>
                            {a.label}
                        </Button>
                    )}
                </Box>
                {aiLoading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}

                {aiResult && (
                    <Box sx={{ mt: 3, p: 3, borderRadius: 2, bgcolor: '#1E293B', border: '1px solid #334155' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#6C63FF', mb: 2, textTransform: 'uppercase' }}>
                            {aiResult.action.replace('-', ' ')} Result
                        </Typography>

                        {aiResult.data.error && (
                            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>AI Analysis Error</Typography>
                                <Typography variant="body2">{aiResult.data.error}</Typography>
                                {aiResult.data.raw && (
                                    <Box sx={{ mt: 1, p: 1, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1 }}>
                                        <Typography variant="caption" sx={{ display: 'block', mb: 0.5, opacity: 0.7 }}>Raw Response:</Typography>
                                        <pre style={{ margin: 0, fontSize: '0.7rem', overflow: 'auto', maxHeight: '100px' }}>{aiResult.data.raw}</pre>
                                    </Box>
                                )}
                            </Alert>
                        )}

                        {aiResult.action === 'summarize' && !aiResult.data.error && (
                            <Box>
                                <Typography variant="body1" sx={{ color: '#F1F5F9', lineHeight: 1.7, mb: 3 }}>{aiResult.data.summary}</Typography>

                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#6C63FF' }}>KEY TERMS</Typography>
                                <Grid container spacing={2} sx={{ mb: 4 }}>
                                    {aiResult.data.key_terms?.map((t, idx) => (
                                        <Grid item xs={12} sm={6} key={idx}>
                                            <Paper sx={{ p: 1.5, bgcolor: 'rgba(108,99,255,0.05)', border: '1px solid rgba(108,99,255,0.1)' }}>
                                                <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 700 }}>{t.term}</Typography>
                                                <Typography variant="body2" sx={{ color: '#E2E8F0' }}>{t.value}</Typography>
                                            </Paper>
                                        </Grid>
                                    ))}
                                </Grid>

                                <Grid container spacing={3}>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#F44336' }}>POTENTIAL RISKS</Typography>
                                        <Stack spacing={1}>
                                            {aiResult.data.risks?.map((r, idx) => (
                                                <Box key={idx} sx={{ p: 1.5, bgcolor: 'rgba(244,67,54,0.05)', borderRadius: 1, borderLeft: '3px solid #F44336' }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{r.risk}</Typography>
                                                    <Typography variant="caption" sx={{ color: '#94A3B8' }}>Severity: {r.severity} | Category: {r.category}</Typography>
                                                </Box>
                                            ))}
                                            {(!aiResult.data.risks || aiResult.data.risks.length === 0) && <Typography variant="body2" sx={{ color: '#64748B' }}>No specific risks identified.</Typography>}
                                        </Stack>
                                    </Grid>
                                    <Grid item xs={12} md={6}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#FFB347' }}>MISSING CLAUSES</Typography>
                                        <Stack spacing={1}>
                                            {aiResult.data.missing_clauses?.map((c, idx) => (
                                                <Chip key={idx} label={c} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,179,71,0.3)', color: '#FFB347' }} />
                                            ))}
                                            {(!aiResult.data.missing_clauses || aiResult.data.missing_clauses.length === 0) && <Typography variant="body2" sx={{ color: '#64748B' }}>All standard clauses appear present.</Typography>}
                                        </Stack>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 3, mb: 1, color: '#66BB6A' }}>RECOMMENDATIONS</Typography>
                                        <ul style={{ margin: 0, paddingLeft: '20px', color: '#CBD5E1', fontSize: '0.85rem' }}>
                                            {aiResult.data.recommendations?.map((rec, idx) => <li key={idx}>{rec}</li>)}
                                        </ul>
                                    </Grid>
                                </Grid>
                            </Box>
                        )}

                        {aiResult.action === 'clauses' && !aiResult.data.error && (
                            <Stack spacing={2}>
                                {(!aiResult.data.clauses || aiResult.data.clauses.length === 0) && (
                                    <Typography variant="body2" sx={{ textAlign: 'center', py: 4, color: '#64748B' }}>No specific clauses could be extracted from this document text.</Typography>
                                )}
                                {aiResult.data.clauses?.map((c, idx) => (
                                    <Box key={idx} sx={{ p: 2, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.02)', borderLeft: '3px solid #6C63FF' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 700, textTransform: 'capitalize' }}>
                                                {c.clause_number ? `${c.clause_number}: ` : ''}{c.title || c.category}
                                            </Typography>
                                            <Chip label={c.risk_assessment?.toUpperCase()} size="small"
                                                sx={{ bgcolor: `${getRiskColor(c.risk_assessment === 'high' ? 80 : 40)}20`, color: getRiskColor(c.risk_assessment === 'high' ? 80 : 40), fontWeight: 700, fontSize: '0.65rem' }} />
                                        </Box>
                                        <Typography variant="body2" sx={{ color: '#CBD5E1', fontSize: '0.85rem', mb: 1 }}>{c.text}</Typography>
                                        {c.notes && <Typography variant="caption" sx={{ color: '#94A3B8', fontStyle: 'italic' }}>Note: {c.notes}</Typography>}
                                    </Box>
                                ))}
                                {aiResult.data.overall_assessment && (
                                    <Paper sx={{ p: 2, mt: 2, bgcolor: 'rgba(108,99,255,0.05)', border: '1px solid rgba(108,99,255,0.2)' }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Overall Assessment</Typography>
                                        <Typography variant="body2" sx={{ color: '#CBD5E1' }}>{aiResult.data.overall_assessment}</Typography>
                                    </Paper>
                                )}
                            </Stack>
                        )}

                        {aiResult.action === 'risk-score' && !aiResult.data.error && (
                            <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                    <Typography variant="h2" sx={{ fontWeight: 800, color: getRiskColor(aiResult.data.overall_score) }}>{aiResult.data.overall_score}</Typography>
                                    <Box>
                                        <Chip label={`${aiResult.data.risk_level?.toUpperCase()} RISK`} sx={{ bgcolor: `${getRiskColor(aiResult.data.overall_score)}20`, color: getRiskColor(aiResult.data.overall_score), fontWeight: 700 }} />
                                        <Typography variant="body2" sx={{ color: '#94A3B8', mt: 0.5 }}>{aiResult.data.explanation}</Typography>
                                    </Box>
                                </Box>
                                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>Identified Risks:</Typography>
                                {aiResult.data.red_flags?.map((r, idx) => (
                                    <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 1.5, p: 1.5, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
                                        <Typography variant="body2" sx={{ fontWeight: 700, color: getRiskColor(r.severity === 'high' ? 80 : 40), minWidth: 60 }}>{r.severity.toUpperCase()}</Typography>
                                        <Typography variant="body2">{r.flag}</Typography>
                                    </Box>
                                ))}
                            </Box>
                        )}

                        {aiResult.action === 'template/renewal' && !aiResult.data.error && (
                            <Box sx={{ mt: 1, p: 2, bgcolor: '#1E293B', borderRadius: 2, border: '1px solid #334155' }}>
                                <ReactMarkdown className="markdown-body">{aiResult.data.template}</ReactMarkdown>
                            </Box>
                        )}

                        {!['summarize', 'clauses', 'risk-score', 'template/renewal'].includes(aiResult.action) && !aiResult.data.error && (
                            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#CBD5E1' }}>{JSON.stringify(aiResult.data, null, 2)}</pre>
                        )}
                    </Box>
                )}

                <Divider sx={{ my: 4, borderColor: 'rgba(108,99,255,0.1)' }} />
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SmartToy sx={{ color: '#6C63FF' }} /> Chat with Legal AI
                </Typography>
                <Paper sx={{ p: 2, bgcolor: 'rgba(15, 23, 42, 0.5)', borderRadius: 2, border: '1px solid rgba(108, 99, 255, 0.1)' }}>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField fullWidth placeholder="Ask a question about this agreement..." size="small"
                            value={chatQ} onChange={e => setChatQ(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && handleChat()}
                            disabled={aiLoading}
                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }} />
                        <Button variant="contained" onClick={handleChat} disabled={aiLoading || !chatQ.trim()} sx={{ px: 3 }}>
                            {aiLoading ? <CircularProgress size={24} /> : 'Ask'}
                        </Button>
                    </Box>
                </Paper>
            </CardContent></Card>}

            <Dialog open={revisionDialogOpen} onClose={() => setRevisionDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 800 }}>
                    {dialogAction === 'reject' ? 'Request Revision' : 'Complete Review & Send to Manager'}
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        {dialogAction === 'reject'
                            ? 'Provide detailed notes on what needs to be changed. The author will see these comments.'
                            : 'Add any final notes or observations before sending this agreement to the manager for final approval.'}
                    </Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        placeholder={dialogAction === 'reject'
                            ? "e.g., Clause 4.2 needs clarification on liability..."
                            : "Summary of changes reviewed, everything looks good..."}
                        value={revisionComment}
                        onChange={(e) => setRevisionComment(e.target.value)}
                        required={dialogAction === 'reject'}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setRevisionDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        color={dialogAction === 'reject' ? 'error' : 'secondary'}
                        onClick={handleConfirmAction}
                        disabled={dialogAction === 'reject' && !revisionComment.trim()}
                    >
                        {dialogAction === 'reject' ? 'Confirm Revision Request' : 'Complete Review'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={signingDialogOpen} onClose={() => setSigningDialogOpen(false)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 800 }}>Digital Signature Required</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        Please use your mouse or touch screen to provide your signature below. This will be permanently attached to the agreement.
                    </Typography>
                    <Box sx={{ border: '1px solid #334155', borderRadius: 2, overflow: 'hidden', bgcolor: '#fff' }}>
                        <canvas
                            ref={canvasRef}
                            width={600}
                            height={250}
                            style={{ cursor: 'crosshair', width: '100%', display: 'block' }}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                        />
                    </Box>
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary', textAlign: 'center' }}>
                        By signing, you confirm that you have reviewed and approved this agreement according to company policy.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2.5 }}>
                    <Button onClick={() => setSigningDialogOpen(false)}>Cancel</Button>
                    <Button variant="outlined" onClick={clearCanvas}>Clear</Button>
                    <Button variant="contained" color="success" onClick={async () => {
                        await handleSign();
                        setSigningDialogOpen(false);
                    }} disabled={actionLoading}>
                        Confirm & Sign
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
