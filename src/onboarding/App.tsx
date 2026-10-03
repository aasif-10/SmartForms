import React from 'react';
import { LogoIcon, EditIcon, SavedIcon, CheckIcon, LockIcon } from '../popup/components/Icons';

export const App: React.FC = () => {
  const handleGetStarted = async () => {
    if (typeof chrome !== 'undefined' && chrome.action && typeof chrome.action.openPopup === 'function') {
      try {
        await chrome.action.openPopup();
      } catch (err) {
        console.error('Failed to open action popup:', err);
      }
    }
  };

  return (
    <div className="sf-onboarding-container">
      <header className="sf-onboarding-header">
        <div className="sf-onboarding-brand">
          <div className="sf-brand-icon">
            <LogoIcon size={20} />
          </div>
          <span className="sf-brand-name">SmartForm Saver</span>
        </div>
        <h1 className="sf-onboarding-title">Welcome to SmartForms</h1>
        <p className="sf-onboarding-subtitle">
          SmartForms saves form data locally on your device so you can reuse it anytime for instant autofill.
        </p>
      </header>

      <main>
        {/* How It Works Section */}
        <section className="sf-onboarding-section">
          <h2 className="sf-section-title">
            <span className="sf-section-title-icon">
              <LogoIcon size={18} />
            </span>
            How It Works
          </h2>
          <p className="sf-section-description">
            SmartForms works seamlessly in the background as you browse and fill out forms.
          </p>

          <div className="sf-steps-grid">
            <div className="sf-step-card">
              <div className="sf-step-header">
                <span className="sf-step-number">Step 1</span>
                <span className="sf-step-icon">
                  <EditIcon size={18} />
                </span>
              </div>
              <h3 className="sf-step-title">Fill Out Forms</h3>
              <p className="sf-step-text">
                Enter your details on form fields across any website as you normally would.
              </p>
            </div>

            <div className="sf-step-card">
              <div className="sf-step-header">
                <span className="sf-step-number">Step 2</span>
                <span className="sf-step-icon">
                  <SavedIcon size={18} />
                </span>
              </div>
              <h3 className="sf-step-title">Saved Automatically</h3>
              <p className="sf-step-text">
                SmartForms identifies field types and securely saves values directly to local storage.
              </p>
            </div>

            <div className="sf-step-card">
              <div className="sf-step-header">
                <span className="sf-step-number">Step 3</span>
                <span className="sf-step-icon">
                  <CheckIcon size={18} />
                </span>
              </div>
              <h3 className="sf-step-title">Click to Autofill</h3>
              <p className="sf-step-text">
                Click or select any form field to see SmartForms suggestions and autofill instantly.
              </p>
            </div>
          </div>
        </section>

        {/* Privacy Section */}
        <section className="sf-privacy-card">
          <div className="sf-privacy-icon">
            <LockIcon size={18} />
          </div>
          <div className="sf-privacy-content">
            <h3>100% Local & Private Data Storage</h3>
            <p>
              Your saved data stays strictly on your device. SmartForms uses Chrome's local storage API to retain your values. No data is ever sent to external servers, cloud services, or analytics trackers.
            </p>
          </div>
        </section>

        {/* Action Button */}
        <div className="sf-onboarding-actions">
          <button className="sf-btn-primary" onClick={handleGetStarted}>
            Start using SmartForms
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
};
