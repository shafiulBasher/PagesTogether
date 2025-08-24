import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationDropdown from './NotificationDropdown';

const Navigation = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isFindBooksDropdownOpen, setIsFindBooksDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const findBooksDropdownRef = useRef(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleUserDropdown = () => {
    setIsUserDropdownOpen(!isUserDropdownOpen);
    setIsFindBooksDropdownOpen(false); // Close other dropdown
  };

  const toggleFindBooksDropdown = () => {
    setIsFindBooksDropdownOpen(!isFindBooksDropdownOpen);
    setIsUserDropdownOpen(false); // Close other dropdown
  };

  const closeUserDropdown = () => {
    setIsUserDropdownOpen(false);
  };

  // eslint-disable-next-line no-unused-vars
  const closeFindBooksDropdown = () => {
    setIsFindBooksDropdownOpen(false);
  };

  const closeAllDropdowns = () => {
    setIsUserDropdownOpen(false);
    setIsFindBooksDropdownOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target) &&
          findBooksDropdownRef.current && !findBooksDropdownRef.current.contains(event.target)) {
        closeAllDropdowns();
      }
    };

    if (isUserDropdownOpen || isFindBooksDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserDropdownOpen, isFindBooksDropdownOpen]);

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Brand/Logo with Icon */}
        <div className="nav-brand">
          <Link to="/dashboard" className="brand-link">
            <svg className="brand-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            PagesTogether
          </Link>
        </div>

        {/* Main navigation links for authenticated users */}
        {isAuthenticated && (
          <div className="nav-main-links">
            <Link to="/dashboard" className="nav-main-link">
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9L12 2L21 9V20C21 20.5304 20.7893 21.0391 20.4142 21.4142C20.0391 21.7893 19.5304 22 19 22H5C4.46957 22 3.96086 21.7893 3.58579 21.4142C3.21071 21.0391 3 20.5304 3 20V9Z" stroke="currentColor" strokeWidth="2" fill="none"/>
                <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" fill="none"/>
              </svg>
              <span>Home</span>
            </Link>
            
            <div className="nav-dropdown-container" ref={findBooksDropdownRef}>
              <button 
                onClick={toggleFindBooksDropdown}
                className="nav-main-link nav-dropdown-button"
              >
                <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Find Books</span>
                <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {isFindBooksDropdownOpen && (
                <div className="dropdown-menu nav-dropdown-menu">
                  <div className="dropdown-item disabled">
                    <svg className="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 12V8H6C5.46957 8 4.96086 7.78929 4.58579 7.41421C4.21071 7.03914 4 6.53043 4 6C4 5.46957 4.21071 4.96086 4.58579 4.58579C4.96086 4.21071 5.46957 4 6 4H18V0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="20" cy="16" r="4" stroke="currentColor" strokeWidth="2"/>
                      <path d="M12 12H2L7 7L12 12L7 17L2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Giveaway (Coming Soon)
                  </div>
                  <div className="dropdown-item disabled">
                    <svg className="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V8L16 3Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <polyline points="16,3 16,8 21,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 13L10 16L17 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Exchange (Coming Soon)
                  </div>
                </div>
              )}
            </div>

            <Link to="/communities" className="nav-main-link">
              <svg className="nav-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M17 21V19C17 17.9391 16.5786 16.9217 16.1213 16.4645C15.6641 16.0072 15.0304 15.7838 14.4142 15.8284C13.7979 15.8729 13.2105 16.1825 12.7934 16.6967C12.3763 17.2108 12.1667 17.8907 12.2071 18.5858L12.2929 19.4142C12.3333 20.1093 12.5429 20.7892 12.96 21.3033C13.3771 21.8175 13.9645 22.1271 14.5808 22.1716C15.197 22.2162 15.8307 21.9928 16.2879 21.5355C16.7452 21.0783 17 20.5696 17 20V21Z" stroke="currentColor" strokeWidth="2"/>
                <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
                <path d="M1 21V19C1 17.9391 1.42143 16.9217 1.87868 16.4645C2.33594 16.0072 2.96957 15.7838 3.58579 15.8284C4.202 15.8729 4.78947 16.1825 5.20656 16.6967C5.62365 17.2108 5.83333 17.8907 5.79289 18.5858L5.70711 19.4142C5.66667 20.1093 5.45699 20.7892 5.0399 21.3033C4.62281 21.8175 4.03534 22.1271 3.41921 22.1716C2.80307 22.2162 2.16929 21.9928 1.71213 21.5355C1.25497 21.0783 1 20.5696 1 20V21Z" stroke="currentColor" strokeWidth="2"/>
                <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 18.9018 6.11683 18.7020 6.94593C18.5022 7.77504 17.9277 8.49274 17.1093 8.93506C16.2909 9.37738 15.3052 9.50217 14.38 9.28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Communities</span>
            </Link>
          </div>
        )}

        {/* User section - only show when authenticated */}
        {isAuthenticated && (
          <div className="nav-user-section">
            {/* Notifications */}
            <NotificationDropdown />

            {/* Messages icon */}
            <button className="nav-icon-button disabled" title="Messages (Coming Soon)">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <polyline points="22,6 12,13 2,6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {/* Friends icon */}
            <Link to="/friends" className="nav-icon-button" title="Friends">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8.5" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 8V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M23 11H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </Link>

            {/* Profile avatar: click to open your profile */}
            <Link to="/profile" className="user-profile" title="View profile" aria-label="View profile">
              {user?.profilePicture ? (
                <img
                  src={user.profilePicture}
                  alt={user?.username || 'Profile'}
                  className="user-avatar"
                />
              ) : (
                <div className="user-avatar-placeholder" role="img" aria-label="Profile avatar">
                  {user?.username?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </Link>
            
            <div className="user-dropdown-container" ref={userDropdownRef}>
              <button 
                onClick={toggleUserDropdown}
                className="dropdown-toggle"
              >
                <svg className="dropdown-arrow" width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              
              {isUserDropdownOpen && (
                <div className="dropdown-menu">
                  <Link to="/profile" className="dropdown-item" onClick={closeUserDropdown}>
                    <svg className="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Profile
                  </Link>
                  <Link to="/account" className="dropdown-item" onClick={closeUserDropdown}>
                    <svg className="dropdown-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Account
                  </Link>
                  <Link to="/settings" className="dropdown-item" onClick={closeUserDropdown}>
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
