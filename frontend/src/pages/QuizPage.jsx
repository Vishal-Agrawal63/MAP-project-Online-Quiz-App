import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Question from '../components/Question';
import LoadingSpinner from '../components/LoadingSpinner';
import ResultsPage from './ResultsPage';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL = '/api'; // Adjust if needed

function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [totalQuestions, setTotalQuestions] = useState(0);

  useEffect(() => {
    const fetchQuiz = async () => {
      setLoading(true);
      setError(null);
      setQuizData(null);
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setQuizCompleted(false);
      setScore(0);
      setTotalQuestions(0);

      try {
        const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setQuizData(data);
        setTotalQuestions(data.questions.length);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleAnswerSelect = (questionId, answer) => {
    if (quizCompleted || confirmed) return;
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleConfirmAnswer = async () => {
    setConfirmed(true);

    const currentQuestion = quizData.questions[currentQuestionIndex];
    const selectedAnswer = userAnswers[currentQuestion.questionId];
    const correctAnswer = currentQuestion.correctAnswer; // Get the correct answer
    console.log('Sending to /api/explanation:', {
        question: currentQuestion.text,
        answer: correctAnswer // Use 'answer' as the key
    }); // Add logging

    try {
      const response = await fetch(`${API_BASE_URL}/explanation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // --- MODIFIED LINE ---
        body: JSON.stringify({
          question: currentQuestion.text,
          answer: correctAnswer, // Send the correct answer under the key 'answer'
          // You can remove selectedAnswer unless your backend needs it for something else
        }),
        // --- END MODIFIED LINE ---
      });

      if (!response.ok) {
        const errorResponse = await response.text(); // Read response text for detailed errors
        console.error('Explanation fetch failed response:', errorResponse); // Log the actual error body
        throw new Error(`Failed to fetch explanation: ${response.status} - ${errorResponse}`);
      }

      const data = await response.json();

      // --- Adjusted Explanation Message Logic (Optional but Recommended) ---
      // The explanation from the AI focuses on why the CORRECT answer is right.
      // Adapt the display logic accordingly.

      setExplanation(data.explanation); // Store just the AI's explanation

    } catch (err) {
      console.error('Error fetching explanation:', err);
      // Provide a clearer user message if explanation fails
      setExplanation('Sorry, could not retrieve an explanation at this time.');
    }
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setConfirmed(false);
      setExplanation('');
    } else {
      handleSubmitQuiz();
    }
  };

  const handleSubmitQuiz = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAnswers,
          userId: currentUser?.id,
        }),
      });

      const resultData = await response.json();
      if (!response.ok) {
        throw new Error(resultData.message || `HTTP error! status: ${response.status}`);
      }

      setScore(resultData.score);
      setQuizCompleted(true);
    } catch (err) {
      setError(`Failed to submit quiz results: ${err.message}`);
      setQuizCompleted(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !quizCompleted) return <LoadingSpinner />;
  if (error && !quizCompleted) {
    return (
      <div className="container">
        <p className="form-error">Error: {error}</p>
        <button onClick={() => navigate('/quizzes')}>Back to Quizzes</button>
      </div>
    );
  }

  if (quizCompleted) {
    if (error) {
      return (
        <div className="container">
          <h2>Error Submitting Results</h2>
          <p className="form-error">{error}</p>
          <button onClick={() => navigate('/quizzes')} className="primary">Back to Quizzes</button>
        </div>
      );
    }

    return (
      <ResultsPage
        score={score}
        totalQuestions={totalQuestions}
        quizTitle={quizData?.title || 'Quiz'}
        onRestart={() => navigate('/quizzes')}
      />
    );
  }

  if (!quizData) return <div className="container"><p>Loading quiz data...</p></div>;

  const currentQuestion = quizData.questions[currentQuestionIndex];
  const isAnswerSelected = !!userAnswers[currentQuestion.questionId];

  return (
    <div className="container">
      <h2>{quizData.title}</h2>
      <p>Question {currentQuestionIndex + 1} of {quizData.questions.length}</p>

      <Question
        question={currentQuestion}
        selectedAnswer={userAnswers[currentQuestion.questionId]}
        onAnswerSelect={(answer) => handleAnswerSelect(currentQuestion.questionId, answer)}
        disabled={confirmed}
        showResult={confirmed}
        explanation={explanation}
      />

      {isAnswerSelected && !confirmed && (
        <button onClick={handleConfirmAnswer} className="primary">
          Confirm Answer
        </button>
      )}

      {confirmed && (
        <button onClick={handleNextQuestion} className="primary">
          {currentQuestionIndex < quizData.questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
        </button>
      )}
    </div>
  );
}

export default QuizPage;
