import React from 'react';
import { Clock, RefreshCw, MessageSquare } from 'lucide-react';

export default function OTPCountdown({ 
  timerSeconds, 
  formatTime, 
  isResending, 
  resendChannel, 
  onResend 
}) {
  return (
    <div className="auth-timer-resend-area">
      {timerSeconds > 0 ? (
        <div className="auth-timer-pill">
          <Clock size={14} style={{ color: '#2563EB' }} />
          <span>Resend code available in <strong>{formatTime(timerSeconds)}</strong></span>
        </div>
      ) : (
        <div className="auth-resend-actions">
          <span className="auth-resend-prompt-text">Didn't receive the code?</span>
          <div className="auth-resend-btn-group">
            <button 
              type="button"
              className="auth-resend-chip"
              disabled={isResending}
              onClick={() => onResend('11')}
            >
              <RefreshCw size={13} className={isResending && resendChannel === '11' ? 'spin' : ''} />
              <span>{isResending && resendChannel === '11' ? 'Sending SMS...' : 'Resend SMS'}</span>
            </button>

            <button 
              type="button"
              className="auth-resend-chip whatsapp"
              disabled={isResending}
              onClick={() => onResend('12')}
            >
              <MessageSquare size={13} />
              <span>{isResending && resendChannel === '12' ? 'Sending WhatsApp...' : 'Send on WhatsApp'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
