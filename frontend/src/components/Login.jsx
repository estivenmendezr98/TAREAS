import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './Login.css'; // We'll assume basic styles or reuse index.css

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Quick frontend check before API call
        if (!username || !password) {
            setError('Por favor, ingrese usuario y contraseña');
            return;
        }

        const result = await login(username, password);
        if (!result.success) {
            setError(result.message || 'Error al iniciar sesión');
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2>Iniciar Sesión</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Usuario:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Ingrese su usuario"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Contraseña:</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Ingrese su contraseña"
                        />
                    </div>
                    {error && <div className="error-message">{error}</div>}
                    <button type="submit" className="login-button">Ingresar</button>
                </form>
            </div>
        </div>
    );
};

export default Login;
