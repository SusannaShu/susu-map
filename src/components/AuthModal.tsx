import { useState } from 'react';
import { useAppDispatch } from '../store/store';
import { login, registerUser } from '../store/authSlice';
import { useLazyGetGoogleAuthUrlQuery } from '../store/communityApi';
import './AuthModal.css';

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [identifier, setIdentifier] = useState(''); // username or email for login
  const [username, setUsername] = useState(''); // explicitly username for register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [getGoogleAuthUrl] = useLazyGetGoogleAuthUrlQuery();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch the dynamically generated auth URL from the backend custom-auth controller
      const { data, error } = await getGoogleAuthUrl();
      if (error || !data?.authUrl) {
        throw new Error('Failed to generate authentication URL');
      }
      // Redirect to the URL
      window.location.href = data.authUrl;
    } catch (err: any) {
      setError(err.message || 'Could not connect to Google');
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'login') {
      if (!identifier || !password) {
        setError('Please enter both username/email and password');
        return;
      }
    } else {
      if (!username || !email || !password) {
        setError('Please fill out all fields');
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'login') {
        await dispatch(login({ identifier, password })).unwrap();
      } else {
        await dispatch(registerUser({ username, email, password })).unwrap();
      }
      onClose(); // Close modal on success
    } catch (err: any) {
      setError(err || (mode === 'login' ? 'Invalid credentials' : 'Registration failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="authModalOverlay" onClick={onClose}>
      <div className="authModalContent" onClick={(e) => e.stopPropagation()}>
        <h2 className="authModalTitle">{mode === 'login' ? 'Sign in to your account' : 'Create an account'}</h2>

        <button className="googleBtn" onClick={handleGoogleLogin} type="button">
          <svg className="googleIcon" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>

        <div className="authDivider">{mode === 'login' ? 'Or sign in with email' : 'Or sign up with email'}</div>

        <form className="authForm" onSubmit={handleSubmit}>
          {mode === 'login' ? (
            <div className="inputGroup">
              <label>Username or Email <span>*</span></label>
              <input 
                type="text" 
                className="authInput"
                placeholder="Enter your username or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isLoading}
              />
            </div>
          ) : (
            <>
              <div className="inputGroup">
                <label>Username <span>*</span></label>
                <input 
                  type="text" 
                  className="authInput"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="inputGroup">
                <label>Email <span>*</span></label>
                <input 
                  type="email" 
                  className="authInput"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div className="inputGroup">
            <label>Password <span>*</span></label>
            <div className="passwordInputWrapper">
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="authInput"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button 
                type="button" 
                className="togglePasswordBtn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {showPassword ? (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {error && <div className="authError">{error}</div>}

          <button type="submit" className="submitBtn" disabled={isLoading}>
            {isLoading ? (mode === 'login' ? 'Signing in...' : 'Signing up...') : (mode === 'login' ? 'Sign in' : 'Sign up')}
          </button>
        </form>

        <div className="authFooter">
          {mode === 'login' ? (
            <>New here? <button type="button" onClick={() => { setMode('register'); setError(null); }}>Sign up with email</button></>
          ) : (
            <>Already have an account? <button type="button" onClick={() => { setMode('login'); setError(null); }}>Sign in</button></>
          )}
        </div>

        <button className="cancelBtn" onClick={onClose} type="button">
          Cancel
        </button>
      </div>
    </div>
  );
}
