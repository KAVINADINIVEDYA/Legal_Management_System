import React from 'react';
import { Box, Typography, Chip, Paper, Stack } from '@mui/material';
import {
    Create, Edit, CheckCircle, Cancel, Upload,
    Download, SmartToy, SwapHoriz, AssignmentInd
} from '@mui/icons-material';
import { formatDate } from '../utils/helpers';

export default function AuditTimeline({ logs, loading }) {
    if (loading) return null;

    if (logs.length === 0) {
        return (
            <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant="body2" sx={{ color: '#64748B' }}>
                    No historical records available for this item.
                </Typography>
            </Box>
        );
    }

    const getIcon = (action) => {
        const sx = { fontSize: 20 };
        switch (action) {
            case 'create': return <Create sx={{ ...sx, color: '#00D9A6' }} />;
            case 'update':
            case 'update_fields': return <Edit sx={{ ...sx, color: '#6C63FF' }} />;
            case 'approve':
            case 'status_change': return <CheckCircle sx={{ ...sx, color: '#00D9A6' }} />;
            case 'reject': return <Cancel sx={{ ...sx, color: '#FF6B6B' }} />;
            case 'upload': return <Upload sx={{ ...sx, color: '#6C63FF' }} />;
            case 'download': return <Download sx={{ ...sx, color: '#94A3B8' }} />;
            case 'ai_query':
            case 'summarize': return <SmartToy sx={{ ...sx, color: '#6C63FF' }} />;
            case 'submit': return <SwapHoriz sx={{ ...sx, color: '#6C63FF' }} />;
            case 'assign': return <AssignmentInd sx={{ ...sx, color: '#6C63FF' }} />;
            default: return <Edit sx={{ ...sx, color: '#94A3B8' }} />;
        }
    };

    return (
        <Box sx={{ position: 'relative', pl: 4, py: 2 }}>
            {/* Vertical Line */}
            <Box sx={{
                position: 'absolute',
                left: '15px',
                top: 0,
                bottom: 0,
                width: '2px',
                background: 'linear-gradient(to bottom, rgba(108, 99, 255, 0.2) 0%, rgba(0, 217, 166, 0.2) 100%)',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: '-4px',
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#00D9A6'
                }
            }} />

            <Stack spacing={3}>
                {logs.map((log, index) => {
                    let details = null;
                    try {
                        details = log.details && log.details.startsWith('{') ? JSON.parse(log.details) : null;
                    } catch {
                        details = null;
                    }

                    return (
                        <Box key={log.id} sx={{ position: 'relative' }}>
                            {/* Icon Dot */}
                            <Box sx={{
                                position: 'absolute',
                                left: '-33px',
                                top: '4px',
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                bgcolor: '#1e293b', // Match layout bg
                                border: '2px solid rgba(108, 99, 255, 0.3)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                zIndex: 1
                            }}>
                                {getIcon(log.action)}
                            </Box>

                            <Paper className="glass-card" sx={{
                                p: 2,
                                border: '1px solid rgba(255,255,255,0.03)',
                                bgcolor: 'rgba(255,255,255,0.01)',
                                '&:hover': {
                                    bgcolor: 'rgba(255,255,255,0.03)',
                                    borderColor: 'rgba(108, 99, 255, 0.2)'
                                }
                            }}>
                                {log.action === 'update_fields' && details ? (
                                    <Box>
                                        {Object.entries(details).map(([field, vals]) => {
                                            // Fallback humanizer for old/technical logs
                                            const humanField = {
                                                'assigned_officer_id': 'ASSIGNED OFFICER',
                                                'supervisor_id': 'SUPERVISOR',
                                                'created_by_id': 'CREATED BY',
                                                'case_type': 'CASE TYPE',
                                                'nature_of_case': 'NATURE OF CASE',
                                                'financial_exposure': 'FINANCIAL EXPOSURE'
                                            }[field] || field.replace(/_/g, ' ').toUpperCase();

                                            return (
                                                <Box key={field} sx={{ mb: 1 }}>
                                                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#F1F5F9' }}>
                                                        {humanField} <span style={{ fontWeight: 500, color: '#00D9A6' }}>{vals.new}</span>
                                                    </Typography>
                                                    {vals.old && vals.old !== 'None' && (
                                                        <Typography variant="caption" sx={{ color: '#94A3B8', display: 'block', mt: -0.5 }}>
                                                            previously {vals.old}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                        <Typography variant="caption" sx={{ color: '#6C63FF', fontWeight: 600, display: 'block', mt: 0.5 }}>
                                            by {log.performed_by} • {formatDate(log.created_at)}
                                        </Typography>
                                    </Box>
                                ) : (
                                    <Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#F1F5F9' }}>
                                                {log.action.replace('_', ' ').toUpperCase()}
                                            </Typography>
                                            <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                                                {formatDate(log.created_at)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" sx={{ color: '#94A3B8', fontSize: '0.85rem' }}>
                                            {log.details || `Performed by ${log.performed_by}`}
                                        </Typography>
                                        {log.details && (
                                            <Typography variant="caption" sx={{ color: '#6C63FF', fontWeight: 600, display: 'block', mt: 0.5 }}>
                                                by {log.performed_by}
                                            </Typography>
                                        )}
                                    </Box>
                                )}
                            </Paper>
                        </Box>
                    );
                })}
            </Stack>
        </Box>
    );
}
