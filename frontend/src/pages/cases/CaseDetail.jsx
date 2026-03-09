/* Case Detail page with AI features */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Card, CardContent, Typography, Chip, Button, Grid, Divider, Tab, Tabs, TextField, LinearProgress, CircularProgress, Alert, Stack, Paper, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemButton, ListItemText, ListItemAvatar, Avatar } from '@mui/material';
import { ArrowBack, Upload, SmartToy, Assessment, Timeline, NoteAdd, AutoAwesome, Edit, TrendingUp, Warning } from '@mui/icons-material';
import api from '../../api/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { getStatusColor, getRiskColor, getRiskLabel, formatDate } from '../../utils/helpers';
import { useAuth } from '../../contexts/AuthContext';
import AuditTimeline from '../../components/AuditTimeline';

export default function CaseDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [caseData, setCaseData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState(0);
    const [aiResult, setAiResult] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [chatQ, setChatQ] = useState('');
    const [noteText, setNoteText] = useState('');
    const [uploading, setUploading] = useState(false);
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLoading, setAuditLoading] = useState(false);
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [sendBackDialogOpen, setSendBackDialogOpen] = useState(false);
    const [sendBackReason, setSendBackReason] = useState('');
    const [officers, setOfficers] = useState([]);

    const loadOfficers = async () => {
        try {
            const res = await api.get('/auth/users');
            setOfficers(res.data.filter(u => u.role === 'legal_officer'));
        } catch (err) { console.error('Failed to load officers', err); }
    };

    useEffect(() => {
        if (user?.role === 'admin') loadOfficers();
    }, [user?.role]);

    const load = () => {
        api.get(`/cases/${id}`).then(res => setCaseData(res.data)).catch(() => toast.error('Case not found')).finally(() => setLoading(false));
    };
    useEffect(load, [id]);

    const loadAudit = async () => {
        setAuditLoading(true);
        try {
            const res = await api.get(`/cases/${id}/audit`);
            setAuditLogs(res.data);
        } catch { toast.error('Failed to load audit trail'); }
        setAuditLoading(false);
    };

    useEffect(() => {
        if (tab === 5) loadAudit();
    }, [tab]);

    const isEditable = React.useMemo(() => {
        if (!caseData || !user) return false;
        if (caseData.status === 'REVISION_REQUIRED' && user.role === 'admin') return true;
        if (caseData.status !== 'NEW' || user.role !== 'admin') return false;

        if (!caseData.created_at) return false;
        // Force UTC interpretation
        const timeStr = caseData.created_at.endsWith('Z') ? caseData.created_at : `${caseData.created_at}Z`;
        const created = new Date(timeStr);
        const now = new Date();
        const diffHours = (now - created) / (1000 * 60 * 60);
        return diffHours < 24;
    }, [caseData, user]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('doc_type', 'initial_document');
        formData.append('case_id', id);
        try {
            await api.post('/documents/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Document uploaded!');
            load();
        } catch (err) { toast.error('Upload failed'); }
        setUploading(false);
    };

    const handleAI = async (action) => {
        setAiLoading(true);
        setAiResult(null);
        try {
            const doc = caseData?.documents?.[0];
            const payload = doc ? { document_id: doc.id } : { text: caseData?.description || '' };
            const res = await api.post(`/ai/${action}`, payload, { params: { doc_type: 'case' } });
            setAiResult({ action, data: res.data });
            toast.success('AI analysis complete!');
        } catch (err) { toast.error('AI analysis failed'); }
        setAiLoading(false);
    };

    const handleChat = async () => {
        if (!chatQ.trim()) return;
        setAiLoading(true); setAiResult(null);
        try {
            const doc = caseData?.documents?.[0];
            const r = await api.post('/ai/chat', { question: chatQ, document_id: doc?.id });
            setAiResult({ action: 'chat', data: r.data });
            setChatQ('');
        } catch { toast.error('Failed'); }
        setAiLoading(false);
    };

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        try {
            await api.post(`/cases/${id}/notes`, { content: noteText });
            setNoteText('');
            toast.success('Note added!');
            load();
        } catch (err) { toast.error('Failed to add note'); }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await api.put(`/cases/${id}/status?new_status=${newStatus}`);
            toast.success(`Status changed to ${newStatus}`);
            load();
        } catch (err) { toast.error(err.response?.data?.detail || 'Status change failed'); }
    };

    if (loading) return <LinearProgress />;
    if (!caseData) return <Typography>Case not found</Typography>;

    const handleWorkflowAction = async (newStatus) => {
        try {
            await api.put(`/cases/${id}/status?new_status=${newStatus}`);
            const label = newStatus === 'ACTIVE' ? 'Active' : (newStatus === 'REVISION_REQUIRED' ? 'Sent Back' : newStatus.replace(/_/g, ' '));
            toast.success(`Case status: ${label}`);
            load();
        } catch (err) { toast.error(err.response?.data?.detail || 'Action failed'); }
    };



    return (
        <Box className="fade-in">
            <Button startIcon={<ArrowBack />} onClick={() => navigate('/cases')} sx={{ mb: 2, color: '#94A3B8' }}>Back</Button>

            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                        <Chip label={caseData.case_number} sx={{ bgcolor: '#6C63FF20', color: '#6C63FF', fontWeight: 700 }} />
                        <Chip label={caseData.status} sx={{ bgcolor: `${getStatusColor(caseData.status)}20`, color: getStatusColor(caseData.status), fontWeight: 600 }} />
                        {caseData.reference_number && <Chip label={caseData.reference_number} size="small" sx={{ bgcolor: '#00D9A620', color: '#00D9A6' }} />}
                    </Box>
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>{caseData.title}</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    {isEditable && (
                        <Button
                            variant="outlined"
                            startIcon={<Edit />}
                            onClick={() => navigate(`/cases/${id}/edit`)}
                            sx={{ mr: 1, borderColor: '#64748B', color: '#64748B', '&:hover': { borderColor: '#94A3B8', color: '#94A3B8' } }}
                        >
                            Edit
                        </Button>
                    )}

                    {/* Admin Submission */}
                    {(caseData.status === 'NEW' || caseData.status === 'REVISION_REQUIRED') && user?.role === 'admin' && (
                        <Button variant="contained" color="primary" onClick={() => setAssignDialogOpen(true)}>
                            Submit for Review
                        </Button>
                    )}

                    {/* Legal Officer Review */}
                    {caseData.status === 'PENDING_REVIEW' && user?.role === 'legal_officer' && caseData.assigned_officer_id === user?.id && (
                        <>
                            <Button variant="contained" color="success" onClick={() => handleWorkflowAction('ACTIVE')}>
                                Approve (Make Active)
                            </Button>
                            <Button variant="outlined" color="warning" onClick={() => setSendBackDialogOpen(true)}>
                                Send Back
                            </Button>
                        </>
                    )}

                    {/* General Status Transitions (for Active cases) */}
                    {['ACTIVE', 'ON_HOLD', 'CLOSED'].includes(caseData.status) && user?.role === 'legal_officer' && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            {caseData.status === 'ACTIVE' && (
                                <>
                                    <Button variant="outlined" size="small" onClick={() => handleWorkflowAction('ON_HOLD')}>On Hold</Button>
                                    <Button variant="outlined" size="small" onClick={() => handleWorkflowAction('CLOSED')}>Close Case</Button>
                                </>
                            )}
                            {caseData.status === 'ON_HOLD' && (
                                <>
                                    <Button variant="outlined" size="small" onClick={() => handleWorkflowAction('ACTIVE')}>Make Active</Button>
                                    <Button variant="outlined" size="small" onClick={() => handleWorkflowAction('CLOSED')}>Close Case</Button>
                                </>
                            )}
                        </Box>
                    )}
                </Box>
            </Box>

            {/* Revision Note for Admin */}
            {caseData.status === 'REVISION_REQUIRED' && user?.role === 'admin' && (
                <Alert severity="warning" icon={<Warning fontSize="inherit" />} sx={{ mb: 3, borderRadius: 2, bgcolor: 'rgba(255, 179, 71, 0.1)', color: '#FFB347', border: '1px solid rgba(255, 179, 71, 0.2)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>Revision Required</Typography>
                    <Typography variant="body2">
                        The Legal Officer has requested revisions for this case. Please review the comments below and update the case.
                        {caseData.case_notes && caseData.case_notes.length > 0 && (
                            <Box sx={{ mt: 1.5, p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 1.5, borderLeft: '4px solid #FFB347' }}>
                                <Typography variant="body2" sx={{ fontStyle: 'italic', fontWeight: 500, color: '#F1F5F9' }}>
                                    "{[...caseData.case_notes].reverse()[0].content}"
                                </Typography>
                                <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#94A3B8' }}>
                                    — Added on {formatDate([...caseData.case_notes].reverse()[0].created_at)}
                                </Typography>
                            </Box>
                        )}
                    </Typography>
                </Alert>
            )}

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
                <Tab label="Overview" />
                <Tab label="Documents" />
                <Tab label="AI Analysis" />
                <Tab label="Notes & Timeline" />
                <Tab label="Court & Scheduling" />
                <Tab label="Audit Trail" />
            </Tabs>

            {/* Overview Tab */}
            {tab === 0 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={8}>
                        <Card className="glass-card">
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Case Details</Typography>
                                {[['Type', caseData.case_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())],
                                ['Reference Number', caseData.reference_number], ['Parties', caseData.parties],
                                ['Court/Authority', caseData.court_authority], ['Nature of Case', caseData.nature_of_case],
                                ['Financial Exposure', caseData.financial_exposure > 0 ? `${caseData.currency || 'LKR'} ${caseData.financial_exposure?.toLocaleString()}` : 'N/A'],
                                ['Filed Date', formatDate(caseData.filed_date)]].map(([label, val]) => (
                                    <Box key={label} sx={{ display: 'flex', py: 1.2, borderBottom: '1px solid rgba(108,99,255,0.08)' }}>
                                        <Typography variant="body2" sx={{ color: '#94A3B8', width: 180, fontWeight: 500 }}>{label}</Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{val || 'N/A'}</Typography>
                                    </Box>
                                ))}


                                {/* Specific Case Details */}
                                {caseData.case_details && Object.keys(caseData.case_details).length > 0 && (
                                    <Box sx={{ mt: 3, pt: 2, borderTop: '1px dashed rgba(108,99,255,0.2)' }}>
                                        <Typography variant="subtitle2" sx={{ color: '#6C63FF', fontWeight: 700, mb: 1.5, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                                            {caseData.case_type?.replace(/_/g, ' ')} Specifics
                                        </Typography>
                                        <Grid container spacing={2}>
                                            {Object.entries(caseData.case_details).map(([key, val]) => (
                                                <Grid item xs={12} sm={6} key={key}>
                                                    <Box sx={{ bgcolor: 'rgba(108,99,255,0.03)', p: 1.5, borderRadius: 1.5 }}>
                                                        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>
                                                            {key.replace(/_/g, ' ')}
                                                        </Typography>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, color: '#F1F5F9' }}>
                                                            {val || '-'}
                                                        </Typography>
                                                    </Box>
                                                </Grid>
                                            ))}
                                        </Grid>
                                    </Box>
                                )}

                                {caseData.description && (
                                    <Box sx={{ mt: 3 }}>
                                        <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 500, mb: 1 }}>Description</Typography>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{caseData.description}</Typography>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        {caseData.case_type === 'money_recovery' && (
                            <Card className="glass-card" sx={{ mb: 2, border: '1px solid #00D9A6' }}>
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="subtitle2" sx={{ color: '#00D9A6', fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TrendingUp sx={{ fontSize: 20 }} /> MONEY RECOVERY PROGRESS
                                    </Typography>
                                    <Stack spacing={2}>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block' }}>CLAIMED</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 800 }}>{caseData.currency} {caseData.claim_amount?.toLocaleString()}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#66BB6A', display: 'block' }}>RECOVERED</Typography>
                                            <Typography variant="h6" sx={{ fontWeight: 800, color: '#66BB6A' }}>{caseData.currency} {caseData.recovered_amount?.toLocaleString()}</Typography>
                                        </Box>
                                        <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                                        <Box>
                                            <Typography variant="caption" sx={{ color: '#FF6B6B', display: 'block' }}>OUTSTANDING</Typography>
                                            <Typography variant="h5" sx={{ fontWeight: 900, color: '#FF6B6B' }}>{caseData.currency} {caseData.outstanding_amount?.toLocaleString()}</Typography>
                                        </Box>
                                        <Box sx={{ mt: 1 }}>
                                            <LinearProgress
                                                variant="determinate"
                                                value={caseData.claim_amount > 0 ? (caseData.recovered_amount / caseData.claim_amount) * 100 : 0}
                                                sx={{ height: 10, borderRadius: 5, bgcolor: 'rgba(0,0,0,0.3)', '& .MuiLinearProgress-bar': { bgcolor: '#00D9A6' } }}
                                            />
                                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, textAlign: 'right', color: '#94A3B8' }}>
                                                {caseData.claim_amount > 0 ? Math.round((caseData.recovered_amount / caseData.claim_amount) * 100) : 0}% Recovered
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        )}
                        {caseData.risk_score > 0 && (
                            <Card className="glass-card" sx={{ mb: 2 }}>
                                <CardContent sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="overline" sx={{ color: '#94A3B8' }}>Risk Score</Typography>
                                    <Typography variant="h2" sx={{ fontWeight: 800, color: getRiskColor(caseData.risk_score) }}>{caseData.risk_score}</Typography>
                                    <Chip label={getRiskLabel(caseData.risk_score)} sx={{
                                        bgcolor: `${getRiskColor(caseData.risk_score)}20`,
                                        color: getRiskColor(caseData.risk_score), fontWeight: 600
                                    }} />
                                </CardContent>
                            </Card>
                        )}
                        {caseData.ai_summary && (
                            <Card className="glass-card">
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="subtitle2" sx={{ color: '#6C63FF', fontWeight: 600, mb: 1 }}>AI Summary</Typography>
                                    <Typography variant="body2" sx={{ color: '#CBD5E1' }}>{caseData.ai_summary}</Typography>
                                </CardContent>
                            </Card>
                        )}
                    </Grid>
                </Grid>
            )
            }

            {/* Documents Tab */}
            {
                tab === 1 && (
                    <Card className="glass-card">
                        <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Documents</Typography>

                            {(caseData.documents || []).map(doc => (
                                <Box key={doc.id} sx={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1.5,
                                    borderRadius: 2, border: '1px solid rgba(108,99,255,0.1)', mb: 1
                                }}>
                                    <Box>
                                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{doc.filename}</Typography>
                                        <Typography variant="caption" sx={{ color: '#64748B' }}>v{doc.version} · {doc.doc_type} · {formatDate(doc.created_at)}</Typography>
                                    </Box>
                                    <Button size="small" onClick={async () => {
                                        try {
                                            const res = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' });
                                            const url = window.URL.createObjectURL(new Blob([res.data]));
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.setAttribute('download', doc.filename);
                                            document.body.appendChild(link);
                                            link.click();
                                            link.remove();
                                        } catch (err) {
                                            toast.error('Download failed');
                                        }
                                    }}>Download</Button>
                                </Box>
                            ))}
                            {(!caseData.documents || caseData.documents.length === 0) && (
                                <Typography variant="body2" sx={{ color: '#64748B', textAlign: 'center', py: 3 }}>No documents uploaded yet</Typography>
                            )}
                        </CardContent>
                    </Card>
                )
            }

            {/* AI Tab */}
            {
                tab === 2 && (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card className="glass-card">
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>AI Analysis Tools</Typography>
                                    <Typography variant="body2" sx={{ color: '#94A3B8', mb: 3 }}>Automated legal intelligence for case files.</Typography>
                                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                                        {[
                                            { id: 'summarize', label: 'Generate Brief', icon: <SmartToy /> },
                                            { id: 'extract', label: 'Extract Key Facts', icon: <Assessment /> },
                                            { id: 'risk-score', label: 'Risk Analysis', icon: <Assessment /> },
                                            { id: 'timeline', label: 'Event Timeline', icon: <Timeline /> },
                                            { id: 'validate', label: 'Completeness Check', icon: <AutoAwesome /> },
                                            { id: 'template/case', label: 'Generate Filing Template', icon: <NoteAdd /> },
                                        ].map((action) => (
                                            <Button
                                                key={action.id}
                                                variant={aiResult?.action === action.id ? "contained" : "outlined"}
                                                startIcon={action.icon}
                                                onClick={() => handleAI(action.id)}
                                                disabled={aiLoading}
                                                sx={{
                                                    borderColor: aiResult?.action === action.id ? 'transparent' : 'rgba(108,99,255,0.5)',
                                                    bgcolor: aiResult?.action === action.id ? '#6C63FF' : 'transparent',
                                                    color: aiResult?.action === action.id ? '#fff' : '#6C63FF',
                                                    '&:hover': {
                                                        bgcolor: aiResult?.action === action.id ? '#5a52d5' : 'rgba(108,99,255,0.05)',
                                                        borderColor: aiResult?.action === action.id ? 'transparent' : '#6C63FF'
                                                    }
                                                }}
                                            >
                                                {action.label}
                                            </Button>
                                        ))}
                                    </Box>
                                    {aiLoading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}
                                </CardContent>
                            </Card>
                        </Grid>

                        {aiResult && (
                            <Grid item xs={12}>
                                <Card className="glass-card">
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#6C63FF', textTransform: 'uppercase' }}>
                                                {aiResult.action.replace('-', ' ')} Result
                                            </Typography>
                                        </Box>

                                        {aiResult.data?.error && (
                                            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
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

                                        {/* Summarize Result */}
                                        {aiResult.action === 'summarize' && (
                                            <Box>
                                                <Box sx={{ bgcolor: '#1E293B', p: 3, borderRadius: 2, border: '1px solid #334155', mb: 3 }}>
                                                    <Typography variant="body1" sx={{ lineHeight: 1.7, color: '#E2E8F0' }}>
                                                        {aiResult.data.summary}
                                                    </Typography>
                                                </Box>
                                                <Grid container spacing={2}>
                                                    <Grid item xs={12} md={6}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#6C63FF' }}>KEY FACTS</Typography>
                                                        <Stack spacing={1}>
                                                            {aiResult.data.key_facts?.map((f, i) => (
                                                                <Box key={i} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1, borderLeft: '3px solid #00D9A6' }}>
                                                                    <Typography variant="body2" sx={{ color: '#CBD5E1' }}>{f}</Typography>
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    </Grid>
                                                    <Grid item xs={12} md={6}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5, color: '#6C63FF' }}>RECOMMENDED ACTIONS</Typography>
                                                        <Stack spacing={1}>
                                                            {aiResult.data.recommended_actions?.map((a, i) => (
                                                                <Box key={i} sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 1, borderLeft: '3px solid #F59E0B' }}>
                                                                    <Typography variant="body2" sx={{ color: '#CBD5E1' }}>{a}</Typography>
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                        )}

                                        {/* Extract Result */}
                                        {aiResult && aiResult.action === 'extract' && (
                                            <Grid container spacing={2}>
                                                {Object.entries(aiResult.data).map(([key, val]) => (
                                                    <Grid item xs={12} md={6} key={key}>
                                                        <Box sx={{ p: 2, bgcolor: '#1E293B', borderRadius: 2, border: '1px solid #334155' }}>
                                                            <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mb: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>
                                                                {key.replace(/_/g, ' ')}
                                                            </Typography>
                                                            <Typography variant="body2" sx={{ fontWeight: 500, color: '#F8FAFC' }}>
                                                                {key === 'financial_exposure' && typeof val === 'object'
                                                                    ? `${val.currency || 'LKR'} ${val.amount?.toLocaleString() || '0'}`
                                                                    : (typeof val === 'object' ? JSON.stringify(val) : String(val))}
                                                            </Typography>
                                                        </Box>
                                                    </Grid>
                                                ))}
                                            </Grid>
                                        )}

                                        {/* Risk Score Result */}
                                        {aiResult && aiResult.action === 'risk-score' && (
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 4, p: 3, bgcolor: `${getRiskColor(aiResult.data.overall_score)}10`, borderRadius: 3, border: `1px solid ${getRiskColor(aiResult.data.overall_score)}30` }}>
                                                    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                                                        <CircularProgress variant="determinate" value={aiResult.data.overall_score} size={90} thickness={5} sx={{ color: getRiskColor(aiResult.data.overall_score) }} />
                                                        <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Typography variant="h4" component="div" sx={{ fontWeight: 800, color: getRiskColor(aiResult.data.overall_score) }}>
                                                                {Math.round(aiResult.data.overall_score)}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="h5" sx={{ fontWeight: 800, color: getRiskColor(aiResult.data.overall_score), mb: 0.5 }}>
                                                            {aiResult.data.risk_level?.toUpperCase()} RISK
                                                        </Typography>
                                                        <Typography variant="body1" sx={{ color: '#E2E8F0', fontWeight: 500 }}>{aiResult.data.explanation}</Typography>
                                                    </Box>
                                                </Box>
                                                {aiResult && aiResult.data.error && (
                                                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
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

                                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5, color: '#6C63FF', textTransform: 'uppercase', letterSpacing: 1 }}>
                                                    Risk Categories</Typography>
                                                <Grid container spacing={2} sx={{ mb: 4 }}>
                                                    {Object.entries(aiResult.data.categories || {}).map(([cat, detail]) => (
                                                        <Grid item xs={12} sm={6} md={2.4} key={cat}>
                                                            <Paper sx={{ p: 2, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 2, border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                                                                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 700, color: '#94A3B8' }}>{cat}</Typography>
                                                                <Typography variant="h4" sx={{ my: 1, fontWeight: 800, color: getRiskColor(detail.score) }}>{detail.score}</Typography>
                                                                <LinearProgress variant="determinate" value={detail.score} sx={{ height: 6, borderRadius: 3, bgcolor: '#334155', '& .MuiLinearProgress-bar': { bgcolor: getRiskColor(detail.score) } }} />
                                                            </Paper>
                                                        </Grid>
                                                    ))}
                                                </Grid>

                                                {aiResult.data.red_flags?.length > 0 && (
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>🚩 Critical Red Flags</Typography>
                                                        <Stack spacing={1.5}>
                                                            {aiResult.data.red_flags.map((flag, i) => (
                                                                <Box key={i} sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.05)', borderRadius: 2, border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#fca5a5' }}>{flag.flag}</Typography>
                                                                    <Chip label={flag.category} size="small" sx={{ bgcolor: '#7f1d1d', color: '#fca5a5', fontWeight: 700, fontSize: '0.65rem' }} />
                                                                </Box>
                                                            ))}
                                                        </Stack>
                                                    </Box>
                                                )}
                                            </Box>
                                        )}

                                        {/* Timeline Result */}
                                        {aiResult && aiResult.action === 'timeline' && (
                                            <Box>
                                                <Grid container spacing={4}>
                                                    <Grid item xs={12} md={8}>
                                                        <Typography variant="subtitle2" sx={{ mb: 3, fontWeight: 700, color: '#6C63FF', textTransform: 'uppercase' }}>Case Evolution</Typography>
                                                        <Box sx={{ position: 'relative', pl: 4, borderLeft: '2px solid rgba(108, 99, 255, 0.2)' }}>
                                                            {aiResult.data.timeline_events?.map((event, i) => (
                                                                <Box key={i} sx={{ mb: 4, position: 'relative' }}>
                                                                    <Box sx={{
                                                                        position: 'absolute', left: -41, top: 4, width: 14, height: 14, borderRadius: '50%',
                                                                        bgcolor: event.status === 'completed' ? '#00D9A6' : event.status === 'overdue' ? '#EF4444' : '#6C63FF',
                                                                        border: '4px solid #0F172A', boxShadow: '0 0 0 2px rgba(108, 99, 255, 0.2)'
                                                                    }} />
                                                                    <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800, display: 'block', mb: 1, textTransform: 'uppercase' }}>
                                                                        {event.date} · <span style={{ color: event.status === 'completed' ? '#00D9A6' : event.status === 'overdue' ? '#EF4444' : '#6C63FF' }}>{event.status}</span>
                                                                    </Typography>
                                                                    <Paper variant="outlined" sx={{ bgcolor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)', p: 2, borderRadius: 2 }}>
                                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#F8FAFC', mb: 0.5 }}>{event.event}</Typography>
                                                                        <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 500 }}>Type: {event.type}</Typography>
                                                                    </Paper>
                                                                </Box>
                                                            ))}
                                                        </Box>
                                                    </Grid>
                                                    <Grid item xs={12} md={4}>
                                                        <Stack spacing={3}>
                                                            {aiResult.data.next_actions?.length > 0 && (
                                                                <Box>
                                                                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#3B82F6', textTransform: 'uppercase' }}>Strategic Next Steps</Typography>
                                                                    <Stack spacing={1.5}>
                                                                        {aiResult.data.next_actions.map((action, i) => (
                                                                            <Paper key={i} sx={{ p: 2, bgcolor: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: 2 }}>
                                                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#93c5fd', mb: 1 }}>{action.action}</Typography>
                                                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                    <Typography variant="caption" sx={{ color: '#60a5fa', fontWeight: 600 }}>Due: {action.due_date}</Typography>
                                                                                    <Chip label={action.priority} size="small" sx={{ height: 20, fontSize: '0.65rem', bgcolor: '#1e3a8a', color: '#93c5fd', fontWeight: 700 }} />
                                                                                </Box>
                                                                            </Paper>
                                                                        ))}
                                                                    </Stack>
                                                                </Box>
                                                            )}
                                                            {aiResult.data.missed_deadlines?.length > 0 && (
                                                                <Box>
                                                                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#EF4444', textTransform: 'uppercase' }}>⚠️ Missed Deadlines</Typography>
                                                                    <Stack spacing={1.5}>
                                                                        {aiResult.data.missed_deadlines.map((missed, i) => (
                                                                            <Paper key={i} sx={{ p: 2, bgcolor: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: 2 }}>
                                                                                <Typography variant="body2" sx={{ fontWeight: 700, color: '#fca5a5', mb: 0.5 }}>{missed.deadline}</Typography>
                                                                                <Typography variant="caption" sx={{ color: '#f87171', display: 'block', fontWeight: 500 }}>Original Date: {missed.original_date}</Typography>
                                                                            </Paper>
                                                                        ))}
                                                                    </Stack>
                                                                </Box>
                                                            )}
                                                        </Stack>
                                                    </Grid>
                                                </Grid>
                                            </Box>
                                        )}

                                        {/* Validate Result */}
                                        {aiResult && aiResult.action === 'validate' && (
                                            <Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 4, p: 3, bgcolor: 'rgba(255,255,255,0.02)', borderRadius: 3 }}>
                                                    <Box sx={{ position: 'relative', mr: 3 }}>
                                                        <CircularProgress variant="determinate" value={aiResult.data.completeness_score} size={70} thickness={5} sx={{ color: aiResult.data.completeness_score > 80 ? '#00D9A6' : '#F59E0B' }} />
                                                        <Box sx={{ top: 0, left: 0, bottom: 0, right: 0, position: 'absolute', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                            <Typography variant="caption" sx={{ fontWeight: 800, color: '#fff' }}>{aiResult.data.completeness_score}%</Typography>
                                                        </Box>
                                                    </Box>
                                                    <Box>
                                                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#F8FAFC' }}>Case Quality Score</Typography>
                                                        <Typography variant="body2" sx={{ color: '#94A3B8' }}>Assessment: <b>{aiResult.data.quality_assessment}</b> · {aiResult.data.is_complete ? 'Ready for supervisor review' : 'Additional details requested'}</Typography>
                                                    </Box>
                                                </Box>

                                                {aiResult.data.issues?.length > 0 ? (
                                                    <Box>
                                                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase' }}>Missing Intelligence</Typography>
                                                        <Stack spacing={2}>
                                                            {aiResult.data.issues.map((issue, i) => (
                                                                <Paper key={i} sx={{ p: 2.5, bgcolor: '#1E293B', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                                                    <Box sx={{ display: 'flex', gap: 2 }}>
                                                                        <Box sx={{ color: issue.severity === 'critical' ? '#EF4444' : '#F59E0B', mt: 0.5 }}>
                                                                            {issue.severity === 'critical' ? '🚫' : '⚠️'}
                                                                        </Box>
                                                                        <Box>
                                                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F8FAFC', mb: 0.5, fontSize: '0.8rem', textTransform: 'uppercase' }}>{issue.type.replace(/_/g, ' ')}</Typography>
                                                                            <Typography variant="body2" sx={{ color: '#CBD5E1', mb: 2 }}>{issue.description}</Typography>
                                                                            <Box sx={{ p: 1, bgcolor: 'rgba(129, 140, 248, 0.1)', borderRadius: 1, display: 'inline-block' }}>
                                                                                <Typography variant="caption" sx={{ color: '#818CF8', fontWeight: 600 }}>💡 Recommendation: {issue.recommendation}</Typography>
                                                                            </Box>
                                                                        </Box>
                                                                    </Box>
                                                                </Paper>
                                                            ))}
                                                        </Stack>
                                                    </Box>
                                                ) : (
                                                    <Alert severity="success" sx={{ bgcolor: 'rgba(0, 217, 166, 0.1)', color: '#00D9A6', border: '1px solid rgba(0, 217, 166, 0.2)', borderRadius: 2 }}>
                                                        <b>Full Compliance:</b> No mandatory documentation issues identified by AI.
                                                    </Alert>
                                                )}
                                            </Box>
                                        )}

                                        {aiResult && aiResult.action === 'template/case' && (
                                            <Box sx={{ mt: 1, p: 2, bgcolor: '#1E293B', borderRadius: 2, border: '1px solid #334155' }}>
                                                <ReactMarkdown className="markdown-body">{aiResult.data.template}</ReactMarkdown>
                                            </Box>
                                        )}

                                        {aiResult && aiResult.action === 'chat' && (
                                            <Box sx={{ mt: 1, p: 2, bgcolor: '#1E293B', borderRadius: 2, border: '1px solid #334155' }}>
                                                <Typography variant="subtitle2" sx={{ color: '#6C63FF', mb: 1 }}>AI Response:</Typography>
                                                <ReactMarkdown className="markdown-body">{aiResult.data.answer}</ReactMarkdown>
                                            </Box>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                        <Grid item xs={12}>
                            <Divider sx={{ my: 1, borderColor: 'rgba(108,99,255,0.1)' }} />
                            <Card className="glass-card">
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <SmartToy sx={{ color: '#6C63FF' }} /> Chat with Case AI
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                                        <TextField fullWidth placeholder="Ask a question about this case..." size="small"
                                            value={chatQ} onChange={e => setChatQ(e.target.value)}
                                            onKeyPress={e => e.key === 'Enter' && handleChat()}
                                            disabled={aiLoading}
                                            sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }} />
                                        <Button variant="contained" onClick={handleChat} disabled={aiLoading || !chatQ.trim()} sx={{ px: 3 }}>
                                            {aiLoading ? <CircularProgress size={24} /> : 'Ask'}
                                        </Button>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                )
            }

            {/* Notes Tab */}
            {
                tab === 3 && (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Card className="glass-card">
                                <CardContent sx={{ p: 3 }}>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Add Note</Typography>
                                    <TextField fullWidth multiline rows={3} value={noteText} onChange={e => setNoteText(e.target.value)}
                                        placeholder="Enter your note..." sx={{ mb: 2 }} />
                                    <Button variant="contained" startIcon={<NoteAdd />} onClick={handleAddNote}>Add Note</Button>
                                </CardContent>
                            </Card>
                        </Grid>
                        {(caseData.case_notes || []).map(note => (
                            <Grid item xs={12} key={note.id}>
                                <Card className="glass-card">
                                    <CardContent sx={{ p: 2.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Chip label={note.note_type} size="small" sx={{ bgcolor: '#6C63FF20', color: '#6C63FF' }} />
                                            <Typography variant="caption" sx={{ color: '#64748B' }}>{formatDate(note.created_at)}</Typography>
                                        </Box>
                                        <Typography variant="body2">{note.content}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )
            }

            {/* Court & Scheduling Tab */}
            {tab === 4 && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={7}>
                        <Card className="glass-card">
                            <CardContent sx={{ p: 4 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Scheduled Court Events</Typography>
                                {caseData.court_events?.length > 0 ? (
                                    <Stack spacing={2}>
                                        {caseData.court_events.map(event => (
                                            <Box key={event.id} sx={{
                                                p: 2.5, borderRadius: 2, border: '1px solid rgba(108, 99, 255, 0.1)',
                                                bgcolor: 'rgba(108, 99, 255, 0.02)', display: 'flex', gap: 2
                                            }}>
                                                <Box sx={{
                                                    width: 60, height: 60, borderRadius: 2,
                                                    bgcolor: '#6C63FF', display: 'flex', flexDirection: 'column',
                                                    alignItems: 'center', justifyContent: 'center', color: '#fff'
                                                }}>
                                                    <Typography variant="caption" sx={{ fontWeight: 800, lineHeight: 1 }}>
                                                        {new Date(event.event_date).toLocaleString('default', { month: 'short' }).toUpperCase()}
                                                    </Typography>
                                                    <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>
                                                        {new Date(event.event_date).getDate()}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ flex: 1 }}>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{event.title}</Typography>
                                                        <Chip label={event.event_type} size="small" sx={{ bgcolor: 'rgba(0, 217, 166, 0.1)', color: '#00D9A6', fontWeight: 600, fontSize: '0.65rem' }} />
                                                    </Box>
                                                    <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1 }}>
                                                        📍 {event.location || 'No location set'} · ⏰ {new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </Typography>
                                                    {event.notes && (
                                                        <Typography variant="caption" sx={{ color: '#64748B', fontStyle: 'italic', display: 'block', pt: 1, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                            {event.notes}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            </Box>
                                        ))}
                                    </Stack>
                                ) : (
                                    <Alert severity="info" sx={{ borderRadius: 2 }}>
                                        No court events scheduled for this case yet.
                                    </Alert>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={5}>
                        <Card className="glass-card" sx={{ border: '1px solid #6C63FF' }}>
                            <CardContent sx={{ p: 4 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700, mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Timeline sx={{ color: '#6C63FF' }} /> Schedule New Event
                                </Typography>
                                <Stack spacing={2.5} component="form" autoComplete="off" onSubmit={async (e) => {
                                    e.preventDefault();
                                    const data = new FormData(e.target);
                                    const datePart = data.get('event_date_only');
                                    const timePart = data.get('event_time_only');

                                    try {
                                        await api.post(`/cases/${id}/events`, {
                                            title: data.get('title'),
                                            event_type: data.get('event_type'),
                                            event_date: `${datePart}T${timePart}`,
                                            location: data.get('location'),
                                            notes: data.get('notes')
                                        });
                                        toast.success('Event scheduled!');
                                        load();
                                        e.target.reset();
                                    } catch { toast.error('Failed to schedule event'); }
                                }}>
                                    <TextField fullWidth label="Event Title" name="title" required placeholder="e.g., Preliminary Hearing" />
                                    <FormControl fullWidth required>
                                        <InputLabel>Event Type</InputLabel>
                                        <Select name="event_type" label="Event Type" defaultValue="hearing">
                                            <MenuItem value="hearing">Court Hearing</MenuItem>
                                            <MenuItem value="filing">Document Filing</MenuItem>
                                            <MenuItem value="judgment">Judgment Delivery</MenuItem>
                                            <MenuItem value="mediation">Mediation Session</MenuItem>
                                            <MenuItem value="appeal">Appeal Submission</MenuItem>
                                        </Select>
                                    </FormControl>
                                    <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                                        <TextField
                                            fullWidth
                                            label="Event Date"
                                            name="event_date_only"
                                            type="date"
                                            required
                                            InputLabelProps={{ shrink: true }}
                                            inputProps={{ autoComplete: 'off' }}
                                            sx={{ '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)', cursor: 'pointer' } }}
                                        />
                                        <TextField
                                            fullWidth
                                            label="Event Time"
                                            name="event_time_only"
                                            type="time"
                                            required
                                            InputLabelProps={{ shrink: true }}
                                            inputProps={{ autoComplete: 'off' }}
                                            sx={{ '& input::-webkit-calendar-picker-indicator': { filter: 'invert(1)', cursor: 'pointer' } }}
                                        />
                                    </Box>
                                    <TextField fullWidth label="Location" name="location" placeholder="e.g., Colombo High Court 04" autoComplete="off" />
                                    <TextField fullWidth multiline rows={2} label="Notes" name="notes" placeholder="Any specific instructions..." autoComplete="off" />
                                    <Button fullWidth variant="contained" type="submit" sx={{ background: 'linear-gradient(135deg, #6C63FF, #5A52E0)', py: 1.5, fontWeight: 700 }}>
                                        Schedule Event
                                    </Button>
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Audit Trail Tab */}
            {tab === 5 && (
                <Card className="glass-card">
                    <CardContent sx={{ p: 4 }}>
                        <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>Case Audit Trail & Versioning History</Typography>
                        {tab === 5 && (
                            <AuditTimeline logs={auditLogs} loading={auditLoading} />
                        )}
                    </CardContent>
                </Card>
            )}
            {/* Assign Officer Dialog */}
            <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} PaperProps={{ sx: { bgcolor: '#1E293B', color: '#fff', minWidth: 400 } }}>
                <DialogTitle sx={{ borderBottom: '1px solid #334155' }}>Assign Legal Officer</DialogTitle>
                <DialogContent sx={{ p: 0 }}>
                    {officers.length === 0 ? (
                        <Typography sx={{ p: 3, textAlign: 'center', color: '#94A3B8' }}>No Legal Officers found.</Typography>
                    ) : (
                        <List>
                            {officers.map((officer) => (
                                <ListItem disablePadding key={officer.id}>
                                    <ListItemButton onClick={async () => {
                                        try {
                                            // Update assigned officer
                                            await api.put(`/cases/${id}`, { assigned_officer_id: officer.id });
                                            // Update status to PENDING_REVIEW
                                            await api.put(`/cases/${id}/status?new_status=PENDING_REVIEW`);
                                            toast.success(`Case assigned to ${officer.full_name || officer.username} and submitted for review.`);
                                            setAssignDialogOpen(false);
                                            load();
                                        } catch (err) {
                                            toast.error(err.response?.data?.detail || 'Assignment failed');
                                        }
                                    }}>
                                        <ListItemAvatar>
                                            <Avatar sx={{ bgcolor: '#6C63FF' }}>{officer.full_name?.[0] || officer.username?.[0]}</Avatar>
                                        </ListItemAvatar>
                                        <ListItemText primary={officer.full_name || officer.username} secondary={officer.email} secondaryTypographyProps={{ color: '#94A3B8' }} />
                                    </ListItemButton>
                                </ListItem>
                            ))}
                        </List>
                    )}
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid #334155', p: 2 }}>
                    <Button onClick={() => setAssignDialogOpen(false)} sx={{ color: '#94A3B8' }}>Cancel</Button>
                </DialogActions>
            </Dialog>

            {/* Send Back Reason Dialog */}
            <Dialog open={sendBackDialogOpen} onClose={() => setSendBackDialogOpen(false)} PaperProps={{ sx: { bgcolor: '#1E293B', color: '#fff', minWidth: 400 } }}>
                <DialogTitle sx={{ borderBottom: '1px solid #334155' }}>Send Back for Revision</DialogTitle>
                <DialogContent sx={{ p: 3 }}>
                    <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
                        Please provide a reason or instructions for the correction. This note will be added to the case.
                    </Typography>
                    <TextField
                        fullWidth
                        autoFocus
                        multiline
                        rows={4}
                        placeholder="Enter reason for sending back..."
                        value={sendBackReason}
                        onChange={(e) => setSendBackReason(e.target.value)}
                        sx={{ '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)' } }}
                    />
                </DialogContent>
                <DialogActions sx={{ borderTop: '1px solid #334155', p: 2 }}>
                    <Button onClick={() => { setSendBackDialogOpen(false); setSendBackReason(''); }} sx={{ color: '#94A3B8' }}>Cancel</Button>
                    <Button
                        variant="contained"
                        color="warning"
                        disabled={!sendBackReason.trim()}
                        onClick={async () => {
                            try {
                                await api.post(`/cases/${id}/notes`, { content: sendBackReason, note_type: 'general' });
                                await api.put(`/cases/${id}/status?new_status=REVISION_REQUIRED`);
                                toast.success(`Case sent back for revision.`);
                                setSendBackDialogOpen(false);
                                setSendBackReason('');
                                load();
                            } catch (err) {
                                toast.error(err.response?.data?.detail || 'Action failed');
                            }
                        }}
                    >
                        Confirm Send Back
                    </Button>
                </DialogActions>
            </Dialog>

        </Box >
    );
}
