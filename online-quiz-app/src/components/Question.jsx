import React from 'react';
import AnswerOption from './AnswerOption';

function Question({ question, onAnswerSelect, selectedAnswer, showResult }) {
  return (
    <div className="question-container">
      <p className="question-text">{question.text}</p>
      <div className="answer-options">
        {question.options.map((option) => (
          <AnswerOption
            key={option}
            option={option}
            onSelect={onAnswerSelect}
            isSelected={selectedAnswer === option}
            isCorrect={option === question.correctAnswer}
            showResult={showResult}
          />
        ))}
      </div>
    </div>
  );
}

export default Question;