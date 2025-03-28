import React, { useState } from 'react';

function AuthForm({ formType, onSubmit, loading, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(username, password);
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      <h2>{formType === 'login' ? 'Login' : 'Sign Up'}</h2>
      {error && <p className="form-error">{error}</p>}
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        disabled={loading}
      />
      <button type="submit" className="primary" disabled={loading}>
        {loading ? 'Processing...' : (formType === 'login' ? 'Login' : 'Sign Up')}
      </button>
    </form>
  );
}

export default AuthForm;