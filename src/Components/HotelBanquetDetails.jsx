import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHeart, faShare, faBuilding, faBed, faRulerCombined, faCalendarDays,
  faComment, faUser, faMap, faImage, faLocationDot, faStar, faPhone, faEnvelope
} from '@fortawesome/free-solid-svg-icons';
import { faStar as faRegularStar } from '@fortawesome/free-regular-svg-icons';
import { faFacebookF, faTwitter, faInstagram, faLinkedinIn } from '@fortawesome/free-brands-svg-icons';
import Sidebar from './HotelSidebar';
import Apartment from '../assets/A-1.avif';
import './HotelBanquetDetails.css';
import axios from 'axios';
import { baseurl } from '../../BaseUrl';

const API_CONFIG = {
  baseUrl: 'https://hotel-banquet.nearprop.com',
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

const HotelBanquetDetails = () => {
  const { type: urlType, id: propertyId } = useParams();
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
  const sliderIntervalRef = useRef(null);

  const propertyType = urlType === 'banquet' ? 'banquet-hall' : 'hotel';

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
        const sanitizedDistrict = (property.districtName || '').trim().replace(/[:\s]+/g, ''); // Remove colons, extra spaces
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

      // Handle various API response structures
      let ads = Array.isArray(data)
        ? data
        : data.content || data.data || data.ads || data.items || [];

      // Normalize advertisement data
      ads = ads.map(ad => ({
        id: ad.id || ad._id || `ad-${Math.random().toString(36).substr(2, 9)}`,
        title: ad.title || 'Untitled Advertisement',
        description: ad.description || 'No description available',
        bannerImageUrl: ad.bannerImageUrl || ad.imageUrl || PLACEHOLDER_IMAGE,
        phoneNumber: ad.phoneNumber || '',
        emailAddress: ad.emailAddress || '',
        facebookUrl: ad.facebookUrl || null,
        twitterUrl: ad.twitterUrl || null,
        instagramUrl: ad.instagramUrl || null,
        linkedinUrl: ad.linkedinUrl || null,
        districtName: ad.districtName || property?.districtName || '',
      }));

      // Filter ads to ensure exact district match
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

  // Auto-scroll advertisements if more than one
  useEffect(() => {
    if (advertisements.length > 1) {
      sliderIntervalRef.current = setInterval(() => {
        setCurrentAdIndex((prev) => (prev + 1) % advertisements.length);
      }, 5000); // Change ad every 5 seconds
      return () => clearInterval(sliderIntervalRef.current);
    }
  }, [advertisements.length]);

  const fetchProperty = async () => {
    try {
      setLoading(true);
      setError(null);
      setReviewsError(null);
      const auth = getToken();
      if (!auth?.token) {
        throw new Error('Authentication required. Please log in.');
      }

      const endpoint = propertyType === 'hotel'
        ? `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/hotels/${propertyId}`
        : `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/banquet-halls/${propertyId}`;

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorMessages = {
          401: 'Authentication failed. Please log in again.',
          403: 'Access denied to view this property.',
          404: `Property ${propertyId} not found.`,
          500: 'Server error. Please try again later.',
        };
        throw new Error(errorMessages[response.status] || `Failed to fetch property: ${response.status}`);
      }

      const { data } = await response.json();
      if (!data || Object.keys(data).length === 0) {
        throw new Error('No property data returned from the server.');
      }

      const allImages = [
        ...(data.images || []),
        ...(propertyType === 'hotel' ? data.rooms?.flatMap(room => room.images || []) : []),
        ...(propertyType === 'banquet-hall' ? (data.events?.flatMap(event => event.images || []) || []) : []),
      ].filter(img => img);

      const allVideos = [
        ...(data.videos || []),
        ...(propertyType === 'hotel' ? data.rooms?.flatMap(room => room.videos || []) : []),
      ].filter(video => video);

      const amenities = [
        ...new Set(
          propertyType === 'hotel'
            ? data.amenities || []
            : data.amenities || []
        ),
      ];

      let price = 'N/A';
      let area = 'N/A';
      let landAreaPostfix = '';

      if (propertyType === 'hotel') {
        // Prefer averageRoomPrice if available, else top-level price, else first room price
        price = data.averageRoomPrice ?? data.price ?? data.rooms?.[0]?.price ?? 'N/A';
        area = data.rooms?.length ?? 0;
        landAreaPostfix = 'Rooms';
      } else { // banquet-hall
        price = data.pricePerPlate ?? 'N/A';
        // No direct capacity, using parkingCapacity as fallback if needed, but keeping 'N/A' for now as per original
        area = data.capacity ?? data.parkingCapacity ?? 'N/A';
        landAreaPostfix = 'Guests'; // Adjusted to better fit banquet (common is per plate + capacity)
      }

      const totalBeds = propertyType === 'hotel' ? data.rooms?.reduce((sum, room) => sum + (room.capacity || 0), 0) || 0 : 'N/A';

      const propertyData = {
        id: data._id || propertyId,
        title: data.name || 'Untitled Property',
        description: data.description || 'No description available',
        type: propertyType === 'hotel' ? 'Hotel' : 'Banquet Hall',
        status: data.isAvailable ? 'AVAILABLE' : 'UNAVAILABLE',
        price: price,
        area: area,
        landAreaPostfix: landAreaPostfix,
        bedrooms: totalBeds,
        bathrooms: data.bathrooms || 'N/A',
        garages: data.parking || data.parkingCapacity || 'N/A',
        garageSize: data.parkingSize || 'N/A',
        address: `${data.city || 'Unknown City'}, ${data.state || 'Unknown State'}, ${data.pincode || 'N/A'}`,
        city: data.city || 'Indore',
        state: data.state || 'Indore',
        districtName: data.city || 'Indore', // Ensure districtName is set for ads
        zipCode: data.pincode || '452010',
        country: 'India',
        owner: {
          name: data.landlord?.name || data.userId?.name || 'Unknown Agent',
          phone: data.landlord?.contactNumber || data.contactNumber || '1234567890',
          whatsapp: data.landlord?.contactNumber || data.contactNumber || '1234567890',
          avatar: data.landlord?.profilePhoto || data.userId?.profileImage || '/placeholder.jpg',
          role: 'Agent',
        },
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
        permanentId: data.hotelId || data.banquetHallId || 'UNKNOWN',
        latitude: data.location?.coordinates?.[1] || data.latitude || 19.076,
        longitude: data.location?.coordinates?.[0] || data.longitude || 72.8777,
        videoUrl: allVideos[0] || 'https://www.youtube.com/embed/-NInBEdSvp8?si=H4Qq2rmaE3bifehT',
        approved: data.verificationStatus === 'verified',
        featured: data.subscriptions?.[0]?.isActive || false,
        active: data.isAvailable,
        subscriptionExpiry: data.subscriptions?.[0]?.endDate || new Date().toISOString(),
        rooms: propertyType === 'hotel' ? (data.rooms || []) : [],
        gst: data.gst || data.gstNumber || 'N/A',
        businessLicense: data.businessLicense || 'N/A',
        capacity: propertyType === 'banquet-hall' ? (data.capacity || data.parkingCapacity || 'N/A') : 'N/A',
        eventTypes: propertyType === 'banquet-hall' ? data.events?.map(e => e.eventType) || [] : [],
        cateringOptions: propertyType === 'banquet-hall' ? data.cateringOptions || [] : [],
        pricePerEvent: propertyType === 'banquet-hall' ? data.pricePerPlate : 'N/A', // Using pricePerPlate as per response
        seasonalPrice: data.seasonalPrice || {},
        subscriptionPlan: data.subscriptions?.[0]?.planId?.name || 'N/A',
        subscriptionStartDate: data.subscriptions?.[0]?.startDate || 'N/A',
        subscriptionFinalPrice: data.subscriptions?.[0]?.finalPrice || 'N/A',
        subscriptionDiscountApplied: data.subscriptions?.[0]?.discountApplied || 'N/A',
      };

      setProperty(propertyData);
      setMainImage(allImages[0] || PLACEHOLDER_IMAGE);
      try {
        setReviews(data.reviews?.items || data.reviews || []);
        setAverageRating(data.rating?.averageRating?.toFixed(1) || data.averageRating?.toFixed(1) || '0.0');
        setReviewCount(data.rating?.totalReviews || data.reviewCount || 0);
      } catch (err) {
        console.error('Error processing reviews:', err.message);
        setReviewsError('Failed to load reviews.');
      }
    } catch (err) {
      console.error('Fetch Property Error:', err.message, err);
      setError(err.message || 'Failed to fetch property data.');
      if (err.response?.status === 404) {
        navigate('/properties', { state: { error: `Property ${propertyId} not found` } });
      } else if (err.response?.status === 401) {
        localStorage.removeItem('authData');
        navigate('/login', { state: { from: `/HotelAndBanquetDetails/${urlType}/${propertyId}` } });
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
        [propertyType === 'hotel' ? 'hotelId' : 'banquetId']: propertyId,
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
          404: 'Property not found.',
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
        navigate('/login', { state: { from: `/HotelAndBanquetDetails/${urlType}/${propertyId}` } });
      }
    }
  };

  const handleShareClick = () => {
    const shareText = `
🏠 *${property?.title}*
📍 Location: ${property?.address}
💰 Price: ₹${typeof property?.price === 'number' || typeof property?.price === 'string' ? property.price.toLocaleString?.() || property.price : property?.price}/${propertyType === 'hotel' ? 'night' : 'plate/event'}
🛏️ ${propertyType === 'hotel' ? 'Rooms' : 'Capacity'}: ${property?.area}
🏠 Type: ${property?.type}
👤 Owner: ${property?.owner.name}
🔗 View more: ${window.location.origin}/HotelAndBanquetDetails/${urlType}/${propertyId}
    `.trim();
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + (property.imageUrls[0] || ''))}`;
    window.open(shareUrl, '_blank');
  };

  const handleImageClick = (index) => {
    setCurrentIndex(index);
    setViewMode('image');
  };

  const openGoogleMap = () => {
    if (property?.address) {
      const googleMapsUrl = `https://www.google.com/maps?q=${encodeURIComponent(property.address)}`;
      window.open(googleMapsUrl, '_blank');
    } else if (property?.latitude && property?.longitude) {
      const googleMapsUrl = `https://www.google.com/maps?q=${property.latitude},${property.longitude}`;
      window.open(googleMapsUrl, '_blank');
    } else {
      alert('Location data is not available for this property.');
    }
  };

  useEffect(() => {
    const auth = getToken();
    if (auth?.token) {
      fetchProperty();
    } else {
      navigate('/login', { state: { from: `/HotelAndBanquetDetails/${urlType}/${propertyId}` } });
    }
  }, [propertyId, propertyType, navigate, urlType]);

  useEffect(() => {
    if (property?.districtName) {
      fetchAdvertisements();
    }
  }, [property?.districtName]);

  useEffect(() => {
    const startSlider = () => {
      sliderIntervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const images = property?.imageUrls || [PLACEHOLDER_IMAGE];
          return (prevIndex + 1) % images.length;
        });
      }, 3000);
    };

    const stopSlider = () => {
      if (sliderIntervalRef.current) {
        clearInterval(sliderIntervalRef.current);
      }
    };

    if (viewMode === 'image') {
      startSlider();
    } else {
      stopSlider();
    }

    return () => stopSlider();
  }, [viewMode, property?.imageUrls]);

  if (loading) {
    return (
      <div className="">
        <p>Loading property details...</p>
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
    role: 'Agent',
  };

  return (
    <ErrorBoundary navigate={navigate}>
      <div className="main-container">
        <div className="property-header">
          <div className="property-left">
            <div className="breadcrumbs">
              <Link to="/"><FontAwesomeIcon icon={faBuilding} /> Home</Link> <span>&gt;</span>
              <Link to="/properties">{propertyType === 'hotel' ? 'Hotels' : 'Banquet Halls'}</Link> <span>&gt;</span> {property?.title || 'Property'}
            </div>
            <h1 className="property-title">{property?.title || 'Untitled Property'}</h1>
            <p className="location"><FontAwesomeIcon icon={faLocationDot} /> {property?.address || 'Unknown Address'}</p>
            <div className="labels">
              {property?.featured && <span className="label featured"><FontAwesomeIcon icon={faStar} /> Featured</span>}
              <span className="label for-sale">{property?.status || 'N/A'}</span>
              <span className="label">{averageRating} ({reviewCount} reviews)</span>
            </div>
          </div>
          <div className="property-price">
            <span className="price">₹{property?.price?.toLocaleString?.() || property?.price || 'N/A'} {propertyType === 'banquet-hall' ? '/plate' : '/night'}</span>
          </div>
        </div>

        <div className="main-layout">
          <div className="content-column">
            <div className="image-slider">
              {viewMode === 'image' && (
                <img
                  src={images[currentIndex]}
                  alt={property?.title || 'Property Image'}
                  className="main-image"
                  onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
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
                      src={`https://www.google.com/maps?q=${encodeURIComponent(property.address)}&output=embed`}
                    />
                  ) : (
                    <div className="error bg-red-50 text-red-700 p-4 rounded-lg text-center">
                      Location unavailable: No address provided.
                    </div>
                  )}
                </ErrorBoundary>
              )}
              <div className="slider-indicators">
                {images.map((_, index) => (
                  <span
                    key={index}
                    className={`indicator ${currentIndex === index && viewMode === 'image' ? 'active' : ''}`}
                    onClick={() => handleImageClick(index)}
                  />
                ))}
              </div>
              <div className="neartime-price-box">
                ₹{property?.price?.toLocaleString?.() || property?.price || 'N/A'} {propertyType === 'banquet-hall' ? '/plate' : '/night'}
                <br />
                <span className="neartime-price-per">
                  {property?.area || 'N/A'} {property?.landAreaPostfix || ''}
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
                  title="Share Property"
                />
              </div>
            </div>
            <div className="thumbs">
              {images.map((img, index) => (
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
              <div className="docker-content">
                <div className="docker-chips">
                  {property?.featured && <span className="docker-chip featured">FEATURED</span>}
                  <span className="docker-chip for-sale">{property?.status || 'N/A'}</span>
                </div>
                <h1 className="docker-title">{property?.title || 'Untitled Property'}</h1>
                <div className="docker-address">
                  <FontAwesomeIcon icon={faLocationDot} />
                  <span>{property?.address || 'Unknown Address'}</span>
                </div>
                <div className="docker-price">₹{property?.price?.toLocaleString?.() || property?.price || 'N/A'} {propertyType === 'banquet-hall' ? '/plate' : '/night'}</div>
                <div className="docker-per">{property?.area || 'N/A'} {property?.landAreaPostfix || ''}</div>
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
                  {propertyType === 'hotel' && (
                    <div className="docker-ovr">
                      <div className="docker-ic"><FontAwesomeIcon icon={faBed} /></div>
                      <div><b>{property?.bedrooms || 'N/A'}</b><span>Beds</span></div>
                    </div>
                  )}
                  <div className="docker-ovr">
                    <div className="docker-ic"><FontAwesomeIcon icon={faRulerCombined} /></div>
                    <div><b>{property?.area || 'N/A'}</b><span>{propertyType === 'hotel' ? 'Rooms' : 'Capacity'}</span></div>
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
                  <span><FontAwesomeIcon icon={faCalendarDays} /> {property?.createdAt || 'N/A'}</span>
                  <small>Listed On</small>
                </div>
              </div>
            </div>

            {propertyType === 'hotel' ? (
              <div className="rooms-section">
                <h2>Rooms</h2>
                {property?.rooms?.length > 0 ? (
                  <div className="rooms-grid">
                    {property.rooms.map((room, index) => (
                      <div key={room._id || index} className="room-item">
                        <h3>Room {room.roomNumber || room.roomType} ({room.roomType})</h3>
                        <p><strong>Price:</strong> ₹{room.price?.toLocaleString() || 'N/A'}</p>
                        <p><strong>Seasonal Price:</strong> Summer: ₹{room.seasonalPrice?.summer?.toLocaleString() || 'N/A'}, Winter: ₹{room.seasonalPrice?.winter?.toLocaleString() || 'N/A'}</p>
                        <p><strong>Availability:</strong> {room.isAvailable ? 'Available' : 'Unavailable'}</p>
                        <p><strong>Features:</strong> {room.features?.join(', ') || 'None'}</p>
                        <p><strong>Services:</strong> {room.services?.join(', ') || 'None'}</p>
                        {room.images?.length > 0 && (
                          <div className="room-images">
                            {room.images.map((img, imgIndex) => (
                              <img
                                key={imgIndex}
                                src={img}
                                alt={`Room Image ${imgIndex + 1}`}
                                className="room-image"
                                onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No rooms available.</p>
                )}
              </div>
            ) : (
              <div className="banquet-details-section">
                <h2>Banquet Hall Details</h2>
                <p><strong>Price Per Plate:</strong> ₹{property?.price?.toLocaleString() || property?.price || 'N/A'}</p>
                <p><strong>Capacity:</strong> {property?.capacity || 'N/A'}</p>
                <p><strong>Event Types:</strong> {property?.eventTypes?.join(', ') || 'N/A'}</p>
                <p><strong>Catering Options:</strong> {property?.cateringOptions?.join(', ') || 'N/A'}</p>
                <p><strong>Seasonal Price:</strong> Summer: ₹{property?.seasonalPrice?.summer?.toLocaleString() || 'N/A'}, Winter: ₹{property?.seasonalPrice?.winter?.toLocaleString() || 'N/A'}</p>
              </div>
            )}

            <div className="description-container">
              <h2>Description</h2>
              <p>{property?.description || 'No description available'}</p>
            </div>

            <div className="ad-section">
              <span className="ads">Sponsored</span>

              {adsLoading && <div className=""><div className="" /></div>}
              {adsError && <p className="error-text">{adsError}</p>}

              {!adsLoading && !adsError && advertisements.length > 0 && (
                <div className="ad-layout">
                  <div className="ad-image-section">
                    <img
                      src={advertisements[currentAdIndex].bannerImageUrl || Apartment}
                      alt={advertisements[currentAdIndex].title}
                      className="ad-image"
                    />
                  </div>

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

                    <div className="ad-social-icons">
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
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="address-section">
              <h2>Address</h2>
              <div className="address-details">
                <div><strong>Address:</strong> {property?.address || 'Unknown Address'}</div>
                <div><strong>City:</strong> {property?.city || 'N/A'}</div>
                <div><strong>State:</strong> {property?.state || 'N/A'}</div>
                <div><strong>Zip/Postal Code:</strong> {property?.zipCode || 'N/A'}</div>
                <div><strong>Country:</strong> {property?.country || 'N/A'}</div>
                <button onClick={openGoogleMap} className="google-maps-btn" aria-label="Open in Google Maps">
                  Open in Google Maps
                </button>
              </div>
            </div>

            <div className="details-section">
              <h2>Details <span className="update-time">Updated on {property?.createdAt || 'N/A'}</span></h2>
              <div className="details-grid">
                <div><strong>Property ID:</strong> <span className="property-id">{property?.permanentId || 'UNKNOWN'}</span></div>
                <div><strong>Price:</strong> ₹{property?.price?.toLocaleString?.() || property?.price || 'N/A'} {propertyType === 'banquet-hall' ? '/plate' : '/night'}</div>
                <div><strong>{propertyType === 'hotel' ? 'Rooms' : 'Capacity'}:</strong> {property?.area || 'N/A'}</div>
                <div><strong>Property Type:</strong> {property?.type || 'N/A'}</div>
                <div><strong>Property Status:</strong> {getStatus()}</div>
                <div><strong>Business License:</strong> <a href={property?.businessLicense || '#'} target="_blank" rel="noopener noreferrer">{property?.businessLicense || 'N/A'}</a></div>
                <div><strong>GST:</strong> <a href={property?.gst || '#'} target="_blank" rel="noopener noreferrer">{property?.gst || 'N/A'}</a></div>
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
                      placeholder="Share your experience with this property..."
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
              propertyTitle={property?.title || 'Untitled Property'}
              owner={property?.owner || defaultOwner}
              propertydata={property || {}}
            />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default HotelBanquetDetails;