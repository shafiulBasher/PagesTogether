import React from 'react';
import { Link } from 'react-router-dom';

const Privacy = () => {
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>📚 PagesTogether</h1>
          <h2>Privacy Policy</h2>
        </div>

        <div style={{ textAlign: 'left', padding: '20px 0' }}>
          <h3>1. Information We Collect</h3>
          <p>We collect information you provide directly to us, such as when you create an account, use our services, or contact us.</p>

          <h3>2. How We Use Your Information</h3>
          <p>We use the information we collect to provide, maintain, and improve our services, process transactions, and communicate with you.</p>

          <h3>3. Information Sharing</h3>
          <p>We do not sell, trade, or otherwise transfer your personal information to outside parties without your consent.</p>

          <h3>4. Data Security</h3>
          <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

          <h3>5. Cookies</h3>
          <p>We use cookies to enhance your experience, gather general visitor information, and track visits to our website.</p>

          <h3>6. Third-Party Services</h3>
          <p>We may use third-party services that collect, monitor and analyze user behavior to improve our service.</p>

          <h3>7. Changes to Privacy Policy</h3>
          <p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>

          <h3>8. Contact Us</h3>
          <p>If you have any questions about this Privacy Policy, please contact us through our support channels.</p>
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

export default Privacy;
