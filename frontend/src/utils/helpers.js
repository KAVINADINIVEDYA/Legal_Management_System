/* Utility helpers */
export const getStatusColor = (status) => {
    const colors = {
        NEW: '#4FC3F7', DRAFT: '#4FC3F7',
        ACTIVE: '#66BB6A', SIGNED: '#66BB6A', APPROVED: '#66BB6A',
        IN_PROGRESS: '#FFB347', UNDER_REVIEW: '#FFB347', SUBMITTED: '#FFB347', PENDING_REVIEW: '#FFB347', ON_HOLD: '#FFB347',
        RESOLVED: '#AB47BC', EXPIRED: '#AB47BC',
        CLOSED: '#78909C', ARCHIVED: '#78909C',
        REJECTED: '#FF6B6B', REVISION: '#FF6B6B', REVISION_REQUIRED: '#FF6B6B',
    };
    return colors[status] || '#94A3B8';
};

export const getRiskColor = (score) => {
    if (score >= 80) return '#F44336';
    if (score >= 60) return '#FF6B6B';
    if (score >= 40) return '#FFB347';
    if (score >= 20) return '#66BB6A';
    return '#4FC3F7';
};

export const getRiskLabel = (score) => {
    if (score >= 80) return 'Critical';
    if (score >= 60) return 'High';
    if (score >= 40) return 'Medium';
    if (score >= 20) return 'Low';
    return 'Minimal';
};

export const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
};

export const truncate = (str, len = 100) => {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
};
