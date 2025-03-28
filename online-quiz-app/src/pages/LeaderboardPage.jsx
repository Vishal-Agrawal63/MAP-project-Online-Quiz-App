import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';

const API_BASE_URL = 'http://localhost:3001/api'; // Backend URL

function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_BASE_URL}/leaderboard`);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Data is already sorted by the backend
        setLeaderboardData(data);
      } catch (err) {
        console.error("Error loading leaderboard:", err);
        setError(err.message || 'Failed to load leaderboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="container"><p className="form-error">{error}</p></div>;

  return (
    <div className="container">
      <h2>Leaderboard</h2>
      {leaderboardData.length > 0 ? (
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Username</th>
              <th>Quiz</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {leaderboardData.map((entry, index) => (
              <tr key={`${entry.userId}-${entry.quizId}-${index}`}> {/* Simple key for mock data */}
                <td>{index + 1}</td>
                <td>{entry.username}</td>
                <td>{entry.quizId.replace(/_/g, ' ')}</td> {/* Basic formatting */}
                <td>{entry.score} / {entry.totalQuestions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>Leaderboard is empty.</p>
      )}
    </div>
  );
}

export default LeaderboardPage;