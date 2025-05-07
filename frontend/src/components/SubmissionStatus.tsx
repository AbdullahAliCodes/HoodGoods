import React from 'react';

interface SubmissionStatusProps {
    error: string | null;
    success: string | null;
}

const SubmissionStatus: React.FC<SubmissionStatusProps> = ({ error, success }) => {
    if (!error && !success) return null;

    return (
        <>
            {error && <output className="error-message">{error}</output>}
            {success && <output className="success-message">{success}</output>}
        </>
    );
};

export default SubmissionStatus;