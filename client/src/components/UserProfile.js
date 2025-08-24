import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { userAPI, authAPI, bookAPI, socialAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './UserProfile.css';

const UserProfile = () => {
  const { id: viewedUserId } = useParams();
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    bio: '',
    favoriteQuote: '',
    profilePicture: '',
  });
  const [stats, setStats] = useState({
    totalBooks: 0,
    currentlyReading: 0,
    booksRead: 0,
    wantToRead: 0
  });
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({ bio: '', favoriteQuote: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // If viewing someone else's profile via /users/:id, fetch public profile
    if (viewedUserId) {
      (async () => {
        try {
          const res = await socialAPI.getUserProfile(viewedUserId);
          const userData = res.data?.data?.user || {};
          const profileData = {
            username: userData.username || '',
            email: userData.email || '',
            bio: userData.bio || '',
            favoriteQuote: userData.favoriteQuote || '',
            profilePicture: userData.profilePicture || '',
          };
          setProfile(profileData);
          setForm({ bio: profileData.bio, favoriteQuote: profileData.favoriteQuote });
          setLoading(false);
        } catch (e) {
          setError('Failed to load profile');
          setLoading(false);
        }
      })();
      return;
    }

    if (user) {
      const profileData = {
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
        favoriteQuote: user.favoriteQuote || '',
        profilePicture: user.profilePicture || '',
      };
      setProfile(profileData);
      setForm({ 
        bio: profileData.bio, 
        favoriteQuote: profileData.favoriteQuote 
      });
      loadStats();
      setLoading(false);
    } else {
      loadProfile();
    }
  }, [user, viewedUserId]);

  const loadProfile = async () => {
    try {
      const response = await userAPI.getProfile();
      const userData = response.data.user || response.data;
      const profileData = {
        username: userData.username || '',
        email: userData.email || '',
        bio: userData.bio || '',
        favoriteQuote: userData.favoriteQuote || '',
        profilePicture: userData.profilePicture || '',
      };
      setProfile(profileData);
      setForm({ 
        bio: profileData.bio, 
        favoriteQuote: profileData.favoriteQuote 
      });
      await loadStats();
    } catch (error) {
      setError('Failed to load profile');
    }
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const [currentlyReadingRes, bookshelfRes] = await Promise.all([
        userAPI.getCurrentlyReading().catch(() => ({ data: [] })),
        bookAPI.getBookshelf().catch(() => ({ data: [] }))
      ]);
      
      const allBooks = Array.isArray(bookshelfRes.data) ? bookshelfRes.data : [];
      const readingBooks = Array.isArray(currentlyReadingRes.data) ? currentlyReadingRes.data : [];
      
      setStats({
        totalBooks: allBooks.length,
        currentlyReading: readingBooks.length,
        booksRead: allBooks.filter(book => book.status === 'read').length,
        wantToRead: allBooks.filter(book => book.status === 'want-to-read').length
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userAPI.updateProfile(form);
      const updatedProfile = { ...profile, ...form };
      setProfile(updatedProfile);
      if (updateUser) {
        updateUser(updatedProfile);
      }
      setEditMode(false);
      setError('');
    } catch (error) {
      setError('Failed to update profile');
    }
    setSaving(false);
  };

  const handleProfilePictureClick = () => {
    if (viewedUserId) return; // don't allow editing others' pictures
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    if (viewedUserId) return; // not editable when viewing another user
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size should be less than 5MB');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      
      // Create FormData to send file
      const formData = new FormData();
      formData.append('profilePicture', file);

      // Upload the file
      const response = await userAPI.uploadProfilePicture(formData);
      
      if (response.data.success) {
        // Update profile state locally
        const updatedProfile = { ...profile, profilePicture: response.data.profilePicture };
        setProfile(updatedProfile);
        
        // Refresh user data from server to get the updated profile picture
  try {
          const userResponse = await authAPI.getCurrentUser();
          if (updateUser && userResponse.data.user) {
            updateUser(userResponse.data.user);
          }
        } catch (userError) {
          console.error('Failed to refresh user data:', userError);
        }
      }
    } catch (error) {
      console.error('Profile picture upload error:', error);
      setError('Failed to upload profile picture. Please try again.');
    } finally {
      setIsUploading(false);
      // Clear the file input
      event.target.value = '';
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="profile-card">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-card">
      <div className="profile-header">
        <div className="profile-avatar" onClick={handleProfilePictureClick}>
          <div className="avatar-container">
            {profile.profilePicture ? (
              <img src={profile.profilePicture} alt="Profile" />
            ) : (
              <div className="avatar-initials">
                {getInitials(profile.username)}
              </div>
            )}
            
            {/* Camera Icon Overlay */}
            <div className="camera-overlay">
              {isUploading ? (
                <div className="uploading-spinner">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeDasharray="32" strokeDashoffset="32">
                      <animate attributeName="stroke-dashoffset" dur="2s" values="32;0" repeatCount="indefinite"/>
                    </circle>
                  </svg>
                </div>
              ) : (
                <svg className="camera-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 3H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </div>
          </div>
          
          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
        <div className="profile-info">
          <h2 className="profile-name">{profile.username}</h2>
          <p className="profile-email">{profile.email}</p>
        </div>
        <button 
          className="edit-button"
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="profile-content">
        {editMode ? (
          <div className="edit-form">
            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                rows="3"
              />
            </div>
            <div className="form-group">
              <label htmlFor="favoriteQuote">Favorite Quote</label>
              <textarea
                id="favoriteQuote"
                name="favoriteQuote"
                value={form.favoriteQuote}
                onChange={handleInputChange}
                placeholder="Share your favorite quote..."
                rows="2"
              />
            </div>
            <div className="form-actions">
              <button 
                className="save-button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-display">
            {profile.bio && (
              <div className="bio-section">
                <h3>About</h3>
                <p>{profile.bio}</p>
              </div>
            )}
            {profile.favoriteQuote && (
            <div className="quote-section">
              <div className="quote-icon">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-10zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z" fill="#4c63d2"/>
                </svg>
              </div>
              <div className="quote-content">
                <blockquote>
                  {profile.favoriteQuote}
                </blockquote>
              </div>
            </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile; 