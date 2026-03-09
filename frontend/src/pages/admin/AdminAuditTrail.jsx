import React, { useState, useEffect } from 'react';
import {
    Box, Card, CardContent, Typography, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, TextField,
    MenuItem, Select, FormControl, InputLabel, TablePagination,
    CircularProgress, IconButton, Tooltip
} from '@mui/material';
import { History, FilterList, Info, Person, Link as LinkIcon } from '@mui/icons-material';
import api from '../../api/client';
import toast from 'react-hot-toast';
import { formatDate } from '../../utils/helpers';

export default function AdminAuditTrail() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(25);
    const [totalLogs, setTotalLogs] = useState(0);
    const [filters, setFilters] = useState({
        entity_type: '',
    });

    const loadLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/audit', {
                params: {
                    skip: page * rowsPerPage,
                    limit: rowsPerPage,
                    entity_type: filters.entity_type || undefined
                }
            });
            setLogs(res.data);
            // Since our backend doesn't return total count currently, we estimate or handle visually
            setTotalLogs(res.data.length === rowsPerPage ? (page + 2) * rowsPerPage : (page + 1) * rowsPerPage);
        } catch {
            toast.error('Failed to load audit logs');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadLogs();
    }, [page, rowsPerPage, filters.entity_type]);

    const getActionColor = (action) => {
        switch (action) {
            case 'create': return 'success';
            case 'update': return 'info';
            case 'delete': return 'error';
            case 'status_change': return 'warning';
            default: return 'default';
        }
    };

    return (
        <Box className="fade-in">
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                        System <span className="gradient-text">Audit Trail</span>
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#94A3B8' }}>
                        Chronological record of all system events and user actions
                    </Typography>
                </Box>
                <History sx={{ fontSize: 48, color: '#6C63FF', opacity: 0.5 }} />
            </Box>

            <Card className="glass-card" sx={{ mb: 3 }}>
                <CardContent sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <FilterList sx={{ color: '#94A3B8' }} />
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Filter by Type</InputLabel>
                        <Select
                            value={filters.entity_type}
                            label="Filter by Type"
                            onChange={(e) => setFilters({ ...filters, entity_type: e.target.value })}
                        >
                            <MenuItem value="">All Entities</MenuItem>
                            <MenuItem value="case">Legal Cases</MenuItem>
                            <MenuItem value="agreement">Agreements</MenuItem>
                            <MenuItem value="document">Documents</MenuItem>
                            <MenuItem value="user">Users</MenuItem>
                        </Select>
                    </FormControl>
                </CardContent>
            </Card>

            <TableContainer component={Paper} className="glass-card" sx={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                {loading && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                        <CircularProgress size={40} sx={{ color: '#6C63FF' }} />
                    </Box>
                )}
                {!loading && (
                    <Table sx={{ minWidth: 650 }}>
                        <TableHead sx={{ bgcolor: 'rgba(255,255,255,0.02)' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700, color: '#94A3B8' }}>Timestamp</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#94A3B8' }}>User</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#94A3B8' }}>Action</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#94A3B8' }}>Entity</TableCell>
                                <TableCell sx={{ fontWeight: 700, color: '#94A3B8' }}>Details</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {logs.map((log) => (
                                <TableRow key={log.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell sx={{ color: '#E2E8F0' }}>{formatDate(log.created_at)}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Person sx={{ fontSize: 16, color: '#6C63FF' }} />
                                            <Typography variant="body2" sx={{ fontWeight: 600 }}>{log.performed_by}</Typography>
                                        </Box>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={log.action.replace('_', ' ').toUpperCase()}
                                            size="small"
                                            color={getActionColor(log.action)}
                                            variant="outlined"
                                            sx={{ fontWeight: 700, fontSize: '0.7rem' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Chip
                                                label={log.entity_type}
                                                size="small"
                                                sx={{ bgcolor: 'rgba(108, 99, 255, 0.1)', color: '#6C63FF', fontWeight: 600 }}
                                            />
                                            {log.entity_id && (
                                                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                                                    #{log.entity_id}
                                                </Typography>
                                            )}
                                        </Box>
                                    </TableCell>
                                    <TableCell sx={{ color: '#94A3B8', maxWidth: 300 }}>
                                        {(() => {
                                            if (!log.details) return '-';
                                            try {
                                                const details = JSON.parse(log.details);
                                                if (typeof details === 'object' && !Array.isArray(details)) {
                                                    const fieldMap = {
                                                        'assigned_officer_id': 'ASSIGNED OFFICER',
                                                        'supervisor_id': 'SUPERVISOR',
                                                        'created_by_id': 'CREATED BY',
                                                        'case_type': 'CASE TYPE',
                                                        'action': 'ACTION'
                                                    };
                                                    return Object.entries(details).map(([field, vals]) => {
                                                        const label = fieldMap[field] || field.replace(/_/g, ' ').toUpperCase();
                                                        return `${label}: ${vals.new}`;
                                                    }).join(', ');
                                                }
                                                return log.details;
                                            } catch {
                                                return log.details;
                                            }
                                        })()}
                                    </TableCell>
                                </TableRow>
                            ))}
                            {logs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 8 }}>
                                        <Typography variant="body1" sx={{ color: '#94A3B8' }}>No logs found</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                )}
                <TablePagination
                    rowsPerPageOptions={[25, 50, 100]}
                    component="div"
                    count={-1} // Handled dynamically or removed if not supported by backend count
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={(e, newPage) => setPage(newPage)}
                    onRowsPerPageChange={(e) => {
                        setRowsPerPage(parseInt(e.target.value, 10));
                        setPage(0);
                    }}
                    sx={{ color: '#94A3B8', borderTop: '1px solid rgba(255,255,255,0.05)' }}
                />
            </TableContainer>
        </Box>
    );
}
