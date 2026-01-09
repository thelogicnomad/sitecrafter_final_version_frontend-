import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, UserPlus, Loader2 } from 'lucide-react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { BACKEND_URL } from '../config';
import LoadingOverlay from '../components/LoadingOverlay';
import { GoogleLogo } from '../components/googllogo';
import { useAuth } from '../components/context/AuthContext';

const Register = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showColdStartMessage, setShowColdStartMessage] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
  });

  // Check if Google auth was in progress when page loads
  useEffect(() => {
    const googleAuthInProgress = localStorage.getItem('googleAuthInProgress');
    if (googleAuthInProgress === 'true') {
      // Clear the flag
      localStorage.removeItem('googleAuthInProgress');

      // Show a toast message
      toast.info('Google authentication was interrupted. Please try again.', {
        autoClose: 5000
      });
    }
  }, []);

  const handleRegister = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setShowColdStartMessage(true);

    try {
      const response = await axios.post(
        `${BACKEND_URL}/auth/signup`,
        formData,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.status === 201) {
        const { token, user } = response.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        await login(user, token); // Ensure this is awaited
        toast.success('Registered Successfully!', { autoClose: 2000 });

        setTimeout(() => {
          navigate('/agent', { replace: true });
        }, 500);
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || 'Registration failed. Please try again.'
      );
    } finally {
      setLoading(false);
      setShowColdStartMessage(false);
    }
  }, [formData, login, navigate]);

  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setShowColdStartMessage(true);

    // Store a flag in localStorage to indicate Google auth is in progress
    localStorage.setItem('googleAuthInProgress', 'true');

    // Redirect to Google auth endpoint
    window.location.href = `${BACKEND_URL}/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex justify-center items-center p-4 sm:p-6">
      <ToastContainer position="top-right" />
      {showColdStartMessage && (
        <LoadingOverlay message={googleLoading ? "Connecting to Google..." : "Creating your account..."} />
      )}
      <div className="flex flex-col-reverse md:flex-row w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="hidden md:block w-1/2 bg-gradient-to-br from-gray-900 to-gray-800 p-12">
          <div className="h-full flex flex-col justify-center">
            <h2 className="text-4xl font-bold text-white mb-6">Welcome Back!</h2>
            <p className="text-gray-300 mb-8">Already have an account? Sign in to continue your journey</p>
            <Link to="/login" className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white hover:text-gray-900 transition-colors duration-200">
              Sign in
            </Link>
          </div>
        </div>

        <div className="w-full md:w-1/2 p-6 sm:p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
              <p className="mt-2 text-gray-600">Join us and start creating</p>
            </div>

            <div className="flex flex-col space-y-4">
              <div className="flex justify-center">
                <button
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                  className="flex items-center justify-center w-full sm:w-auto px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  {googleLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <GoogleLogo />
                  )}
                  <span className="ml-2 text-sm font-medium text-gray-700">
                    {googleLoading ? 'Connecting...' : 'Sign up with Google'}
                  </span>
                </button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or sign up with</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </div>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4" />
                      <span>Username</span>
                    </div>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
                    placeholder="Choose a username"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4" />
                      <span>Password</span>
                    </div>
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all duration-200"
                    placeholder="Create a password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition-colors duration-200 disabled:bg-gray-500"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                <span>{loading ? 'Creating account...' : 'Create account'}</span>
              </button>
            </form>

            <div className="text-center md:hidden">
              <p className="text-gray-600">Already have an account?</p>
              <Link
                to="/login"
                className="mt-2 inline-block text-yellow-500 hover:text-yellow-600 font-semibold"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;