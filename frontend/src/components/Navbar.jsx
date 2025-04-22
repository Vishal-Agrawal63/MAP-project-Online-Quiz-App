// frontend/src/components/Navbar.jsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Example: Check if user is an admin (you'd need to implement this logic)
  // const isAdmin = currentUser && currentUser.role === 'admin'; // Assuming role exists

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">QuizApp</Link>
      <nav>
        {currentUser ? (
          <>
            <Link to="/quizzes">Quizzes</Link>
            <Link to="/leaderboard">Leaderboard</Link>
            {/* Add the link here */}
            <Link to="/ai-accuracy">AI Accuracy</Link>
            {/* Example: Conditional link for admin */}
            {/* {isAdmin && <Link to="/ai-accuracy">AI Accuracy</Link>} */}
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