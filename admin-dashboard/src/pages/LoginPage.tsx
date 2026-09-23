import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@context/AuthContext';
import { Button } from '@components/Button';
import { Card, CardBody } from '@components/Card';
import { Mail, Lock, BarChart3 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary-dark flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BarChart3 size={40} className="text-white" />
            <div>
              <h1 className="text-3xl font-bold text-white">HySafe</h1>
              <p className="text-primary-light">Admin Dashboard</p>
            </div>
          </div>
          <p className="text-primary-light">
            Sign in to your admin account
          </p>
        </div>

        {/* Login Form */}
        <Card>
          <CardBody className="space-y-6">
            {error && (
              <div className="bg-danger/10 border border-danger text-danger px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-3 text-text-secondary"
                    size={20}
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0123456789"
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-3 text-text-secondary"
                    size={20}
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                isLoading={isLoading}
                fullWidth
                className="mt-6"
              >
                Sign In
              </Button>
            </form>

            <p className="text-center text-sm text-text-secondary">
              Use admin credentials to access the dashboard
            </p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
