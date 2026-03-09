import React, { useState } from 'react';
import {
    Box, Card, CardContent, Typography, TextField, Button, Chip,
    CircularProgress, Grid, Dialog, DialogTitle, DialogContent, DialogActions,
    IconButton
} from '@mui/material';
import { Search, SmartToy, AutoAwesome, Close, Download } from '@mui/icons-material';
import api from '../../api/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { truncate } from '../../utils/helpers';

export default function SemanticSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [genLoading, setGenLoading] = useState(false);
    const [showTemplate, setShowTemplate] = useState(false);
    const [generatedTemplate, setGeneratedTemplate] = useState(null);
    const [aiAnswer, setAiAnswer] = useState(null);

    const handleSearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setAiAnswer(null);
        try {
            const res = await api.get('/search', { params: { q: query, n_results: 15 } });
            setResults(res.data.results || []);
            setAiAnswer(res.data.ai_answer);
            setSearched(true);
        } catch { toast.error('Search failed'); }
        setLoading(false);
    };

    const handleGenerateFromSearch = async (result) => {
        setGenLoading(true);
        try {
            const endpoint = result.entity_type === 'case' ? '/ai/template/case' : '/ai/template/renewal';
            const payload = result.metadata?.agreement_id || result.metadata?.case_id
                ? { document_id: result.doc_id || result.metadata?.agreement_id || result.metadata?.case_id }
                : { text: result.text };

            const res = await api.post(endpoint, payload);
            setGeneratedTemplate({
                title: `Template for ${result.entity_type === 'case' ? 'Legal Case' : 'Agreement Renewal'}`,
                content: res.data.template
            });
            setShowTemplate(true);
            toast.success('Template generated!');
        } catch (err) {
            console.error('Gen error:', err);
            toast.error('Failed to generate template');
        }
        setGenLoading(false);
    };

    const handleDownloadTemplate = (content, title) => {
        const element = document.createElement("a");
        const file = new Blob([content], { type: 'text/markdown' });
        element.href = URL.createObjectURL(file);
        element.download = `${title.replace(/\s+/g, '_')}.md`;
        document.body.appendChild(element);
        element.click();
    };

    const suggestions = [
        'Give me a template for MS Copilot agreement', 'Draft a service agreement for TechNova',
        'Find similar cases to fraud', 'Show cases with high financial exposure',
        'Find agreements mentioning termination penalty',
    ];

    return (
        <Box className="fade-in">
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <SmartToy sx={{ fontSize: 48, color: '#6C63FF', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                    <span className="gradient-text">AI Semantic Search</span>
                </Typography>
                <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                    Search across all cases and agreements using natural language
                </Typography>
            </Box>

            <Card className="glass-card" sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <TextField fullWidth value={query} onChange={e => setQuery(e.target.value)}
                            placeholder="Describe what you're looking for (e.g. Give me a template for...)"
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            sx={{ '& .MuiOutlinedInput-root': { fontSize: '1.1rem' } }} />
                        <Button variant="contained" onClick={handleSearch} disabled={loading}
                            startIcon={loading ? <CircularProgress size={20} /> : <Search />}
                            sx={{ px: 4 }}>Search</Button>
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="caption" sx={{ color: '#64748B', mr: 1, mt: 0.5 }}>Try:</Typography>
                        {suggestions.map(s => (
                            <Chip key={s} label={s} size="small" variant="outlined"
                                onClick={() => { setQuery(s); }}
                                sx={{ cursor: 'pointer', '&:hover': { borderColor: '#6C63FF', bgcolor: '#6C63FF10' } }} />
                        ))}
                    </Box>
                </CardContent>
            </Card>

            {/* AI Recommendation Section */}
            {aiAnswer && (
                <Card className="glass-card" sx={{ mb: 3, border: '1px solid rgba(0, 217, 166, 0.3)', background: 'linear-gradient(135deg, rgba(108, 99, 255, 0.05), rgba(0, 217, 166, 0.05))' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <AutoAwesome sx={{ color: '#00D9A6' }} />
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#00D9A6' }}>
                                AI Drafted Recommendation
                            </Typography>
                        </Box>
                        <Box sx={{
                            color: '#F1F5F9', maxHeight: '400px', overflowY: 'auto', p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: 2, mb: 2,
                            '& h1, & h2, & h3': { color: '#6C63FF', mt: 2, mb: 1, fontWeight: 700, fontSize: '1.2rem' },
                            '& strong': { color: '#00D9A6' }
                        }}>
                            <ReactMarkdown>{aiAnswer}</ReactMarkdown>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                            <Button variant="outlined" startIcon={<Download />} onClick={() => handleDownloadTemplate(aiAnswer, "AI_Suggested_Template")}
                                sx={{ borderColor: 'rgba(0, 217, 166, 0.3)', color: '#00D9A6' }}>
                                Download Draft
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {searched && (
                <Typography variant="body2" sx={{ color: '#94A3B8', mb: 2 }}>
                    Found {results.length} historical matches for "{query}"
                </Typography>
            )}

            <Grid container spacing={2}>
                {results.map((r, i) => (
                    <Grid item xs={12} key={i}>
                        <Card className="glass-card">
                            <CardContent sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Chip label={r.metadata?.entity_type || 'document'} size="small"
                                            sx={{
                                                bgcolor: r.metadata?.entity_type === 'case' ? '#6C63FF20' : '#00D9A620',
                                                color: r.metadata?.entity_type === 'case' ? '#6C63FF' : '#00D9A6', fontWeight: 600
                                            }} />
                                    </Box>
                                    <Typography variant="caption" sx={{ color: '#64748B' }}>
                                        {r.relevance ? `Relevance: ${(r.relevance * 100).toFixed(0)}%` : `Score: ${((1 - (r.distance || 0)) * 100).toFixed(0)}%`}
                                    </Typography>
                                </Box>
                                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#F1F5F9', mb: 0.5 }}>
                                    {r.metadata?.title || 'Untitled Document'}
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#94A3B8' }}>{truncate(r.text, 300)}</Typography>
                                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                    <Button size="small" startIcon={<AutoAwesome />}
                                        variant="outlined"
                                        onClick={() => handleGenerateFromSearch({ ...r, entity_type: r.metadata?.entity_type, doc_id: r.metadata?.doc_id })}
                                        sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600, borderColor: 'rgba(108, 99, 255, 0.3)', color: '#6C63FF' }}>
                                        Generate Template
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {searched && results.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="h6" sx={{ color: '#64748B' }}>No results found</Typography>
                    <Typography variant="body2" sx={{ color: '#475569' }}>Try a different query</Typography>
                </Box>
            )}

            {/* Template Display Modal */}
            <Dialog open={showTemplate} onClose={() => setShowTemplate(false)} maxWidth="md" fullWidth
                PaperProps={{ className: 'glass-card', sx: { bgcolor: '#0F172A', border: '1px solid rgba(108, 99, 255, 0.2)' } }}>
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AutoAwesome sx={{ color: '#6C63FF' }} />
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>{generatedTemplate?.title}</Typography>
                    </Box>
                    <IconButton onClick={() => setShowTemplate(false)} sx={{ color: '#94A3B8' }}><Close /></IconButton>
                </DialogTitle>
                <DialogContent dividers sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    {generatedTemplate && (
                        <Box sx={{
                            color: '#F1F5F9', lineHeight: 1.7,
                            '& h1, & h2, & h3': { color: '#6C63FF', mt: 2, mb: 1.5, fontWeight: 700 },
                            '& strong': { color: '#00D9A6' }
                        }}>
                            <ReactMarkdown>{generatedTemplate.content}</ReactMarkdown>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2, bgcolor: 'rgba(15, 23, 42, 0.5)' }}>
                    <Button onClick={() => setShowTemplate(false)} sx={{ color: '#94A3B8' }}>Close</Button>
                    <Button variant="contained" startIcon={<Download />} onClick={handleDownloadTemplate}
                        sx={{ background: 'linear-gradient(135deg, #00D9A6, #00AD85)' }}>
                        Download (.md)
                    </Button>
                </DialogActions>
            </Dialog>

            {genLoading && (
                <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, bgcolor: 'rgba(15, 23, 42, 0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 }}>
                    <CircularProgress size={60} sx={{ color: '#6C63FF' }} />
                    <Typography variant="h6" sx={{ color: '#fff', fontWeight: 700 }}>AI is drafting your template...</Typography>
                </Box>
            )}
        </Box>
    );
}
