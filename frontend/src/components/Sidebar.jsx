/* Sidebar navigation component */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Avatar, Divider, Chip } from '@mui/material';
import { Dashboard, Gavel, Description, Search, People, Logout, Security, SmartToy, LockReset } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import NotificationCenter from './NotificationCenter';

/* Full menu for most roles */
const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Legal Cases', icon: <Gavel />, path: '/cases' },
    { text: 'Agreements', icon: <Description />, path: '/agreements' },
    { text: 'AI Search', icon: <Search />, path: '/search' },
    { text: 'Ask Legal AI', icon: <SmartToy />, path: '/ai/chat' },
];

/* Manager/Reviewer role: dashboard + agreements only */
const managerItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/' },
    { text: 'Agreements', icon: <Description />, path: '/agreements' },
];

const adminItems = [
    { text: 'User Management', icon: <People />, path: '/admin/users' },
];

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();

    const handleLogout = () => { logout(); navigate('/login'); };

    const roleColors = {
        admin: '#FF6B6B', supervisor: '#FFB347', legal_officer: '#6C63FF',
        reviewer: '#00D9A6', manager: '#E879F9'
    };

    /* Pick which nav items to show based on role */
    const navItems = (user?.role === 'manager' || user?.role === 'reviewer')
        ? managerItems
        : menuItems;

    return (
        <Box sx={{
            width: 260, background: 'linear-gradient(180deg, #0F1629 0%, #111827 100%)',
            borderRight: '1px solid rgba(108, 99, 255, 0.15)', display: 'flex', flexDirection: 'column',
            height: '100vh', position: 'fixed', left: 0, top: 0, zIndex: 10,
        }}>
            {/* Logo */}
            <Box sx={{ p: 3, textAlign: 'center', position: 'relative' }}>
                <Box sx={{ position: 'absolute', right: 8, top: 12 }}>
                    <NotificationCenter />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'center' }}>
                    <Security sx={{ fontSize: 32, color: '#6C63FF' }} />
                    <Box>
                        <Typography variant="h6" sx={{
                            fontWeight: 800, background: 'linear-gradient(135deg, #6C63FF, #00D9A6)',
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1.2
                        }}>
                            MobiLex
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94A3B8', fontSize: '0.65rem' }}>Legal Management</Typography>
                    </Box>
                </Box>
            </Box>

            <Divider sx={{ borderColor: 'rgba(108, 99, 255, 0.15)' }} />

            {/* Navigation */}
            <List sx={{ px: 1.5, flex: 1, mt: 1 }}>
                {navItems.map((item) => (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                        <ListItemButton onClick={() => navigate(item.path)} sx={{
                            borderRadius: 2, py: 1.2,
                            backgroundColor: location.pathname === item.path ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                            '&:hover': { backgroundColor: 'rgba(108, 99, 255, 0.1)' },
                            transition: 'all 0.2s ease',
                        }}>
                            <ListItemIcon sx={{ color: location.pathname === item.path ? '#6C63FF' : '#94A3B8', minWidth: 40 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText primary={item.text} primaryTypographyProps={{
                                fontSize: '0.875rem', fontWeight: location.pathname === item.path ? 600 : 400,
                                color: location.pathname === item.path ? '#F1F5F9' : '#94A3B8',
                            }} />
                        </ListItemButton>
                    </ListItem>
                ))}

                {user?.role === 'admin' && (
                    <>
                        <Divider sx={{ borderColor: 'rgba(108, 99, 255, 0.15)', my: 1.5 }} />
                        <Typography variant="overline" sx={{ px: 2, color: '#64748B', fontSize: '0.65rem' }}>Admin</Typography>
                        {adminItems.map((item) => (
                            <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
                                <ListItemButton onClick={() => navigate(item.path)} sx={{
                                    borderRadius: 2, py: 1.2,
                                    backgroundColor: location.pathname === item.path ? 'rgba(108, 99, 255, 0.15)' : 'transparent',
                                    '&:hover': { backgroundColor: 'rgba(108, 99, 255, 0.1)' },
                                }}>
                                    <ListItemIcon sx={{ color: location.pathname === item.path ? '#6C63FF' : '#94A3B8', minWidth: 40 }}>
                                        {item.icon}
                                    </ListItemIcon>
                                    <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.875rem' }} />
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </>
                )}
            </List>

            {/* User info */}
            <Box sx={{ p: 2, borderTop: '1px solid rgba(108, 99, 255, 0.15)' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                    <Avatar sx={{ width: 36, height: 36, bgcolor: roleColors[user?.role] || '#6C63FF', fontSize: '0.85rem' }}>
                        {user?.full_name?.charAt(0) || 'U'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }} noWrap>{user?.full_name}</Typography>
                        <Chip label={user?.role?.replace('_', ' ')} size="small" sx={{
                            height: 18, fontSize: '0.6rem', bgcolor: `${roleColors[user?.role] || '#6C63FF'}22`,
                            color: roleColors[user?.role] || '#6C63FF', fontWeight: 600,
                        }} />
                    </Box>
                </Box>
                <ListItemButton onClick={() => navigate('/change-password')} sx={{ borderRadius: 2, py: 0.8, mb: 0.5 }}>
                    <LockReset sx={{ fontSize: 18, mr: 1, color: '#94A3B8' }} />
                    <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 500, fontSize: '0.8rem' }}>Change Password</Typography>
                </ListItemButton>
                <ListItemButton onClick={handleLogout} sx={{ borderRadius: 2, py: 0.8, justifyContent: 'center' }}>
                    <Logout sx={{ fontSize: 18, mr: 1, color: '#FF6B6B' }} />
                    <Typography variant="body2" sx={{ color: '#FF6B6B', fontWeight: 500, fontSize: '0.8rem' }}>Sign Out</Typography>
                </ListItemButton>
            </Box>
        </Box>
    );
}
