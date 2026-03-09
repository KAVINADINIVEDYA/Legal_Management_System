
import React, { useState, useRef, useEffect } from 'react';
import {
    Box, Typography, TextField, Button, Paper, Avatar,
    List, ListItem, ListItemText, Divider, CircularProgress,
    IconButton, Chip, Stack, Card, CardContent
} from '@mui/material';
import {
    Send, SmartToy, Person, Info,
    History, Clear, AutoAwesome, Bookmark
} from '@mui/icons-material';
import api from '../../api/client';
import toast from 'react-hot-toast';

import ReactMarkdown from 'react-markdown';

export default function AskLegal() {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hello! I am your AI Legal Assistant grounded in MobiLex data. You can ask me questions about cases, agreements, or legal policies in the system.',
            type: 'initial'
        }
    ]);
    const [loading, setLoading] = useState(false);
    const scrollRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setLoading(true);

        try {
            const res = await api.post('/ai/chat', { question: userMsg });
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: res.data.answer,
                confidence: res.data.confidence
            }]);
        } catch (err) {
            toast.error('Failed to get response from AI');
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again later.' }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', gap: 3 }} className="fade-in">
            {/* Chat Area */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ bgcolor: '#6C63FF' }}><SmartToy /></Avatar>
                    <Box>
                        <Typography variant="h5" sx={{ fontWeight: 800 }}>Ask Legal AI</Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8' }}>RAG-Powered Intelligence • Grounded in System Data</Typography>
                    </Box>
                </Box>

                <Paper className="glass-card" sx={{
                    flex: 1, p: 0, overflow: 'hidden', display: 'flex',
                    flexDirection: 'column', border: '1px solid rgba(108, 99, 255, 0.1)'
                }}>
                    <Box ref={scrollRef} sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
                        <List disablePadding>
                            {messages.map((m, i) => (
                                <ListItem key={i} sx={{
                                    flexDirection: 'column',
                                    alignItems: m.role === 'user' ? 'flex-end' : 'flex-start',
                                    gap: 1, mb: 3, px: 0
                                }}>
                                    <Box sx={{ display: 'flex', gap: 1.5, maxWidth: m.role === 'user' ? '70%' : '90%', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
                                        <Avatar sx={{
                                            width: 32, height: 32,
                                            bgcolor: m.role === 'user' ? '#00D9A6' : '#6C63FF',
                                            fontSize: '0.9rem'
                                        }}>
                                            {m.role === 'user' ? <Person sx={{ fontSize: 18 }} /> : <SmartToy sx={{ fontSize: 18 }} />}
                                        </Avatar>
                                        <Paper sx={{
                                            p: 2.5, borderRadius: 3,
                                            bgcolor: m.role === 'user' ? 'rgba(0, 217, 166, 0.1)' : 'rgba(108, 99, 255, 0.05)',
                                            border: m.role === 'user' ? '1px solid rgba(0, 217, 166, 0.2)' : '1px solid rgba(108, 99, 255, 0.1)',
                                            boxShadow: 'none'
                                        }}>
                                            <Box sx={{
                                                color: '#F1F5F9',
                                                lineHeight: 1.7,
                                                fontSize: '0.95rem',
                                                '& h1, & h2, & h3': { color: '#6C63FF', mt: 2, mb: 1.5, fontWeight: 700 },
                                                '& p': { mb: 1.5 },
                                                '& ul, & ol': { pl: 3, mb: 1.5 },
                                                '& li': { mb: 1 },
                                                '& strong': { color: '#00D9A6' }
                                            }}>
                                                <ReactMarkdown>{m.content}</ReactMarkdown>
                                            </Box>
                                        </Paper>
                                    </Box>
                                </ListItem>
                            ))}
                            {loading && (
                                <ListItem sx={{ px: 0 }}>
                                    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', p: 1, borderRadius: 2, bgcolor: 'rgba(108, 99, 255, 0.05)' }}>
                                        <CircularProgress size={16} sx={{ color: '#6C63FF' }} />
                                        <Typography variant="caption" sx={{ color: '#94A3B8', fontStyle: 'italic' }}>AI is searching and analyzing data...</Typography>
                                    </Box>
                                </ListItem>
                            )}
                        </List>
                    </Box>

                    {/* Input Area */}
                    <Box sx={{ p: 2, bgcolor: 'rgba(15, 23, 42, 0.5)', borderTop: '1px solid rgba(108, 99, 255, 0.1)' }}>
                        <Stack direction="row" spacing={2}>
                            <TextField
                                fullWidth placeholder="Type your legal question here..." size="small"
                                value={input} onChange={e => setInput(e.target.value)}
                                onKeyPress={e => e.key === 'Enter' && handleSend()}
                                disabled={loading}
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 10, bgcolor: 'rgba(15, 23, 42, 0.8)' } }}
                            />
                            <Button
                                variant="contained" onClick={handleSend} disabled={loading || !input.trim()}
                                sx={{ borderRadius: 10, px: 3, background: 'linear-gradient(135deg, #6C63FF, #5A52E0)' }}
                            >
                                <Send sx={{ fontSize: 20 }} />
                            </Button>
                        </Stack>
                    </Box>
                </Paper>
            </Box>

            {/* Sidebar / Info Area */}
            <Box sx={{ width: 320, display: { xs: 'none', lg: 'block' } }}>

                <Card className="glass-card">
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                            <History sx={{ color: '#FFB347' }} />
                            <Typography variant="h6" sx={{ fontWeight: 700 }}>Suggested Questions</Typography>
                        </Box>
                        <Stack spacing={1}>
                            {[
                                "Summarize the high-risk money recovery cases.",
                                "Find agreements expiring in next 3 months.",
                                "What are the common charges in bribery cases?",
                                "List all agreements with vendor ABC."
                            ].map((q, i) => (
                                <Paper key={i} sx={{
                                    p: 1.5, borderRadius: 2, cursor: 'pointer',
                                    bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                                    '&:hover': { bgcolor: 'rgba(108, 99, 255, 0.1)', border: '1px solid rgba(108, 99, 255, 0.3)' }
                                }} onClick={() => setInput(q)}>
                                    <Typography variant="caption" sx={{ color: '#F1F5F9', fontWeight: 500 }}>{q}</Typography>
                                </Paper>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
}
