import React, { useState, useEffect } from 'react';
import {
    Badge, IconButton, Menu, MenuItem, List, ListItem,
    ListItemText, Typography, Box, Divider, Button,
    CircularProgress
} from '@mui/material';
import { Notifications as NotificationsIcon, NotificationsActive } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import toast from 'react-hot-toast';

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [anchorEl, setAnchorEl] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const open = Boolean(anchorEl);

    const loadNotifications = async () => {
        setLoading(true);
        try {
            const res = await api.get('/notifications');
            setNotifications(res.data);
            const countRes = await api.get('/notifications/unread-count');
            setUnreadCount(countRes.data.count);
        } catch (err) {
            console.error('Failed to load notifications');
        }
        setLoading(false);
    };

    useEffect(() => {
        loadNotifications();
        // Poll every 30 seconds
        const timer = setInterval(loadNotifications, 30000);
        return () => clearInterval(timer);
    }, []);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMarkAllRead = async () => {
        try {
            await api.put('/notifications/mark-all-read');
            loadNotifications();
            toast.success('All marked as read');
        } catch (err) {
            toast.error('Failed to mark as read');
        }
    };

    const handleNotificationClick = async (n) => {
        if (!n.is_read) {
            await api.put(`/notifications/${n.id}/read`);
        }
        handleClose();
        if (n.entity_type === 'case') {
            navigate(`/cases/${n.entity_id}`);
        } else if (n.entity_type === 'agreement') {
            navigate(`/agreements/${n.entity_id}`);
        }
        loadNotifications();
    };

    return (
        <Box>
            <IconButton color="inherit" onClick={handleClick}>
                <Badge badgeContent={unreadCount} color="error">
                    {unreadCount > 0 ? <NotificationsActive sx={{ color: '#6C63FF' }} /> : <NotificationsIcon sx={{ color: '#94A3B8' }} />}
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    sx: { width: 320, maxHeight: 400, bgcolor: '#111827', color: '#F1F5F9', border: '1px solid rgba(108, 99, 255, 0.2)' }
                }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Notifications</Typography>
                    {unreadCount > 0 && (
                        <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: '0.7rem' }}>Mark all read</Button>
                    )}
                </Box>
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                {loading && notifications.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={24} /></Box>
                ) : notifications.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" sx={{ color: '#94A3B8' }}>No notifications</Typography>
                    </Box>
                ) : (
                    <List sx={{ p: 0 }}>
                        {notifications.map((n) => (
                            <MenuItem
                                key={n.id}
                                onClick={() => handleNotificationClick(n)}
                                sx={{
                                    whiteSpace: 'normal',
                                    bgcolor: n.is_read ? 'transparent' : 'rgba(108, 99, 255, 0.05)',
                                    borderLeft: n.is_read ? 'none' : '3px solid #6C63FF',
                                    py: 1.5
                                }}
                            >
                                <ListItemText
                                    primary={n.message}
                                    secondary={new Date(n.created_at).toLocaleString()}
                                    primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: n.is_read ? 400 : 600, color: '#F8FAFC' }}
                                    secondaryTypographyProps={{ fontSize: '0.7rem', color: '#94A3B8' }}
                                />
                            </MenuItem>
                        ))}
                    </List>
                )}
            </Menu>
        </Box>
    );
}
