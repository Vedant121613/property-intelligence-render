import React from 'react';
import { Edit2, CheckCircle2 } from 'lucide-react';

export default function MobileInput({ value, onChange, disabled, onEdit, isLocked }) {
  const isValid = value.length === 10;

  return (
    <div className="auth-input-group">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <label className="auth-field-label">Mobile Number</label>
        {isLocked && onEdit ? (
          <button 
            type="button" 
            className="auth-edit-phone-pill"
            title="Change mobile number"
            onClick={onEdit}
          >
            <Edit2 size={12} />
            <span>Change</span>
          </button>
        ) : (
          <span className="auth-label-helper">Indian Mobile (+91)</span>
        )}
      </div>

      <div className={`auth-phone-input-row ${isValid ? 'valid' : ''} ${isLocked ? 'locked' : ''}`}>
        <div className="auth-country-code-pill">
          <span className="auth-flag-icon" role="img" aria-label="India">🇮🇳</span>
          <span>+91</span>
        </div>
        <input 
          type="tel"
          className="auth-phone-number-field"
          placeholder="Enter 10-digit number"
          value={value}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
            onChange(val);
          }}
          disabled={disabled}
          autoFocus={!isLocked}
          required
        />
        {isValid && !isLocked && (
          <div className="auth-valid-check" title="Valid mobile number">
            <CheckCircle2 size={18} color="#10B981" />
          </div>
        )}
      </div>
      {!isLocked && (
        <span className="auth-field-hint">We'll send a 6-digit OTP for instant login</span>
      )}
    </div>
  );
}
