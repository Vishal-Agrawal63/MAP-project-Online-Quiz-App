import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function HomePage() {
  const { currentUser } = useAuth();

  return (
    <div className="container">
      <h1>Welcome to QuizApp!</h1>
      <p>Test your knowledge and climb the leaderboard.</p>
      {currentUser ? (
         <Link to="/quizzes">
            <button className="primary">Browse Quizzes</button>
          </Link>
      ) : (
        <div>
          <Link to="/login">
            <button className="primary">Login</button>
          </Link>
          <Link to="/signup">
            <button>Sign Up</button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default HomePage;