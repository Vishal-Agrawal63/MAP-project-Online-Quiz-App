import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login'); // Redirect to login after logout
  };

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">QuizApp</Link>
      <nav>
        {currentUser ? (
          <>
            <Link to="/quizzes">Quizzes</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            <div className="user-info">
              <span>Hi, {currentUser.username}!</span>
              <button onClick={handleLogout}>Logout</button>
            </div>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/signup">Sign Up</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export default Navbar;