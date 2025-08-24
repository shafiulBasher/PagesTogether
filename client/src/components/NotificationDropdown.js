import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationAPI, groupAPI } from '../services/api';
import './NotificationDropdown.css';

const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Load initial data
  useEffect(() => {
    loadUnreadCount();
    // Set up periodic check for new notifications
    const interval = setInterval(() => {
      loadUnreadCount();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadUnreadCount = async () => {
    try {
      const response = await notificationAPI.getUnreadCount();
      setUnreadCount(response.data.count);
    } catch (error) {
      console.error('Failed to load unread count:', error);
    }
  };

  const loadNotifications = async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      const response = await notificationAPI.getNotifications();
      setNotifications(response.data.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen && notifications.length === 0) {
      loadNotifications();
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationAPI.markAsRead(notificationId);
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif._id === notificationId
            ? { ...notif, isRead: true }
            : notif
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      
      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      
      // Reset unread count
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleNotificationClick = async (notification) => {
    // Mark as read if not already read
    if (!notification.isRead) {
      await handleMarkAsRead(notification._id);
    }

    // Close dropdown
    setIsOpen(false);

    // Navigate based on notification type
  switch (notification.type) {
      case 'friend_request':
        // Navigate to friends page with friend requests tab
        navigate('/friends', { state: { activeTab: 'requests' } });
        break;
      case 'friend_request_accepted':
        // Navigate to friends page with friends tab
        navigate('/friends', { state: { activeTab: 'friends' } });
        break;
      case 'new_follower':
        // Navigate to friends page with followers tab
        navigate('/friends', { state: { activeTab: 'followers' } });
        break;
      case 'group_invite':
        // For group invite, do not navigate immediately; show inline actions instead
        break;
      case 'group_invite_accepted':
      case 'group_invite_declined':
        // Optionally navigate to group (correct route prefix is /communities/:id)
        if (notification.relatedId) {
          navigate(`/communities/${notification.relatedId}`);
        } else {
          navigate('/dashboard');
        }
        break;
      case 'post_like':
      case 'post_comment':
      case 'comment_like':
      case 'comment_reply':
      case 'reply_like': {
        // relatedId stores groupId; navigate to community. Deep-linking to a post could be enhanced later.
        if (notification.relatedId) {
          navigate(`/communities/${notification.relatedId}`);
        } else {
          navigate('/dashboard');
        }
        break;
      }
      default:
        navigate('/dashboard');
        break;
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `${days}d ago`;
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'friend_request':
        return '👋';
      case 'friend_request_accepted':
        return '🤝';
      case 'new_follower':
        return '👥';
      case 'group_invite':
        return '📨';
      case 'group_invite_accepted':
        return '✅';
      case 'group_invite_declined':
        return '🚫';
      case 'post_like':
        return '❤️';
      case 'post_comment':
        return '💬';
      case 'comment_like':
        return '👍';
      case 'comment_reply':
        return '↩️';
      case 'reply_like':
        return '⭐';
      default:
        return '🔔';
    }
  };

  return (
    <div className="notification-dropdown" ref={dropdownRef}>
      <button
        className="notification-trigger"
        onClick={handleToggleDropdown}
        title="Notifications"
      >
        <svg className="notification-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M18 8C18 6.4087 17.3679 4.88258 16.2426 3.75736C15.1174 2.63214 13.5913 2 12 2C10.4087 2 8.88258 2.63214 7.75736 3.75736C6.63214 4.88258 6 6.4087 6 8C6 15 3 17 3 17H21C21 17 18 15 18 8Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M13.73 21C13.5542 21.3031 13.3018 21.5547 12.9987 21.7305C12.6956 21.9063 12.3522 21.9999 12 21.9999C11.6478 21.9999 11.3044 21.9063 11.0013 21.7305C10.6982 21.5547 10.4458 21.3031 10.27 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        {unreadCount > 0 && (
          <span className="notification-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown-menu">
          <div className="notification-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button
                className="mark-all-read-btn"
                onClick={handleMarkAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">
                <div className="loading-spinner">Loading...</div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <div className="empty-icon">🔔</div>
                <p>No notifications yet</p>
                <small>You'll see friend requests and social activity here</small>
              </div>
            ) : (
        notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
          onClick={() => handleNotificationClick(notification)}
          style={{ cursor: 'pointer' }}
                >
                  <div className="notification-avatar">
                    {notification.sender.profilePicture ? (
                      <img 
                        src={notification.sender.profilePicture} 
                        alt={notification.sender.username}
                        className="avatar-img"
                      />
                    ) : (
                      <div className="avatar-placeholder">
                        {notification.sender.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="notification-content">
                    <div className="notification-message">
                      <span className="notification-type-icon">
                        {getNotificationIcon(notification.type)}
                      </span>
                      {notification.message}
                    </div>
                    <div className="notification-time">
                      {formatTimeAgo(notification.createdAt)}
                    </div>
                    {notification.type === 'group_invite' && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }} onClick={(e) => e.stopPropagation()}>
                        <button
                          className="mark-all-read-btn"
                          style={{ background: '#10b981', color: '#fff' }}
                          onClick={async () => {
                            try {
                              await groupAPI.acceptInvite(notification.relatedId, notification._id);
                              // Mark read, refresh list
                              await loadNotifications();
                              navigate(`/communities/${notification.relatedId}`);
                            } catch (err) {
                              console.error('Accept invite failed:', err);
                            }
                          }}
                        >
                          Accept
                        </button>
                        <button
                          className="mark-all-read-btn"
                          style={{ background: '#ef4444', color: '#fff' }}
                          onClick={async () => {
                            try {
                              await groupAPI.declineInvite(notification.relatedId, notification._id);
                              await loadNotifications();
                            } catch (err) {
                              console.error('Decline invite failed:', err);
                            }
                          }}
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>

                  {!notification.isRead && (
                    <div className="unread-indicator"></div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
