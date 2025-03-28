import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';

function SignUpPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (username, password) => {
    setError('');
    setLoading(true);
    try {
        // Add basic password validation if desired
        if (password.length < 6) {
            throw new Error("Password must be at least 6 characters long");
        }
      await signup(username, password);
      navigate('/quizzes'); // Redirect to quizzes after mock signup
    } catch (err) {
      setError(err.message || 'Failed to sign up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <AuthForm
        formType="signup"
        onSubmit={handleSignup}
        loading={loading}
        error={error}
      />
       <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  );
}

export default SignUpPage;