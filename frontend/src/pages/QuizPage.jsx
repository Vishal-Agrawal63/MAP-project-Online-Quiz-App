import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Question from '../components/Question';
import LoadingSpinner from '../components/LoadingSpinner';
import ResultsPage from './ResultsPage'; // We'll render results directly for simplicity here
import { useAuth } from '../context/AuthContext'; // Import useAuth to get userId

const API_BASE_URL = '/api'; // Use a relative path

function QuizPage() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth(); // Get current user for submission
  const [quizData, setQuizData] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { questionId: answer }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0); // Store total questions

  useEffect(() => {
    const fetchQuiz = async () => {
        setLoading(true);
        setError(null);
        setQuizData(null); // Clear previous data
        // Reset states for new quiz attempt
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
            setTotalQuestions(data.questions.length); // Store total questions from fetched data
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    fetchQuiz();
  }, [quizId]); // Re-run effect if quizId changes

  const handleAnswerSelect = (questionId, answer) => {
      if (quizCompleted) return; // Don't allow changes after completion
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quizData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // If it's the last question, submit automatically or show submit button
      handleSubmitQuiz();
    }
  };

  // Updated handleSubmitQuiz to call backend
  const handleSubmitQuiz = async () => {
    setLoading(true); // Show loading indicator during submission
    setError(null);

    try {
        const response = await fetch(`${API_BASE_URL}/quizzes/${quizId}/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userAnswers: userAnswers,
                userId: currentUser?.id // Send userId if available
            }),
        });

        const resultData = await response.json();

        if (!response.ok) {
            throw new Error(resultData.message || `HTTP error! status: ${response.status}`);
        }

        // Use score and total from backend response
        setScore(resultData.score);
        // Total questions could also come from resultData.totalQuestions if backend calculates it reliably
        // setTotalQuestions(resultData.totalQuestions);
        setQuizCompleted(true);

        console.log("Quiz submission response:", resultData);

    } catch (err) {
         console.error("Error submitting quiz:", err);
         // Show error to user, maybe allow retry?
         setError(`Failed to submit quiz results: ${err.message}`);
         // Optionally: Don't set quizCompleted=true on error, allow retry?
         // For simplicity now, we still proceed to show results page (potentially with score 0) if submission fails hard
         setQuizCompleted(true); // Or handle error state more gracefully
    } finally {
        setLoading(false); // Hide loading indicator
    }
  };

  if (loading && !quizCompleted) return <LoadingSpinner />; // Show spinner only when initially loading or submitting
  
    // Display error if one occurred (and not completed)
  if (error && !quizCompleted) {
    return <div className="container"><p className="form-error">Error: {error}</p><button onClick={() => navigate('/quizzes')}>Back to Quizzes</button></div>;
  }
  
  // Display results if completed
  if (quizCompleted) {
    // If submission failed but we proceeded, show error within results
    if (error) {
         return (
             <div className="container">
                 <h2>Error Submitting Results</h2>
                 <p className="form-error">{error}</p>
                 <button onClick={() => navigate('/quizzes')} className="primary">Back to Quizzes</button>
             </div>
         );
    }
    // Otherwise, show normal results
    return (
        <ResultsPage
            score={score}
            totalQuestions={totalQuestions} // Use state variable
            quizTitle={quizData?.title || 'Quiz'} // Use optional chaining
            onRestart={() => navigate('/quizzes')}
        />
    );
  }

  // If still loading quiz data but haven't submitted (edge case after error?)
  if (!quizData) return <div className="container"><p>Loading quiz data...</p></div>;

  // Render current question
  const currentQuestion = quizData.questions[currentQuestionIndex];
  return (
    <div className="container">
      <h2>{quizData.title}</h2>
      <p>Question {currentQuestionIndex + 1} of {quizData.questions.length}</p>
      <Question
        question={currentQuestion}
        selectedAnswer={userAnswers[currentQuestion.id]}
        onAnswerSelect={(answer) => handleAnswerSelect(currentQuestion.id, answer)}
        showResult={false}
      />
      <button
        onClick={handleNextQuestion}
        disabled={!userAnswers[currentQuestion.id] || (loading && quizCompleted) } // Disable while submitting too
        className="primary"
      >
        {loading && quizCompleted ? 'Submitting...' : (currentQuestionIndex < quizData.questions.length - 1 ? 'Next Question' : 'Submit Quiz')}
      </button>
    </div>
  );
  }

export default QuizPage;