import React from 'react';
import { Link } from 'react-router-dom';

const Terms = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>📚 PagesTogether</h1>
          <h2>Terms of Service</h2>
        </div>

        <div style={{ textAlign: 'left', padding: '20px 0' }}>
          <h3>1. Acceptance of Terms</h3>
          <p>By accessing and using PagesTogether, you accept and agree to be bound by the terms and provision of this agreement.</p>

          <h3>2. Use License</h3>
          <p>Permission is granted to temporarily download one copy of PagesTogether for personal, non-commercial transitory viewing only.</p>

          <h3>3. User Account</h3>
          <p>When you create an account with us, you must provide information that is accurate, complete, and current at all times.</p>

          <h3>4. Privacy</h3>
          <p>Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service.</p>

          <h3>5. Prohibited Uses</h3>
          <p>You may not use our service for any unlawful purpose or to solicit others to act unlawfully.</p>

          <h3>6. Content</h3>
          <p>Our service allows you to post, link, store, share and otherwise make available certain information, text, graphics, or other material.</p>

          <h3>7. Changes to Terms</h3>
          <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time.</p>
        </div>

        <div className="auth-footer">
          <p>
            <Link to="/register" className="auth-link">
              ← Back to Registration
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Terms;
