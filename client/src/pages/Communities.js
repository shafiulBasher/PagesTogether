import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import './Communities.css';

const Communities = () => {
  const [groups, setGroups] = useState([]);
  const [featuredGroups, setFeaturedGroups] = useState([]);
  const [popularGroups, setPopularGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fixed book categories
  const bookCategories = [
    'Romance',
    'Science fiction',
    'Short stories',
    'Thrillers',
    'Science Fiction',
    'Fantasy',
    'Historical Fiction',
    'Young-Adult',
    'Autobiography',
    'Self-Help/Personal Development',
    'Cooking',
    'Business',
    'Health & Fitness',
    'Mystery and suspense',
    'Political thriller',
    'Poetry',
    'Plays',
    'Action/Adventure',
    'Classic fiction',
    'Non-fiction'
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchGroups();
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchTerm, selectedCategory]);

  const fetchInitialData = async () => {
    try {
      const [featuredRes, popularRes] = await Promise.all([
        api.get('/api/groups/featured'),
        api.get('/api/groups/popular')
      ]);

      setFeaturedGroups(featuredRes.data.groups);
      setPopularGroups(popularRes.data.groups);
      
      // Initial load of all groups
      fetchGroups();
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setError('Failed to load communities data');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;

  const response = await api.get('/api/groups', { params });
      setGroups(response.data.groups);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load groups');
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(selectedCategory === category ? '' : category);
  };

  const formatMemberCount = (count) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count;
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const diff = now - new Date(date);
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return 'Active now';
    }
  };

  if (loading) {
    return (
      <div className="communities-container">
        <div className="loading">Loading communities...</div>
      </div>
    );
  }

  return (
    <div className="communities-container">
      <div className="communities-header">
        <h1>Groups</h1>
        <div className="search-section">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Group name, description"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="search-btn">Search groups</button>
          </div>
        </div>
      </div>

      {/* Browse groups by category - moved to top */}
      <div className="browse-categories-section">
        <h2>Browse groups by category</h2>
        <div className="categories-container">
          {bookCategories.map((category) => (
            <button
              key={category}
              className={`category-tag ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      <div className="communities-content">
        <div className="main-content">
          {/* Featured Groups */}
          {featuredGroups.length > 0 && !searchTerm && !selectedCategory && (
            <section className="featured-section">
              <h2>Featured groups</h2>
              <div className="featured-groups">
                {featuredGroups.map((group) => (
                  <Link to={`/communities/${group._id}`} key={group._id} className="featured-group-card">
                    <div className="group-image">
                      {group.image ? (
                        <img src={group.image} alt={group.name} />
                      ) : (
                        <div className="placeholder-image">
                          <span>{group.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="group-info">
                      <h3>{group.name}</h3>
                      <p className="member-count">{formatMemberCount(group.memberCount)} members • Active {getTimeAgo(group.lastActivity)}</p>
                      <p className="group-description">{group.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Popular Groups */}
          <section className="popular-section">
            <h2>{searchTerm || selectedCategory ? 'Search Results' : 'Popular groups'}</h2>
            <div className="popular-groups">
              {(searchTerm || selectedCategory ? groups : popularGroups).map((group) => (
                <Link to={`/communities/${group._id}`} key={group._id} className="popular-group-card">
                  <div className="group-image">
                    {group.image ? (
                      <img src={group.image} alt={group.name} />
                    ) : (
                      <div className="placeholder-image">
                        <span>{group.name.charAt(0).toUpperCase()}</span>
                      </div>
                    )}
                  </div>
                  <div className="group-info">
                    <h3>{group.name}</h3>
                    <p className="member-count">{formatMemberCount(group.memberCount)} members • Active {getTimeAgo(group.lastActivity)}</p>
                    <p className="group-description">{group.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {error && <div className="error-message">{error}</div>}
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <div className="more-groups">
            <h3>More groups</h3>
            <p>Goodreads Librarians Group: request changes to book records</p>
            <Link to="/communities/create" className="create-group-link">
              Create a group
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Communities;
