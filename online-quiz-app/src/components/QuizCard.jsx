import React from 'react';
import { Link } from 'react-router-dom';

function QuizCard({ quiz }) {
  return (
    <div className="quiz-card">
      <h3>{quiz.title}</h3>
      <p>{quiz.description}</p>
      <p>{quiz.questionCount} Questions</p>
      <Link to={`/quiz/${quiz.id}`}>
        <button className="primary">Start Quiz</button>
      </Link>
    </div>
  );
}

export default QuizCard;