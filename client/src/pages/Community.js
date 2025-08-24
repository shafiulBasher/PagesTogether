import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './Community.css';

// Helper function to format time
const formatTimeAgo = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return postDate.toLocaleDateString();
};

// Helper function to get tag color
const getTagColor = (type) => {
    switch (type) {
        case 'discussion': return '#4f46e5';
        case 'recommendation': return '#059669';
        case 'megathread': return '#dc2626';
        default: return '#6b7280';
    }
};

// Helper function to get tag display name
const getTagDisplayName = (type) => {
    switch (type) {
        case 'discussion': return 'Discussion';
        case 'recommendation': return 'Review';
        case 'megathread': return 'Suggestion';
        default: return 'General';
    }
};

// Comment Component
const Comment = ({ comment, postId, currentUserId, onLikeComment, onLikeReply, onReply, onDeleteComment, onDeleteReply, canModerate, depth = 0, parentCommentId }) => {
    const [showReplies, setShowReplies] = useState(false);
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [isLiking, setIsLiking] = useState(false);
    const [isReplying, setIsReplying] = useState(false);

    const isOwner = currentUserId && ((comment.user?._id || comment.user) === currentUserId);

    const isLiked = comment.likes?.some(like => 
        like && like.user && currentUserId && 
        ((like.user._id || like.user) === currentUserId)
    );

    const handleLike = async () => {
        if (isLiking) return;
        setIsLiking(true);
        try {
            if (depth > 0 && onLikeReply && parentCommentId) {
                await onLikeReply(postId, parentCommentId, comment._id);
            } else {
                await onLikeComment(postId, comment._id);
            }
        } finally {
            setIsLiking(false);
        }
    };

    const handleReply = async () => {
        if (!replyContent.trim() || isReplying) return;
        setIsReplying(true);
        try {
            await onReply(postId, comment._id, replyContent.trim());
            setReplyContent('');
            setShowReplyForm(false);
            setShowReplies(true);
        } finally {
            setIsReplying(false);
        }
    };

    return (
        <div className={`comment-item ${depth > 0 ? 'comment-reply' : ''}`} style={{marginLeft: depth * 20}}>
            <div className="comment-author">
                <div className="comment-avatar">
                    {comment.user?.profilePicture ? (
                        <img src={comment.user.profilePicture} alt={comment.user.username} />
                    ) : (
                        <div className="avatar-placeholder">
                            {comment.user?.username?.charAt(0)?.toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="comment-info">
                    <span className="comment-username">{comment.user?.username}</span>
                    <span className="comment-time">{formatTimeAgo(comment.createdAt)}</span>
                </div>
            </div>
            <p className="comment-content">{comment.content}</p>
            
            <div className="comment-actions">
                <button 
                    className={`comment-action-btn ${isLiked ? 'liked' : ''}`}
                    onClick={handleLike}
                    disabled={isLiking}
                >
                    <svg fill={isLiked ? '#ff4757' : 'currentColor'} viewBox="0 0 20 20" width="14" height="14">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    {comment.likes?.length || 0}
                </button>
                
                {depth < 2 && (
                    <button 
                        className="comment-action-btn"
                        onClick={() => setShowReplyForm(!showReplyForm)}
                    >
                        <svg fill="currentColor" viewBox="0 0 20 20" width="14" height="14">
                            <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 8l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Reply
                    </button>
                )}
                {(canModerate || isOwner) && (
                    <button
                        className="comment-action-btn"
                        onClick={() => {
                            const ok = window.confirm(depth > 0 ? 'Delete this reply?' : 'Delete this comment and its replies?');
                            if (!ok) return;
                            if (depth > 0 && onDeleteReply && parentCommentId) {
                                onDeleteReply(postId, parentCommentId, comment._id);
                            } else if (onDeleteComment) {
                                onDeleteComment(postId, comment._id);
                            }
                        }}
                        title={depth > 0 ? 'Delete reply' : 'Delete comment'}
                        aria-label={depth > 0 ? 'Delete reply' : 'Delete comment'}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M6 7h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm5-3h2a1 1 0 0 1 1 1v1H10V5a1 1 0 0 1 1-1zM4 7h16v2H4z"/>
                        </svg>
                        Delete
                    </button>
                )}
                
                {comment.replies?.length > 0 && (
                    <button 
                        className="comment-action-btn"
                        onClick={() => setShowReplies(!showReplies)}
                    >
                        {showReplies ? 'Hide' : 'Show'} {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </button>
                )}
            </div>

            {showReplyForm && (
                <div className="reply-form">
                    <textarea
                        name={`reply-${comment._id}`}
                        id={`reply-${comment._id}`}
                        value={replyContent}
                        onChange={(e) => setReplyContent(e.target.value)}
                        placeholder="Write a reply..."
                        rows="2"
                        className="reply-textarea"
                    />
                    <div className="reply-form-actions">
                        <button 
                            onClick={handleReply}
                            disabled={!replyContent.trim() || isReplying}
                            className="reply-submit-btn"
                        >
                            {isReplying ? 'Replying...' : 'Reply'}
                        </button>
                        <button 
                            onClick={() => {
                                setShowReplyForm(false);
                                setReplyContent('');
                            }}
                            className="reply-cancel-btn"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

    {showReplies && comment.replies?.map((reply) => (
                <Comment
                    key={reply._id}
                    comment={reply}
                    postId={postId}
                    currentUserId={currentUserId}
            onLikeComment={onLikeComment}
            onLikeReply={onLikeReply}
                    onReply={onReply}
            onDeleteComment={onDeleteComment}
            onDeleteReply={onDeleteReply}
            canModerate={canModerate}
            depth={depth + 1}
            parentCommentId={comment._id}
                />
            ))}
        </div>
    );
};

// PostCard Component
const PostCard = ({ post, currentUserId, onLike, onComment, onLikeComment, onLikeReply, onReply, canPin, onTogglePin, canModerate, onDeletePost, onDeleteComment, onDeleteReply, isFocused }) => {
    const navigate = useNavigate();
    const [showComments, setShowComments] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [isLiking, setIsLiking] = useState(false);
    const [isCommenting, setIsCommenting] = useState(false);
    const cardRef = React.useRef(null);

    const isLiked = post.likes?.some(like => 
        like && like.user && currentUserId && 
        ((like.user._id || like.user) === currentUserId)
    );
    const canDeletePost = !!canModerate;

    const handleLike = async () => {
        if (isLiking) return;
        setIsLiking(true);
        try {
            await onLike(post._id);
        } finally {
            setIsLiking(false);
        }
    };

    const handleAddComment = async () => {
        if (!newComment.trim() || isCommenting) return;
        setIsCommenting(true);
        try {
            await onComment(post._id, newComment.trim());
            setNewComment('');
        } finally {
            setIsCommenting(false);
        }
    };

    useEffect(() => {
        if (isFocused && cardRef.current) {
            // Briefly highlight and scroll into view
            cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [isFocused]);

    return (
        <div className="post-card" id={`post-${post._id}`} ref={cardRef} style={isFocused ? { outline: '2px solid #f59e0b', outlineOffset: 2, borderRadius: 8 } : undefined}>
            <div className="post-header">
                <div className="post-author">
                    <div
                        className="author-avatar"
                        onClick={() => post.author?._id && navigate(`/users/${post.author._id}`)}
                        title="View profile"
                        style={{ cursor: post.author?._id ? 'pointer' : 'default' }}
                    >
                        {post.author?.profilePicture ? (
                            <img src={post.author.profilePicture} alt={post.author.username} />
                        ) : (
                            <div className="avatar-placeholder">
                                {post.author?.username?.charAt(0)?.toUpperCase()}
                            </div>
                        )}
                    </div>
                    <div className="author-info">
                        <span className="author-name">{post.author?.username}</span>
                        <span className="post-time">{formatTimeAgo(post.createdAt)}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="post-tag" style={{ backgroundColor: getTagColor(post.type) }}>
                        {getTagDisplayName(post.type)}
                    </div>
                    {canPin && (
                        <button
                            className={`pin-toggle-btn${post.isPinned ? ' active' : ''}`}
                            title={post.isPinned ? 'Unpin from highlights' : 'Pin to highlights'}
                            aria-label={post.isPinned ? 'Unpin post' : 'Pin post'}
                            onClick={() => onTogglePin(post._id, !post.isPinned)}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: 6,
                                borderRadius: 6,
                                color: post.isPinned ? '#f59e0b' : '#6b7280'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill={post.isPinned ? '#f59e0b' : 'currentColor'}>
                                <path d="M14 2l-1 4-2 2 5 5-2 2-5-5-2 2-4-1 7-7z" />
                            </svg>
                        </button>
                    )}
                    {canDeletePost && (
                        <button
                            className={`pin-toggle-btn`}
                            title="Delete post"
                            aria-label="Delete post"
                            onClick={() => {
                                const ok = window.confirm('Delete this post? This will remove all its comments.');
                                if (!ok) return;
                                onDeletePost && onDeletePost(post._id);
                            }}
                            style={{
                                border: 'none',
                                background: 'transparent',
                                cursor: 'pointer',
                                padding: 6,
                                borderRadius: 6,
                                color: '#b91c1c'
                            }}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M6 7h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 7zm5-3h2a1 1 0 0 1 1 1v1H10V5a1 1 0 0 1 1-1zM4 7h16v2H4z"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="post-content">
                <h3 className="post-title">{post.title}</h3>
                <p className="post-text">{post.content}</p>
            </div>

            <div className="post-actions">
                <button 
                    className={`action-btn like-btn ${isLiked ? 'liked' : ''}`}
                    onClick={handleLike}
                    disabled={isLiking}
                >
                    <svg fill={isLiked ? '#ff4757' : 'currentColor'} viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                    {post.likes?.length || 0}
                </button>
                
                <button 
                    className="action-btn comment-btn"
                    onClick={() => setShowComments(!showComments)}
                >
                    <svg fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                    {post.comments?.length || 0}
                </button>
            </div>

            {showComments && (
                <div className="comments-section">
                    <div className="add-comment">
                        <textarea
                            name={`comment-${post._id}`}
                            id={`comment-${post._id}`}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..."
                            rows="2"
                        />
                        <button 
                            onClick={handleAddComment}
                            disabled={!newComment.trim() || isCommenting}
                            className="comment-submit-btn"
                        >
                            {isCommenting ? 'Posting...' : 'Comment'}
                        </button>
                    </div>
                    
                    <div className="comments-list">
            {post.comments?.map((comment) => (
                            <Comment
                                key={comment._id}
                                comment={comment}
                                postId={post._id}
                                currentUserId={currentUserId}
                onLikeComment={onLikeComment}
                onLikeReply={onLikeReply}
                                onReply={onReply}
                                onDeleteComment={onDeleteComment}
                                onDeleteReply={onDeleteReply}
                                canModerate={canModerate}
                                depth={0}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const Community = () => {
    const { id: groupId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user: authUser } = useAuth(); // Get authenticated user from context
    const [group, setGroup] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showGuidelines, setShowGuidelines] = useState(false);
    const [newPost, setNewPost] = useState('');
    // Post modal state
    const [showPostModal, setShowPostModal] = useState(false);
    const [showTagsModal, setShowTagsModal] = useState(false);
    const [postTitle, setPostTitle] = useState('');
    const [postBody, setPostBody] = useState('');
    const [postTag, setPostTag] = useState('Discussion'); // UI label: Discussion | Review | Suggestion
    const [pinnedPosts, setPinnedPosts] = useState([]);
    const [isLeaving, setIsLeaving] = useState(false);
    const [posts, setPosts] = useState([]);
    const [postsLoading, setPostsLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = React.useRef(null);
    const coverInputRef = React.useRef(null);
    const [menu, setMenu] = useState({ visible: false, x: 0, y: 0, userId: null, isTargetMod: false, name: '' });
    // Invite modal state
    const [showInvite, setShowInvite] = useState(false);
    const [friends, setFriends] = useState([]);
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [inviting, setInviting] = useState(false);
    const [focusPostId, setFocusPostId] = useState(null);

    // Build a fast lookup of all users who are already part of this group (creator, moderators, members)
    const groupMemberIdSet = React.useMemo(() => {
        const set = new Set();
        if (group?.creator) set.add(String(group.creator._id || group.creator));
        (group?.moderators || []).forEach(m => set.add(String(m?._id || m)));
        (group?.members || []).forEach(m => set.add(String(m?.user?._id || m?.user || m?._id || m)));
        return set;
    }, [group]);

    // Close the member context menu on outside interactions
    useEffect(() => {
        const close = () => setMenu(m => (m.visible ? { ...m, visible: false } : m));
        const onKey = (e) => { if (e.key === 'Escape') close(); };
        window.addEventListener('click', close);
        window.addEventListener('scroll', close, true);
        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('click', close);
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('keydown', onKey);
        };
    }, []);

    const fetchPosts = useCallback(async () => {
        try {
            setPostsLoading(true);
            const response = await api.get(`/api/groups/${groupId}/posts`);
            setPosts(response.data.posts || []);
        } catch (err) {
            console.error('Posts fetch error:', err);
            setPosts([]);
        } finally {
            setPostsLoading(false);
        }
    }, [groupId]);

    // Watch query string for ?post=<id> to focus a post when arriving via link or clicking a highlight
    useEffect(() => {
        try {
            const params = new URLSearchParams(location.search);
            const pid = params.get('post');
            if (pid) setFocusPostId(pid);
        } catch {}
    }, [location.search]);

    // When posts change and we have a focus target, scroll into view (secondary to PostCard effect)
    useEffect(() => {
        if (!focusPostId) return;
        const el = document.getElementById(`post-${focusPostId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, [focusPostId, posts]);

    // Load friends when opening invite modal (members/mods/creator only)
    const openInvite = async () => {
        // Compute access locally to avoid dependency on render-time flags
        const cu = authUser?.id || authUser?._id;
        const isCreatorLocal = cu && group?.creator && ((group.creator._id && String(group.creator._id) === String(cu)) || String(group.creator) === String(cu));
        const isModLocal = cu && group?.moderators?.some(m => String(m?._id || m) === String(cu));
        const isMemberLocal = cu && group?.members?.some(m => String(m?.user?._id || m?.user || m?._id || m) === String(cu));
        if (!(isCreatorLocal || isModLocal || isMemberLocal)) return;

        setShowInvite(true);
        if (friends.length === 0) {
            try {
                const res = await api.get('/api/social/friends');
                setFriends(res.data.data || []);
            } catch (e) {
                console.error('Load friends failed:', e);
                setFriends([]);
            }
        }
    };

    const toggleRecipient = (userId) => {
        // Do not allow selecting friends who are already in the group
        if (groupMemberIdSet.has(String(userId))) return;
        setSelectedRecipients(prev => prev.includes(userId)
            ? prev.filter(id => id !== userId)
            : [...prev, userId]
        );
    };

    const sendInvites = async () => {
        // Only invite friends who are NOT already part of the group
        const recipientsToInvite = selectedRecipients.filter(id => !groupMemberIdSet.has(String(id)));
        if (recipientsToInvite.length === 0) return;
        setInviting(true);
        try {
            await api.post(`/api/groups/${groupId}/invite`, { recipients: recipientsToInvite });
            alert('Invitations sent');
            setShowInvite(false);
            setSelectedRecipients([]);
        } catch (e) {
            console.error('Send invites error:', e);
            alert(e?.response?.data?.message || 'Failed to send invites');
        } finally {
            setInviting(false);
        }
    };

    const handleLikePost = async (postId) => {
        console.log('handleLikePost called with:', { postId, authUser });
        try {
            await api.post(`/api/groups/posts/${postId}/like`);

            // Refresh posts to get accurate server state
            const response = await api.get(`/api/groups/${groupId}/posts`);
            setPosts(response.data.posts || []);
        } catch (err) {
            if (err?.response?.status === 401) {
                console.error('Not authenticated (401) while liking post');
            } else {
                console.error('Like post error:', err);
            }
        }
    };

    const handleTogglePin = async (postId, shouldPin) => {
        try {
            await api.post(`/api/groups/posts/${postId}/${shouldPin ? 'pin' : 'unpin'}`);
            // Refresh highlights and posts
            try {
                const [pinnedResp] = await Promise.all([
                    api.get(`/api/groups/${groupId}/pinned`)
                ]);
                setPinnedPosts(pinnedResp.data.posts || []);
            } catch (e) {
                console.info('Pinned refresh failed:', e?.response?.status || e?.message);
            }
            await fetchPosts();
        } catch (err) {
            console.error('Toggle pin error:', err);
            alert(err?.response?.data?.message || 'Failed to toggle pin');
        }
    };

    const handleCommentOnPost = async (postId, commentContent) => {
        try {
            await api.post(`/api/groups/posts/${postId}/comments`, {
                content: commentContent
            });
            // Refresh posts to show new comment with inline fetch
            const response = await api.get(`/api/groups/${groupId}/posts`);
            setPosts(response.data.posts || []);
        } catch (err) {
            console.error('Comment post error:', err);
        }
    };

    const handleLikeComment = async (postId, commentId) => {
        console.log('handleLikeComment called with:', { postId, commentId, authUser });
        try {
            await api.post(`/api/groups/posts/${postId}/comments/${commentId}/like`);

            // Refresh posts to get accurate server state
            const response = await api.get(`/api/groups/${groupId}/posts`);
            setPosts(response.data.posts || []);
        } catch (err) {
            if (err?.response?.status === 401) {
                console.error('Not authenticated (401) while liking comment');
            } else {
                console.error('Like comment error:', err);
            }
        }
    };

    const handleReplyToComment = async (postId, commentId, replyContent) => {
        try {
            await api.post(`/api/groups/posts/${postId}/comments/${commentId}/replies`, {
                content: replyContent
            });
            // Refresh posts to show new reply
            const response = await api.get(`/api/groups/${groupId}/posts`);
            setPosts(response.data.posts || []);
        } catch (err) {
            console.error('Reply to comment error:', err);
        }
    };

    const handleLikeReply = async (postId, commentId, replyId) => {
        try {
            await api.post(`/api/groups/posts/${postId}/comments/${commentId}/replies/${replyId}/like`);
            const response = await api.get(`/api/groups/${groupId}/posts`);
            setPosts(response.data.posts || []);
        } catch (err) {
            if (err?.response?.status === 401) {
                console.error('Not authenticated (401) while liking reply');
            } else {
                console.error('Like reply error:', err);
            }
        }
    };

    // Delete handlers with optimistic updates
    const handleDeletePost = async (postId) => {
        const prevPosts = posts;
        const prevPinned = pinnedPosts;
        setPosts((ps) => ps.filter(p => String(p._id) !== String(postId)));
        setPinnedPosts((pp) => pp.filter(p => String(p._id) !== String(postId)));
        try {
            await api.delete(`/api/groups/posts/${postId}`);
        } catch (err) {
            console.error('Delete post error:', err);
            alert(err?.response?.data?.message || 'Failed to delete post');
            setPosts(prevPosts);
            setPinnedPosts(prevPinned);
        }
    };

    const handleDeleteComment = async (postId, commentId) => {
        const prevPosts = posts;
        setPosts((ps) => ps.map(p => {
            if (String(p._id) !== String(postId)) return p;
            return { ...p, comments: (p.comments || []).filter(c => String(c._id) !== String(commentId)) };
        }));
        try {
            await api.delete(`/api/groups/posts/${postId}/comments/${commentId}`);
        } catch (err) {
            console.error('Delete comment error:', err);
            alert(err?.response?.data?.message || 'Failed to delete comment');
            setPosts(prevPosts);
        }
    };

    const handleDeleteReply = async (postId, commentId, replyId) => {
        const prevPosts = posts;
        const removeReplyRecursive = (list, rid) => {
            return (list || []).reduce((acc, r) => {
                if (String(r._id) === String(rid)) {
                    return acc; // skip to remove
                }
                const updated = r.replies && r.replies.length
                    ? { ...r, replies: removeReplyRecursive(r.replies, rid) }
                    : r;
                acc.push(updated);
                return acc;
            }, []);
        };
        setPosts((ps) => ps.map(p => {
            if (String(p._id) !== String(postId)) return p;
            return {
                ...p,
                comments: (p.comments || []).map(c => {
                    if (String(c._id) !== String(commentId)) return c;
                    return { ...c, replies: removeReplyRecursive(c.replies || [], replyId) };
                })
            };
        }));
        try {
            await api.delete(`/api/groups/posts/${postId}/comments/${commentId}/replies/${replyId}`);
        } catch (err) {
            console.error('Delete reply error:', err);
            alert(err?.response?.data?.message || 'Failed to delete reply');
            setPosts(prevPosts);
        }
    };

    // Moderator actions
    const handlePromoteToMod = async (userId) => {
        try {
            await api.post(`/api/groups/${groupId}/moderators`, { userId });
            const response = await api.get(`/api/groups/${groupId}`);
            setGroup(response.data.group);
        } catch (err) {
            console.error('Promote to mod error:', err);
            alert(err?.response?.data?.message || 'Failed to promote');
        }
    };

    const handleRemoveMember = async (userId) => {
        if (!window.confirm('Remove this member from the group?')) return;
        try {
            await api.delete(`/api/groups/${groupId}/members/${userId}`);
            const response = await api.get(`/api/groups/${groupId}`);
            setGroup(response.data.group);
        } catch (err) {
            console.error('Remove member error:', err);
            alert(err?.response?.data?.message || 'Failed to remove');
        }
    };

    // Image uploads
    const onPickGroupImage = () => fileInputRef.current?.click();
    const onPickCoverImage = () => coverInputRef.current?.click();

    const onUploadGroupImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append('image', file);
            await api.post(`/api/groups/${groupId}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
            const response = await api.get(`/api/groups/${groupId}`);
            setGroup(response.data.group);
        } catch (err) {
            console.error('Upload group image error:', err);
            alert(err?.response?.data?.message || 'Failed to upload image');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    const onUploadCoverImage = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const form = new FormData();
            form.append('cover', file);
            await api.post(`/api/groups/${groupId}/cover`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
            const response = await api.get(`/api/groups/${groupId}`);
            setGroup(response.data.group);
        } catch (err) {
            console.error('Upload cover image error:', err);
            alert(err?.response?.data?.message || 'Failed to upload cover');
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    };

    // Removed individual fetch functions as we now use a single data fetching approach

    useEffect(() => {
        if (!groupId) return;
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                // 1) Load group first (public)
                const groupResp = await api.get(`/api/groups/${groupId}`);
                if (!mounted) return;
                const loadedGroup = groupResp.data.group;
                setGroup(loadedGroup);
                setError('');

                // 2) Pinned posts (safe to ignore on 401/403)
                try {
                    const pinnedResp = await api.get(`/api/groups/${groupId}/pinned`);
                    if (mounted) setPinnedPosts(pinnedResp.data.posts || []);
                } catch (e) {
                    if (mounted) setPinnedPosts([]);
                    console.info('Pinned fetch skipped/error (non-fatal):', e?.response?.status);
                }

                // 3) Posts only if member/mod/creator
                const cu = authUser?.id || authUser?._id;
                const isCreatorLocal = cu && loadedGroup.creator && ((loadedGroup.creator._id && String(loadedGroup.creator._id) === String(cu)) || String(loadedGroup.creator) === String(cu));
                const isModLocal = cu && loadedGroup.moderators?.some(m => String(m._id || m) === String(cu));
                const isMemberLocal = cu && loadedGroup.members?.some(m => String(m.user?._id || m.user || m._id || m) === String(cu));
                if (isCreatorLocal || isModLocal || isMemberLocal) {
                    try {
                        const postsResp = await api.get(`/api/groups/${groupId}/posts`);
                        if (mounted) setPosts(postsResp.data.posts || []);
                    } catch (e) {
                        if (mounted) setPosts([]);
                        console.info('Posts fetch forbidden/non-member; skipping.', e?.response?.status);
                    }
                } else {
                    if (mounted) setPosts([]);
                }
            } catch (err) {
                if (mounted) setError('Failed to load community data.');
                console.error('Data fetch error:', err);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        load();
        return () => { mounted = false; };
    }, [groupId, authUser]);

    if (loading) {
        return <div className="loading">Loading...</div>;
    }

    if (error) {
        return <div className="error-message">{error}</div>;
    }

    if (!group) {
        return <div className="error-message">Group not found.</div>;
    }

    const currentUserId = authUser?.id || authUser?._id;
    const isUserCreator = currentUserId && group.creator && (
        (group.creator._id && String(group.creator._id) === String(currentUserId)) ||
        String(group.creator) === String(currentUserId)
    );
    const isUserModerator = currentUserId && group.moderators?.some(mod => String(mod?._id || mod) === String(currentUserId));
    const canModerate = !!(isUserModerator || isUserCreator);
    // Check membership with more flexible logic to handle different response structures
    const isUserMember = currentUserId && group.members?.some(member => {
        // Handle both populated and unpopulated member references
        const memberId = member.user?._id || member.user || member._id || member;
        return String(memberId) === String(currentUserId);
    });
    const canViewProfiles = !!(isUserCreator || isUserModerator || isUserMember);
    const canInvite = canViewProfiles;

    const handleJoinGroup = async () => {
        if (!currentUserId) return;
        const prev = group;
        const optimistic = {
            ...group,
            members: [{ user: { _id: currentUserId } }, ...(group.members || [])],
            memberCount: (group.memberCount || 0) + 1
        };
        setGroup(optimistic);
        try {
            await api.post(`/api/groups/${groupId}/join`);
            const response = await api.get(`/api/groups/${groupId}`);
            setGroup(response.data.group);
            // Try to load pinned and posts now that we're a member
            try {
                const [pinnedResp, postsResp] = await Promise.all([
                    api.get(`/api/groups/${groupId}/pinned`),
                    api.get(`/api/groups/${groupId}/posts`)
                ]);
                setPinnedPosts(pinnedResp.data.posts || []);
                setPosts(postsResp.data.posts || []);
            } catch (inner) {
                // Non-fatal if immediate fetch fails due to propagation delay
                console.info('Post fetch after join skipped/error:', inner?.response?.status);
            }
        } catch (err) {
            console.error('Join group error:', err);
            setGroup(prev);
        }
    };

    const handleLeaveGroup = async () => {
        if (!currentUserId || isLeaving) return;
        // Confirmation like Reddit/Facebook
        const warn = isUserModerator
            ? 'You will lose moderator privileges. Leave this group?'
            : 'Are you sure you want to leave this group?';
        if (!window.confirm(warn)) return;
        setIsLeaving(true);
        const prev = group;
        const optimistic = {
            ...group,
            members: (group.members || []).filter(m => String(m.user?._id || m.user || m._id || m) !== String(currentUserId)),
            memberCount: Math.max(0, (group.memberCount || 0) - 1)
        };
        setGroup(optimistic);
        try {
            const response = await api.post(`/api/groups/${groupId}/leave`);
            const srvGroup = response.data?.group;
            if (srvGroup) {
                setGroup(srvGroup);
            } else {
                // As a fallback, refresh once
                const refetch = await api.get(`/api/groups/${groupId}`);
                setGroup(refetch.data.group);
            }
            // Clear member-only data
            setPosts([]);
            setPinnedPosts([]);
            // Close any member-only modals/state
            setShowInvite(false);
            setSelectedRecipients([]);
        } catch (err) {
            console.error('Leave group error:', err);
            const msg = err?.response?.data?.message || 'Failed to leave group';
            alert(msg);
            setGroup(prev);
        } finally {
            setIsLeaving(false);
        }
    };

    // Map UI tag to backend type enum
    const mapTagToType = (tag) => {
        switch ((tag || '').toLowerCase()) {
            case 'discussion':
                return 'discussion';
            case 'review':
                return 'recommendation';
            case 'suggestion':
                return 'megathread';
            default:
                return 'discussion';
        }
    };

    const openPostModal = () => {
        if (!isUserMember) return;
        setShowPostModal(true);
        // Prefill from any existing draft
        try {
            const draft = JSON.parse(localStorage.getItem(`group-post-draft-${groupId}`) || 'null');
            if (draft) {
                setPostTitle(draft.title || '');
                setPostBody(draft.body || '');
                setPostTag(draft.tag || 'Discussion');
            }
        } catch {}
    };

    const closePostModal = () => {
        setShowPostModal(false);
    };

    const saveDraft = () => {
        const draft = { title: postTitle, body: postBody, tag: postTag };
        localStorage.setItem(`group-post-draft-${groupId}`, JSON.stringify(draft));
        setShowPostModal(false);
    };

    const submitPost = async () => {
        const title = postTitle.trim();
        const body = postBody.trim();
        if (!isUserMember || !title || !body) return;
        try {
            await api.post(`/api/groups/${groupId}/posts`, {
                title,
                content: body,
                type: mapTagToType(postTag)
            });
            // clear state and draft
            setPostTitle('');
            setPostBody('');
            setPostTag('Discussion');
            localStorage.removeItem(`group-post-draft-${groupId}`);
            setShowPostModal(false);
            // Refresh posts to show the new post
            await fetchPosts();
            alert('Post created successfully!');
        } catch (err) {
            console.error('Create post error:', err);
            alert('Failed to create post. Please try again.');
        }
    };

    return (
        <div className="community-page">
            {/* Cover Section */}
            <div className="community-cover">
                <div 
                    className="cover-image" 
                    style={{ 
                        backgroundImage: `url(${group.coverImage || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&h=300&fit=crop'})` 
                    }}
                >
                    {isUserModerator && (
                        <button
                            className="cover-camera-btn"
                            onClick={onPickCoverImage}
                            disabled={uploading}
                            aria-label="Change cover photo"
                            title={uploading ? 'Uploading…' : 'Change cover photo'}
                        >
                            {uploading ? (
                                // Simple spinner
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="spin">
                                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.2" />
                                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                                </svg>
                            ) : (
                                // Camera icon
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M4 7a3 3 0 0 1 3-3h1.172a2 2 0 0 1 1.414.586L10.414 6H17a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="community-content">
                <div className="community-main">
                    {/* Group Info Card */}
                    <div className="group-info-card">
                        <div className="group-profile-section">
                            <div className="group-profile-image">
                                {group.image ? (
                                    <img src={group.image} alt={group.name} />
                                ) : (
                                    <div className="placeholder-profile">
                                        {group.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}
                                {isUserModerator && (
                                    <button className="edit-profile-btn" onClick={onPickGroupImage} disabled={uploading}>
                                        {uploading ? '…' : '📷'}
                                    </button>
                                )}
                            </div>
                            <div className="group-details">
                                <div className="group-tag">{group.category}</div>
                                <h1>{group.name}</h1>
                                <div className="group-meta">
                                    <svg fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                                    </svg>
                                    Date: {new Date(group.createdAt).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                        
                        <div className="group-description">
                            <h3>About this Group ...</h3>
                            <p>{group.description}</p>
                            <button className="more-link">... more</button>
                        </div>

                        <div className="group-actions">
                            {isUserCreator ? (
                                <button className="creator-btn" disabled>
                                    Creator
                                </button>
                            ) : isUserModerator ? (
                                <button className="moderator-btn" disabled>
                                    Moderator
                                </button>
                            ) : isUserMember ? (
                                <button className="joined-btn" onClick={handleLeaveGroup} disabled={isLeaving}>
                                    {isLeaving ? 'Leaving…' : 'Joined'}
                                </button>
                            ) : (
                                <button className="join-btn" onClick={handleJoinGroup}>
                                    Join Group
                                </button>
                            )}
                            {canInvite && (
                                <button className="invite-btn" onClick={openInvite}>Invite</button>
                            )}
                        </div>
                    </div>

                    {/* Community Highlights - Only show if there are pinned posts */}
                    {pinnedPosts.length > 0 && (
                        <div className="community-highlights">
                            <div className="section-header">
                                <svg fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                <h2>Community highlights</h2>
                            </div>
                            <p>Pinned posts by moderators and members.</p>
                            
                            <div className="highlights-grid">
                                {pinnedPosts.map((post, index) => (
                                    <div
                                        key={post._id}
                                        className={`highlight-card ${index % 3 === 0 ? 'highlight-dark' : index % 3 === 1 ? 'highlight-medium' : 'highlight-light'}`}
                                        onClick={() => navigate(`/communities/${groupId}?post=${post._id}`)}
                                        style={{ cursor: 'pointer' }}
                                        title="Open post"
                                    >
                                        <div className="highlight-content">
                                            <h4>{post.content.slice(0, 50)}...</h4>
                                            <div className="post-meta">
                                                <svg fill="currentColor" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                Pinned Post
                                            </div>
                                        </div>
                                        {(isUserModerator || isUserCreator) && (
                                            <button
                                                className="delete-post-btn"
                                                title="Unpin from highlights"
                                                aria-label="Unpin post"
                                                onClick={(e) => { e.stopPropagation(); handleTogglePin(post._id, false); }}
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Post Composer (members only) - acts as a trigger */}
                    <div className="post-composer post-composer--narrow">
                        <textarea 
                            name={`composer-${groupId}`}
                            id={`composer-${groupId}`}
                            className="post-input"
                            placeholder={isUserMember ? 'Write something ...' : 'Join the group to post'}
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            onFocus={openPostModal}
                            onClick={openPostModal}
                            rows="3"
                            readOnly
                            disabled={!isUserMember}
                        />
                    </div>

                    {/* Posts Feed */}
                    {isUserMember && (
                        <div className="posts-feed">
                            {postsLoading ? (
                                <div className="posts-loading">Loading posts...</div>
                            ) : posts.length > 0 ? (
                                posts.map((post) => (
                                    <PostCard
                                        key={post._id}
                                        post={post}
                                        currentUserId={currentUserId}
                                        onLike={handleLikePost}
                                        onComment={handleCommentOnPost}
                                        onLikeComment={handleLikeComment}
                                        onLikeReply={handleLikeReply}
                                        onReply={handleReplyToComment}
                                        canPin={isUserModerator || isUserCreator}
                                        onTogglePin={handleTogglePin}
                                        canModerate={canModerate}
                                        onDeletePost={handleDeletePost}
                                        onDeleteComment={handleDeleteComment}
                                        onDeleteReply={handleDeleteReply}
                                        isFocused={focusPostId === post._id}
                                    />
                                ))
                            ) : (
                                <div className="no-posts">
                                    <p>No posts yet. Be the first to share something!</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="community-sidebar">
                    {/* Members Section */}
                    <div className="members-section">
                        <h3>Members({group.memberCount || 0})</h3>
                        <div className="members-grid">
                {group.members?.slice(0, 20).map((member, index) => (
                                <div
                                    key={member.user._id || index}
                                    className="member-avatar"
                                    onClick={() => (canViewProfiles && member.user?._id) && navigate(`/users/${member.user._id}`)}
                                    title={member.user?.username ? (canViewProfiles ? `View ${member.user.username}` : 'Members only') : 'Profile'}
                                    style={{ cursor: canViewProfiles && member.user?._id ? 'pointer' : 'not-allowed' }}
                                    onContextMenu={(e) => {
                                        if (!isUserModerator) return;
                                        e.preventDefault();
                                        const uid = member.user._id;
                                        const isMod = group.moderators?.some(mod => String((mod && (mod._id || mod)) || '') === String(uid));
                                        setMenu({
                                            visible: true,
                                            x: e.clientX,
                                            y: e.clientY,
                                            userId: uid,
                                            isTargetMod: !!isMod,
                                            name: member.user.username || ''
                                        });
                                    }}
                                >
                                    {member.user.profilePicture ? (
                                        <img src={member.user.profilePicture} alt={member.user.username} />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {member.user.username?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                    {/* Right-click a member to open the actions menu */}
                                </div>
                            ))}
        {/* Context menu for member actions */}
        {menu.visible && (
            <div
                className="context-menu"
                style={{ position: 'fixed', left: menu.x, top: menu.y, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: 8, zIndex: 1000, minWidth: 180 }}
                onMouseLeave={() => setMenu({ ...menu, visible: false })}
            >
                <div style={{ padding: '10px 12px', fontWeight: 600, borderBottom: '1px solid #eee' }}>{menu.name || 'Member'}</div>
                {!menu.isTargetMod && (
                    <button
                        style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                        onClick={() => { handlePromoteToMod(menu.userId); setMenu({ ...menu, visible: false }); }}
                    >
                        Promote to Moderator
                    </button>
                )}
                <button
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 12px', border: 'none', background: 'transparent', color: '#b91c1c', cursor: 'pointer' }}
                    onClick={() => { handleRemoveMember(menu.userId); setMenu({ ...menu, visible: false }); }}
                >
                    Remove Member
                </button>
            </div>
        )}
                            {group.memberCount > 20 && (
                                <div className="member-avatar more-indicator">
                                    +{group.memberCount - 20}
                                </div>
                            )}
                        </div>
                        <button className="more-members-btn">
                            more 
                            <svg fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>

                    {/* Moderators Section */}
                    <div className="moderators-section">
                        <h3>MODERATORS</h3>
                        <div className="moderators-list">
                            {group.moderators?.map((moderator, index) => (
                                <div
                                    key={moderator._id || index}
                                    className="moderator-avatar"
                                    onClick={() => (canViewProfiles && moderator?._id) && navigate(`/users/${moderator._id}`)}
                                    title={moderator?.username ? (canViewProfiles ? `View ${moderator.username}` : 'Members only') : 'Profile'}
                                    style={{ cursor: canViewProfiles && moderator?._id ? 'pointer' : 'not-allowed' }}
                                >
                                    {moderator.profilePicture ? (
                                        <img src={moderator.profilePicture} alt={moderator.username} />
                                    ) : (
                                        <div className="avatar-placeholder">
                                            {moderator.username?.charAt(0)?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Guidelines Section */}
                    <div className="guidelines-section">
                        <button 
                            className="guidelines-btn"
                            onClick={() => setShowGuidelines(true)}
                        >
                            <svg fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                            </svg>
                            Community Guidelines
                        </button>
                    </div>
                </div>
            </div>

            {/* Guidelines Modal */}
            {showGuidelines && (
                <div className="modal-overlay" onClick={() => setShowGuidelines(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Community Guidelines</h3>
                            <button className="close-modal" onClick={() => setShowGuidelines(false)}>
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>{group.rules || 'Please follow our community guidelines to maintain a respectful and engaging environment for all members.'}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Post Modal */}
            {showPostModal && (
                <div className="modal-overlay" onClick={closePostModal}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Create post</h3>
                            <button className="close-modal" onClick={closePostModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="post-modal-field">
                                <label className="post-modal-label">Title*</label>
                                <input
                                    type="text"
                                    className="post-modal-input"
                                    placeholder="Title"
                                    name="post-title"
                                    id="post-title"
                                    value={postTitle}
                                    onChange={(e) => setPostTitle(e.target.value)}
                                    maxLength={300}
                                />
                            </div>
                            <div className="post-modal-field">
                                <button className="tags-btn" onClick={() => setShowTagsModal(true)} type="button">Add tags</button>
                                {postTag && <span className="tag-chip">{postTag}</span>}
                            </div>
                            <div className="post-modal-field">
                                <label className="post-modal-label">Body text (required)</label>
                                <textarea
                                    className="post-modal-textarea"
                                    placeholder="Write your post..."
                                    name="post-body"
                                    id="post-body"
                                    value={postBody}
                                    onChange={(e) => setPostBody(e.target.value)}
                                    rows={8}
                                />
                            </div>
                            <div className="post-modal-footer">
                                <button className="draft-btn" onClick={saveDraft} type="button">Save Draft</button>
                                <button
                                    className="submit-btn"
                                    onClick={submitPost}
                                    disabled={!postTitle.trim() || !postBody.trim()}
                                    type="button"
                                >
                                    Post
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tags Modal */}
            {showTagsModal && (
                <div className="modal-overlay" onClick={() => setShowTagsModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Select a tag</h3>
                            <button className="close-modal" onClick={() => setShowTagsModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="tag-options">
                                {['Discussion', 'Review', 'Suggestion'].map((tag) => (
                                    <button
                                        key={tag}
                                        className={`tag-option${postTag === tag ? ' active' : ''}`}
                                        onClick={() => { setPostTag(tag); setShowTagsModal(false); }}
                                        type="button"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Invite Modal */}
            {showInvite && (
                <div className="modal-overlay" onClick={() => setShowInvite(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Invite Friends</h3>
                            <button className="close-modal" onClick={() => setShowInvite(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            {friends.length === 0 ? (
                                <p>No friends to invite.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {friends.map(friend => {
                                        const fid = friend._id || friend.id;
                                        const alreadyInGroup = groupMemberIdSet.has(String(fid));
                                        return (
                                            <label key={fid} style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: alreadyInGroup ? 0.6 : 1 }}>
                                                <input
                                                    type="checkbox"
                                                    disabled={alreadyInGroup}
                                                    checked={selectedRecipients.includes(fid)}
                                                    onChange={() => toggleRecipient(fid)}
                                                />
                                                <div className="member-avatar" style={{ width: 28, height: 28 }}>
                                                    {friend.profilePicture ? (
                                                        <img src={friend.profilePicture} alt={friend.username} />
                                                    ) : (
                                                        <div className="avatar-placeholder">
                                                            {friend.username?.charAt(0)?.toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <span>{friend.username}</span>
                                                {alreadyInGroup && (
                                                    <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6b7280' }}>Already in group</span>
                                                )}
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="post-modal-footer">
                            <button className="draft-btn" onClick={() => setShowInvite(false)} disabled={inviting}>Cancel</button>
                            <button
                                className="submit-btn"
                                onClick={sendInvites}
                                disabled={inviting || selectedRecipients.filter(id => !groupMemberIdSet.has(String(id))).length === 0}
                            >
                                {inviting ? 'Sending…' : 'Send Invites'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Hidden file inputs */}
            <input type="file" accept="image/*" name="image" id="group-image-input" ref={fileInputRef} style={{ display: 'none' }} onChange={onUploadGroupImage} />
            <input type="file" accept="image/*" name="cover" id="group-cover-input" ref={coverInputRef} style={{ display: 'none' }} onChange={onUploadCoverImage} />
        </div>
    );
};

export default Community;
