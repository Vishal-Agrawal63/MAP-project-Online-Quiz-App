// frontend/src/pages/AiAccuracyPage.jsx
import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import LoadingSpinner from '../components/LoadingSpinner';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const API_BASE_URL = '/api'; // Use relative path for proxy

function AiAccuracyPage() {
    const [accuracyData, setAccuracyData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAccuracyData = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/ai-accuracy-stats`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                setAccuracyData(data);
            } catch (err) {
                console.error("Error loading AI accuracy stats:", err);
                setError(err.message || 'Failed to load accuracy data.');
            } finally {
                setLoading(false);
            }
        };

        fetchAccuracyData();
    }, []);

    if (loading) return <LoadingSpinner />;
    if (error) return <div className="container"><p className="form-error">{error}</p></div>;
    if (!accuracyData) return <div className="container"><p>No accuracy data available.</p></div>;

    // --- Prepare data for the Bar chart (Accuracy per Quiz) ---
    const quizLabels = accuracyData.byQuiz.map(item => item.quizId.replace(/_/g, ' ')); // Format quiz IDs
    const quizAccuracies = accuracyData.byQuiz.map(item => item.accuracy * 100); // Convert to percentage

    const barChartData = {
        labels: quizLabels,
        datasets: [
            {
                label: 'AI Prediction Accuracy (%)',
                data: quizAccuracies,
                backgroundColor: 'rgba(75, 192, 192, 0.6)', // Teal color
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1,
            },
        ],
    };

    const barChartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: 'AI Prediction Accuracy per Quiz' },
            tooltip: {
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) { label += ': '; }
                        if (context.parsed.y !== null) {
                            label += `${context.parsed.y.toFixed(1)}%`; // Show one decimal place
                        }
                        // Add total checks/correct for context
                        const quizIndex = context.dataIndex;
                        const quizStats = accuracyData.byQuiz[quizIndex];
                        if (quizStats) {
                           label += ` (${quizStats.totalCorrect}/${quizStats.totalChecks} correct)`;
                        }
                        return label;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100, // Percentage scale
                title: { display: true, text: 'Accuracy (%)' }
            },
            x: {
               title: { display: true, text: 'Quiz Title' }
            }
        },
    };

    const overallAccuracyPercent = (accuracyData.overall.overallAccuracy * 100).toFixed(1);

    return (
        <div className="container">
            <h2>AI Prediction Accuracy Analysis</h2>

            <div className="overall-accuracy-summary" style={{ margin: '2rem 0', padding: '1rem', background: '#333', borderRadius: '8px' }}>
                <h3>Overall Accuracy</h3>
                <p style={{ fontSize: '1.5em', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {overallAccuracyPercent}%
                </p>
                <p>
                    ({accuracyData.overall.totalCorrect} correct predictions out of {accuracyData.overall.totalChecks} total checks)
                </p>
            </div>

            {accuracyData.byQuiz.length > 0 ? (
               <div className="chart-container" style={{ position: 'relative', height: '50vh', width: '80vw', margin: 'auto' }}>
                    <Bar options={barChartOptions} data={barChartData} />
                </div>
             ) : (
                <p>No per-quiz accuracy data logged yet. Complete some quizzes!</p>
             )}

        </div>
    );
}

export default AiAccuracyPage;