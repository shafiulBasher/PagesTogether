import React from 'react';
import UserProfile from '../components/UserProfile';
import Bookshelf from '../components/Bookshelf';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <UserProfile />
        <Bookshelf />
      </div>
    </div>
  );
};

export default Dashboard;
