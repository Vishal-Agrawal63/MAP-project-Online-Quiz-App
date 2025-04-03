// frontend/src/components/QuizCard.jsx

import React from 'react';
import { Link } from 'react-router-dom';

function QuizCard({ quiz }) {
  // Add a check in case quiz data is somehow incomplete
  if (!quiz || !quiz.quizId) {
      console.error("QuizCard received invalid quiz data:", quiz);
      return <div className="quiz-card error">Invalid Quiz Data</div>; // Or render nothing
  }

  return (
    <div className="quiz-card">
      <h3>{quiz.title}</h3>
      <p>{quiz.description}</p>
      <p>{quiz.questionCount ?? '?'} Questions</p>
      {/* --- CORRECTED LINE --- */}
      <Link to={`/quiz/${quiz.quizId}`}> {/* Use quiz.quizId */}
        <button className="primary">Start Quiz</button>
      </Link>
    </div>
  );
}

export default QuizCard;