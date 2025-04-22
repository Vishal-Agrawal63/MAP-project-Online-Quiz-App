// frontend/src/pages/QuestionGeneratorPage.jsx
import React, { useState } from 'react';
import LoadingSpinner from '../components/LoadingSpinner'; // Make sure this path is correct

// This should work with the Nginx proxy setup in docker-compose
// Nginx forwards requests starting with /api/ to the backend service
const API_BASE_URL = '/api';

function QuestionGeneratorPage() {
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null); // Stores error messages for display
    const [successMessage, setSuccessMessage] = useState(null); // Stores success messages
    const [generatedData, setGeneratedData] = useState(null); // Stores the successfully generated question details for preview

    // Function to handle form submission
    const handleGenerate = async (e) => {
        e.preventDefault(); // Prevent default browser form submission

        // Basic validation
        if (!topic.trim()) {
            setError("Please enter a topic.");
            setSuccessMessage(null); // Clear any previous success message
            return;
        }

        // Reset state before making the API call
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        setGeneratedData(null);

        try {
            // Make the POST request to the backend endpoint
            const response = await fetch(`${API_BASE_URL}/generate-question`, {
                method: 'POST',
                headers: {
                    // Indicate we're sending JSON data
                    'Content-Type': 'application/json',
                    // Add Authorization header if your endpoint requires authentication
                    // 'Authorization': `Bearer ${your_auth_token}`,
                },
                // Send the topic in the request body as a JSON string
                body: JSON.stringify({ topic: topic.trim() }),
            });

            // Attempt to parse the JSON response body, even if the status code indicates an error
            // This is important because the backend might send error details in the body
            let data;
            try {
                 data = await response.json();
            } catch (parseError) {
                 // Handle cases where the response is not valid JSON (e.g., HTML error page from proxy)
                 console.error("Failed to parse JSON response:", parseError);
                 // Use the raw response text if JSON parsing fails
                 const rawText = await response.text();
                 throw new Error(`Received non-JSON response from server (status ${response.status}): ${rawText.substring(0, 100)}...`);
            }


            // Check if the HTTP response status code is OK (e.g., 200, 201)
            if (!response.ok) {
                // If not OK, throw an error with the message from the backend (if available)
                // or a generic HTTP error message.
                throw new Error(data.message || `Request failed with status ${response.status}`);
            }

            // --- Success Case ---
            // Set success message from the backend response
            setSuccessMessage(data.message || 'Question generated successfully and saved for review.');

            // Optionally, if the backend sends back the generated question details, store them for preview
            // This depends on what you send back from the backend 'generate-question' route on success
            // For example, if the backend response is: { success: true, message: "...", generatedQuestion: { text: "...", options: [...], correctAnswer: "..." } }
            if (data.generatedQuestion) {
                 setGeneratedData(data.generatedQuestion);
            }

            setTopic(''); // Clear the input field after successful generation

        } catch (err) {
            // --- Error Case ---
            console.error("Error generating question:", err);
            // Set the error message for display to the user
            // Use the error message caught (could be from response.ok check or network error)
            setError(err.message || 'An unexpected error occurred. Please check the console or try again.');
            setSuccessMessage(null); // Clear any previous success message
        } finally {
            // This block always runs, regardless of success or error
            setLoading(false); // Stop showing the loading indicator
        }
    };

    // Render the component UI
    return (
        <div className="container">
            <h2>Generate Quiz Question using AI</h2>
            <p>Enter a topic, and the AI will attempt to generate a multiple-choice question. Generated questions are saved with status 'pending_review'.</p>

            {/* Form for entering the topic and triggering generation */}
            <form onSubmit={handleGenerate} className="auth-form" style={{ maxWidth: '500px', margin: '2rem auto' }}>
                <div style={{ marginBottom: '1rem' }}>
                    <label htmlFor="topicInput" style={{ display: 'block', marginBottom: '0.5rem', textAlign: 'left' }}>Topic:</label>
                    <input
                        id="topicInput"
                        type="text"
                        placeholder="e.g., 'Photosynthesis', 'World War II Leaders'"
                        value={topic}
                        // Update the topic state whenever the input changes
                        onChange={(e) => setTopic(e.target.value)}
                        required // HTML5 form validation
                        disabled={loading} // Disable input while loading
                        style={{ width: '100%', boxSizing: 'border-box' }} // Ensure padding doesn't overflow
                    />
                </div>

                {/* Display Loading Spinner */}
                {loading && <LoadingSpinner />}

                {/* Display Error Message if any */}
                {error && <p className="form-error" style={{ marginTop: '1rem' }}>Error: {error}</p>}

                {/* Display Success Message if any */}
                {successMessage && !error && <p style={{ color: 'lightgreen', marginTop: '1rem' }}>{successMessage}</p>}

                <button type="submit" className="primary" disabled={loading} style={{ marginTop: '1rem' }}>
                    {loading ? 'Generating...' : 'Generate Question'}
                </button>
            </form>

            {/* Optional: Display the generated question preview if data exists */}
            {generatedData && !loading && (
                <div className="generated-question-preview" style={{ marginTop: '2rem', textAlign: 'left', background: 'transparent', padding: '1.5rem', borderRadius: '8px', border: '1px solid #444' }}>
                    <h4>Generated Question (Preview - Pending Review):</h4>
                    <p><strong>Q:</strong> {generatedData.text || 'N/A'}</p>
                    {generatedData.options && generatedData.options.length > 0 ? (
                        <ul>
                            {generatedData.options.map((opt, index) => (
                                <li key={index} style={{ margin: '0.3rem 0', color: opt === generatedData.correctAnswer ? 'lightgreen' : 'inherit' }}>
                                    {/* Display letter (A, B, C, D) */}
                                    <strong>{String.fromCharCode(65 + index)}:</strong> {opt}
                                    {/* Indicate the correct answer */}
                                    {opt === generatedData.correctAnswer ? <em style={{ marginLeft: '10px' }}>(Correct Answer)</em> : ''}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p><em>Options not available in preview.</em></p>
                    )}
                </div>
            )}
        </div>
    );
}

export default QuestionGeneratorPage;