import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faMapMarkerAlt,
  faBed,
  faMoneyBill,
  faCalendarAlt,
  faStar,
  faShare,
  faPhone,
  faComment,
  faEnvelope,
} from '@fortawesome/free-solid-svg-icons';
import { faWhatsapp, faInstagram, faFacebook, faYoutube, faLinkedin } from '@fortawesome/free-brands-svg-icons';
import axios from 'axios';
import PgHostelSidebar from './PgHostelSidebar';
import './PgAndHostelDetails.css';

const API_CONFIG = {
  baseUrl: 'https://pg-hostel.nearprop.com',
  publicApiPrefix: 'api/public',
  privateApiPrefix: 'api',
};

const AD_API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api/v1',
};

const FALLBACK_AD = [
  {
    id: 1,
    title: "Luxury Hotel in Ujjain",
    description: "Experience a luxurious stay with world-class amenities and scenic views",
    bannerImageUrl: "/hotel.jpg",
    phoneNumber: "+91 91551 05666",
    whatsappNumber: "+91 91551 05666",
    emailAddress: "bookings@ujjainhotel.com",
    targetLocation: "Ujjain",
    validUntil: "2025-12-31T23:59:59",
    createdBy: { name: "Hotel Administrator" },
  },
];

const DEFAULT_AD_IMAGE = '/assets/default-hotel-ad.png';
const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400';
const DEFAULT_AVATAR = '/assets/default-avatar.png';

const DEFAULT_PROPERTY = {
  id: '',
  propertyId: 'N/A',
  title: 'Untitled PG/Hostel',
  type: 'PG/Hostel',
  address: 'Location not specified',
  city: 'N/A',
  state: 'N/A',
  pinCode: 'N/A',
  totalRooms: 0,
  totalBeds: 0,
  availableRooms: 0,
  availableBeds: 0,
  lowestPrice: 0,
  images: [PLACEHOLDER_IMAGE],
  reels: [],
  description: 'No description available',
  hasAvailability: false,
  createdAt: 'N/A',
  owner: { name: 'Unknown Agent', phone: 'N/A', avatar: DEFAULT_AVATAR },
};

