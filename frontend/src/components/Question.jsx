// frontend/src/components/Question.jsx
import React from 'react';
import AnswerOption from './AnswerOption';

function Question({ question, selectedAnswer, onAnswerSelect, disabled, showResult, explanation }) {

  const isCorrectSelection = selectedAnswer === question.correctAnswer;

  return (
    <div className="question-container">
      <p className="question-text">{question.text}</p>

      <div className="answer-options">
        {question.options.map((option) => (
          <AnswerOption
            key={option}
            option={option}
            onSelect={() => onAnswerSelect(option)}
            isSelected={selectedAnswer === option}
            isCorrect={showResult && option === question.correctAnswer}
            isIncorrect={showResult && selectedAnswer === option && option !== question.correctAnswer}
            showResult={showResult}
            disabled={disabled}
          />
        ))}
      </div>

      {/* Updated Result Section */}
      {showResult && (
        <div className="result-section">
          {isCorrectSelection ? (
            <p className="correct-feedback">
              ✅ Correct! Your answer: <strong>{selectedAnswer}</strong>
            </p>
          ) : (
            <p className="incorrect-feedback">
              ❌ Incorrect. Your answer: <strong>{selectedAnswer}</strong><br />
              The correct answer is: <strong>{question.correctAnswer}</strong>
            </p>
          )}
          {/* Display the explanation fetched from the API */}
          {explanation && (
             <div className="explanation-box">
               <strong>Explanation:</strong>
               <p>{explanation}</p>
             </div>
          )}
          {!explanation && (
              <p><em>Loading explanation or explanation unavailable...</em></p>
          )}
        </div>
      )}
    </div>
  );
}

export default Question;