import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeart, faShare, faBuilding, faBed, faShower, faCar, faRulerCombined,
  faMap, faImage, faLocationDot, faStar as faSolidStar, faPlay,
  faPhone, faEnvelope, faStar as faRegularStar, faGlobe
} from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faTwitter, faInstagram, faLinkedinIn, faYoutube, faWhatsapp } from '@fortawesome/free-brands-svg-icons';
import Sidebar from './Sidebar';
import Apartment from '../assets/A-1.avif';

const API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api',
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error bg-red-50 text-red-700 p-4 rounded-lg text-center">
          Error: {this.state.error?.message || 'Something went wrong'}
          <button className="btn btn-primary mt-3" onClick={() => this.props.navigate('/properties')}>
            Go Back
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PropertySell = () => {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(Apartment);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [viewMode, setViewMode] = useState('image');
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
  const [reviewSubmitError, setReviewSubmitError] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [isAgentFooterVisible, setIsAgentFooterVisible] = useState(true);
  const [reels, setReels] = useState([]);
  const [reelsLoading, setReelsLoading] = useState(true);
  const [reelsError, setReelsError] = useState(null);
  const [advertisements, setAdvertisements] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const footerRef = useRef(null);

  const getToken = () => {
    try {
      const authData = localStorage.getItem('authData');
      if (!authData) {
        console.warn('No authData found in localStorage');
        return null;
      }
      const parsedData = JSON.parse(authData);
      return parsedData?.token || null;
    } catch (err) {
      console.error('Error parsing authData:', err.message);
      return null;
    }
  };

  const fetchAdvertisements = async (page = 0, size = 10, sortBy = "createdAt", direction = "DESC") => {
    try {
      setAdsLoading(true);
      setAdsError(null);

      const token = getToken();
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      let url = `${API_CONFIG.baseUrl}/api/v1/advertisements?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`;
      if (property?.districtName) {
        url += `&districtName=${encodeURIComponent(property.districtName)}`;
      }

      console.log('Fetching advertisements from:', url);
      const response = await fetch(url, { method: "GET", headers });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }
      const data = await response.json();
      console.log("---------------Advertisement API response:", data);
      const ads = Array.isArray(data)
        ? data
        : data.content || data.data || data.ads || [];

      if (!ads.length) {
        console.warn("No advertisements returned from API");
      }

      // Client-side filter to ensure only matching district ads are set
      const filteredAds = ads.filter(ad => ad.districtName === property?.districtName).map(ad => ({
        ...ad,
        facebookUrl: ad.facebookUrl || null,
        twitterUrl: ad.twitterUrl || null,
        instagramUrl: ad.instagramUrl || null,
        linkedinUrl: ad.linkedinUrl || null,
        youtubeUrl: ad.youtubeUrl || null,
        websiteUrl: ad.websiteUrl || null,
        phoneNumber: ad.phoneNumber || null,
        emailAddress: ad.emailAddress || null,
      }));

      setAdvertisements(filteredAds);
    } catch (err) {
      console.error("Advertisement fetch error:", err);
      setAdsError(`Failed to load advertisements: ${err.message}`);
      setAdvertisements([]);
    } finally {
      setAdsLoading(false);
    }
  };

  const fetchProperty = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = getToken();
      const headers = token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };

      const response = await fetch(`${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/properties/${propertyId}`, { headers });

      if (!response.ok) {
        const errorMessages = {
          400: 'Bad request. Please check the property ID.',
          401: 'Authentication failed. Please log in again.',
          403: 'Access denied to view this property.',
          404: 'Property not found.',
          500: 'Server error. Please try again later.',
        };
        throw new Error(errorMessages[response.status] || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('=-------------------------------Property API response:', data);
      if (!data || Object.keys(data).length === 0) {
        throw new Error('No property data returned from the server.');
      }

      setProperty({
        id: data.id || propertyId,
        title: data.title || 'Untitled Property',
        description: data.description || 'No description available.',
        type: data.type || 'Apartment',
        status: data.status || 'For Sale',
        label: data.label || '',
        price: data.price ? parseFloat(data.price) : 11000,
        area: data.area ? `${data.area}` : '1789',
        landAreaPostfix: data.landAreaPostfix || data.sizePostfix || 'sq.ft',
        bedrooms: data.bedrooms || 3,
        bathrooms: data.bathrooms || 1,
        garages: data.garages || 1,
        garageSize: data.garageSize || '200 Sq Ft',
        address: data.address || '8100 S Ashland Ave',
        city: data.city || 'Chicago',
        state: data.state || 'Illinois',
        districtName: data.districtName || 'Beverly',
        country: data.country || 'India',
        owner: {
          name: data.owner?.name || 'Unknown Agent',
          phone: data.owner?.phone || '1234567890',
          whatsapp: data.owner?.whatsapp || '1234567890',
          avatar: data.owner?.avatar || data.imageUrls?.[0] || Apartment,
          role: data.owner?.role || 'Agent',
        },
        createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A',
        yearBuilt: data.yearBuilt,
        imageUrls: data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls : [Apartment],
        features: data.features && Array.isArray(data.features) && data.features.length > 0 ? data.features : ['No features available'],
        securityFeatures: data.securityFeatures || [],
        luxuriousFeatures: data.luxuriousFeatures || [],
        additionalDetails: {
          deposit: data.deposit || '20%',
          poolSize: data.poolSize || '300 Sq Ft',
          lastRemodelYear: data.lastRemodelYear || 1987,
          features: data.features || 'Clubhouse',
          additionalRooms: { guestBath: true, equipment: data.equipment || 'Grill - Gas' },
        },
        permanentId: data.permanentId || 'HZ28',
        latitude: data.latitude || 41.7468,
        longitude: data.longitude || -87.6636,
        videoUrl: data.videoUrl || null,
        approved: data.approved ?? true,
        featured: data.featured ?? false,
        active: data.active ?? true,
        subscriptionExpiry: data.subscriptionExpiry || new Date().toISOString(),
        subscriptionPlanName: data.subscriptionPlanName || "Basic",
  subscriptionExpiry: data.subscriptionExpiry || new Date().toISOString(),
      });
      setMainImage(data.imageUrls && data.imageUrls.length > 0 ? data.imageUrls[0] : Apartment);
    } catch (err) {
      console.error('Property fetch error:', err.message);
      setError(`Failed to fetch property data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);
      const token = getToken();
      const headers = token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };

      const response = await fetch(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/reviews/property/${propertyId}?page=0&size=10&sortBy=createdAt&direction=DESC`,
        { headers }
      );

      if (!response.ok) {
        const errorMessages = {
          400: 'Bad request. Please check the review parameters.',
          401: 'Authentication failed. Please log in again.',
          403: 'Access denied to view reviews.',
          404: 'No reviews found for this property.',
          500: 'Server error. Please try again later.',
        };
        throw new Error(errorMessages[response.status] || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('Reviews API response:', data);
      if (!data.content) {
        console.warn('No review content returned from the server');
        setReviews([]);
        return;
      }
      setReviews(data.content);
    } catch (error) {
      console.error('Reviews fetch error:', error.message);
      setReviewsError(`Failed to load reviews: ${error.message}`);
    } finally {
      setReviewsLoading(false);
    }
  };

  const fetchRatings = async () => {
    try {
      const token = getToken();
      const headers = token
        ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };

      const response = await fetch(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/reviews/property/${propertyId}/rating`,
        { headers }
      );

      if (!response.ok) {
        const errorMessages = {
          400: 'Bad request. Please check the rating parameters.',
          401: 'Authentication failed. Please log in again.',
          403: 'Access denied to view ratings.',
          404: 'No ratings found for this property.',
          500: 'Server error. Please try again later.',
        };
        throw new Error(errorMessages[response.status] || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('Ratings API response:', data);
      setAverageRating(data.averageRating ? data.averageRating.toFixed(1) : '0.0');
      setReviewCount(data.reviewCount || 0);
    } catch (error) {
      console.error('Ratings fetch error:', error.message);
      setReviewsError(`Failed to load ratings: ${error.message}`);
    }
  };

  const fetchReels = async () => {
    try {
      setReelsLoading(true);
      setReelsError(null);
      const token = getToken();
      if (!token) throw new Error('Authentication required to fetch reels');
      console.log('Fetching reels from:', `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/reels/feed/nearby?radiusKm=1000000&latitude=${property?.latitude || 41.7468}&longitude=${property?.longitude || -87.6636}`);
      const response = await fetch(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/reels/feed/nearby?radiusKm=1000000&latitude=${property?.latitude || 41.7468}&longitude=${property?.longitude || -87.6636}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorMessages = {
          400: 'Bad request. Please check the reel parameters.',
          401: 'Authentication failed. Please log in again.',
          403: 'Access denied to view reels.',
          404: 'No reels found for this property.',
          500: 'Server error. Please try again later.',
        };
        throw new Error(errorMessages[response.status] || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log('Reels API response:', data);
      if (!data.success) throw new Error(data.message || 'Failed to fetch reels');

      const normalizeThumbnailUrl = (url) => {
        if (!url) return Apartment;
        return url.replace(/jpg\.jpg$/, 'jpg').replace(/([0-9a-f-]{36})jpg$/, '$1.jpg');
      };

      const propertyReels = (data.data || []).filter(reel => reel.propertyId === parseInt(propertyId)).map(reel => ({
        ...reel,
        id: reel.id || `reel-${Math.random().toString(36).substr(2, 9)}`,
        type: 'property',
        owner: {
          id: reel.owner?.id || 'unknown',
          name: reel.owner?.name || 'Unknown',
          profileImageUrl: reel.owner?.profileImageUrl || Apartment,
        },
        liked: reel.liked || false,
        saved: reel.saved || false,
        followed: reel.followed || false,
        likeCount: reel.likeCount || 0,
        commentCount: reel.commentCount || 0,
        shareCount: reel.shareCount || 0,
        saveCount: reel.saveCount || 0,
        viewCount: reel.viewCount || 0,
        comments: reel.comments || [],
        videoUrl: reel.videoUrl || 'https://www.w3schools.com/html/mov_bbb.mp4',
        thumbnailUrl: normalizeThumbnailUrl(reel.thumbnailUrl),
      }));
      setReels(propertyReels);
    } catch (error) {
      console.error('Reels fetch error:', error.message);
      setReelsError(`Failed to load reels: ${error.message}`);
    } finally {
      setReelsLoading(false);
    }
  };

  const handleStarClick = (rating) => {
    setReviewForm((prev) => ({ ...prev, rating }));
  };

  const handleStarHover = (rating) => {
    setHoveredRating(rating);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!reviewForm.rating || reviewForm.rating < 1 || reviewForm.rating > 5) {
      errors.rating = 'Please select a rating between 1 and 5';
    }
    if (!reviewForm.comment.trim()) {
      errors.comment = 'Comment is required';
    } else if (reviewForm.comment.length > 500) {
      errors.comment = 'Comment must be 500 characters or less';
    }
    if (Object.keys(errors).length > 0) {
      setReviewSubmitError(errors);
      return;
    }

    try {
      const token = getToken();
      if (!token) throw new Error('Authentication required to submit a review');
      console.log('Submitting review to:', `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/reviews`);
      const response = await fetch(`${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/reviews`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...reviewForm, propertyId: parseInt(propertyId) }),
      });

      if (!response.ok) {
        const errorMessages = {
          400: 'Bad request. Please check the review data.',
          401: 'Authentication failed. Please log in again.',
          403: 'Access denied to submit reviews.',
          500: 'Server error. Please try again later.',
        };
        throw new Error(errorMessages[response.status] || `HTTP error ${response.status}`);
      }

      const newReview = await response.json();
      console.log('Review submit response:', newReview);
      setReviews((prev) => [newReview, ...prev]);
      setReviewForm({ rating: 0, comment: '' });
      setReviewSubmitError(null);
      alert('Review submitted successfully!');
      await fetchRatings();
      await fetchReviews();
    } catch (error) {
      console.error('Review submit error:', error.message);
      setReviewSubmitError({ submit: `Failed to submit review: ${error.message}` });
    }
  };

  const handleShareClick = () => {
    const shareText = `
🏠 *${property?.title || 'Property'}*
📍 Location: ${property?.districtName || 'N/A'}, ${property?.city || 'N/A'}, ${property?.state || 'N/A'}
💰 Price: ₹${typeof property?.price === 'number' ? property.price.toLocaleString() : 'N/A'}
${property?.type?.toLowerCase() !== 'plot' ? `🛏️ Bedrooms: ${property?.bedrooms || 'N/A'}\n🛁 Bathrooms: ${property?.bathrooms || 'N/A'}\n🚗 Garage: ${property?.garages || 'N/A'}\n` : ''}📏 Area: ${property?.area || 'N/A'} ${property?.landAreaPostfix || 'N/A'}
🏠 Type: ${property?.type || 'N/A'}
👤 Owner: ${property?.owner?.name || 'N/A'}
🔗 View more: ${window.location.origin}/propertySell/${propertyId}
    `.trim();
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + (property?.imageUrls?.[0] || Apartment))}`;
    window.open(shareUrl, '_blank');
  };

  const handleImageClick = (index) => {
    setCurrentIndex(index);
    setViewMode('image');
  };

  const handleNext = () => {
    const images = property?.imageUrls || [Apartment];
    setCurrentIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0));
    setViewMode('image');
  };

  const handlePrev = () => {
    const images = property?.imageUrls || [Apartment];
    setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : images.length - 1));
    setViewMode('image');
  };

  const openGoogleMap = () => {
    if (property?.latitude && property?.longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${property.latitude},${property.longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      alert('Location data is not available for this property.');
    }
  };

  const handleReelClick = (reelId) => {
    navigate(`/reels?reelId=${reelId}`);
  };

  useEffect(() => {
    if (viewMode !== 'image') return;
    const images = property?.imageUrls || [Apartment];
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex < images.length - 1 ? prevIndex + 1 : 0));
    }, 3000);
    return () => clearInterval(interval);
  }, [property?.imageUrls, viewMode]);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      console.warn('No token found, redirecting to login');
      navigate('/login');
      return;
    }
    console.log('Initiating API calls for propertyId:', propertyId);
    fetchProperty();
    fetchReviews();
    fetchRatings();
    fetchReels();
  }, [propertyId, navigate]);

  useEffect(() => {
    if (property?.districtName) {
      fetchAdvertisements();
    }
  }, [property?.districtName]);

  useEffect(() => {
    const handleScroll = () => {
      if (footerRef.current) {
        const footerTop = footerRef.current.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;
        setIsAgentFooterVisible(footerTop > windowHeight);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (advertisements.length > 1) {
      const interval = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [advertisements.length]);

  if (loading) {
    return (
      <div className="text-center">
        <div className="">loading.....</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error bg-red-50 text-red-700 p-4 rounded-lg text-center">
        {error}
        <button className="btn btn-primary mt-3" onClick={() => navigate('/properties')}>
          Go Back
        </button>
      </div>
    );
  }

  const images = property?.imageUrls || [Apartment];
  const isPlotOrLand = ['PLOT', 'LAND'].includes(property?.type?.toUpperCase());
  const isPlot = property?.type?.toLowerCase() === 'plot';
  const getStatus = () => {
    if (!property?.approved) return 'Pending Verification';
    if (!property?.active) return 'Expired';
    if (property?.status === 'SOLD') return 'Sold';
    return 'Active';
  };

  const getTags = () => {
    const tags = [];
    if (property?.approved) tags.push('Aadhaar Verified');
    if (property?.active && property?.subscriptionExpiry > new Date().toISOString()) {
      tags.push('Subscription Active');
    } else {
      tags.push('Subscription Expired');
      if (new Date(property?.subscriptionExpiry) < new Date()) {
        tags.push('Grace Period Over');
      }
    }
    if (property?.status === 'SOLD') tags.push('Sold');
    if (!property?.approved) tags.push('Not Aadhaar Verified');
    if (property?.featured) tags.push('Featured');
    return tags;
  };

  return (
    <ErrorBoundary navigate={navigate}>
      <div className="main-container">
        <style jsx>{`
          :root {
            --primary-color: #006666;
            --secondary-color: #00CED1;
            --accent-color: #10b981;
            --text-dark: #1f2937;
            --text-grey: #4b5563;
            --shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
            --border-radius: 16px;
            --transition: all 0.3s ease;
          }

          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }

          @keyframes spin {
            to { transform: rotate(360deg); }
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Inter', 'Roboto', sans-serif;
          }

          .main-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 24px;
            background: #f8fafc;
            animation: fadeIn 0.5s ease;
          }

          .property-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 20px 0;
            border-bottom: 1px solid #eaeaea;
            font-family: 'Arial', sans-serif;
          }

          .property-left {
            max-width: 70%;
          }

          .breadcrumbs {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
          }

          .breadcrumbs a {
            color: #3b82f6;
            text-decoration: none;
            margin: 0 5px;
          }

          .property-title {
            font-size: 32px;
            font-weight: bold;
            margin: 5px 0 10px 0;
            color: #111;
          }

          .location {
            font-size: 16px;
            color: #444;
            margin-bottom: 10px;
          }

          .location svg {
            color: #666;
            margin-right: 5px;
          }

          .labels {
            display: flex;
            gap: 10px;
            margin-top: 5px;
          }

          .label {
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            color: #fff;
            text-transform: uppercase;
          }

          .label.featured {
            background-color: #3bd267;
          }

          .label.for-sale {
            background-color: #444;
          }

          .property-price {
            font-size: 28px;
            font-weight: bold;
            color: #111;
            white-space: nowrap;
            margin-top: 10px;
          }

          .main-layout {
            display: flex;
            gap: 24px;
            min-height: calc(100vh - 80px);
          }

          .content-column {
            flex: 3;
            padding: 24px;
            background: #ffffff;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }

          .sidebar {
            flex: 1;
            position: sticky;
            top: 24px;
            max-width: 380px;
            padding: 4px;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            max-height: calc(100vh - 48px);
            overflow-y: auto;
            scrollbar-width: none;
          }

          .sidebar::-webkit-scrollbar {
            display: none;
          }

          .image-slider {
            position: relative;
            height: 400px;
            border-radius: var(--border-radius);
            overflow: hidden;
            box-shadow: var(--shadow);
            margin: 24px 0;
          }

          .main-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.5s ease;
          }

          .image-slider:hover .main-image {
            transform: scale(1.05);
          }

          .iframe-map {
            width: 100%;
            height: 100%;
            border: 0;
            border-radius: 8px;
          }

          .property-nav {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            background: rgba(0, 0, 0, 0.6);
            color: #ffffff;
            border: none;
            padding: 12px;
            font-size: 1.5rem;
            cursor: pointer;
            border-radius: 50%;
            transition: var(--transition);
          }

          .property-nav:hover {
            background: rgba(0, 0, 0, 0.8);
          }

          .property-nav.left {
            left: 16px;
          }

          .property-nav.right {
            right: 16px;
          }

          .thumbs {
            display: flex;
            gap: 12px;
            margin-top: 12px;
            overflow-x: auto;
            scroll-snap-type: x mandatory;
            padding-bottom: 12px;
            scrollbar-width: none;
          }

          .thumbs::-webkit-scrollbar {
            display: none;
          }

          .thumbs .thumb {
            width: 80px;
            height: 60px;
            object-fit: cover;
            border-radius: 8px;
            cursor: pointer;
            border: 2px solid transparent;
            transition: var(--transition);
            position: relative;
          }

          .thumbs .thumb.active,
          .thumbs .thumb:hover {
            border: 2px solid var(--secondary-color);
            transform: scale(1.05);
          }

          .reels-section {
            margin: 24px 0;
            padding: 24px;
            background: #ffffff;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }

          .reels-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 12px;
          }

          .reels-grid .reel {
            position: relative;
            width: 100%;
            height: 200px;
            border-radius: 8px;
            overflow: hidden;
            cursor: pointer;
            transition: var(--transition);
          }

          .reels-grid .reel:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .reels-grid .reel video {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 8px;
          }

          .reels-grid .reel img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            border-radius: 8px;
            display: none;
          }

          .reels-grid .reel .play-icon {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #fff;
            font-size: 2rem;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            z-index: 1;
          }

          .neartime-price-box {
            position: absolute;
            bottom: 8px;
            left: 8px;
            background: rgba(0, 0, 0, 0.3);
            color: white;
            padding: 8px 16px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
            text-shadow: 0 2px 6px rgba(0,0,0,0.8);
          }

          .neartime-price-per {
            font-size: 0.5rem;
            opacity: 0.9;
          }

          .landing-overlay-icons {
            position: absolute;
            top: -18px;
            width: 278px;
            height: 40px;
            background: green;
            right: 10px;
            display: flex;
            gap: 10px;
          }

          .landing-overlay-icons-i {
            background: rgba(0, 0, 0, 0.6);
            color: white;
            padding: 8px;
            border-radius: 50%;
            font-size: 1rem;
            cursor: pointer;
            transition: var(--transition);
          }

          .landing-overlay-icons-i:hover {
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
          }

          .landing-overlay-icons-i.active {
            background: var(--secondary-color);
          }

          .property-id {
            font-weight: 600;
            color: var(--primary-color);
            padding: 4px 8px;
            border-radius: 4px;
            background: #e6f0fa;
            margin-bottom: 20px;
          }

          h2 {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-dark);
            margin-bottom: 16px;
            position: relative;
          }

          .overview-container {
            margin: 24px 0;
            padding: 24px;
            background: #ffffff;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }

          .overview-top-bar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.95rem;
            color: var(--text-grey);
            margin-bottom: 16px;
          }

          .overview-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            gap: 16px;
            margin: 16px 0;
          }

          .overview-item {
            text-align: center;
          }

          .overview-item span {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-weight: 500;
            color: var(--text-dark);
          }

          .overview-item small {
            font-size: 0.8rem;
            color: var(--text-grey);
          }

          .description-container {
            margin: 24px 0;
            padding: 24px;
            background: #ffffff;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }

          .ad-section {
            margin: 24px 0;
            padding: 24px;
            background: #ffffff;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }

          .ad-layout {
            display: flex;
            gap: 20px;
          }

          .ad-image-section {
            flex: 1;
            max-width: 50%;
          }

          .ad-content-section {
            flex: 2;
            max-width: 50%;
          }

          .ad-image {
            width: 100%;
            height: 300px;
            object-fit: cover;
            border-radius: var(--border-radius);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease;
          }

          .ad-image:hover {
            transform: scale(1.02);
          }

          .ad-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--text-dark);
            margin-bottom: 8px;
          }

          .ad-description {
            font-size: 0.9rem;
            color: var(--text-grey);
            line-height: 1.6;
            margin-bottom: 16px;
          }

          .ad-social-icons {
            display: flex;
            gap: 10px;
            margin-top: 10px;
          }

          .ad-social-icons a {
            color: #333;
            font-size: 20px;
          }

          .address-section {
            margin: 24px 0;
            padding: 24px;
            background: #ffffff;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }

          .google-maps-btn {
            background: var(--primary-color);
            color: #ffffff;
            border: none;
            padding: 8px 12px;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-size: 0.9rem;
            float: right;
          }

          .google-maps-btn:hover {
            background: #005555;
          }

          .address-details {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
            font-size: 0.9rem;
            color: var(--text-grey);
            margin-top: 10px;
          }

          .address-details div {
            margin: 5px 0;
          }

          .details-section {
  margin: 24px 0;
  padding: 24px;
  background: #ffffff;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
}

.update-time {
  font-size: 0.8rem;
  color: var(--text-grey);
  float: right;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 10px;
  font-size: 0.9rem;
  color: var(--text-dark);
  background: #e6f0fa;
  padding: 15px;
  border-radius: var(--border-radius);
}

.details-grid div {
  margin: 5px 0;
}

@media (max-width: 600px) {
  .details-section {
    margin: 16px 0;
    padding: 12px;
  }

  h2 {
    font-size: 1.2rem;
    margin-bottom: 12px;
  }

  .update-time {
    font-size: 0.7rem;
  }

  .details-grid {
    grid-template-columns: 1fr; /* Stack into a single column on mobile */
    font-size: 0.85rem;
    padding: 10px;
  }

  .details-grid div {
    margin: 4px 0;
  }
}

@media (max-width: 480px) {
  .details-section {
    padding: 8px;
  }

  .details-grid {
    font-size: 0.8rem;
    padding: 8px;
  }

  .details-grid div {
    margin: 3px 0;
  }
}

          .features-section {
            margin: 24px 0;
            padding: 24px;
            background: #ffffff;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }

          .features-list {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 10px;
          }

          .feature-item {
            display: flex;
            align-items: center;
            font-size: 0.9rem;
            color: var(--text-dark);
          }

          .feature-item input[type="checkbox"] {
            margin-right: 8px;
          }

          .gallery-section {
            margin: 24px 0;
            padding: 24px;
            background: #ffffff;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }

          .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 12px;
          }

          .gallery-grid img {
            width: 100%;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            cursor: pointer;
            transition: var(--transition);
          }

          .gallery-grid img:hover {
            transform: scale(1.02);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          }

          .video-section {
            margin: 24px 0;
            padding: 24px;
            background: #ffffff;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }

          .video-wrapper {
            position: relative;
            padding-bottom: 56.25%;
            height: 0;
            overflow: hidden;
          }

          .video-wrapper iframe {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            border-radius: 8px;
          }

          .reviews-section {
            margin: 24px 0;
            padding: 24px;
            background: #ffffff;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
          }

          .reviews-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
          }

          .review-item {
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
          }

          .review-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }

          .review-header span {
            font-size: 0.95rem;
            font-weight: 500;
            color: var(--text-dark);
          }

          .review-rating .filled {
            color: #facc15;
          }

          .review-rating svg {
            color: #d1d5db;
            width: 20px;
            height: 20px;
          }

          .review-item p {
            font-size: 0.9rem;
            color: var(--text-dark);
            line-height: 1.5;
          }

          .review-item small {
            font-size: 0.8rem;
            color: var(--text-grey);
          }

          .review-form {
            margin-top: 20px;
            padding: 20px;
            background: #f9f9f9;
            border-radius: 8px;
          }

          .form-group {
            margin-bottom: 15px;
          }

          .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
          }

          .form-group textarea {
            width: 100%;
            min-height: 100px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 4px;
          }

          .error-text {
            color: #dc2626;
            font-size: 0.8rem;
            margin-top: 4px;
          }

          .terms {
            font-size: 0.85rem;
            color: var(--text-grey);
            margin: 12px 0;
          }

          .terms a {
            color: var(--secondary-color);
            text-decoration: none;
          }

          .terms a:hover {
            text-decoration: underline;
          }

          .submit-btn {
            width: 100%;
            padding: 12px;
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: var(--transition);
          }

          .submit-btn:hover {
            background: linear-gradient(90deg, #005555, #00B7B7);
            transform: translateY(-2px);
          }

          .submit-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
          }

          .detail-agent-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: #ffffff;
            border-top: 1px solid #e5e7eb;
            padding: 12px 16px;
            box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
            z-index: 1000;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          .detail-agent-footer-content {
            display: flex;
            align-items: center;
            gap: 12px;
            max-width: 1400px;
            width: 100%;
            padding: 0 24px;
          }

          .detail-agent-footer-name {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
          }

          .detail-agent-footer-name img {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            object-fit: cover;
          }

          .detail-agent-footer-name span {
            font-weight: 600;
            color: var(--text-dark);
          }

          .detail-agent-square-btn {
            width: 96px;
            height: 36px;
            background-color: #0c9;
            color: white;
            border: none;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 1rem;
            transition: var(--transition);
          }

          .detail-agent-square-btn:hover {
            background-color: #0a7;
          }

          .spinner {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 300px;
          }

          .spinner-icon {
            width: 64px;
            height: 64px;
            border: 4px solid var(--secondary-color);
            border-top-color: transparent;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .error {
            background: #fef2f2;
            color: #dc2626;
            padding: 24px;
            border-radius: var(--border-radius);
            text-align: center;
            font-size: 1rem;
            margin: 24px 0;
          }

          .error .btn {
            padding: 10px 20px;
            background: var(--secondary-color);
            color: #ffffff;
            border: none;
            border-radius: 8px;
            font-size: 0.95rem;
            font-weight: 500;
            margin-top: 16px;
            transition: var(--transition);
          }

          .error .btn:hover {
            background: var(--primary-color);
          }

          .rating-stars {
            display: flex;
            gap: 5px;
            margin-bottom: 10px;
          }

          .rating-stars svg {
            color: #ccc;
            width: 24px;
            height: 24px;
          }

          .rating-stars svg.filled {
            color: #ffd700;
          }

          @media (max-width: 1200px) {
            .main-layout {
              flex-direction: column;
            }

            .sidebar {
              position: static;
              max-width: 100%;
              margin-top: 24px;
            }

            .image-slider {
              height: 300px;
            }

            .gallery-grid {
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            }

            .reels-grid {
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            }

            .ad-layout {
              flex-direction: column;
            }

            .ad-image-section, .ad-content-section {
              max-width: 100%;
            }

            .detail-agent-footer-content {
              padding: 0 16px;
            }
          }

          @media (max-width: 900px) {
            .main-container {
              padding: 16px;
            }

            .content-column {
              padding: 16px;
            }

            .sidebar {
              padding: 16px;
            }

            .property-header {
              flex-direction: column;
              align-items: flex-start;
            }

            .property-left {
              max-width: 100%;
              margin-bottom: 16px;
            }

            .property-price {
              margin-top: 0;
            }

            .image-slider {
              height: 250px;
            }

            .thumbs .thumb {
              width: 60px;
              height: 45px;
            }

            .gallery-grid {
              grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }

            .reels-grid {
              grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
            }

            .ad-image {
              height: 200px;
            }

            .detail-agent-footer-content {
              padding: 0 16px;
            }

            .detail-agent-footer-name {
              gap: 8px;
            }

            .detail-agent-square-btn {
              width: 80px;
              height: 32px;
              font-size: 0.9rem;
            }

            .detail-agent-footer-name img {
              width: 32px;
              height: 32px;
            }

            .detail-agent-footer-name span {
              font-size: 0.9rem;
            }
          }

          @media (max-width: 600px) {
            .property-title {
              font-size: 1.8rem;
            }

            .image-slider {
              height: 200px;
            }

            .thumbs .thumb {
              width: 50px;
              height: 38px;
            }

            .gallery-grid img,
            .reels-grid .reel {
              height: 150px;
            }

            .property-id {
              font-size: 0.85rem;
              margin-left: 25px;
            }

            .ad-image {
              height: 150px;
            }

            .ad-title {
              font-size: 1.1rem;
            }

            .ad-description {
              font-size: 0.8rem;
            }

            .detail-agent-footer-name {
              gap: 6px;
            }

            .detail-agent-square-btn {
              width: 60px;
              height: 28px;
              font-size: 0.85rem;
            }

            .detail-agent-footer-name img {
              width: 28px;
              height: 28px;
            }

            .detail-agent-footer-name span {
              font-size: 0.8rem;
            }
          }

          @media (max-width: 480px) {
            .main-container {
              padding: 8px;
            }

            .property-title {
              font-size: 1.75rem;
            }

            .image-slider {
              height: 180px;
            }

            .thumbs .thumb {
              width: 40px;
              height: 30px;
            }

            .gallery-grid img,
            .reels-grid .reel {
              height: 120px;
            }

            .ad-image {
              height: 120px;
            }

            .ad-title {
              font-size: 1rem;
            }

            .ad-description {
              font-size: 0.75rem;
            }
          }
        `}</style>

        <div className="property-header">
          <div className="property-left">
            <div className="breadcrumbs">
              <Link to="/"><FontAwesomeIcon icon={faBuilding} /> Home</Link> <span>&gt;</span> <Link to="/properties">Properties</Link> <span>&gt;</span> {property?.title || 'Property'}
            </div>
            <h1 className="property-title">{property?.title || 'Untitled Property'}</h1>
            <p className="location"><FontAwesomeIcon icon={faLocationDot} /> {property?.address || 'N/A'}, {property?.city || 'N/A'}, {property?.state || 'N/A'}</p>
            <div className="labels">
              {property?.featured && <span className="label featured"><FontAwesomeIcon icon={faSolidStar} /> Featured</span>}
              <span className="label for-sale">{property?.status || ''}</span>
              <span className="label for-sale">{property?.label || ''}</span>
            </div>
          </div>
          <div className="property-price">
            <span className="price">₹{typeof property?.price === 'number' ? property.price.toLocaleString() : 'N/A'}</span>
          </div>
        </div>

        <div className="main-layout">
          <div className="content-column">
              <div >  
                <div style={{gap: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                <FontAwesomeIcon
                  icon={faMap}
                  className={`landing-overlay-icons-i ${viewMode === 'map' ? 'active' : ''}`}
                  onClick={() => setViewMode('map')}
                />
                <FontAwesomeIcon
                  icon={faImage}
                  className={`landing-overlay-icons-i ${viewMode === 'image' ? 'active' : ''}`}
                  onClick={() => setViewMode('image')}
                />
                <FontAwesomeIcon
                  icon={faLocationDot}
                  className={`landing-overlay-icons-i ${viewMode === 'location' ? 'active' : ''}`}
                  onClick={() => setViewMode('location')}
                />
                {/* <FontAwesomeIcon
                  icon={faHeart}
                  className="landing-overlay-icons-i"
                /> */}
                <FontAwesomeIcon
                  icon={faShare}
                  className="landing-overlay-icons-i"
                  onClick={handleShareClick}
                  title="Share Property"
                />
              </div></div>
            <div className="image-slider">
              {viewMode === 'image' && (
                <img
                  src={images[currentIndex]}
                  alt={property?.title || 'Property Image'}
                  className="main-image"
                  onError={(e) => { e.target.src = Apartment; }}
                />
              )}
              {viewMode === 'map' && (
                <ErrorBoundary>
                  {property?.latitude && property?.longitude ? (
                    <iframe
                      title="Property Map"
                      className="iframe-map"
                      loading="lazy"
                      allowFullScreen
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(property.latitude)},${encodeURIComponent(property.longitude)}&z=15&output=embed`}
                    />
                  ) : (
                    <div className="error bg-red-50 text-red-700 p-4 rounded-lg text-center">
                      Map unavailable: No coordinates provided.
                    </div>
                  )}
                </ErrorBoundary>
              )}
              {viewMode === 'location' && (
                <ErrorBoundary>
                  {property?.address ? (
                    <iframe
                      title="Property Location"
                      className="iframe-map"
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps?q=${encodeURIComponent(`${property.address}, ${property.city || ''}, ${property.state || ''}`)}&output=embed`}
                    />
                  ) : (
                    <div className="error bg-red-50 text-red-700 p-4 rounded-lg text-center">
                      Location unavailable: No address provided.
                    </div>
                  )}
                </ErrorBoundary>
              )}
              <div className="neartime-price-box">
                ₹{typeof property?.price === 'number' ? property.price.toLocaleString() : 'N/A'}
                <br />
                <span className="neartime-price-per">
                  ₹{(property?.price && property?.area ? (property.price / parseFloat(property.area)).toFixed(2) : 'N/A')} / {property?.landAreaPostfix || 'sq.ft'}
                </span>
              </div>
              {/* <div className="landing-overlay-icons">
                <FontAwesomeIcon
                  icon={faMap}
                  className={`landing-overlay-icons-i ${viewMode === 'map' ? 'active' : ''}`}
                  onClick={() => setViewMode('map')}
                />
                <FontAwesomeIcon
                  icon={faImage}
                  className={`landing-overlay-icons-i ${viewMode === 'image' ? 'active' : ''}`}
                  onClick={() => setViewMode('image')}
                />
                <FontAwesomeIcon
                  icon={faLocationDot}
                  className={`landing-overlay-icons-i ${viewMode === 'location' ? 'active' : ''}`}
                  onClick={() => setViewMode('location')}
                />
                <FontAwesomeIcon
                  icon={faHeart}
                  className="landing-overlay-icons-i"
                />
                <FontAwesomeIcon
                  icon={faShare}
                  className="landing-overlay-icons-i"
                  onClick={handleShareClick}
                  title="Share Property"
                />
              </div> */}
            </div>
            <div className="thumbs">
              
              {images.map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  className={`thumb ${currentIndex === index && viewMode === 'image' ? 'active' : ''}`}
                  onClick={() => handleImageClick(index)}
                  onError={(e) => { e.target.src = Apartment; }}
                />
              ))}
            </div>

            <div className="overview-container">
              <div className="overview-top-bar">
                <h2>Overview</h2>
                <span className="property-id">Property ID: {property?.permanentId || 'N/A'}</span>
              </div>
              <div className="overview-grid">
  <div className="overview-item">
    <span><FontAwesomeIcon icon={faBuilding} /> {property?.type || 'N/A'}</span>
    <small>Property Type</small>
  </div>

  {/* Bedrooms - सिर्फ Plot/Land नहीं होने पर और value > 0 होने पर दिखाओ */}
  {!isPlotOrLand && property?.bedrooms > 0 && (
    <div className="overview-item">
      <span><FontAwesomeIcon icon={faBed} /> {property?.bedrooms}</span>
      <small>Bedrooms</small>
    </div>
  )}

  {/* Bathrooms - सिर्फ Plot/Land नहीं होने पर और value > 0 होने पर दिखाओ */}
  {!isPlotOrLand && property?.bathrooms > 0 && (
    <div className="overview-item">
      <span><FontAwesomeIcon icon={faShower} /> {property?.bathrooms}</span>
      <small>Bathrooms</small>
    </div>
  )}

  {/* Garage - सिर्फ Plot/Land नहीं होने पर और value > 0 होने पर दिखाओ */}
  {!isPlotOrLand && property?.garages > 0 && (
    <div className="overview-item">
      <span><FontAwesomeIcon icon={faCar} /> {property?.garages}</span>
      <small>Garage</small>
    </div>
  )}

  {/* Area Size - हमेशा दिखाओ */}
  <div className="overview-item">
    <span>
      <FontAwesomeIcon icon={faRulerCombined} /> 
      {property?.area || 'N/A'} {property?.landAreaPostfix || property?.sizePostfix || 'sq.ft'}
    </span>
    <small>Area Size</small>
  </div>
</div>
            </div>

            <div className="description-container">
              <h2>Description</h2>
              <p>{property?.description || 'No description available.'}</p>
            </div>

{/* ----------------------------------ads-------------------------------------------- */}
           <div className="ad-section">
  <span className="ads">Sponsored</span>

  {adsLoading && <div className="spinner text-center"><div className="spinner-icon" /></div>}
  {adsError && <p className="error-text">{adsError}</p>}

  {!adsLoading && !adsError && advertisements.length > 0 && (
    <div className="ad-layout">
      {/* Image 50% */}
      <div className="ad-image-section">
        <img
          src={advertisements[currentAdIndex].bannerImageUrl || Apartment}
          alt={advertisements[currentAdIndex].title}
          className="ad-image"
        />
      </div>

      {/* Content 50% */}
      <div className="ad-content-section">
        <div>
          <h2 className="ad-title">
            {advertisements[currentAdIndex].title}
          </h2>

          <div className="ad-location">
            📍 {advertisements[currentAdIndex].districtName}
          </div>

          <p className="ad-description">
            {advertisements[currentAdIndex].description}
          </p>

          <div className="ad-validity">
            ⏳ Valid till:{" "}
            {new Date(advertisements[currentAdIndex].validUntil).toLocaleDateString()}
          </div>
        </div>

        {/* Contact / Social */}
        <div className="ad-social-icons">
          {advertisements[currentAdIndex].phoneNumber && (
            <a href={`tel:${advertisements[currentAdIndex].phoneNumber}`} title="Call">
              <FontAwesomeIcon icon={faPhone} />
            </a>
          )}
          {advertisements[currentAdIndex].whatsappNumber && (
            <a
              href={`https://wa.me/${advertisements[currentAdIndex].whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              title="WhatsApp"
            >
              <FontAwesomeIcon icon={faWhatsapp} />
            </a>
          )}
          {advertisements[currentAdIndex].emailAddress && (
            <a href={`mailto:${advertisements[currentAdIndex].emailAddress}`} title="Email">
              <FontAwesomeIcon icon={faEnvelope} />
            </a>
          )}
          {advertisements[currentAdIndex].websiteUrl && (
            <a
              href={advertisements[currentAdIndex].websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Website"
            >
              <FontAwesomeIcon icon={faGlobe} />
            </a>
          )}
        </div>
      </div>
    </div>
  )}
</div>


            <div className="address-section">
              <h2>Address</h2>
              <div className="address-details">
                <div><strong>Address:</strong> {property?.address || 'N/A'}</div>
                <div><strong>City:</strong> {property?.city || 'N/A'}</div>
                <div><strong>State/County:</strong> {property?.state || 'N/A'}</div>
                <div><strong>Area:</strong> {property?.districtName || 'N/A'}</div>
                <div><strong>Country:</strong> {property?.country || 'N/A'}</div>
                <button onClick={openGoogleMap} className="google-maps-btn" aria-label="Open in Google Maps">
                  Open in Google Maps
                </button>
              </div>
            </div>

            <div className="details-section">
              <h2>Details <span className="update-time">Updated on {property?.createdAt || 'N/A'}</span></h2>
              <div className="details-grid">
                {/* <div><strong>Property ID:</strong> {property?.permanentId || 'N/A'}</div> */}
                <div><strong>Price:</strong> ₹{typeof property?.price === 'number' ? property.price.toLocaleString() : 'N/A'}</div>
                <div><strong>Property Size:</strong> {property?.area || 'N/A'} {property?.landAreaPostfix || 'sq.ft'}</div>
                {!isPlot && <div><strong>Bedrooms:</strong> {property?.bedrooms || 'N/A'}</div>}
                {!isPlot && <div><strong>Bathroom:</strong> {property?.bathrooms || 'N/A'}</div>}
                {/* {!isPlot && <div><strong>Garage:</strong> { property?.garages}</div>} */}
                {!isPlot && <div><strong>Garage Size:</strong> {property?.garageSize || 'N/A'}</div>}
                <div><strong>Year Built:</strong> {property?.yearBuilt || 'N/A'}</div>
                <div><strong>Property Type:</strong> {property?.type || 'N/A'}</div>
                <div><strong>Property Status:</strong> {getStatus()}</div>
              </div>
            </div>

            <div className="features-section">
              <h2>Features</h2>
              <div className="features-list">
                {property?.features?.map((amenity, index) => (
                  <div key={index} className="feature-item">
                    <input type="checkbox" checked readOnly />
                    <span>{amenity}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="gallery-section">
              <h2>Gallery</h2>
              <div className="gallery-grid">
                {property?.imageUrls?.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Gallery ${index + 1}`}
                    onError={(e) => { e.target.src = Apartment; }}
                  />
                ))}
              </div>
            </div>

            {reels.length > 0 && (
              <div className="reels-section">
                <h2>Reels</h2>
                {reelsLoading && <p>Loading reels...</p>}
                {reelsError && (
                  <p className="error-text">
                    {reelsError.includes('500') ? 'Server error (500). Please try again later or contact support.' : `Error: ${reelsError}`}
                  </p>
                )}
                {!reelsLoading && !reelsError && (
                  <div className="reels-grid">
                    {reels.map((reel, index) => (
                      <div key={reel.id} className="reel" onClick={() => handleReelClick(reel.id)}>
                        <video
                          src={reel.videoUrl}
                          poster={reel.thumbnailUrl}
                          muted
                          loop
                          playsInline
                          autoPlay
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <img
                          src={reel.thumbnailUrl}
                          alt={`Reel ${index + 1}`}
                          onError={(e) => { e.target.src = Apartment; }}
                        />
                        <FontAwesomeIcon icon={faPlay} className="play-icon" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {property?.videoUrl && (
              <div className="video-section">
                <h2>Video Tour</h2>
                <div className="video-wrapper">
                  <iframe
                    src={property.videoUrl}
                    title="Property Video"
                    frameBorder="0"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    sandbox="allow-scripts allow-same-origin allow-presentation"
                  ></iframe>
                </div>
              </div>
            )}

            <div className="reviews-section">
              <h2>Reviews</h2>
              {reviewsLoading && <p>Loading reviews...</p>}
              {reviewsError && (
                <p className="error-text">
                  {reviewsError.includes('500') ? 'Server error (500). Please try again later or contact support.' : `Error: ${reviewsError}`}
                </p>
              )}
              {reviewSubmitError?.submit && <p className="error-text">{reviewSubmitError.submit}</p>}
              {!reviewsLoading && !reviewsError && reviews.length === 0 ? (
                <p>No reviews yet.</p>
              ) : (
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review.id} className="review-item">
                      <div className="review-header">
                        <span>{review.user?.name || 'Anonymous'}</span>
                        <span className="review-rating">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <FontAwesomeIcon
                              key={num}
                              icon={num <= review.rating ? faSolidStar : faRegularStar}
                              className={num <= review.rating ? 'filled' : ''}
                            />
                          ))}
                        </span>
                      </div>
                      <p>{review.comment || 'No comment provided'}</p>
                      <small>{new Date(review.createdAt || Date.now()).toLocaleDateString()}</small>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="review-form">
                <h3>Submit a Review</h3>
                <form onSubmit={handleReviewSubmit}>
                  <div className="form-group">
                    <label>Rating</label>
                    <div className="rating-stars">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <FontAwesomeIcon
                          key={num}
                          icon={num <= (hoveredRating || reviewForm.rating) ? faSolidStar : faRegularStar}
                          className={num <= (hoveredRating || reviewForm.rating) ? 'filled' : ''}
                          onClick={() => handleStarClick(num)}
                          onMouseEnter={() => handleStarHover(num)}
                          onMouseLeave={() => handleStarHover(0)}
                          style={{ cursor: 'pointer' }}
                        />
                      ))}
                    </div>
                    {reviewSubmitError?.rating && <span className="error-text">{reviewSubmitError.rating}</span>}
                  </div>
                  <div className="form-group">
                    <label>Comment</label>
                    <textarea
                      name="comment"
                      value={reviewForm.comment}
                      onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                      placeholder="Share your experience with this property..."
                      maxLength={500}
                    ></textarea>
                    {reviewSubmitError?.comment && <span className="error-text">{reviewSubmitError.comment}</span>}
                  </div>
                  {reviewSubmitError?.submit && <p className="error-text">{reviewSubmitError.submit}</p>}
                  <div className="terms">
                    By submitting this form I agree to <a href="#">Terms of Use</a>
                  </div>
                  <button type="submit" className="submit-btn" disabled={reviewsLoading}>
                    Submit Review
                  </button>
                </form>
              </div>
            </div>
          </div>
          <div className="sidebar">
            <Sidebar propertyId={propertyId} propertyTitle={property?.title} owner={property?.owner} propertydata={property} />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default PropertySell;