function ErrorBoundary({ children }) {
  const [hasError, setHasError] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleError = (error) => {
      setHasError(true);
      setError(error);
      console.error('ErrorBoundary caught an error:', error);
    };
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (hasError) {
    return (
      <div className="error">
        <h1>Something went wrong.</h1>
        <p>{error?.message || 'An unexpected error occurred.'}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }
  return children;
}

function PgAndHostelDetails() {
  const { pgandhosteltyId } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState(DEFAULT_PROPERTY);
  const [ratings, setRatings] = useState([]);
  const [comments, setComments] = useState([]);
  const [ratingStats, setRatingStats] = useState({ averageRating: 0, totalRatings: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [newRating, setNewRating] = useState(0);
  const [newReview, setNewReview] = useState('');
  const [newComment, setNewComment] = useState('');
  const [advertisements, setAdvertisements] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [adsLoading, setAdsLoading] = useState(true);
  const [adsError, setAdsError] = useState(null);

  const getToken = () => {
    try {
      const authData = localStorage.getItem('authData');
      if (!authData) return null;

      const parsedData = JSON.parse(authData);
      if (!parsedData || !parsedData.token) return null;

      const token = parsedData.token;

      // Verify token
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);

      // Check if token is expired
      if (payload.exp && payload.exp < now) {
        localStorage.removeItem('authData');
        return null;
      }

      return token;
    } catch (err) {
      console.error('Token validation error:', err);
      localStorage.removeItem('authData');
      return null;
    }
  };
  const retryRequest = async (fn, retries = 2, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (err) {
        if (i === retries - 1) throw err;
        await new Promise((resolve) => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    }
  };

  const fetchAdvertisements = async (districtName) => {
    try {
      setAdsLoading(true);
      setAdsError(null);
      const token = getToken();
      const cleanedDistrict = (districtName || 'Ujjain').replace(/[^a-zA-Z\s]/g, '');

      const response = await axios.get(
        `${AD_API_CONFIG.baseUrl}/${AD_API_CONFIG.apiPrefix}/advertisements`,
        {
          params: {
            page: 0,
            size: 10,
            sortBy: "createdAt",
            direction: "DESC",
            targetLocation: cleanedDistrict,
            type: 'hotel',
          },
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        }
      );

      let ads = response.data.content || response.data;
      const filteredAds = ads.filter(ad =>
        ad.targetLocation?.toLowerCase() === cleanedDistrict.toLowerCase()
      );

      if (filteredAds.length === 0) {
        console.warn(`No hotel advertisements found for district: ${cleanedDistrict}`);
        setAdvertisements(FALLBACK_AD);
        setAdsError(`No hotel advertisements available for ${cleanedDistrict}.`);
      } else {
        setAdvertisements(filteredAds);
      }
    } catch (err) {
      console.error('Advertisement fetch error:', err.message);
      setAdsError(`Failed to load hotel advertisements: ${err.message}`);
      setAdvertisements(FALLBACK_AD);
    } finally {
      setAdsLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = getToken();
        const headers = token
          ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
          : { 'Content-Type': 'application/json' };

        const propertyResponse = await retryRequest(() =>
          axios.get(`${API_CONFIG.baseUrl}/${API_CONFIG.publicApiPrefix}/property/${pgandhosteltyId}`, {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
          })
        );

        if (!propertyResponse.data.success || !propertyResponse.data.property) {
          throw new Error('No property data returned');
        }

        const propData = propertyResponse.data.property;
        setProperty({
          id: propData.id || DEFAULT_PROPERTY.id,
          propertyId: propData.propertyId || DEFAULT_PROPERTY.propertyId,
          title: propData.name || DEFAULT_PROPERTY.title,
          type: propData.type || DEFAULT_PROPERTY.type,
          address: propData.location?.address || DEFAULT_PROPERTY.address,
          city: propData.location?.city || DEFAULT_PROPERTY.city,
          state: propData.location?.state || DEFAULT_PROPERTY.state,
          pinCode: propData.location?.pinCode || DEFAULT_PROPERTY.pinCode,
          totalRooms: propData.totalRooms || DEFAULT_PROPERTY.totalRooms,
          totalBeds: propData.totalBeds || DEFAULT_PROPERTY.totalBeds,
          availableRooms: propData.availability?.availableRoomCount || DEFAULT_PROPERTY.availableRooms,
          availableBeds: propData.availability?.availableBedCount || DEFAULT_PROPERTY.availableBeds,
          lowestPrice: propData.pricing?.beds?.min || propData.pricing?.rooms?.min || DEFAULT_PROPERTY.lowestPrice,
          images: propData.images?.length > 0 ? propData.images : DEFAULT_PROPERTY.images,
          reels: propData.reels?.length > 0 ? propData.reels : DEFAULT_PROPERTY.reels,
          description: propData.description || DEFAULT_PROPERTY.description,
          hasAvailability: propData.availability?.hasAvailableRooms || DEFAULT_PROPERTY.hasAvailability,
          createdAt: propData.createdAt
            ? new Date(propData.createdAt).toLocaleDateString('en-IN')
            : DEFAULT_PROPERTY.createdAt,
          owner: {
            name: propData.landlord?.name || DEFAULT_PROPERTY.owner.name,
            phone: propData.landlord?.contactNumber || DEFAULT_PROPERTY.owner.phone,
            avatar: propData.landlord?.profilePhoto || DEFAULT_PROPERTY.owner.avatar,
            whatsapp: propData.landlord?.whatsapp || propData.landlord?.contactNumber || DEFAULT_PROPERTY.owner.phone,
          },
        });

        fetchAdvertisements(propData.location?.city);

        const ratingsParams = new URLSearchParams({
          page: '1',
          limit: '10',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }).toString();

        const commentsParams = new URLSearchParams({
          page: '1',
          limit: '10',
          sortBy: 'createdAt',
          sortOrder: 'desc',
        }).toString();

        const publicHeaders = { 'Content-Type': 'application/json' };

        const fetchWithFallback = async (url, authHeaders, isPublic = false) => {
          try {
            if (isPublic) {
              const publicUrl = url.replace(`/${API_CONFIG.privateApiPrefix}/`, `/${API_CONFIG.publicApiPrefix}/`);
              return await axios.get(publicUrl, { headers: publicHeaders });
            }
            return await axios.get(url, { headers: publicHeaders });
          } catch (err) {
            if (err.response?.status === 401 && authHeaders.Authorization) {
              return await axios.get(url, { headers: authHeaders });
            }
            throw err;
          }
        };

        const [statsResponse, ratingsResponse, commentsResponse] = await Promise.all([
          retryRequest(() =>
            fetchWithFallback(
              `${API_CONFIG.baseUrl}/${API_CONFIG.privateApiPrefix}/property/${pgandhosteltyId}/rating-stats`,
              headers,
              true
            )
          ).catch(() => ({ data: { averageRating: 0, totalRatings: 0 } })),
          retryRequest(() =>
            fetchWithFallback(
              `${API_CONFIG.baseUrl}/${API_CONFIG.privateApiPrefix}/property/${pgandhosteltyId}/ratings?${ratingsParams}`,
              headers,
              true
            )
          ).catch(() => ({ data: { ratings: [] } })),
          retryRequest(() =>
            fetchWithFallback(
              `${API_CONFIG.baseUrl}/${API_CONFIG.privateApiPrefix}/property/${pgandhosteltyId}/comments?${commentsParams}`,
              headers,
              true
            )
          ).catch(() => ({ data: { comments: [] } })),
        ]);

        setRatingStats({
          averageRating: statsResponse.data.averageRating || 0,
          totalRatings: statsResponse.data.totalRatings || 0,
        });
        setRatings(ratingsResponse.data.ratings || []);
        setComments(commentsResponse.data.comments || []);
      } catch (err) {
        let errorMessage = 'Failed to fetch property data. Please try again later.';
        if (err.code === 'ERR_NETWORK' || err.code === 'ERR_CONNECTION_REFUSED') {
          errorMessage = 'Unable to connect to the server. Please check your network.';
        } else if (err.response) {
          if (err.response.status === 404) {
            errorMessage = `Property not found for ID: ${pgandhosteltyId}.`;
          } else if (err.response.status === 500) {
            errorMessage = 'Server error occurred. Please contact support.';
          } else if (err.response.status === 401) {
            errorMessage = 'Authentication failed. Please log in again.';
            navigate('/login', { state: { from: `/pg-and-hostels/${pgandhosteltyId}` } });
            return;
          } else if (err.response.status === 403) {
            errorMessage = 'Access denied to view this property.';
          }
        }
        setError(errorMessage);
        setProperty(DEFAULT_PROPERTY);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [pgandhosteltyId, navigate]);

  const handleSubmitRating = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      setError('Please log in to submit a rating.');
      navigate('/login', { state: { from: `/pg-and-hostels/${pgandhosteltyId}` } });
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      await retryRequest(() =>
        axios.post(
          `${API_CONFIG.baseUrl}/${API_CONFIG.privateApiPrefix}/property/${pgandhosteltyId}/ratings`,
          { rating: newRating, review: newReview },
          { headers }
        )
      );

      const ratingsParams = new URLSearchParams({
        page: '1',
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }).toString();

      const [ratingsResponse, statsResponse] = await Promise.all([
        retryRequest(() =>
          axios.get(
            `${API_CONFIG.baseUrl}/${API_CONFIG.privateApiPrefix}/property/${pgandhosteltyId}/ratings?${ratingsParams}`,
            { headers }
          )
        ).catch(() => ({ data: { ratings: [] } })),
        retryRequest(() =>
          axios.get(
            `${API_CONFIG.baseUrl}/${API_CONFIG.privateApiPrefix}/property/${pgandhosteltyId}/rating-stats`,
            { headers }
          )
        ).catch(() => ({ data: { averageRating: 0, totalRatings: 0 } })),
      ]);

      setRatings(ratingsResponse.data.ratings || []);
      setRatingStats({
        averageRating: statsResponse.data.averageRating || 0,
        totalRatings: statsResponse.data.totalRatings || 0,
      });
      setNewRating(0);
      setNewReview('');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login', { state: { from: `/pg-and-hostels/${pgandhosteltyId}` } });
      } else if (err.response?.status === 403) {
        setError('You do not have permission to submit a rating.');
      } else {
        setError('Failed to submit rating. Please try again.');
      }
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const token = getToken();
    if (!token) {
      setError('Please log in to submit a comment.');
      navigate('/login', { state: { from: `/pg-and-hostels/${pgandhosteltyId}` } });
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      await retryRequest(() =>
        axios.post(
          `${API_CONFIG.baseUrl}/${API_CONFIG.privateApiPrefix}/property/${pgandhosteltyId}/comments`,
          { comment: newComment },
          { headers }
        )
      );

      const commentsParams = new URLSearchParams({
        page: '1',
        limit: '10',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }).toString();

      const commentsResponse = await retryRequest(() =>
        axios.get(
          `${API_CONFIG.baseUrl}/${API_CONFIG.privateApiPrefix}/property/${pgandhosteltyId}/comments?${commentsParams}`,
          { headers }
        )
      );
      setComments(commentsResponse.data.comments || []);
      setNewComment('');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Authentication failed. Please log in again.');
        localStorage.removeItem('token');
        navigate('/login', { state: { from: `/pg-and-hostels/${pgandhosteltyId}` } });
      } else if (err.response?.status === 403) {
        setError('You do not have permission to submit a comment.');
      } else {
        setError('Failed to submit comment. Please try again.');
      }
    }
  };

  const handleShareClick = () => {
    const shareText = `
🏠 *${property.title}*
📍 Location: ${property.address}, ${property.city}, ${property.state}
💰 Price: ₹${property.lowestPrice.toLocaleString('en-IN')}/mo
🛏️ Beds: ${property.totalBeds} (${property.availableBeds} available)
🏠 Rooms: ${property.totalRooms} (${property.availableRooms} available)
🔗 View more: ${window.location.origin}/pg-and-hostels/${pgandhosteltyId}
    `.trim();
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, '_blank');
  };

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % (property.images.length || 1));
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev === 0 ? (property.images.length || 1) - 1 : prev - 1));
  };

  const handleImageClick = (index) => {
    setCurrentImageIndex(index);
  };

  const handleGoBack = () => {
    setError(null);
    navigate('/pg-and-hostels', { replace: true });
  };

  const handleContactSupport = () => {
    navigate('/contact', {
      state: {
        issue: `Unable to load property with ID: ${pgandhosteltyId}`,
      },
    });
  };

  const propertyData = {
    price: property.lowestPrice,
    type: property.type,
    area: property.totalRooms,
    landAreaPostfix: 'Rooms',
    status: property.hasAvailability ? 'Available' : 'Unavailable',
    districtName: property.city,
    imageUrls: property.images,
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <p>Please ensure the property ID in the URL is correct or try another property.</p>
        <div className="error-buttons">
          <button onClick={handleGoBack}>Go Back to PG & Hostels</button>
          <button onClick={handleContactSupport}>Contact Support</button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="main-container">
        <div className="property-header">
          <div className="property-left">
            <div className="breadcrumbs">
              <Link to="/">
                <FontAwesomeIcon icon={faHome} /> Home
              </Link>
              <span>&gt;</span>
              <Link to="/pg-and-hostels">PG & Hostels</Link>
              <span>&gt;</span>
              <span>{property.title}</span>
            </div>
            <h1 className="property-title">{property.title}</h1>
            <p className="location">
              <FontAwesomeIcon icon={faMapMarkerAlt} /> {property.address}, {property.city}, {property.state}, {property.pinCode}
            </p>
            <div className="labels">
              {property.hasAvailability ? (
                <span className="label for-sale">Available</span>
              ) : (
                <span className="label for-sale">Unavailable</span>
              )}
              <span className="label">
                {ratingStats.averageRating.toFixed(1)} ({ratingStats.totalRatings} reviews)
              </span>
            </div>
          </div>
          <div className="property-price">
            <span className="price">₹{property.lowestPrice.toLocaleString('en-IN')}/mo</span>
            <p>{property.totalBeds} Beds ({property.availableBeds} available)</p>
          </div>
        </div>

        <div className="main-layout">
          <div className="content-column">
            <div className="image-slider-section">
              <div className="image-slider">
                <img
                  src={property.images[currentImageIndex]}
                  alt={property.title}
                  className="main-image"
                  onError={(e) => (e.target.src = PLACEHOLDER_IMAGE)}
                />
                <button className="property-nav left" onClick={handlePrevImage} aria-label="Previous Image">
                  ‹
                </button>
                <button className="property-nav right" onClick={handleNextImage} aria-label="Next Image">
                  ›
                </button>
                <div className="neartime-price-box">
                  ₹{property.lowestPrice.toLocaleString('en-IN')}/mo
                  <br />
                  <span className="neartime-price-per">
                    {property.totalBeds} Beds ({property.availableBeds} available)
                  </span>
                </div>
                <div className="landing-overlay-icons">
                  <FontAwesomeIcon
                    icon={faShare}
                    className="landing-overlay-icons-i"
                    onClick={handleShareClick}
                    title="Share Property"
                  />
                  <FontAwesomeIcon
                    icon={faComment}
                    className="landing-overlay-icons-i"
                    onClick={() => navigate('/contact', { state: { propertyId: property.id } })}
                    title="Contact Owner"
                  />
                </div>
              </div>
              <div className="thumbs">
                {property.images.map((img, index) => (
                  <img
                    key={index}
                    src={img}
                    alt={`Thumbnail ${index + 1}`}
                    className={`thumb ${currentImageIndex === index ? 'active' : ''}`}
                    onClick={() => handleImageClick(index)}
                    onError={(e) => (e.target.src = PLACEHOLDER_IMAGE)}
                  />
                ))}
              </div>
            </div>

            <div className="overview-container">
              <div className="overview-top-bar">
                <h2>Overview</h2>
                <span className="property-id">Property ID: {property.propertyId}</span>
              </div>
              <div className="overview-details">
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faHome} /> Type</span>
                  <strong>{property.type}</strong>
                </div>
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faBed} /> Total Beds</span>
                  <strong>{property.totalBeds}</strong>
                </div>
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faBed} /> Available Beds</span>
                  <strong>{property.availableBeds}</strong>
                </div>
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faHome} /> Total Rooms</span>
                  <strong>{property.totalRooms}</strong>
                </div>
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faHome} /> Available Rooms</span>
                  <strong>{property.availableRooms}</strong>
                </div>
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faMoneyBill} /> Price</span>
                  <strong>₹{property.lowestPrice.toLocaleString('en-IN')}/mo</strong>
                </div>
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faCalendarAlt} /> Listed On</span>
                  <strong>{property.createdAt}</strong>
                </div>
                <div className="overview-item">
                  <span><FontAwesomeIcon icon={faStar} /> Rating</span>
                  <strong>{ratingStats.averageRating.toFixed(1)} ({ratingStats.totalRatings} reviews)</strong>
                </div>
              </div>
            </div>

            <div className="description-section">
              <h2>Description</h2>
              <p className="description-text">{property.description}</p>
            </div>
          </div>

          <PgHostelSidebar
            propertyId={property.id}
            propertyTitle={property.title}
            owner={property.owner}
            propertydata={propertyData}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default PgAndHostelDetails;