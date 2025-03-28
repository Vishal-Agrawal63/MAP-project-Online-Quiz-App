import React, { useState, useEffect } from 'react';
import QuizCard from '../components/QuizCard';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = 'http://localhost:3001/api'; // Backend URL

function QuizSelectionPage() {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchQuizzes = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/quizzes`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setQuizzes(data);
      } catch (err) {
         console.error("Error loading quizzes:", err);
         setError(err.message || 'Failed to load quizzes.');
      } finally {
         setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <div className="container"><p className="form-error">{error}</p></div>;
  }

  return (
    <div className="container">
      <h2>Available Quizzes</h2>
      {quizzes.length > 0 ? (
        quizzes.map(quiz => <QuizCard key={quiz.id} quiz={quiz} />)
      ) : (
        <p>No quizzes available at the moment.</p>
      )}
    </div>
  );
}

export default QuizSelectionPage;