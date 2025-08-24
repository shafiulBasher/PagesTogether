import React from 'react';

const SocialGuide = () => {
  return (
    <div className="social-guide">
      <div className="guide-header">
        <h2>🌟 Welcome to Social Features!</h2>
        <p>Connect with fellow book lovers and build your reading community</p>
      </div>
      
      <div className="guide-steps">
        <div className="step-card">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>Search for Friends</h3>
            <p>Use the search bar above to find other users by name or email. Start by searching for friends who might already be on the platform!</p>
          </div>
        </div>
        
        <div className="step-card">
          <div className="step-number">2</div>
          <div className="step-content">
            <h3>Send Friend Requests</h3>
            <p>Click "Add Friend" to send friend requests. You can also follow users to see their public book activity without being friends.</p>
          </div>
        </div>
        
        <div className="step-card">
          <div className="step-number">3</div>
          <div className="step-content">
            <h3>Manage Your Network</h3>
            <p>Use the tabs to view your friends, pending requests, people you're following, and your followers. Everything is public and simple!</p>
          </div>
        </div>
        
        <div className="step-card">
          <div className="step-number">4</div>
          <div className="step-content">
            <h3>Discover Books</h3>
            <p>Once connected, you'll be able to see what books your friends are reading and get recommendations from your book community.</p>
          </div>
        </div>
      </div>
      
      <div className="guide-footer">
        <div className="feature-highlights">
          <div className="highlight">
            <span className="highlight-icon">🔓</span>
            <span>All profiles are public</span>
          </div>
          <div className="highlight">
            <span className="highlight-icon">📚</span>
            <span>See everyone's bookshelves</span>
          </div>
          <div className="highlight">
            <span className="highlight-icon">🤝</span>
            <span>Simple friend system</span>
          </div>
          <div className="highlight">
            <span className="highlight-icon">👥</span>
            <span>Follow without friendship</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialGuide;
