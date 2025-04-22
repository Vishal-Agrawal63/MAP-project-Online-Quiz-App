import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import SignUpPage from './pages/SignUpPage';
import QuizSelectionPage from './pages/QuizSelectionPage';
import QuizPage from './pages/QuizPage';
// ResultsPage is rendered inside QuizPage now, so no separate route needed unless you want direct access
import LeaderboardPage from './pages/LeaderboardPage';
import AiAccuracyPage from './pages/AiAccuracyPage'; // Import the new page
import QuestionGeneratorPage from './pages/QuestionGeneratorPage'; // <-- Import

// Component to protect routes that require login
function ProtectedRoute({ children }) {
  const { currentUser } = useAuth();
  // If no user, redirect to login
  return currentUser ? children : <Navigate to="/login" replace />;
}

// Component to prevent logged-in users from accessing login/signup
function PublicOnlyRoute({ children }) {
    const { currentUser } = useAuth();
    // If user exists, redirect to quiz selection
    return !currentUser ? children : <Navigate to="/quizzes" replace />;
}


function App() {
  return (
    <AuthProvider> {/* Wrap everything in AuthProvider */}
      <Router>
        <Navbar /> {/* Navbar is always visible */}
        <main>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/signup" element={<PublicOnlyRoute><SignUpPage /></PublicOnlyRoute>} />

            {/* Protected Routes */}
            <Route
              path="/quizzes"
              element={<ProtectedRoute><QuizSelectionPage /></ProtectedRoute>}
            />
            <Route
              path="/quiz/:quizId"
              element={<ProtectedRoute><QuizPage /></ProtectedRoute>}
            />
             {/* Results are shown within QuizPage upon completion */}
             {/* <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} /> */}
             <Route
              path="/leaderboard"
              element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>}
            />
                        {/* Add the new route - maybe protect it */}
            <Route
              path="/ai-accuracy" // Choose your desired path
              element={<ProtectedRoute><AiAccuracyPage /></ProtectedRoute>}
              // Or just element={<AiAccuracyPage />} if public
            />
            
                        {/* --- NEW ROUTE --- */}
                        <Route
              path="/generate-question" // Or choose another path e.g., /admin/generate
              element={<ProtectedRoute><QuestionGeneratorPage /></ProtectedRoute>} // Protect it
            />
            {/* --- END NEW ROUTE --- */}

            {/* Fallback for unknown routes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </Router>
    </AuthProvider>
  );
}

export default App;