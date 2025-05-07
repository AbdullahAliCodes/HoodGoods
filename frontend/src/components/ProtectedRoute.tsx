import React, { useEffect, useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[]; // e.g. ['buyer'], ['seller'], ['admin']
}

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, getAccessTokenSilently } = useAuth0();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      try {
        if (!isAuthenticated) {
          setLoading(false);
          return;
        }

        const token = await getAccessTokenSilently();
        const res = await fetch(`${backendUrl}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          setRole(data.role);
        } else {
          console.error("Failed to fetch role");
        }
      } catch (err) {
        console.error("Error fetching role:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [isAuthenticated, getAccessTokenSilently]);

  if (loading) return null; // Or add a loading spinner if you want

  // Not logged in or role doesn't match
  if (!isAuthenticated || (role && !allowedRoles.includes(role))) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;


