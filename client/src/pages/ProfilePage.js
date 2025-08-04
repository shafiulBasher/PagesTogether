import React from 'react';
import UserProfile from '../components/UserProfile';
import Bookshelf from '../components/Bookshelf';
import './ProfilePage.css';

const ProfilePage = () => {
  return (
    <div className="profile-page">
      <div className="profile-container">
        <div className="profile-sidebar">
          <UserProfile />
        </div>
        <div className="bookshelf-main">
          <Bookshelf />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage; 