import React, { useRef, useEffect } from 'react';

export default function OTPInput({ value, onChange, inputRef, disabled }) {
  const boxRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Expose first box to parent inputRef
  useEffect(() => {
    if (inputRef) {
      inputRef.current = boxRefs[0].current;
    }
  }, [inputRef]);

  const handleBoxChange = (index, char) => {
    const clean = char.replace(/\D/g, '');
    if (!clean) {
      // Clear digit at index
      const chars = (value || '').split('');
      chars[index] = '';
      onChange(chars.join(''));
      return;
    }

    if (clean.length > 1) {
      // Pasted or multiple characters
      const pasted = clean.slice(0, 6);
      onChange(pasted);
      const nextIndex = Math.min(pasted.length, 5);
      boxRefs[nextIndex].current?.focus();
      return;
    }

    // Single digit
    const chars = (value || '').padEnd(6, ' ').split('');
    chars[index] = clean;
    const newVal = chars.join('').trimEnd().slice(0, 6);
    onChange(newVal);

    if (index < 5) {
      boxRefs[index + 1].current?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      const currentChars = (value || '').split('');
      if (!currentChars[index]) {
        // Move to previous box if current is empty
        if (index > 0) {
          boxRefs[index - 1].current?.focus();
        }
      } else {
        currentChars[index] = '';
        onChange(currentChars.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      boxRefs[index - 1].current?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      boxRefs[index + 1].current?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      onChange(pastedData);
      const nextIndex = Math.min(pastedData.length, 5);
      boxRefs[nextIndex].current?.focus();
    }
  };

  return (
    <div className="auth-otp-wrapper">
      <label className="auth-field-label">One Time Password (OTP)</label>
      <div className="auth-otp-boxes-grid" onPaste={handlePaste}>
        {[0, 1, 2, 3, 4, 5].map((idx) => {
          const char = (value || '')[idx] || '';
          return (
            <input
              key={idx}
              ref={boxRefs[idx]}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={char}
              disabled={disabled}
              onChange={(e) => handleBoxChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              className={`auth-otp-slot-input ${char ? 'filled' : ''}`}
              autoFocus={idx === 0}
            />
          );
        })}
      </div>
      <span className="auth-field-hint">Enter the 6-digit code received on your phone</span>
    </div>
  );
}
