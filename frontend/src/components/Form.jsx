import { useState } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "../constants";
import { IconAlert } from "../components/Icons"
import "../styles/Form.css"

function Form({ route, method }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const name = method === "login" ? "Sign In" : "Create Account";
    const buttonText = method === "login" ? "Log In" : "Register";
    const loadingText = method === "login" ? "Signing in…" : "Registering…";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await api.post(route, { username, password });
            if (method === "login") {
                localStorage.setItem(ACCESS_TOKEN, res.data.access);
                localStorage.setItem(REFRESH_TOKEN, res.data.refresh);
                navigate("/");
            } else {
                navigate("/login");
            }
        } catch (err) {
            setError(method === "login" ? "Invalid username or password." : "Registration failed. Try a different username.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-bg">
            <div className="login-card-wrap">
                <div className="login-card">
                    <div className="login-stripe" />
                    <div className="login-body">
                        <div className="login-logo-wrap">
                            <div className="login-logo-icon">
                                <svg width="32" height="32" viewBox="0 0 40 40" fill="none">
                                    <rect x="4"  y="4"  width="13" height="13" rx="2.5" fill="#2563eb" />
                                    <rect x="23" y="4"  width="13" height="13" rx="2.5" fill="#60a5fa" />
                                    <rect x="4"  y="23" width="13" height="13" rx="2.5" fill="#93c5fd" />
                                    <rect x="23" y="23" width="13" height="13" rx="2.5" fill="#2563eb" />
                                </svg>
                            </div>
                            <div className="login-app-name">TeachLoad</div>
                            <div className="login-school">SCHOOL NAME</div>
                        </div>

                        <div className="login-heading">
                            <h2>{name}</h2>
                            <p>Teacher Loading &amp; Assignment System</p>
                        </div>

                        {error !== "" && (
                            <div className="login-error">
                                <IconAlert />
                                <p>{error}</p>
                            </div>
                        )}

                        <form className="login-form" onSubmit={handleSubmit}>
                            <div className="field">
                                <label className="field-label">Username</label>
                                <input
                                    className="input"
                                    type="text"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                            </div>
                            <div className="field">
                                <label className="field-label">Password</label>
                                <input
                                    className="input"
                                    type="password"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <button className="login-submit" type="submit" disabled={loading}>
                                {loading ? loadingText : buttonText}
                            </button>
                        </form>
                    </div>
                </div>
                <p className="login-footer">Department of Education · Authorized Users Only</p>
            </div>
        </div>
    );
}

export default Form;