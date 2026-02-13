import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check if token exists on load
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    // Wrap in useCallback to ensure stability
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
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }, []);

    // Update Axios header whenever token changes
    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    // Axios interceptor to handle 401/403 responses (token expired/invalid)
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    // Only logout if we are currently authenticated to avoid loops
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
        <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
