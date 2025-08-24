import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './CreateGroup.css';

const CreateGroup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    tags: []
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/groups/categories');
      setCategories(response.data.categories);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTagsChange = (e) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
    setFormData(prev => ({
      ...prev,
      tags
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/api/groups', formData);
      navigate(`/communities/${response.data.group._id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      setError(error.response?.data?.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-group-container">
      <div className="create-group-form">
        <h1>Create a Group</h1>
        <p>Start your own book community and connect with like-minded readers</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Group Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              maxLength="100"
              placeholder="Enter a unique name for your group"
            />
            <small>{formData.name.length}/100 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              maxLength="1000"
              rows="6"
              placeholder="Describe your group's purpose, what kind of books you discuss, and what members can expect..."
            />
            <small>{formData.description.length}/1000 characters</small>
          </div>

          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="tags">Tags (optional)</label>
            <input
              type="text"
              id="tags"
              name="tags"
              onChange={handleTagsChange}
              placeholder="Enter tags separated by commas (e.g., sci-fi, fantasy, book-club)"
            />
            <small>Separate multiple tags with commas. These help people discover your group.</small>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={() => navigate('/communities')}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="create-btn"
              disabled={loading || !formData.name || !formData.description || !formData.category}
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
        </form>

        <div className="guidelines">
          <h3>Community Guidelines</h3>
          <ul>
            <li>Choose a descriptive and unique name for your group</li>
            <li>Write a clear description of your group's purpose and focus</li>
            <li>Select the most appropriate category for better discoverability</li>
            <li>Be respectful and create a welcoming environment for all members</li>
            <li>Groups must follow PagesTogether's terms of service</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CreateGroup;
