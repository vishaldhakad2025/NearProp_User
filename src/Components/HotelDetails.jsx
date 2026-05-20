import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeart, faShare, faBuilding, faBed, faRulerCombined, faCalendarDays,
  faComment, faMap, faImage, faLocationDot, faStar, faCheck, faPhone, faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import { faStar as faRegularStar } from '@fortawesome/free-regular-svg-icons';
import { faFacebookF, faTwitter, faInstagram, faLinkedinIn, faYoutube } from '@fortawesome/free-brands-svg-icons';
import Sidebar from './HotelSidebar';
import './HotelDetails.css';
import axios from 'axios';
import { baseurl } from '../../BaseUrl';

const API_CONFIG = {
  baseUrl: 'https://hotel-banquet.nearprop.in',
  apiPrefix: 'api',
};

const AD_API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api/v1',
};

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400';

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
        <div className="error">
          Error: {this.state.error?.message || 'Something went wrong'}
          <button className="btn-primary" onClick={() => this.props.navigate('/properties')}>
            Go Back
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const HotelDetails = () => {
  const { id: propertyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(PLACEHOLDER_IMAGE);
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
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    profileImageUrl: 'https://nearprop-documents.s3.ap-south-1.amazonaws.com/defaults/default-user-profile.png',
  });
  const [advertisements, setAdvertisements] = useState([]);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  const getToken = () => {
    try {
      const authData = localStorage.getItem('authData');
      if (!authData) return null;
      const parsedData = JSON.parse(authData);
      return { token: parsedData.token || null, userId: parsedData.userId || null };
    } catch (err) {
      console.error('Error parsing authData:', err.message);
      return null;
    }
  };

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      const auth = getToken();
      if (!auth?.token) {
        console.log('No token found, redirecting to login');
        setError('No authentication token found. Please log in.');
        navigate('/login');
        return;
      }

      try {
        const profileUrl = `${baseurl}/v1/users/profile`;
        console.log('Fetching profile from URL:', profileUrl);

        const response = await axios.get(profileUrl, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
          },
        });

        console.log('Profile API response:', response);

        if (response.data.success) {
          const { name, email, phoneNumber, profileImageUrl } = response.data.data;
          setUserProfile({
            name: name || '',
            email: email || '',
            phoneNumber: phoneNumber || '',
            profileImageUrl: profileImageUrl || userProfile.profileImageUrl,
          });
        } else {
          console.error('Profile fetch failed:', response.data.message);
          setError('Failed to fetch profile data: ' + response.data.message);
        }
      } catch (err) {
        console.error('Profile fetch error:', err);
        console.error('Full error response:', err.response?.data || err.message);
        if (err.response && (err.response.status === 401 || err.response.status === 403)) {
          console.log('Token invalid/expired, redirecting to login...');
          localStorage.removeItem('authData');
          navigate('/login');
          return;
        }
        setError('Error fetching profile: ' + (err.response?.data?.message || err.message));
      }
    };

    fetchUserProfile();
  }, [navigate]);

  // Fetch advertisements
  const fetchAdvertisements = async (page = 0, size = 10, sortBy = "createdAt", direction = "DESC") => {
    try {
      setAdsLoading(true);
      setAdsError(null);

      const token = getToken()?.token;
      const headers = {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      };

      let url = `${AD_API_CONFIG.baseUrl}/${AD_API_CONFIG.apiPrefix}/advertisements?page=${page}&size=${size}&sortBy=${sortBy}&direction=${direction}`;
      if (property?.districtName) {
        const sanitizedDistrict = (property.districtName || '').trim().replace(/[:\s]+/g, '');
        if (sanitizedDistrict) {
          url += `&districtName=${encodeURIComponent(sanitizedDistrict)}`;
        }
      }

      console.log('Fetching advertisements from:', url);
      console.log('Property districtName for ads filter:', property?.districtName);
      const response = await fetch(url, { method: "GET", headers });

      if (!response.ok) {
        const errorMessages = {
          400: 'Invalid request parameters.',
          401: 'Authentication failed. Please log in again.',
          403: 'Access denied to fetch advertisements.',
          404: 'Advertisement endpoint not found.',
          500: 'Server error. Please try again later.',
        };
        throw new Error(errorMessages[response.status] || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      console.log("Advertisement API response:", data);

      let ads = Array.isArray(data)
        ? data
        : data.content || data.data || data.ads || data.items || [];

      ads = ads.map(ad => ({
        id: ad.id || ad._id || `ad-${Math.random().toString(36).substr(2, 9)}`,
        title: ad.title || 'Untitled Advertisement',
        description: ad.description || 'No description available',
        bannerImageUrl: ad.bannerImageUrl || ad.imageUrl || PLACEHOLDER_IMAGE,
        phoneNumber: ad.phoneNumber || '',
        emailAddress: ad.emailAddress || '',
        districtName: ad.districtName || property?.districtName || '',
        facebookUrl: ad.facebookUrl || '',
        twitterUrl: ad.twitterUrl || '',
        instagramUrl: ad.instagramUrl || '',
        linkedinUrl: ad.linkedinUrl || '',
        youtubeUrl: ad.youtubeUrl || '',
      }));

      const filteredAds = ads.filter(ad => 
        ad.districtName.toLowerCase() === (property?.districtName || '').toLowerCase()
      );

      console.log('Filtered advertisements:', filteredAds);

      if (filteredAds.length === 0) {
        console.warn("No advertisements match the district:", property?.districtName);
      }

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
      setReviewsError(null);
      const auth = getToken();
      if (!auth?.token) {
        throw new Error('Authentication required. Please log in.');
      }

      const endpoint = `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/hotels/${propertyId}`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorMessages = {
          401: 'Authentication failed. Please log in again.',
          403: 'Access denied to view this hotel.',
          404: `Hotel ${propertyId} not found.`,
          500: 'Server error. Please try again later.',
        };
        throw new Error(errorMessages[response.status] || `Failed to fetch hotel: ${response.status}`);
      }

      const { data } = await response.json();
      if (!data || Object.keys(data).length === 0) {
        throw new Error('No hotel data returned from the server.');
      }

      const allImages = [
        ...(data.images || []),
        ...(data.rooms?.flatMap(room => room.images || []) || []),
      ].filter(img => img);

      const allVideos = [
        ...(data.videos || []),
        ...(data.rooms?.flatMap(room => room.videos || []) || []),
      ].filter(video => video);

      const amenities = [
        ...new Set(
          data.rooms?.flatMap(room => [...(room.features || []), ...(room.services || [])]) || []
        ),
      ];

      const totalBeds = data?.rooms?.reduce((sum, room) => sum + (room.inventoryCount || 0), 0) || 0;

      // FIXED OWNER OBJECT - ONLY PRIMITIVE VALUES (STRINGS)
      const ownerData = {
        name: 'Hotel Management',
        phone: data.contactNumber || data.userId?.mobile || 'Not Available',
        whatsapp: data.contactNumber || data.userId?.mobile || 'Not Available',
        email: data.email || data.userId?.email || '',
        avatar: data.userId?.profileImage || PLACEHOLDER_IMAGE,
        role: 'Owner',
      };

      const propertyData = {
        id: data._id || propertyId,
        title: data.name || 'Untitled Hotel',
        description: data.description || 'No description available',
        type: 'Hotel',
        status: data.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
        price: data.averageRoomPrice || data.rooms?.[0]?.price || 2000,
        area: data.rooms?.length || 0,
        landAreaPostfix: 'Rooms',
        bedrooms: totalBeds,
        bathrooms: data.bathrooms || 'N/A',
        garages: data.parking || 'N/A',
        garageSize: data.parkingSize || 'N/A',
        address: `${data.city || 'Unknown City'}, ${data.state || 'Unknown State'}, ${data.pincode || 'N/A'}`,
        city: data.city || 'Indore',
        state: data.state || 'Madhya Pradesh',
        districtName: data.city || 'Indore',
        zipCode: data.pincode || '452010',
        country: 'India',
        owner: ownerData,
        createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString('en-IN') : 'N/A',
        yearBuilt: data.yearBuilt || 'N/A',
        imageUrls: allImages.length > 0 ? allImages : [PLACEHOLDER_IMAGE],
        amenities: amenities.length > 0 ? amenities : ['WiFi', 'Parking'],
        securityFeatures: data.securityFeatures || [],
        luxuriousFeatures: data.luxuriousFeatures || [],
        features: amenities,
        additionalDetails: {
          deposit: data.deposit || '20%',
          poolSize: data.poolSize || 'N/A',
          lastRemodelYear: data.lastRemodelYear || 'N/A',
          amenities: amenities.join(', ') || 'N/A',
          additionalRooms: data.additionalRooms || { guestBath: false, equipment: 'N/A' },
        },
        permanentId: data.hotelId || 'UNKNOWN',
        latitude: data.location?.coordinates?.[1] || data.latitude || 19.076,
        longitude: data.location?.coordinates?.[0] || data.longitude || 72.8777,
        videoUrl: allVideos[0] || 'https://www.youtube.com/embed/-NInBEdSvp8?si=H4Qq2rmaE3bifehT',
        approved: data.verificationStatus === 'verified',
        featured: data.subscriptions?.[0]?.isActive || false,
        active: data.isAvailable,
        subscriptionExpiry: data.subscriptions?.[0]?.endDate || new Date().toISOString(),
        rooms: data.rooms || [],
        gst: data.gst || 'N/A',
        businessLicense: data.businessLicense || 'N/A',
        subscriptionPlan: data.subscriptions?.[0]?.planId?.name || 'N/A',
        subscriptionStartDate: data.subscriptions?.[0]?.startDate || 'N/A',
        subscriptionFinalPrice: data.subscriptions?.[0]?.finalPrice || 'N/A',
        subscriptionDiscountApplied: data.subscriptions?.[0]?.discountApplied || 'N/A',
      };

      setProperty(propertyData);
      setMainImage(allImages[0] || PLACEHOLDER_IMAGE);
      try {
        setReviews(data.reviews?.items || data.reviews || []);
        setAverageRating(data.averageRating?.toFixed(1) || data.rating?.averageRating?.toFixed(1) || '0.0');
        setReviewCount(data.reviewCount || data.rating?.totalReviews || 0);
      } catch (err) {
        console.error('Error processing reviews:', err.message);
        setReviewsError('Failed to load reviews.');
      }
    } catch (err) {
      console.error('Fetch Hotel Error:', err.message, err);
      setError(err.message || 'Failed to fetch hotel data.');
      if (err.message.includes('404')) {
        navigate('/properties', { state: { error: `Hotel ${propertyId} not found` } });
      } else if (err.message.includes('401')) {
        localStorage.removeItem('authData');
        navigate('/login', { state: { from: `/HotelAndBanquetDetails/hotel/${propertyId}` } });
      }
    } finally {
      setLoading(false);
      setReviewsLoading(false);
    }
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
      const auth = getToken();
      if (!auth?.token || !auth?.userId) {
        throw new Error('Authentication required to submit a review');
      }

      const reviewData = {
        userId: auth.userId,
        hotelId: propertyId,
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        name: userProfile.name || 'Anonymous',
        profilePic: userProfile.profileImageUrl,
        email: userProfile.email || 'user@example.com',
        mobile: userProfile.phoneNumber || '1234567890',
      };

      const response = await fetch(`${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/review`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(reviewData),
      });

      if (!response.ok) {
        const errorMessages = {
          400: 'Invalid review data provided.',
          401: 'Authentication failed. Please log in again.',
          403: 'You are not authorized to submit a review.',
          404: 'Hotel not found.',
          500: 'Server error. Please try again later.',
        };
        const error = await response.json();
        throw new Error(errorMessages[response.status] || error.message || 'Failed to submit review');
      }

      const newReview = await response.json();
      setReviews((prev) => [newReview, ...prev]);
      setReviewForm({ rating: 0, comment: '' });
      setReviewSubmitError(null);
      alert('Review submitted successfully!');
      setAverageRating(
        newReview.rating
          ? ((parseFloat(averageRating) * reviewCount + newReview.rating) / (reviewCount + 1)).toFixed(1)
          : averageRating
      );
      setReviewCount(reviewCount + 1);
    } catch (error) {
      console.error('Error submitting review:', error);
      setReviewSubmitError({ submit: error.message || 'Error submitting review. Please try again.' });
      if (error.message.includes('401') || error.message.includes('403')) {
        localStorage.removeItem('authData');
        navigate('/login', { state: { from: `/HotelAndBanquetDetails/hotel/${propertyId}` } });
      }
    }
  };

  const handleShareClick = () => {
    const shareText = `
🏨 *${property?.title}*
📍 Location: ${property?.address}
💰 Price: ₹${typeof property?.price === 'number' ? property.price.toLocaleString() : property?.price}/night
🛏️ Rooms: ${property?.area}
🏠 Type: ${property?.type}
👤 Owner: ${property?.owner.name}
🔗 View more: ${window.location.origin}/HotelAndBanquetDetails/hotel/${propertyId}
    `.trim();
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + property.imageUrls[0])}`;
    window.open(shareUrl, '_blank');
  };

  const handleImageClick = (index) => {
    setCurrentIndex(index);
    setViewMode('image');
  };

  const handleNext = () => {
    const images = property?.imageUrls || [PLACEHOLDER_IMAGE];
    setCurrentIndex((currentIndex + 1) % images.length);
  };

  const handlePrev = () => {
    const images = property?.imageUrls || [PLACEHOLDER_IMAGE];
    setCurrentIndex(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
  };

  const openGoogleMap = () => {
    if (property?.latitude && property?.longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${property.latitude},${property.longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      alert('Location data is not available for this hotel.');
    }
  };

  useEffect(() => {
    const auth = getToken();
    if (auth?.token) {
      fetchProperty();
    } else {
      navigate('/login', { state: { from: `/HotelAndBanquetDetails/hotel/${propertyId}` } });
    }
  }, [propertyId, navigate]);

  useEffect(() => {
    if (property?.districtName) {
      fetchAdvertisements();
    }
  }, [property?.districtName]);

  useEffect(() => {
    console.log('Sidebar Props:', { propertyId, propertyTitle: property?.title, owner: property?.owner, propertydata: property });
  }, [property, propertyId]);

  if (loading) {
    return (
      <div className="">
        {/* <div className="spinner-icon"></div> */}
        <p>Loading hotel details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        {error}
        <button className="btn-primary" onClick={() => navigate('/properties')}>
          Go Back
        </button>
      </div>
    );
  }

  const images = property?.imageUrls || [PLACEHOLDER_IMAGE];
  const getStatus = () => {
    if (!property?.approved) return 'Pending Verification';
    if (!property?.active) return 'Expired';
    if (property?.status === 'UNAVAILABLE') return 'Unavailable';
    return 'Active';
  };

  const defaultOwner = {
    name: 'Unknown Agent',
    phone: '1234567890',
    whatsapp: '1234567890',
    avatar: '/placeholder.jpg',
    email: '',
    role: 'Agent',
  };

  return (
    <ErrorBoundary navigate={navigate}>
      <div className="main-container">
        <div className="property-header">
          <div className="property-left">
            <div className="breadcrumbs">
              <Link to="/"><FontAwesomeIcon icon={faBuilding} /> Home</Link> <span>&gt;</span>
              <Link to="/properties">Hotels</Link> <span>&gt;</span> {property?.title || 'Hotel'}
            </div>
            <h1 className="property-title">{property?.title || 'Untitled Hotel'}</h1>
            <p className="location"><FontAwesomeIcon icon={faLocationDot} /> {property?.address || 'Unknown Address'}</p>
            <div className="labels">
              {property?.featured && <span className="label featured"><FontAwesomeIcon icon={faStar} /> Featured</span>}
              <span className="label for-sale">{property?.status || 'N/A'}</span>
              <span className="label">{averageRating} ({reviewCount} reviews)</span>
            </div>
          </div>
          <div className="property-price">
            <span className="price">₹{property?.price?.toLocaleString() || 'N/A'}/night</span>
          </div>
        </div>

        <div className="main-layout">
          <div className="content-column">
            <div className="image-slider">
              {viewMode === 'image' && (
                <img
                  src={images[currentIndex]}
                  alt={property?.title || 'Hotel Image'}
                  className="main-image"
                  onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                />
              )}
              {viewMode === 'map' && (
                <ErrorBoundary>
                  {property?.latitude && property?.longitude ? (
                    <iframe
                      title="Hotel Map"
                      className="iframe-map"
                      loading="lazy"
                      allowFullScreen
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(property.latitude)},${encodeURIComponent(property.longitude)}&z=15&output=embed`}
                    />
                  ) : (
                    <div className="error">
                      Map unavailable: No coordinates provided.
                    </div>
                  )}
                </ErrorBoundary>
              )}
              {viewMode === 'location' && (
                <ErrorBoundary>
                  {property?.address ? (
                    <iframe
                      title="Hotel Location"
                      className="iframe-map"
                      loading="lazy"
                      allowFullScreen
                      src={`https://www.google.com/maps?q=${encodeURIComponent(property.address)}&output=embed`}
                    />
                  ) : (
                    <div className="error">
                      Location unavailable: No address provided.
                    </div>
                  )}
                </ErrorBoundary>
              )}
              <div className="neartime-price-box">
                ₹{property?.price?.toLocaleString() || 'N/A'}/night
                <br />
                <span className="neartime-price-per">
                  {property?.area || 'N/A'} Rooms
                </span>
              </div>
              <div className="landing-overlay-icons">
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
                  icon={faShare}
                  className="landing-overlay-icons-i"
                  onClick={handleShareClick}
                  title="Share Hotel"
                />
              </div>
            </div>
            <div className="thumbs">
              {images.slice(0, 3).map((img, index) => (
                <img
                  key={index}
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  className={`thumb ${currentIndex === index && viewMode === 'image' ? 'active' : ''}`}
                  onClick={() => handleImageClick(index)}
                  onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                />
              ))}
            </div>

            <article className="docker-card mobile-only">
              <div className="docker-toolbar">
                <div className="docker-left">
                  <button className={`docker-btn-tab ${viewMode === 'image' ? 'docker-active' : ''}`} onClick={() => setViewMode('image')} aria-label="Photos">
                    <FontAwesomeIcon size="xl" icon={faImage} />
                  </button>
                  <button className={`docker-btn-tab ${viewMode === 'map' ? 'docker-active' : ''}`} onClick={() => setViewMode('map')} aria-label="Map">
                    <FontAwesomeIcon size="xl" icon={faMap} />
                  </button>
                  <button className={`docker-btn-tab ${viewMode === 'location' ? 'docker-active' : ''}`} onClick={() => setViewMode('location')} aria-label="Location">
                    <FontAwesomeIcon size="xl" icon={faLocationDot} />
                  </button>
                </div>
                <div className="docker-right">
                  <button className="docker-btn-tab" aria-label="Favorite">
                    <FontAwesomeIcon size="xl" icon={faHeart} />
                  </button>
                  <button className="docker-btn-tab" aria-label="Share" onClick={handleShareClick}>
                    <FontAwesomeIcon size="xl" icon={faShare} />
                  </button>
                </div>
              </div>
              <div className="docker-content">
                <div className="docker-chips">
                  {property?.featured && <span className="docker-chip featured">FEATURED</span>}
                  <span className="docker-chip for-sale">{property?.status || 'N/A'}</span>
                </div>
                <h1 className="docker-title">{property?.title || 'Untitled Hotel'}</h1>
                <div className="docker-address">
                  <FontAwesomeIcon icon={faLocationDot} />
                  <span>{property?.address || 'Unknown Address'}</span>
                </div>
                <div className="docker-price">₹{property?.price?.toLocaleString() || 'N/A'}/night</div>
                <div className="docker-per">{property?.area || 'N/A'} Rooms</div>
                <div className="docker-divider"></div>
                <div className="docker-section-head">
                  <h3>Overview</h3>
                  <small>Property ID: {property?.permanentId || 'UNKNOWN'}</small>
                </div>
                <div className="docker-overview">
                  <div className="docker-ovr">
                    <div className="docker-ic"><FontAwesomeIcon icon={faBuilding} /></div>
                    <div><b>{property?.type || 'N/A'}</b><span>Property Type</span></div>
                  </div>
                  <div className="docker-ovr">
                    <div className="docker-ic"><FontAwesomeIcon icon={faBed} /></div>
                    <div><b>{property?.bedrooms || 'N/A'}</b><span>Beds</span></div>
                  </div>
                  <div className="docker-ovr">
                    <div className="docker-ic"><FontAwesomeIcon icon={faRulerCombined} /></div>
                    <div><b>{property?.area || 'N/A'}</b><span>Rooms</span></div>
                  </div>
                  <div className="docker-ovr">
                    <div className="docker-ic"><FontAwesomeIcon icon={faCalendarDays} /></div>
                    <div><b>{property?.yearBuilt || 'N/A'}</b><span>Year Built</span></div>
                  </div>
                </div>
                <div className="docker-divider"></div>
                <div>
                  <div className="docker-section-title">Description</div>
                  <hr className="text-secondary" />
                  <div className="docker-description">
                    <p>{property?.description || 'No description available'}</p>
                  </div>
                </div>
              </div>
            </article>

            <div className="overview-container">
              <div className="overview-top-bar">
                <h2>Overview</h2>
                <span className="property-id">Property ID: {property?.permanentId || 'UNKNOWN'}</span>
              </div>
              <div className="overview-grid">
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faBuilding} /> {property?.type || 'N/A'}</span>
                  <small>Property Type</small>
                </div>
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faBed} /> {property?.bedrooms || 'N/A'}</span>
                  <small>Beds</small>
                </div>
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faRulerCombined} /> {property?.area || 'N/A'} Rooms</span>
                  <small>Total Rooms</small>
                </div>
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faCalendarDays} /> {property?.createdAt || 'N/A'}</span>
                  <small>Listed On</small>
                </div>
              </div>
            </div>

            <div className="rooms-section">
              <h2>Rooms</h2>
              {property?.rooms?.length > 0 ? (
                <div className="rooms-grid">
                  {property.rooms.map((room, index) => (
                    <div key={room._id || index} className="room-card">
                      <div className="room-header">
                        <span className="room-title">Room {room.roomNumber} ({room.type})</span>
                        <span className="room-status">{room.isAvailable ? 'Available' : 'Unavailable'}</span>
                      </div>
                      <div className="room-image-container">
                        {room.images?.length > 0 ? (
                          <img src={room.images[0]} alt={`Room ${room.roomNumber}`} className="room-image" onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }} />
                        ) : (
                          <div className="room-image-placeholder">No Image</div>
                        )}
                      </div>
                      <div className="room-details">
                        <p className="room-price">₹{room.price?.toLocaleString() || 'N/A'}/night</p>
                        <p><strong>Seasonal Price:</strong> Summer: ₹{room.seasonalPrice?.summer?.toLocaleString() || 'N/A'}, Winter: ₹{room.seasonalPrice?.winter?.toLocaleString() || 'N/A'}</p>
                        <div className="room-features">
                          <strong>Features & Services</strong>
                          <ul>
                            {[...(room.features || []), ...(room.services || [])].map((feature, i) => (
                              <li key={i}><span className="feature-icon"><FontAwesomeIcon icon={faCheck} /></span>{feature}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No rooms available.</p>
              )}
            </div>

            <div className="description-container">
              <h2>Description</h2>
              <p>{property?.description || 'No description available'}</p>
            </div>

            <div className="ad-section">
              <h2>Advertisements</h2>
              {adsLoading && (
                <div className="spinner text-center">
                  <div className="spinner-icon"></div>
                  <p>Loading advertisements...</p>
                </div>
              )}
              {adsError && <p className="error-text">{adsError}</p>}
              {!adsLoading && !adsError && advertisements.length === 0 && (
                <p>No advertisements available for {property?.districtName || 'this district'}.</p>
              )}
              {!adsLoading && !adsError && advertisements.length > 0 && (
                <div key={advertisements[currentAdIndex].id} className="ad-container">
                  <img
                    src={advertisements[currentAdIndex].bannerImageUrl}
                    alt={advertisements[currentAdIndex].title}
                    className="ad-image"
                    onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                  />
                  <div className="ad-content">
                    <h3 className="ad-title">{advertisements[currentAdIndex].title}</h3>
                    <p className="ad-description">{advertisements[currentAdIndex].description}</p>
                    <div className="ad-contact-icons">
                      {advertisements[currentAdIndex].phoneNumber && (
                        <a href={`tel:${advertisements[currentAdIndex].phoneNumber}`} title="Call">
                          <FontAwesomeIcon icon={faPhone} />
                        </a>
                      )}
                      {advertisements[currentAdIndex].emailAddress && (
                        <a href={`mailto:${advertisements[currentAdIndex].emailAddress}`} title="Email">
                          <FontAwesomeIcon icon={faEnvelope} />
                        </a>
                      )}
                      {advertisements[currentAdIndex].facebookUrl && (
                        <a href={advertisements[currentAdIndex].facebookUrl} title="Facebook" target="_blank" rel="noopener noreferrer">
                          <FontAwesomeIcon icon={faFacebookF} />
                        </a>
                      )}
                      {advertisements[currentAdIndex].twitterUrl && (
                        <a href={advertisements[currentAdIndex].twitterUrl} title="Twitter" target="_blank" rel="noopener noreferrer">
                          <FontAwesomeIcon icon={faTwitter} />
                        </a>
                      )}
                      {advertisements[currentAdIndex].instagramUrl && (
                        <a href={advertisements[currentAdIndex].instagramUrl} title="Instagram" target="_blank" rel="noopener noreferrer">
                          <FontAwesomeIcon icon={faInstagram} />
                        </a>
                      )}
                      {advertisements[currentAdIndex].linkedinUrl && (
                        <a href={advertisements[currentAdIndex].linkedinUrl} title="LinkedIn" target="_blank" rel="noopener noreferrer">
                          <FontAwesomeIcon icon={faLinkedinIn} />
                        </a>
                      )}
                      {advertisements[currentAdIndex].youtubeUrl && (
                        <a href={advertisements[currentAdIndex].youtubeUrl} title="YouTube" target="_blank" rel="noopener noreferrer">
                          <FontAwesomeIcon icon={faYoutube} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {advertisements.length > 1 && (
                <div className="ad-nav">
                  <button
                    onClick={() => setCurrentAdIndex((prev) => (prev - 1 + advertisements.length) % advertisements.length)}
                    className="ad-nav-btn"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={() => setCurrentAdIndex((prev) => (prev + 1) % advertisements.length)}
                    className="ad-nav-btn"
                  >
                    &gt;
                  </button>
                </div>
              )}
            </div>

            <div className="address-section">
              <h2>Address</h2>
              <button onClick={openGoogleMap} className="google-maps-btn" aria-label="Open in Google Maps">
                Open in Google Maps
              </button>
              <div className="address-details">
                <div><strong>Address:</strong> {property?.address || 'Unknown Address'}</div>
                <div><strong>City:</strong> {property?.city || 'N/A'}</div>
                <div><strong>State:</strong> {property?.state || 'N/A'}</div>
                <div><strong>Zip/Postal Code:</strong> {property?.zipCode || 'N/A'}</div>
                <div><strong>Country:</strong> {property?.country || 'N/A'}</div>
              </div>
            </div>

            <div className="details-section">
              <h2>Details <span className="update-time">Updated on {property?.createdAt || 'N/A'}</span></h2>
              <div className="details-grid">
                <div><strong>Property ID:</strong> <span className="property-id">{property?.permanentId || 'UNKNOWN'}</span></div>
                <div><strong>Price:</strong> ₹{property?.price?.toLocaleString() || 'N/A'}/night</div>
                <div><strong>Rooms:</strong> {property?.area || 'N/A'}</div>
                <div><strong>Property Type:</strong> {property?.type || 'N/A'}</div>
                <div><strong>Property Status:</strong> {getStatus()}</div>
                <div className="full-row"><strong>GST:</strong> <a href={property?.gst || '#'} target="_blank" rel="noopener noreferrer">{property?.gst || 'N/A'}</a></div>
                <div className="full-row"><strong>Business License:</strong> <a href={property?.businessLicense || '#'} target="_blank" rel="noopener noreferrer">{property?.businessLicense || 'N/A'}</a></div>
              </div>
            </div>

            <div className="features-section">
              <h2>Amenities</h2>
              <div className="features-list">
                {property?.amenities?.map((feature, index) => (
                  <div key={index} className="feature-item">
                    <input type="checkbox" checked readOnly />
                    <span>{feature}</span>
                  </div>
                )) || <p>No amenities available.</p>}
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
                    onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                  />
                )) || <p>No images available.</p>}
              </div>
            </div>

            <div className="video-section">
              <h2>Video Tour</h2>
              <div className="video-wrapper">
                <video
                  src={property?.videoUrl || 'https://www.youtube.com/embed/-NInBEdSvp8?si=H4Qq2rmaE3bifehT'}
                  controls
                  className="video-player"
                  onError={(e) => console.error('Video load error:', e)}
                />
              </div>
            </div>

            <div className="reviews-section">
              <h2>Reviews</h2>
              {reviewsLoading && <p>Loading reviews...</p>}
              {reviewsError && (
                <p className="error-text">
                  {reviewsError.includes('500') ? 'Server error (500). Please try again later or contact support.' : `Error: ${reviewsError}`}
                </p>
              )}
              {reviewSubmitError?.reviews && <p className="error-text">{reviewSubmitError.reviews}</p>}
              {!reviewsLoading && !reviewsError && reviews.length === 0 ? (
                <p>No reviews yet.</p>
              ) : (
                <div className="reviews-list">
                  {reviews.map((review) => (
                    <div key={review._id} className="review-item">
                      <div className="review-header">
                        <span>{review.name || 'Anonymous'}</span>
                        <span className="review-rating">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <FontAwesomeIcon
                              key={num}
                              icon={num <= review.rating ? faStar : faRegularStar}
                              className={num <= review.rating ? 'filled' : ''}
                            />
                          ))}
                        </span>
                      </div>
                      <p>{review.comment || 'No comment provided'}</p>
                      <small>{new Date(review.createdAt || Date.now()).toLocaleDateString('en-IN')}</small>
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
                          icon={num <= (hoveredRating || reviewForm.rating) ? faStar : faRegularStar}
                          className={num <= (hoveredRating || reviewForm.rating) ? 'filled' : ''}
                          onClick={() => setReviewForm({ ...reviewForm, rating: num })}
                          onMouseEnter={() => setHoveredRating(num)}
                          onMouseLeave={() => setHoveredRating(0)}
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
                      placeholder="Share your experience with this hotel..."
                      maxLength={500}
                    ></textarea>
                    {reviewSubmitError?.comment && <span className="error-text">{reviewSubmitError.comment}</span>}
                  </div>
                  {reviewSubmitError?.submit && <span className="error-text">{reviewSubmitError.submit}</span>}
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
            <Sidebar
              propertyId={propertyId}
              propertyTitle={property?.title || 'Untitled Hotel'}
              owner={property?.owner || defaultOwner}
              propertydata={property || {}}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default HotelDetails;