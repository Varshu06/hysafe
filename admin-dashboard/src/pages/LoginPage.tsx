import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { Eye, EyeOff, Lock } from 'lucide-react';
import logo from '../../../src/assets/logo1.png';
import loginImage from '../../../src/assets/loginimage.png';
import './LoginPage.css';

export const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const contentRef = useRef<HTMLElement>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(phone, password);
      navigate('/');
    } catch (err: any) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        'Login failed. Please check your credentials and try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (!contentRef.current?.contains(e.target as Node)) {
      contentRef.current?.scrollBy({ top: e.deltaY });
    }
  };

  return (
    <main className="admin-login-page" onWheel={handlePageWheel}>
      <div className="admin-login-hero" aria-hidden="true">
        <img className="admin-login-hero-image" src={loginImage} alt="" />
        <div className="admin-login-hero-overlay" />
      </div>

      <section ref={contentRef} className="admin-login-content" aria-labelledby="login-title">
        <div className="admin-login-brand">
          <img className="admin-login-logo" src={logo} alt="HySafe logo" />
          <div className="admin-login-brand-copy">
            <h1 id="login-title">HySafe</h1>
            <p>Admin Dashboard</p>
          </div>
        </div>
        <p className="admin-login-subtitle">Sign in to your admin account</p>

        <div className="admin-login-divider" aria-hidden="true">
          <span />
          <p>Administrator sign in</p>
          <span />
        </div>

        <div className="admin-login-form-wrap">
          {error && (
            <div className="admin-login-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="admin-login-form">
            <div className="admin-login-field">
              <label htmlFor="admin-phone">Phone Number</label>
              <div className="admin-login-phone-input">
                <span className="admin-login-country" aria-label="India, country code plus 91">
                  <span aria-hidden="true">🇮🇳</span>
                  <span>+91</span>
                </span>
                <input
                  id="admin-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  autoComplete="tel-national"
                  required
                />
              </div>
            </div>

            <div className="admin-login-field">
              <label htmlFor="admin-password">Password</label>
              <div className="admin-login-password-input">
                <Lock size={19} aria-hidden="true" />
                <input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  className="admin-login-password-toggle"
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              className="admin-login-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="admin-login-note">Use administrator credentials to access the dashboard</p>
        </div>
      </section>
    </main>
  );
};
