/* Layout wrapper with sidebar */
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import Sidebar from './Sidebar';

export default function Layout() {
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <Box component="main" sx={{ flex: 1, ml: '260px', p: 3, minHeight: '100vh', overflow: 'auto' }}>
                <Outlet />
            </Box>
        </Box>
    );
}
