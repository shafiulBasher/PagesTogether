import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navigation = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const closeDropdown = () => {
    setIsDropdownOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Brand/Logo with Icon */}
        <div className="nav-brand">
          <Link to="/dashboard" className="brand-link">
            <svg className="brand-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" fill="none"/>
              <path d="M8 4V20" stroke="currentColor" strokeWidth="2"/>
              <path d="M16 4V20" stroke="currentColor" strokeWidth="2"/>
            </svg>
            PagesTogether
          </Link>
        </div>

        {/* User section - only show when authenticated */}
        {isAuthenticated && (
          <div className="nav-user-section">
            <div className="user-profile">
              {user?.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt={user.username}
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-placeholder">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
            
            <div className="user-dropdown-container" ref={dropdownRef}>
              <button 
                onClick={toggleDropdown}
                className="dropdown-toggle"
              >
                <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {isDropdownOpen && (
                <div className="dropdown-menu">
                  <Link to="/account" className="dropdown-item" onClick={closeDropdown}>
                    <svg className="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Account
                  </Link>
                  <Link to="/settings" className="dropdown-item" onClick={closeDropdown}>
                    <svg className="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
                      <path d="M19.4 15A1.65 1.65 0 0 0 20.25 13.5A8.5 8.5 0 0 0 20.25 10.5A1.65 1.65 0 0 0 19.4 9L18.65 8.2A1.65 1.65 0 0 0 16.5 8.2L15.12 9.34A8.5 8.5 0 0 0 12 8.5A8.5 8.5 0 0 0 8.88 9.34L7.5 8.2A1.65 1.65 0 0 0 5.35 8.2L4.6 9A1.65 1.65 0 0 0 3.75 10.5A8.5 8.5 0 0 0 3.75 13.5A1.65 1.65 0 0 0 4.6 15L5.35 15.8A1.65 1.65 0 0 0 7.5 15.8L8.88 14.66A8.5 8.5 0 0 0 12 15.5A8.5 8.5 0 0 0 15.12 14.66L16.5 15.8A1.65 1.65 0 0 0 18.65 15.8L19.4 15Z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Settings
                  </Link>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleLogout}
              className="logout-button"
            >
              Logout
            </button>
          </div>
        )}

        {/* Login/Register links for non-authenticated users */}
        {!isAuthenticated && (
          <div className="nav-auth-links">
            <Link 
              to="/login" 
              className="nav-link"
            >
              Login
            </Link>
            <Link 
              to="/register" 
              className="nav-link nav-cta"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
