import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Account = () => {
  const { user } = useAuth();

  return (
    <div className="page-container">
      <div className="page-content">
        <h2>Account</h2>
        <div className="account-info">
          <div className="info-group">
            <label>Username:</label>
            <p>{user?.username || 'Not set'}</p>
          </div>
          <div className="info-group">
            <label>Email:</label>
            <p>{user?.email || 'Not set'}</p>
          </div>
          <div className="info-group">
            <label>Bio:</label>
            <p>{user?.bio || 'No bio available'}</p>
          </div>
          <div className="info-group">
            <label>Favorite Quote:</label>
            <p>{user?.favoriteQuote || 'No favorite quote set'}</p>
          </div>
        </div>
        <div className="account-actions">
          <button className="btn btn-primary">Edit Account</button>
          <button className="btn btn-secondary">Change Password</button>
        </div>
      </div>
    </div>
  );
};

export default Account;
