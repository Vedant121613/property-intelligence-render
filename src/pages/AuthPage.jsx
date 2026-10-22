import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Sparkles, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck,
  Smartphone,
  FileText,
  TrendingUp,
  Award,
  Lock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MobileInput from '../components/auth/MobileInput';
import OTPInput from '../components/auth/OTPInput';
import OTPCountdown from '../components/auth/OTPCountdown';

// ─── Wait for MSG91 widget to be ready ──────────────────────────────────────
function waitForWidget(timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const ready = typeof window.sendOtp === 'function' && window.__msg91WidgetReady;
      if (ready) {
        console.log('[AUTH] ✅ MSG91 widget is ready.');
        resolve();
      } else if (Date.now() - start > timeout) {
        reject(new Error(
          'MSG91 widget did not load in time.\n' +
          'Possible causes:\n' +
          '  • No internet connection\n' +
          '  • verify.msg91.com is unreachable\n' +
          '  • Script blocked by browser extension\n' +
          'Try refreshing the page.'
        ));
      } else {
        setTimeout(check, 250);
      }
    };
    check();
  });
}

// ─── Wrap window.sendOtp in a Promise with timeout ──────────────────────────
function sendOtpWithTimeout(identifier, timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error('[AUTH] ⏱ window.sendOtp() timed out after', timeoutMs, 'ms');
      console.error('[AUTH] This usually means hCaptcha is not completing on localhost.');
      console.error('[AUTH] Captcha verified?', typeof window.isCaptchaVerified === 'function'
        ? window.isCaptchaVerified()
        : 'isCaptchaVerified() not available');
      console.error('[AUTH] Widget data:', typeof window.getWidgetData === 'function'
        ? window.getWidgetData()
        : 'getWidgetData() not available');
      reject(new Error(
        'OTP request timed out. hCaptcha may be blocking on localhost.\n' +
        'Try: scroll down to find and complete the CAPTCHA, then retry.'
      ));
    }, timeoutMs);

    console.log(`[AUTH] → Calling window.sendOtp("${identifier}")`);
    console.log('[AUTH] Captcha verified?', typeof window.isCaptchaVerified === 'function'
      ? window.isCaptchaVerified()
      : 'isCaptchaVerified() not available');

    window.sendOtp(
      identifier,
      (data) => {
        clearTimeout(timer);
        console.log('[AUTH] ✅ window.sendOtp() success callback:', JSON.stringify(data));
        resolve(data);
      },
      (err) => {
        clearTimeout(timer);
        console.error('[AUTH] ❌ window.sendOtp() failure callback:', JSON.stringify(err));
        reject(new Error(
          typeof err === 'string' ? err :
          err?.message || err?.error || JSON.stringify(err) ||
          'OTP could not be sent. Check console for details.'
        ));
      }
    );
  });
}

// ─── Wrap window.verifyOtp in a Promise with timeout ────────────────────────
function verifyOtpWithTimeout(otp, reqId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error('[AUTH] ⏱ window.verifyOtp() timed out after', timeoutMs, 'ms');
      reject(new Error('Verification timed out. Please try again.'));
    }, timeoutMs);

    console.log(`[AUTH] → Calling window.verifyOtp("${otp}", reqId="${reqId}")`);

    window.verifyOtp(
      otp,
      (data) => {
        clearTimeout(timer);
        console.log('[AUTH] ✅ window.verifyOtp() success:', JSON.stringify(data));
        resolve(data);
      },
      (err) => {
        clearTimeout(timer);
        console.error('[AUTH] ❌ window.verifyOtp() failure:', JSON.stringify(err));
        reject(new Error(
          typeof err === 'string' ? err :
          err?.message || 'Invalid or expired code. Please try again.'
        ));
      },
      reqId || undefined
    );
  });
}

