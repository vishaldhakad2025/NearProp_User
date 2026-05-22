import React, { useState, useEffect, useRef } from 'react';
import './Reels.css';
import { Link, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import logo from '../assets/Nearprop 1.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, faSearch, faCompass, faPlay, 
  faComment, faShare, faBookmark, faHeart, 
  faThumbsUp, faPlus, faUser, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { faConnectdevelop } from '@fortawesome/free-brands-svg-icons';

const API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api',
};

const PG_API_URL = 'https://pg-hostel.nearprop.com/api';

const getToken = () => {
  try {
    const authData = localStorage.getItem('authData');
    if (!authData) {
      console.warn('No authData found in localStorage');
      return null;
    }
    const parsedData = JSON.parse(authData);
    const token = parsedData.token || null;
    console.log('Token retrieved:', token ? 'Valid token' : 'No token');
    return token;
  } catch (err) {
    console.error('Error parsing authData:', err.message);
    return null;
  }
};

function Reels() {
  const [searchText, setSearchText] = useState('');
  const [pausedVideo, setPausedVideo] = useState(null);
  const [reelsData, setReelsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [commentInputs, setCommentInputs] = useState({});
  const [activeCommentReelId, setActiveCommentReelId] = useState(null);
  const [viewedReels, setViewedReels] = useState(new Set());
  const [shareLink, setShareLink] = useState(null);
  const [activeShareReelId, setActiveShareReelId] = useState(null);
  const [commentLikes, setCommentLikes] = useState({});
  const videoRefs = useRef([]);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // Check authentication and show toast if not logged in
  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.warn("Please log in to view reels.", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        onClose: () => {
          navigate("/login", { state: { from: "/reels" } });
        },
      });
    }
  }, [navigate]);

  useEffect(() => {
    const fetchReels = async () => {
      try {
        const token = getToken();
        if (!token) return; // Skip fetching if not authenticated

        // Fetch property reels
        const propertyResponse = await fetch(
          `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/reels/feed/nearby?radiusKm=1000000&latitude=22.7196&longitude=75.8577`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        if (propertyResponse.status === 403) {
          throw new Error('Access forbidden: Invalid or missing authentication token');
        }

        if (!propertyResponse.ok) {
          throw new Error(`HTTP error! Status: ${propertyResponse.status}`);
        }

        const propertyData = await propertyResponse.json();
        let propertyReels = [];
        if (propertyData.success) {
          propertyReels = (propertyData.data || []).map(reel => ({ ...reel, type: 'property' }));
        } else {
          throw new Error(propertyData.message || 'Failed to fetch property reels');
        }

        // Fetch PG/Hostel popular reels (public, no token needed)
        const pgResponse = await fetch(`${PG_API_URL}/reels?page=1&limit=5&sort=popular`);
        if (!pgResponse.ok) {
          throw new Error(`HTTP error! Status: ${pgResponse.status}`);
        }

        const pgData = await pgResponse.json();
        let pgReels = [];
        if (pgData.success) {
          pgReels = (pgData.reels || []).map(reel => ({
            ...reel,
            type: 'pg',
            owner: {
              id: reel.landlordId.id,
              name: reel.landlordId.name,
              profileImageUrl: `https://pg-hostel.nearprop.com${reel.landlordId.profilePhoto}`,
            },
            liked: false,
            saved: false,
            followed: false,
            likeCount: reel.likesCount,
            commentCount: reel.commentsCount,
            shareCount: reel.sharesCount,
            saveCount: reel.savesCount,
            viewCount: reel.views,
            comments: [],
          }));
        } else {
          throw new Error(pgData.message || 'Failed to fetch PG/Hostel reels');
        }

        // Combine both
        setReelsData([...propertyReels, ...pgReels]);

        // Initialize comment likes
        const initialLikes = {};
        [...propertyReels, ...pgReels].forEach(reel => {
          reel.comments?.forEach(comment => {
            initialLikes[comment.id] = comment.liked || false;
          });
        });
        setCommentLikes(initialLikes);
      } catch (err) {
        console.error('Fetch reels error:', err.message);
        setError(err.message || 'Error fetching reels');
      } finally {
        setLoading(false);
      }
    };

    fetchReels();
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;
          const index = videoRefs.current.indexOf(video);
          if (entry.isIntersecting && index !== -1) {
            video.play().catch((err) => console.error('Play error:', err));
            setPausedVideo(null);
            handleView(reelsData[index].id);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.7 }
    );

    videoRefs.current.forEach((video) => {
      if (video) observer.observe(video);
    });

    return () => {
      videoRefs.current.forEach((video) => {
        if (video) observer.unobserve(video);
      });
    };
  }, [reelsData]);

  const getBaseUrl = (type) => {
    return type === 'pg' ? PG_API_URL : `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}`;
  };

  const handleView = async (reelId) => {
    if (viewedReels.has(reelId)) return;

    const reel = reelsData.find(r => r.id === reelId);
    if (!reel) return;

    try {
      const token = getToken();
      if (!token) {
        setError('Please log in to view reels');
        return;
      }

      const baseUrl = getBaseUrl(reel.type);

      const response = await fetch(
        `${baseUrl}/reels/${reelId}/view`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Unable to process view action');
      } else if (response.status === 403) {
        throw new Error('Access forbidden: Invalid or missing authentication token');
      } else if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const updatedReel = await response.json();
      setReelsData((prevReels) =>
        prevReels.map((r) =>
          r.id === reelId
            ? { ...r, viewCount: updatedReel.viewCount }
            : r
        )
      );
      setViewedReels((prev) => new Set(prev).add(reelId));
      setError(null);
    } catch (err) {
      console.error('View error:', err.message);
      setError(err.message || 'Error processing view action');
    }
  };

  const handleLikeToggle = async (reelId) => {
    const reel = reelsData.find(r => r.id === reelId);
    if (!reel) return;

    try {
      const token = getToken();
      if (!token) {
        setError('Please log in to like/unlike reels');
        return;
      }

      const baseUrl = getBaseUrl(reel.type);

      const response = await fetch(
        `${baseUrl}/reels/${reelId}/like`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (response.status === 400) {
        const errorData = await response.json();
        if (errorData.message === 'You have already liked this reel') {
          return;
        }
        throw new Error(errorData.message || 'Unable to process like/unlike action');
      } else if (response.status === 403) {
        throw new Error('Access forbidden: Invalid or missing authentication token');
      } else if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const updatedReel = await response.json();
      setReelsData((prevReels) =>
        prevReels.map((r) =>
          r.id === reelId
            ? { ...r, likeCount: updatedReel.likeCount, liked: updatedReel.liked }
            : r
        )
      );
      setError(null);
    } catch (err) {
      console.error('Like/Unlike error:', err.message);
      setError(err.message || 'Error processing like/unlike action');
    }
  };

  const handleFollowToggle = async (reelId) => {
    const reel = reelsData.find(r => r.id === reelId);
    if (!reel) return;

    try {
      const token = getToken();
      if (!token) {
        setError('Please log in to follow/unfollow creators');
        return;
      }

      const baseUrl = getBaseUrl(reel.type);

      const response = await fetch(
        `${baseUrl}/reels/${reelId}/follow`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Unable to process follow/unfollow action');
      } else if (response.status === 403) {
        throw new Error('Access forbidden: Invalid or missing authentication token');
      } else if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const updatedReel = await response.json();
      setReelsData((prevReels) =>
        prevReels.map((r) =>
          r.id === reelId
            ? {
                ...r,
                owner: { ...r.owner, following: updatedReel.followed },
                followed: updatedReel.followed,
              }
            : r
        )
      );
      setError(null);
    } catch (err) {
      console.error('Follow/Unfollow error:', err.message);
      setError(err.message || 'Error processing follow/unfollow action');
    }
  };

  const handleShare = async (reelId) => {
    const reel = reelsData.find(r => r.id === reelId);
    if (!reel) return;

    try {
      const token = getToken();
      if (!token) {
        setError('Please log in to share reels');
        return;
      }

      const baseUrl = getBaseUrl(reel.type);

      const response = await fetch(
        `${baseUrl}/reels/${reelId}/share`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Unable to process share action');
      } else if (response.status === 403) {
        throw new Error('Access forbidden: Invalid or missing authentication token');
      } else if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setReelsData((prevReels) =>
          prevReels.map((r) =>
            r.id === reelId
              ? { ...r, shareCount: result.data.shareCount }
              : r
          )
        );
        setShareLink(result.data.shareableLink);
        setActiveShareReelId(reelId);
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to share reel');
      }
    } catch (err) {
      console.error('Share error:', err.message);
      setError(err.message || 'Error processing share action');
    }
  };

  const handleSaveToggle = async (reelId) => {
    const reel = reelsData.find(r => r.id === reelId);
    if (!reel) return;

    try {
      const token = getToken();
      if (!token) {
        setError('Please log in to save/unsave reels');
        return;
      }

      const baseUrl = getBaseUrl(reel.type);

      const response = await fetch(
        `${baseUrl}/reels/${reelId}/save`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Unable to process save/unsave action');
      } else if (response.status === 403) {
        throw new Error('Access forbidden: Invalid or missing authentication token');
      } else if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const updatedReel = await response.json();
      setReelsData((prevReels) =>
        prevReels.map((r) =>
          r.id === reelId
            ? { ...r, saveCount: updatedReel.saveCount, saved: updatedReel.saved }
            : r
        )
      );
      setError(null);
    } catch (err) {
      console.error('Save/Unsave error:', err.message);
      setError(err.message || 'Error processing save/unsave action');
    }
  };

  const handleViewProperty = (propertyId) => {
    navigate(`/propertySell/${propertyId}`);
  };

  const copyToClipboard = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      toast.success('Share link copied to clipboard!', {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

  const handleCommentChange = (reelId, value) => {
    setCommentInputs((prev) => ({ ...prev, [reelId]: value }));
  };

  const handleCommentSubmit = async (reelId) => {
    const commentText = commentInputs[reelId]?.trim();
    if (!commentText) {
      setError('Comment cannot be empty');
      return;
    }

    const reel = reelsData.find(r => r.id === reelId);
    if (!reel) return;

    try {
      const token = getToken();
      if (!token) {
        setError('Please log in to comment on reels');
        return;
      }

      const formData = new FormData();
      formData.append('message', commentText);

      const baseUrl = getBaseUrl(reel.type);

      const response = await fetch(
        `${baseUrl}/reels/${reelId}/comment`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (response.status === 500) {
        throw new Error('Server error: Failed to post comment. Please try again later.');
      } else if (response.status === 400) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Invalid comment data');
      } else if (response.status === 403) {
        throw new Error('Access forbidden: Invalid or missing authentication token');
      } else if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        setReelsData((prevReels) =>
          prevReels.map((r) =>
            r.id === reelId
              ? {
                  ...r,
                  commentCount: result.data.commentCount,
                  comments: result.data.comments || [
                    ...(r.comments || []),
                    {
                      id: result.data.commentId || Date.now(),
                      reelId,
                      user: {
                        id: result.data.userId || 'current-user',
                        name: 'You',
                        profileImageUrl: 'https://nearprop-documents.s3.ap-south-1.amazonaws.com/defaults/default-user-profile.png',
                      },
                      comment: commentText,
                      createdAt: new Date().toISOString(),
                      likeCount: 0,
                      liked: false,
                    },
                  ],
                }
              : r
          )
        );
        setCommentInputs((prev) => ({ ...prev, [reelId]: '' }));
        setError(null);
      } else {
        throw new Error(result.message || 'Failed to post comment');
      }
    } catch (err) {
      console.error('Comment error:', err.message);
      setError(err.message || 'Error posting comment. Please check your connection or try again.');
    }
  };

  const handleCommentLike = async (reelId, commentId) => {
    const reel = reelsData.find(r => r.id === reelId);
    if (!reel) return;

    try {
      const token = getToken();
      if (!token) {
        setError('Please log in to like comments');
        return;
      }

      const baseUrl = getBaseUrl(reel.type);

      const response = await fetch(
        `${baseUrl}/reels/${reelId}/comments/${commentId}/like`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (response.status === 400) {
        const errorData = await response.json();
        if (errorData.message === 'You have already liked this comment') {
          return;
        }
        throw new Error(errorData.message || 'Unable to process like action');
      } else if (response.status === 403) {
        throw new Error('Access forbidden: Invalid or missing authentication token');
      } else if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      setReelsData((prevReels) =>
        prevReels.map((r) =>
          r.id === reelId
            ? {
                ...r,
                comments: r.comments.map((comment) =>
                  comment.id === commentId
                    ? {
                        ...comment,
                        likeCount: result.likeCount,
                        liked: result.liked,
                      }
                    : comment
                ),
              }
            : r
        )
      );
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: result.liked,
      }));
      setError(null);
    } catch (err) {
      console.error('Comment like error:', err.message);
      setError(err.message || 'Error processing comment like action');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric' });
  };

  const togglePlayPause = (e, id) => {
    const video = e.target;
    if (video.paused) {
      video.play();
      setPausedVideo(null);
    } else {
      video.pause();
      setPausedVideo(id);
    }
  };

  // Do not render content if not authenticated
  const token = getToken();
  if (!token) {
    return <ToastContainer />;
  }

  if (loading) return <div className="loading">Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="reels-container" ref={containerRef}>
      <ToastContainer />
      {/* Left Sidebar */}
      <div className="sidebar-reels">
        <div className="logo d-inline-flex"> 
          <img src={logo} alt="Logo" className='me-3' style={{ width: '60px', marginTop: '3px' }} />  
          <p className='mt-2'>Nearprop</p>
        </div>
        <ul className="nav-menu">
          <Link to="/" className="text-light">
            <li>
              <FontAwesomeIcon icon={faHome} /> Home
            </li>
          </Link>
          <Link to="/properties" className="text-light">
            <li>
              <FontAwesomeIcon icon={faSearch} /> Property
            </li>
          </Link>
          <Link to="/agent" className="text-light">
            <li>
              <FontAwesomeIcon icon={faUser} /> Property Advisor
            </li>
          </Link>
          <Link to="/developer" className="text-light">
            <li>
              <FontAwesomeIcon icon={faConnectdevelop} /> Developer
            </li>
          </Link>
          <Link to="/reels" className="text-light">
            <li className="active">
              <FontAwesomeIcon icon={faPlay} /> Reels
            </li>
          </Link>
          <Link to="/about" className="text-light">
            <li>
              <FontAwesomeIcon icon={faPlus} /> Other
            </li>
          </Link>
        </ul>
      </div>

      {/* Main Reels Section */}
      <div className="reels-wrapper">
        {reelsData.map((reel, index) => (
          <div key={reel.id} className="reel-item">
            <video
              ref={(el) => (videoRefs.current[index] = el)}
              className="reels-video"
              src={reel.videoUrl}
              loop
              muted={false}
              playsInline
              onClick={(e) => togglePlayPause(e, reel.id)}
            />
            {pausedVideo === reel.id && <div className="paused-indicator">⏸</div>}

            {/* Video Overlay */}
            <div className="video-overlay">
              <div className="user-info">
                <img 
                  src={reel.owner.profileImageUrl} 
                  alt={reel.owner.name} 
                  className="profile-pic" 
                />
                <p className="username">{reel.owner.name}</p>
                {/* <button 
                  className={`follow-btn ${reel.followed ? "following" : ""}`} 
                  onClick={() => handleFollowToggle(reel.id)}
                >
                  {reel.followed ? "Following" : "Follow"}
                </button> */}
              </div>
 
              <p className="video-caption">{reel.title || 'No caption'}</p>
              
              <div className="video-stats">
                <span>👀 {reel.viewCount || '0'}</span>
                <span>❤️ {reel.likeCount || '0'}</span>
              
              </div>
                <button 
                  className="view-property-btn"
                  onClick={() => handleViewProperty(reel.propertyId)}
                >
                 <FontAwesomeIcon icon={faHome} /> View Property
                </button>
            </div>

            {/* Right Action Buttons */}
            <div className="action-buttons">
              <div className="action-item" onClick={() => handleLikeToggle(reel.id)}>
                <FontAwesomeIcon icon={faHeart} style={{ color: reel.liked ? '#ff0000' : 'black' }} />
                <span>{reel.likeCount || '0'}</span>
              </div>
              <div className="action-item" onClick={() => setActiveCommentReelId(reel.id)}>
                <FontAwesomeIcon icon={faComment} />
                <span>{reel.commentCount || '0'}</span>
              </div>
              <div className="action-item" onClick={() => handleShare(reel.id)}>
                <FontAwesomeIcon icon={faShare} />
                {/* <span>{reel.shareCount || '0'}</span> */}
              </div>
              {/* <div className="action-item" onClick={() => handleSaveToggle(reel.id)}>
                <FontAwesomeIcon icon={faBookmark} style={{ color: reel.saved ? 'black' : 'black' }} />
                <span>{reel.saveCount || '0'}</span>
              </div> */}
            </div>
          </div>
        ))}
      </div>

      {/* Comment Modal */}
      {activeCommentReelId && reelsData.find(reel => reel.id === activeCommentReelId) && (
        <>
          {/* Overlay */}
          <div
            className="comment-overlay"
            onClick={() => setActiveCommentReelId(null)}
          ></div>

          {/* Comment Modal */}
          <div className="comment-modal">
            {/* Header */}
            <div className="comment-header">
              <h3>Comments ({reelsData.find(reel => reel.id === activeCommentReelId).commentCount || 0})</h3>
              <button
                className="close-btn"
                onClick={() => setActiveCommentReelId(null)}
                aria-label="Close comments"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            {/* Comments List */}
            <div className="comments-container">
              {reelsData.find(reel => reel.id === activeCommentReelId).comments?.length > 0 ? (
                reelsData
                  .find(reel => reel.id === activeCommentReelId)
                  .comments.map((comment) => (
                    <div key={comment.id} className="comment-item">
                      <img
                        src={comment.user.profileImageUrl}
                        alt={comment.user.name}
                        className="comment-avatar"
                      />
                      <div className="comment-body">
                        <div className="comment-meta">
                          <span className="comment-username">{comment.user.name}</span>
                          <span className="comment-timestamp">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="comment-text">{comment.comment}</p>
                        {/* <div className="comment-actions">
                          <button
                            className="like-btn"
                            onClick={() => handleCommentLike(activeCommentReelId, comment.id)}
                            aria-label={`Like comment by ${comment.user.name}`}
                          >
                            <FontAwesomeIcon
                              icon={faThumbsUp}
                              className={commentLikes[comment.id] ? 'liked' : ''}
                            />
                            <span>{comment.likeCount || 0}</span>
                          </button>
                        </div> */}
                      </div>
                    </div>
                  ))
              ) : (
                <div className="no-comments">Be the first to comment!</div>
              )}
            </div>

            {/* Comment Input */}
            <div className="comment-input-wrapper">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentInputs[activeCommentReelId] || ''}
                onChange={(e) => handleCommentChange(activeCommentReelId, e.target.value)}
                aria-label="Comment input"
              />
              <button
                className="submit-btn"
                onClick={() => handleCommentSubmit(activeCommentReelId)}
                disabled={!commentInputs[activeCommentReelId]?.trim()}
              >
                Post
              </button>
            </div>
          </div>
        </>
      )}

      {/* Share Modal */}
      {activeShareReelId && shareLink && (
        <>
          <div className="share-modal-overlay" onClick={() => setActiveShareReelId(null)}></div>
          <div className="share-modal">
            <div className="share-modal-content">
              <button className="share-modal-close" onClick={() => setActiveShareReelId(null)}>
                ×
              </button>
              <h4>Share Reel</h4>
              <div className="share-input">
                <input type="text" value={shareLink} readOnly />
                <button onClick={copyToClipboard}>Copy Link</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default Reels;