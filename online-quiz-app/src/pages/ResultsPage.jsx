import React from 'react';
import { Link } from 'react-router-dom';

function ResultsPage({ score, totalQuestions, quizTitle, onRestart }) {
  const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

  return (
    <div className="container results-container">
      <h2>Quiz Completed: {quizTitle}</h2>
      <p className="results-score">
        Your Score: {score} out of {totalQuestions} ({percentage}%)
      </p>
      {/* Optional: Add detailed review here if answers/questions passed */}
      <button onClick={onRestart} className="primary">Play Another Quiz</button>
      <Link to="/leaderboard">
        <button>View Leaderboard</button>
      </Link>
    </div>
  );
}

export default ResultsPage;