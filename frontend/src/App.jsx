/* Main App with routing */
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CaseList from './pages/cases/CaseList';
import CaseCreate from './pages/cases/CaseCreate';
import CaseDetail from './pages/cases/CaseDetail';
import CaseEdit from './pages/cases/CaseEdit';
import AgreementList from './pages/agreements/AgreementList';
import AgreementCreate from './pages/agreements/AgreementCreate';
import AgreementEdit from './pages/agreements/AgreementEdit';
import AgreementDetail from './pages/agreements/AgreementDetail';
import SemanticSearch from './pages/search/SemanticSearch';
import AskLegal from './pages/ai/AskLegal';
import UserManagement from './pages/admin/UserManagement';
import AdminAuditTrail from './pages/admin/AdminAuditTrail';
import ChangePassword from './pages/ChangePassword';

/* Redirect for unauthenticated users */
function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return null;
    return user ? children : <Navigate to="/login" />;
}

/* Block manager and reviewer roles from restricted pages */
function BlockManagerRoute({ children }) {
    const { user } = useAuth();
    if (user?.role === 'manager' || user?.role === 'reviewer') return <Navigate to="/" replace />;
    return children;
}

/* Default landing page */
function DefaultPage() {
    return <Dashboard />;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<DefaultPage />} />
                <Route path="cases" element={<BlockManagerRoute><CaseList /></BlockManagerRoute>} />
                <Route path="cases/new" element={<BlockManagerRoute><CaseCreate /></BlockManagerRoute>} />
                <Route path="cases/:id" element={<BlockManagerRoute><CaseDetail /></BlockManagerRoute>} />
                <Route path="cases/:id/edit" element={<BlockManagerRoute><CaseEdit /></BlockManagerRoute>} />
                <Route path="agreements" element={<AgreementList />} />
                <Route path="agreements/new" element={<AgreementCreate />} />
                <Route path="agreements/:id" element={<AgreementDetail />} />
                <Route path="agreements/:id/edit" element={<AgreementEdit />} />
                <Route path="search" element={<BlockManagerRoute><SemanticSearch /></BlockManagerRoute>} />
                <Route path="ai/chat" element={<BlockManagerRoute><AskLegal /></BlockManagerRoute>} />
                <Route path="admin/users" element={<BlockManagerRoute><UserManagement /></BlockManagerRoute>} />
                <Route path="admin/audit" element={<BlockManagerRoute><AdminAuditTrail /></BlockManagerRoute>} />
                <Route path="change-password" element={<ChangePassword />} />
            </Route>
        </Routes>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}
