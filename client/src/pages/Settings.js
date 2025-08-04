import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    bookRecommendations: true,
    readingReminders: false,
    publicProfile: true,
    darkMode: false
  });

  const handleSettingChange = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSaveSettings = () => {
    // TODO: Implement save settings API call
    alert('Settings saved successfully!');
  };

  return (
    <div className="page-container">
      <div className="page-content">
        <h2>Settings</h2>
        
        <div className="settings-section">
          <h3>Notifications</h3>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.emailNotifications}
                onChange={() => handleSettingChange('emailNotifications')}
              />
              Email Notifications
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.bookRecommendations}
                onChange={() => handleSettingChange('bookRecommendations')}
              />
              Book Recommendations
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.readingReminders}
                onChange={() => handleSettingChange('readingReminders')}
              />
              Reading Reminders
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Privacy</h3>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.publicProfile}
                onChange={() => handleSettingChange('publicProfile')}
              />
              Public Profile
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3>Appearance</h3>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={() => handleSettingChange('darkMode')}
              />
              Dark Mode
            </label>
          </div>
        </div>

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSaveSettings}>
            Save Settings
          </button>
          <button className="btn btn-secondary">
            Reset to Default
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
