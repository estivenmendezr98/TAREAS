import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    // Impersonation state: holds { token, user } of the real admin while viewing as another user
    const [impersonating, setImpersonating] = useState(() => {
        const saved = localStorage.getItem('impersonating');
        return saved ? JSON.parse(saved) : null;
    });

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (username, password) => {
        try {
            const response = await axios.post('http://localhost:3000/api/login', { username, password });
            if (response.data.success) {
                const { token, user } = response.data;
                setToken(token);
                setUser(user);
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
                return { success: true };
            }
            return { success: false, message: response.data.message };
        } catch (error) {
            console.error("Login error:", error);
            return { success: false, message: error.response?.data?.message || 'Error de conexión' };
        }
    }, []);

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        setImpersonating(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('impersonating');
    }, []);

    // Impersonate: admin clicks "Ver como" on a user
    const impersonate = useCallback(async (targetUserId) => {
        try {
            const response = await axios.post(
                `http://localhost:3000/api/admin/impersonate/${targetUserId}`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            const { token: newToken, user: targetUser } = response.data;

            // Save admin's current session to restore later
            const adminSession = { token, user };
            setImpersonating(adminSession);
            localStorage.setItem('impersonating', JSON.stringify(adminSession));

            // Activate target user's token
            setToken(newToken);
            setUser(targetUser);
            localStorage.setItem('token', newToken);
            localStorage.setItem('user', JSON.stringify(targetUser));

            return { success: true };
        } catch (error) {
            console.error('Impersonation error:', error);
            return { success: false };
        }
    }, [token, user]);

    // Stop impersonating: restore admin session
    const stopImpersonating = useCallback(() => {
        if (!impersonating) return;
        const { token: adminToken, user: adminUser } = impersonating;
        setToken(adminToken);
        setUser(adminUser);
        localStorage.setItem('token', adminToken);
        localStorage.setItem('user', JSON.stringify(adminUser));
        setImpersonating(null);
        localStorage.removeItem('impersonating');
    }, [impersonating]);

    // Update Axios header whenever token changes
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // Axios interceptor for expired tokens
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    if (token) {
                        console.warn('Session expired or invalid. Logging out.');
                        logout();
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => axios.interceptors.response.eject(interceptor);
    }, [logout, token]);

    return (
        <AuthContext.Provider value={{
            user, token, login, logout,
            isAuthenticated: !!token,
            loading,
            impersonating,
            impersonate,
            stopImpersonating,
        }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
