import React from 'react';

function AnswerOption({ option, onSelect, isSelected, isCorrect, isIncorrect, showResult }) {
  let className = 'answer-option';
  if (isSelected) className += ' selected';
  if (showResult) {
      if (isCorrect) className += ' correct';
      else if (isSelected) className += ' incorrect'; // Only show incorrect if it was selected
  }


  return (
    <button
      className={className}
      onClick={() => onSelect(option)}
      disabled={showResult} // Disable after submitting
    >
      {option}
    </button>
  );
}

export default AnswerOption;