// ─── Wrap window.retryOtp in a Promise with timeout ─────────────────────────
function retryOtpWithTimeout(channel, reqId, timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      console.error('[AUTH] ⏱ window.retryOtp() timed out after', timeoutMs, 'ms');
      reject(new Error('Resend timed out. Please try again.'));
    }, timeoutMs);

    console.log(`[AUTH] → Calling window.retryOtp(channel="${channel}", reqId="${reqId}")`);

    window.retryOtp(
      channel,
      (data) => {
        clearTimeout(timer);
        console.log('[AUTH] ✅ window.retryOtp() success:', JSON.stringify(data));
        resolve(data);
      },
      (err) => {
        clearTimeout(timer);
        console.error('[AUTH] ❌ window.retryOtp() failure:', JSON.stringify(err));
        reject(new Error(
          typeof err === 'string' ? err :
          err?.message || 'Could not resend code. Please try again.'
        ));
      },
      reqId || undefined
    );
  });
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function AuthPage({ onNavigate, initialPhone = '' }) {
  const { loginWithPhoneOtp } = useAuth();

  const [step, setStep] = useState('phone');
  const [phoneNumber, setPhoneNumber] = useState(initialPhone || '');
  const [otp, setOtp] = useState('');
  const [reqId, setReqId] = useState('');
  const [authState, setAuthState] = useState('idle');
  const [timerSeconds, setTimerSeconds] = useState(60);
  const [feedback, setFeedback] = useState(null);
  const [resendChannel, setResendChannel] = useState(null);
  const [widgetReady, setWidgetReady] = useState(!!window.__msg91WidgetReady);
  const [showCaptcha, setShowCaptcha] = useState(false);

  const otpInputRef = useRef(null);
  const captchaSlotRef = useRef(null);

  // Poll widget ready state
  useEffect(() => {
    if (widgetReady) return;
    const interval = setInterval(() => {
      if (typeof window.sendOtp === 'function' && window.__msg91WidgetReady) {
        setWidgetReady(true);
        console.log('[AUTH] ✅ Widget ready state detected.');
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [widgetReady]);

  // Move MSG91 captcha DOM node into visible slot when captcha needs to be shown
  useEffect(() => {
    const globalContainer = document.getElementById('msg91-captcha-container');
    const inlineSlot = captchaSlotRef.current;

    if (!globalContainer) return;

    if (showCaptcha && inlineSlot) {
      // Move all captcha children into the visible inline slot
      console.log('[AUTH] 🔄 Moving captcha DOM into visible inline slot...');
      while (globalContainer.firstChild) {
        inlineSlot.appendChild(globalContainer.firstChild);
      }
      globalContainer.style.display = 'none';
    } else {
      // Move captcha children back to global hidden container
      if (inlineSlot && inlineSlot.hasChildNodes()) {
        console.log('[AUTH] 🔄 Moving captcha DOM back to hidden global container...');
        while (inlineSlot.firstChild) {
          globalContainer.appendChild(inlineSlot.firstChild);
        }
      }
      globalContainer.style.display = '';
    }
  }, [showCaptcha]);

  // Countdown timer
  useEffect(() => {
    let interval = null;
    if (step === 'otp' && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [step, timerSeconds]);

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ── Step 1: Send OTP ────────────────────────────────────────────────────
  const handleSendOtp = async (channel = '11', e) => {
    if (e) e.preventDefault();
    const clean = phoneNumber.replace(/\D/g, '').slice(-10);
    if (clean.length < 10) {
      setFeedback({ type: 'error', message: 'Please enter a valid 10-digit mobile number' });
      return;
    }

    setAuthState('sending');
    setFeedback(null);
    setShowCaptcha(false);

    const identifier = `91${clean}`;
    console.log(`[AUTH] ──────────────────────────────────────────`);
    console.log(`[AUTH] handleSendOtp called`);
    console.log(`[AUTH]   identifier   : ${identifier}`);
    console.log(`[AUTH]   channel      : ${channel} (${channel === '12' ? 'WhatsApp' : 'SMS'})`);
    console.log(`[AUTH]   widgetReady  : ${widgetReady}`);
    console.log(`[AUTH]   window.sendOtp exists: ${typeof window.sendOtp === 'function'}`);

    try {
      await waitForWidget();

      // Check captcha status before calling
      if (typeof window.isCaptchaVerified === 'function') {
        const captchaOk = window.isCaptchaVerified();
        console.log(`[AUTH]   hCaptcha verified: ${captchaOk}`);
        if (!captchaOk) {
          console.warn('[AUTH] ⚠ hCaptcha not yet verified. Making captcha visible for user...');
          setShowCaptcha(true);
          setFeedback({
            type: 'info',
            message: 'Please complete the CAPTCHA verification below, then try again.'
          });
          setAuthState('idle');
          return;
        }
      }

      const data = await sendOtpWithTimeout(identifier, 20000);

      const rid = data?.message || data?.reqId || data?.request_id || `req_${Date.now()}`;
      setReqId(String(rid));
      console.log(`[AUTH]   reqId stored: ${rid}`);

      setStep('otp');
      setTimerSeconds(60);
      setAuthState('otpSent');
      setShowCaptcha(false);
      setFeedback({
        type: 'success',
        message: channel === '12'
          ? '✓ Verification code sent to WhatsApp!'
          : '✓ Verification code sent via SMS!'
      });

      setTimeout(() => {
        if (otpInputRef.current) otpInputRef.current.focus();
      }, 150);

    } catch (err) {
      console.error('[AUTH] ❌ handleSendOtp error:', err.message);
      setAuthState('error');
      setFeedback({
        type: 'error',
        message: err.message || 'Unable to send OTP. Please check your network and try again.'
      });
    }
  };

  // ── Step 2: Verify OTP ──────────────────────────────────────────────────
  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    const cleanOtp = otp.trim();
    if (!cleanOtp) {
      setFeedback({ type: 'error', message: 'Please enter the verification code' });
      return;
    }

    setAuthState('verifying');
    setFeedback(null);

    console.log(`[AUTH] ──────────────────────────────────────────`);
    console.log(`[AUTH] handleVerifyOtp called`);
    console.log(`[AUTH]   otp   : ${cleanOtp}`);
    console.log(`[AUTH]   reqId : ${reqId}`);

    try {
      await waitForWidget();
      await verifyOtpWithTimeout(cleanOtp, reqId, 15000);

      setAuthState('verified');
      setFeedback({ type: 'success', message: '✓ Verified successfully! Redirecting...' });
      console.log('[AUTH] ✅ OTP verified. Signing in...');

      setTimeout(async () => {
        try {
          await loginWithPhoneOtp(phoneNumber);
          console.log('[AUTH] ✅ DB login complete. Navigating home.');
          onNavigate('home');
        } catch (loginErr) {
          console.error('[AUTH] ⚠ DB login error (non-fatal):', loginErr.message);
          onNavigate('home');
        }
      }, 500);

    } catch (err) {
      console.error('[AUTH] ❌ handleVerifyOtp error:', err.message);
      setAuthState('error');
      setFeedback({
        type: 'error',
        message: err.message || 'Invalid or expired verification code.'
      });
    }
  };

  // ── Step 3: Resend OTP ──────────────────────────────────────────────────
  const handleResendOtp = async (channel = '11') => {
    if (timerSeconds > 0) return;

    setAuthState('resending');
    setResendChannel(channel);
    setFeedback(null);

    console.log(`[AUTH] ──────────────────────────────────────────`);
    console.log(`[AUTH] handleResendOtp called`);
    console.log(`[AUTH]   channel : ${channel}`);
    console.log(`[AUTH]   reqId   : ${reqId}`);

    try {
      await waitForWidget();
      await retryOtpWithTimeout(channel, reqId, 15000);

      setTimerSeconds(60);
      setAuthState('otpSent');
      setFeedback({
        type: 'success',
        message: channel === '12' ? '✓ New code sent to WhatsApp!' : '✓ New code sent via SMS!'
      });
    } catch (err) {
      console.error('[AUTH] ❌ handleResendOtp error:', err.message);
      setAuthState('error');
      setFeedback({ type: 'error', message: err.message || 'Failed to resend code.' });
    } finally {
      setResendChannel(null);
    }
  };

  const isSending = authState === 'sending';
  const isVerifying = authState === 'verifying';
  const isResending = authState === 'resending';
  const phoneClean = phoneNumber.replace(/\D/g, '');

  return (
    <div className="auth-page-container">
      {/* Header Bar */}
      <header className="auth-header-bar">
        <div className="content-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div 
            className="navbar-brand" 
            onClick={() => onNavigate('home')} 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
          >
            <div className="brand-icon-box"><Building2 size={20} /></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="brand-name">
                Pure<span>frame</span>
              </span>
              <span style={{ fontSize: '0.62rem', color: '#94A3B8', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: '-3px' }}>
                Deed Intelligence
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="btn-back-home"
          >
            <ArrowLeft size={16} />
            <span>Back to Property Search</span>
          </button>
        </div>
      </header>

      {/* Main Dual-Column Content */}
      <div className="auth-page-content">
        <div className="auth-layout-wrapper">
          
          {/* Left Column: Value Proposition & Trust */}
          <div className="auth-showcase-panel">
            <div className="auth-showcase-badge">
              <ShieldCheck size={14} />
              <span>IGR Maharashtra Deed Intelligence</span>
            </div>

            <h1 className="auth-showcase-headline">
              Real Property Deals.<br />
              <span className="gradient-text">100% Registered Prices.</span>
            </h1>

            <p className="auth-showcase-desc">
              Access authentic government registered sale deeds, actual transacted carpet area rates, and historical appreciation before making property decisions.
            </p>

            <div className="auth-feature-list">
              <div className="auth-feature-item">
                <div className="auth-feature-icon-box">
                  <FileText size={18} />
                </div>
                <div className="auth-feature-text">
                  <h4>100% Authentic Government Deeds</h4>
                  <p>Direct from Department of Registration &amp; Stamps (IGR). Real buyers, real sellers, real dates.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon-box">
                  <TrendingUp size={18} />
                </div>
                <div className="auth-feature-text">
                  <h4>True Transacted Rates</h4>
                  <p>Discover what actual neighbors paid per sq.ft., not inflated marketing or broker asking rates.</p>
                </div>
              </div>

              <div className="auth-feature-item">
                <div className="auth-feature-icon-box">
                  <Award size={18} />
                </div>
                <div className="auth-feature-text">
                  <h4>3 Free Deed Unlocks</h4>
                  <p>Inspect complete transaction documents with unit numbers, consideration value &amp; stamp duty.</p>
                </div>
              </div>
            </div>

            <div className="auth-social-proof-strip">
              <Sparkles size={16} color="#2563EB" style={{ flexShrink: 0 }} />
              <span>Trusted by <strong>100,000+</strong> home buyers, investors &amp; valuers across Maharashtra.</span>
            </div>
          </div>

          {/* Right Column: Sleek Auth Form Card */}
          <div className="auth-form-card">
            <div className="auth-card-top-accent" />

            {/* Card Header */}
            <div className="auth-card-head">
              <div className="auth-card-steps-pill">
                <span>{step === 'otp' ? 'Step 2 of 2' : 'Step 1 of 2'}</span>
                <span>•</span>
                <span>{step === 'otp' ? 'SMS / WhatsApp OTP' : 'Quick Sign In'}</span>
              </div>

              <h2 className="auth-card-title">
                {step === 'otp' ? 'Enter Verification Code' : 'Sign In or Register'}
              </h2>

              {step === 'otp' ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                  <span className="auth-card-subtitle">
                    We sent a 6-digit code to
                  </span>
                  <span className="auth-phone-locked-pill">
                    +91 {phoneClean.slice(-10)}
                  </span>
                </div>
              ) : (
                <p className="auth-card-subtitle">
                  Enter your mobile number to instantly verify your account and unlock registered deed data.
                </p>
              )}
            </div>

            {/* Feedback Banner */}
            {feedback && (
              <div className={`auth-feedback-banner ${feedback.type}`}>
                {feedback.type === 'success' ? (
                  <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
                ) : feedback.type === 'error' ? (
                  <AlertCircle size={18} color="#DC2626" style={{ flexShrink: 0 }} />
                ) : (
                  <ShieldCheck size={18} color="#2563EB" style={{ flexShrink: 0 }} />
                )}
                <span style={{ whiteSpace: 'pre-line' }}>{feedback.message}</span>
              </div>
            )}

            {/* hCaptcha container — rendered when captcha is triggered */}
            <div style={{
              display: showCaptcha ? 'block' : 'none',
              padding: '14px',
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: '10px',
              margin: '0 32px 14px',
            }}>
              <div style={{ fontWeight: 600, fontSize: '0.82rem', color: '#78350F', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                🛡 Security Check Required
              </div>
              <div ref={captchaSlotRef} style={{ minHeight: '78px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }} />
              <div style={{ marginTop: '10px', fontSize: '0.73rem', color: '#92400E', lineHeight: 1.4 }}>
                Complete the CAPTCHA above, then click <strong>Send OTP</strong> again.
              </div>
              <button
                type="button"
                onClick={() => {
                  const captchaOk = typeof window.isCaptchaVerified === 'function' && window.isCaptchaVerified();
                  if (captchaOk) {
                    setShowCaptcha(false);
                    setFeedback({ type: 'info', message: 'CAPTCHA verified! Click Send OTP to continue.' });
                  } else {
                    setFeedback({ type: 'error', message: 'Please complete the CAPTCHA first.' });
                  }
                }}
                style={{
                  marginTop: '8px',
                  padding: '7px 14px',
                  background: '#F59E0B',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                ✓ I completed the CAPTCHA
              </button>
            </div>

            {/* Form */}
            <form
              onSubmit={step === 'otp' ? handleVerifyOtp : (e) => handleSendOtp('11', e)}
              className="auth-fields-form"
            >
              <MobileInput
                value={phoneNumber}
                onChange={setPhoneNumber}
                disabled={step === 'otp'}
                isLocked={step === 'otp'}
                onEdit={() => {
                  setStep('phone');
                  setOtp('');
                  setFeedback(null);
                  setAuthState('idle');
                  setShowCaptcha(false);
                }}
              />

              {step === 'otp' && (
                <OTPInput
                  value={otp}
                  onChange={setOtp}
                  inputRef={otpInputRef}
                  disabled={isVerifying}
                />
              )}

              <div style={{ marginTop: '22px' }}>
                {step === 'otp' ? (
                  <button
                    type="submit"
                    disabled={!otp.trim() || isVerifying}
                    className={`auth-submit-btn ${otp.trim().length >= 4 ? 'active' : 'disabled'}`}
                  >
                    {isVerifying ? (
                      <span>Verifying code...</span>
                    ) : (
                      <>
                        <span>Verify &amp; Continue</span>
                        <ArrowRight size={17} />
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={phoneClean.length < 10 || isSending}
                    onClick={(e) => handleSendOtp('11', e)}
                    className={`auth-submit-btn ${phoneClean.length >= 10 ? 'active' : 'disabled'}`}
                  >
                    <Smartphone size={17} />
                    <span>{isSending ? 'Sending OTP...' : 'Get Verification Code'}</span>
                  </button>
                )}
              </div>

              {step === 'otp' && (
                <OTPCountdown
                  timerSeconds={timerSeconds}
                  formatTime={formatTime}
                  isResending={isResending}
                  resendChannel={resendChannel}
                  onResend={handleResendOtp}
                />
              )}

              {/* Security badges replacing raw debug text */}
              <div className="auth-security-badges">
                <div className="auth-security-badge-item">
                  <ShieldCheck size={14} color="#10B981" />
                  <span>256-Bit SSL Encrypted</span>
                </div>
                <div className="auth-security-badge-divider">·</div>
                <div className="auth-security-badge-item">
                  <Sparkles size={14} color="#2563EB" />
                  <span>3 Free Deed Unlocks</span>
                </div>
              </div>
            </form>

            {/* Bottom Strip */}
            <div className="auth-card-bottom-pill">
              <Lock size={14} color="#1D4ED8" style={{ flexShrink: 0 }} />
              <span>We never share your number. Spam-free guarantee.</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

