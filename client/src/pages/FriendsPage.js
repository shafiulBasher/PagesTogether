import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { socialAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import SocialGuide from '../components/SocialGuide';
import './Social.css';

const FriendsPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('friends');
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);

  // Handle navigation state (from notifications)
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the state to prevent issues with back/forward navigation
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Load data on component mount
  useEffect(() => {
    loadSocialData();
  }, []);

  const loadSocialData = async () => {
    try {
      setLoading(true);
      const [friendsRes, requestsRes, followingRes, followersRes] = await Promise.all([
        socialAPI.getFriends().catch(() => ({ data: { data: [] } })),
        socialAPI.getFriendRequests().catch(() => ({ data: { data: [] } })),
        socialAPI.getFollowing().catch(() => ({ data: { data: [] } })),
        socialAPI.getFollowers().catch(() => ({ data: { data: [] } }))
      ]);

      setFriends(friendsRes.data.data || []);
      setFriendRequests(requestsRes.data.data || []);
      setFollowing(followingRes.data.data || []);
      setFollowers(followersRes.data.data || []);
    } catch (error) {
      setError('Failed to load social data');
      console.error('Load social data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchLoading(true);
      const response = await socialAPI.searchUsers(query);
      setSearchResults(response.data.data || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Helpers to determine relationship from loaded lists
  const isFriend = (userId) => {
    if (!userId || !Array.isArray(friends)) return false;
    return friends.some(f => (f._id || f.id) === userId);
  };

  const handleSearchInputChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      handleSearch(query);
    }, 500);
  };

  const handleSendFriendRequest = async (userId) => {
    try {
      await socialAPI.sendFriendRequest(userId);
      alert('Friend request sent!');
      // Remove from search results or mark as requested
      setSearchResults(prev => 
        prev.map(user => 
          user._id === userId 
            ? { ...user, friendRequestSent: true }
            : user
        )
      );
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to send friend request');
    }
  };

  const handleFollowUser = async (userId) => {
    try {
      await socialAPI.followUser(userId);
      // Update following list
      loadSocialData();
      // Update search results
      setSearchResults(prev => 
        prev.map(user => 
          user._id === userId 
            ? { ...user, isFollowing: true }
            : user
        )
      );
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to follow user');
    }
  };

  const handleUnfollowUser = async (userId) => {
    try {
      await socialAPI.unfollowUser(userId);
      // Update following list
      loadSocialData();
      // Update search results
      setSearchResults(prev => 
        prev.map(user => 
          user._id === userId 
            ? { ...user, isFollowing: false }
            : user
        )
      );
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to unfollow user');
    }
  };

  const handleRespondToFriendRequest = async (requestId, action) => {
    try {
      await socialAPI.respondToFriendRequest(requestId, action);
      // Reload data to update UI
      loadSocialData();
      alert(`Friend request ${action}ed!`);
    } catch (error) {
      alert(error.response?.data?.message || `Failed to ${action} friend request`);
    }
  };

  const handleRemoveFriend = async (friendId) => {
    if (window.confirm('Are you sure you want to remove this friend?')) {
      try {
        await socialAPI.removeFriend(friendId);
  // Optimistic updates
  setFriends(prev => prev.filter(f => (f._id || f.id) !== friendId));
  setSearchResults(prev => prev.map(u => u._id === friendId ? { ...u } : u));
  // Fallback full refresh to sync counts
  loadSocialData();
        alert('Friend removed successfully');
      } catch (error) {
        alert(error.response?.data?.message || 'Failed to remove friend');
      }
    }
  };

  if (loading) {
    return (
      <div className="social-page">
        <div className="loading-spinner">Loading social data...</div>
      </div>
    );
  }

  return (
    <div className="social-page">
      <div className="social-header">
        <h1>Social Hub</h1>
        <div className="social-stats">
          <span className="stat-item">
            <strong>{friends.length}</strong> Friends
          </span>
          <span className="stat-item">
            <strong>{following.length}</strong> Following
          </span>
          <span className="stat-item">
            <strong>{followers.length}</strong> Followers
          </span>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Social Guide - show when user has no friends/connections */}
      {friends.length === 0 && following.length === 0 && followers.length === 0 && (
        <SocialGuide />
      )}

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={handleSearchInputChange}
            className="search-input"
          />
          {searchLoading && <div className="search-spinner">🔍</div>}
        </div>

        {searchResults.length > 0 && (
          <div className="search-results">
            <h3>Search Results</h3>
            <div className="users-grid">
              {searchResults.map(user => {
                const friendAlready = isFriend(user._id);
                const pendingFromMe = user.pendingFriendRequestFromMe || user.friendRequestSent;
                return (
                <div key={user._id} className="user-card">
                  <div
                    className="user-avatar"
                    role="button"
                    title="View profile"
                    onClick={() => navigate(`/users/${user._id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.username} />
                    ) : (
                      <div className="avatar-placeholder">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="user-info">
                    <h4
                      role="button"
                      title="View profile"
                      onClick={() => navigate(`/users/${user._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {user.username}
                    </h4>
                    <p className="user-email">{user.email}</p>
                    <div className="user-stats">
                      <span>{user.friendsCount} friends</span>
                      <span>{user.followersCount} followers</span>
                    </div>
                  </div>
                  <div className="user-actions">
                    {friendAlready ? (
                      <button 
                        className="btn-unfollow"
                        onClick={() => handleRemoveFriend(user._id)}
                      >
                        Unfriend
                      </button>
                    ) : (
                      !pendingFromMe && (
                        <button 
                          className="btn-friend-request"
                          onClick={() => handleSendFriendRequest(user._id)}
                        >
                          Add Friend
                        </button>
                      )
                    )}
                    {!user.isFollowing ? (
                      <button 
                        className="btn-follow"
                        onClick={() => handleFollowUser(user._id)}
                      >
                        Follow
                      </button>
                    ) : (
                      <button 
                        className="btn-unfollow"
                        onClick={() => handleUnfollowUser(user._id)}
                      >
                        Unfollow
                      </button>
                    )}
                  </div>
                </div>
              );})}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="social-tabs">
        <button 
          className={`tab-button ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}
        >
          Friends ({friends.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          Friend Requests ({friendRequests.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'following' ? 'active' : ''}`}
          onClick={() => setActiveTab('following')}
        >
          Following ({following.length})
        </button>
        <button 
          className={`tab-button ${activeTab === 'followers' ? 'active' : ''}`}
          onClick={() => setActiveTab('followers')}
        >
          Followers ({followers.length})
        </button>
      </div>

      {/* Content */}
      <div className="social-content">
        {activeTab === 'friends' && (
          <div className="friends-section">
            <h3>Your Friends</h3>
            {friends.length === 0 ? (
              <p className="empty-state">No friends yet. Search for users to add as friends!</p>
            ) : (
              <div className="users-grid">
                {friends.map(friend => (
                  <div key={friend._id} className="user-card">
                    <div
                      className="user-avatar"
                      role="button"
                      title="View profile"
                      onClick={() => navigate(`/users/${friend._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {friend.profilePicture ? (
                        <img src={friend.profilePicture} alt={friend.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <h4
                        role="button"
                        title="View profile"
                        onClick={() => navigate(`/users/${friend._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {friend.username}
                      </h4>
                      <p className="user-email">{friend.email}</p>
                      <div className="user-stats">
                        <span>{friend.friendsCount} friends</span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button 
                        className="btn-remove"
                        onClick={() => handleRemoveFriend(friend._id)}
                      >
                        Remove Friend
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="requests-section">
            <h3>Friend Requests</h3>
            {friendRequests.length === 0 ? (
              <p className="empty-state">No pending friend requests.</p>
            ) : (
              <div className="requests-list">
                {friendRequests.map(request => (
                  <div key={request._id} className="request-card">
                    <div
                      className="user-avatar"
                      role="button"
                      title="View profile"
                      onClick={() => navigate(`/users/${request.from._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {request.from.profilePicture ? (
                        <img src={request.from.profilePicture} alt={request.from.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {request.from.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="request-info">
                      <h4
                        role="button"
                        title="View profile"
                        onClick={() => navigate(`/users/${request.from._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {request.from.username}
                      </h4>
                      <p className="user-email">{request.from.email}</p>
                      {request.message && (
                        <p className="request-message">"{request.message}"</p>
                      )}
                      <p className="request-date">
                        Sent {new Date(request.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="request-actions">
                      <button 
                        className="btn-accept"
                        onClick={() => handleRespondToFriendRequest(request._id, 'accept')}
                      >
                        Accept
                      </button>
                      <button 
                        className="btn-decline"
                        onClick={() => handleRespondToFriendRequest(request._id, 'decline')}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'following' && (
          <div className="following-section">
            <h3>Following</h3>
            {following.length === 0 ? (
              <p className="empty-state">You're not following anyone yet.</p>
            ) : (
              <div className="users-grid">
                {following.map(user => (
                  <div key={user._id} className="user-card">
                    <div
                      className="user-avatar"
                      role="button"
                      title="View profile"
                      onClick={() => navigate(`/users/${user._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <h4
                        role="button"
                        title="View profile"
                        onClick={() => navigate(`/users/${user._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {user.username}
                      </h4>
                      <p className="user-email">{user.email}</p>
                      <div className="user-stats">
                        <span>{user.followersCount} followers</span>
                      </div>
                    </div>
                    <div className="user-actions">
                      <button 
                        className="btn-unfollow"
                        onClick={() => handleUnfollowUser(user._id)}
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'followers' && (
          <div className="followers-section">
            <h3>Followers</h3>
            {followers.length === 0 ? (
              <p className="empty-state">No followers yet.</p>
            ) : (
              <div className="users-grid">
                {followers.map(user => (
                  <div key={user._id} className="user-card">
                    <div
                      className="user-avatar"
                      role="button"
                      title="View profile"
                      onClick={() => navigate(`/users/${user._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.username} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="user-info">
                      <h4
                        role="button"
                        title="View profile"
                        onClick={() => navigate(`/users/${user._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        {user.username}
                      </h4>
                      <p className="user-email">{user.email}</p>
                      <div className="user-stats">
                        <span>{user.followersCount} followers</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsPage;
