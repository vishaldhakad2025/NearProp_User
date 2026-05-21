import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faHeart as faHeartSolid,
  faHeart as faHeartRegular,
  faHome,
  faMapMarkerAlt,
} from '@fortawesome/free-solid-svg-icons';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

const API_CONFIG = {
  baseUrl: 'https://hotel-banquet.nearprop.com',
  apiPrefix: 'api',
};

const PLACEHOLDER_IMAGE = 'https://placehold.co/600x400';

// Get auth token from localStorage
const getToken = () => {
  try {
    const authData = localStorage.getItem('authData');
    if (!authData) {
      console.log('No authData found in localStorage');
      return null;
    }
    const parsedData = JSON.parse(authData);
    return { token: parsedData.token || null };
  } catch (err) {
    console.error('Error parsing authData:', err.message);
    return null;
  }
};

// Get user location from localStorage
const getUserLocation = () => {
  try {
    const locationData = localStorage.getItem('myLocation');
    if (!locationData) {
      console.log('No myLocation found in localStorage');
      return null;
    }
    const parsedLocation = JSON.parse(locationData);
    if (!parsedLocation.latitude || !parsedLocation.longitude) {
      console.error('Invalid myLocation data: missing latitude or longitude');
      return null;
    }
    console.log('User location retrieved:', parsedLocation);
    return {
      latitude: parsedLocation.latitude,
      longitude: parsedLocation.longitude,
    };
  } catch (err) {
    console.error('Error parsing myLocation:', err.message);
    return null;
  }
};

// Calculate distance between two coordinates
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function Banquetandhall() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { baseUrl, apiPrefix } = API_CONFIG;

  // Fetch banquet halls and hotels without requiring authentication
  const fetchProperties = async () => {
    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      // Fetch banquet halls
      const banquetResponse = await fetch(`${baseUrl}/${apiPrefix}/banquet-halls`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!banquetResponse.ok) {
        const errorText = await banquetResponse.text();
        throw new Error(`Failed to fetch banquet halls: ${banquetResponse.status} ${errorText}`);
      }

      const banquetData = await banquetResponse.json();
      console.log('Banquet API response:', banquetData);
      if (!banquetData.success || !Array.isArray(banquetData.data?.banquetHalls)) {
        throw new Error('Invalid banquet hall response: ' + JSON.stringify(banquetData));
      }

      // Fetch hotels
      const hotelResponse = await fetch(`${baseUrl}/${apiPrefix}/hotels`, {
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!hotelResponse.ok) {
        const errorText = await hotelResponse.text();
        throw new Error(`Failed to fetch hotels: ${hotelResponse.status} ${errorText}`);
      }

      const hotelData = await hotelResponse.json();
      console.log('Hotel API response:', hotelData);
      if (!hotelData.success || !Array.isArray(hotelData.data?.hotels)) {
        throw new Error('Invalid hotel response: ' + JSON.stringify(hotelData));
      }

      clearTimeout(timeoutId);

      // Map banquet halls
      const banquetProperties = banquetData.data.banquetHalls.map(hall => ({
        id: hall.banquetHallId || `banquet-${Math.random().toString(36).substring(2)}`,
        title: hall.name || 'Unnamed Banquet Hall',
        type: 'Banquet Hall',
        price: hall.pricePerEvent ? `₹${Number(hall.pricePerEvent).toLocaleString('en-IN')}` : 'Price on Enquiry',
        area: hall.capacity ? `${hall.capacity} capacity` : 'N/A',
        address: hall.address || 'Location not specified',
        city: hall.city || 'N/A',
        latitude: hall.latitude ?? null,
        longitude: hall.longitude ?? null,
        owner: { name: hall.owner?.name || 'Unknown Agent' },
        imageUrls: Array.isArray(hall.images) && hall.images.length > 0 ? hall.images : [PLACEHOLDER_IMAGE],
        favorite: false,
        approved: hall.verificationStatus === 'verified',
        active: hall.isAvailable ?? true,
        status: hall.status || 'Active',
      }));

      // Map hotels
      const hotelProperties = hotelData.data.hotels.map(hotel => ({
        id: hotel.hotelId || `hotel-${Math.random().toString(36).substring(2)}`,
        title: hotel.name || 'Unnamed Hotel',
        type: 'Hotel',
        price: hotel.rooms && Array.isArray(hotel.rooms) && hotel.rooms[0]?.price
          ? `₹${Number(hotel.rooms[0].price).toLocaleString('en-IN')}/night`
          : 'Price on Enquiry',
        area: 'N/A',
        address: hotel.address || 'Location not specified',
        city: hotel.city || 'N/A',
        latitude: hotel.latitude ?? null,
        longitude: hotel.longitude ?? null,
        owner: { name: hotel.owner?.name || 'Unknown Agent' },
        imageUrls: Array.isArray(hotel.images) && hotel.images.length > 0 ? hotel.images : [PLACEHOLDER_IMAGE],
        favorite: false,
        approved: hotel.verificationStatus === 'verified',
        active: hotel.isAvailable ?? true,
        status: hotel.status || 'Active',
      }));

      setProperties([...banquetProperties, ...hotelProperties]);
    } catch (err) {
      console.error('Error fetching properties:', err);
      let errorMsg = 'Failed to load properties. Please try again later.';
      if (err.name === 'AbortError') {
        errorMsg = 'Request timed out. Please check your connection and try again.';
      } else if (err.message.includes('HTTP error')) {
        errorMsg = `Server error: ${err.message}`;
      } else if (err.message.includes('fetch')) {
        errorMsg = 'Network error: Unable to connect to the server. Please check your internet connection.';
      }
      setError(errorMsg);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // Toggle favorite status
  const handleToggleFavorite = async (e, id, isFavorite) => {
    e.preventDefault();
    e.stopPropagation();
    const auth = getToken();
    if (!auth?.token) {
      setError('Please log in to manage favorites');
      const property = properties.find(p => p.id === id);
      navigate('/login', {
        state: {
          from: property.type === 'Hotel' ? `/HotelDetails/hotel/${id}` : `/HotelAndBanquetDetails/banquet/${id}`,
        },
      });
      return;
    }

    try {
      const method = isFavorite ? 'DELETE' : 'POST';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${baseUrl}/${apiPrefix}/favorites/${id}`, {
        method,
        headers: {
          Authorization: `Bearer ${auth.token}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to toggle favorite: ${response.status} ${errorText}`);
      }

      setProperties(properties.map(p =>
        p.id === id ? { ...p, favorite: !isFavorite } : p
      ));
    } catch (err) {
      console.error('Toggle Favorite error:', err.message);
      setError(err.message);
    }
  };

  // Handle card click to check authentication
  const handleCardClick = (e, property) => {
    const auth = getToken();
    const route = property.type === 'Hotel'
      ? `/HotelDetails/hotel/${property.id}`
      : `/HotelAndBanquetDetails/banquet/${property.id}`;

    if (!auth?.token) {
      e.preventDefault();
      navigate('/login', { state: { from: route } });
    }
    // If authenticated, allow default navigation via Link
  };

  // Determine availability status
  const getAvailabilityStatus = (property) => {
    return property.active ? 'Available' : 'Unavailable';
  };

  // Generate tags for property
  const getTags = (property) => {
    const tags = [];
    if (property.approved) tags.push('Aadhaar Verified');
    if (property.active) tags.push('Subscription Active');
    else tags.push('Subscription Expired');
    if (property.status === 'SOLD') tags.push('Sold');
    if (!property.approved) tags.push('Not Aadhaar Verified');
    return tags;
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  // Check if user location is available
  const userLocation = getUserLocation();

  return (
    <div style={{ padding: '40px 20px', background: '#f2f4f8' }}>
      <h2 style={{ textAlign: 'center', fontSize: 32, color: 'darkcyan' }}>
        Discover Hotels and Banquet Halls
      </h2>
      <p style={{ textAlign: 'center', maxWidth: 800, margin: '10px auto' }}>
        Explore our curated selection of premium hotels and banquet halls for your events and stays.
      </p>
      {loading && (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div
            style={{
              border: '4px solid #f3f3f3',
              borderTop: '4px solid darkcyan',
              borderRadius: '50%',
              width: '40px',
              height: '40px',
              animation: 'spin 1s linear infinite',
              margin: 'auto',
            }}
          ></div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
      {error && (
        <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>
          <p>{error}</p>
          <button
            onClick={fetchProperties}
            style={{
              padding: '10px 20px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'darkcyan',
              backgroundColor: '#fff',
              border: '2px solid darkcyan',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}
      {!loading && !error && (
        <Swiper
          modules={[Autoplay, Pagination, Navigation]}
          loop
          autoplay={{ delay: 3500, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation
          breakpoints={{
            0: { slidesPerView: 1, spaceBetween: 15 },
            768: { slidesPerView: 2, spaceBetween: 20 },
            1200: { slidesPerView: 3, spaceBetween: 25 },
          }}
          style={{ padding: '40px 0' }}
        >
          {properties.map((property) => {
            const availabilityStatus = getAvailabilityStatus(property);
            const tags = getTags(property);
            const route = property.type === 'Hotel'
              ? `/HotelDetails/hotel/${property.id}`
              : `/HotelAndBanquetDetails/banquet/${property.id}`;
            return (
              <SwiperSlide key={property.id}>
                <Link
                  to={route}
                  style={{ textDecoration: 'none' }}
                  onClick={(e) => handleCardClick(e, property)}
                >
                  <div
                    style={{
                      background: '#fff',
                      borderRadius: 12,
                      overflow: 'hidden',
                      boxShadow: '0 6px 25px rgba(0,0,0,0.12)',
                      cursor: 'pointer',
                      position: 'relative',
                      minHeight: 450,
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'transform 0.3s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {/* Image */}
                    <div style={{ position: 'relative', height: 260 }}>
                      <img
                        src={property.imageUrls[0]}
                        alt={property.title}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        onError={(e) => { e.target.src = PLACEHOLDER_IMAGE; }}
                      />
                      {/* Availability Status - Top Left */}
                      <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          left: 10,
                          background: availabilityStatus === 'Available' ? '#28a745' : '#dc3545',
                          color: '#fff',
                          padding: '4px 10px',
                          borderRadius: 6,
                          fontSize: 12,
                          fontWeight: 'bold',
                          zIndex: 10,
                        }}
                      >
                        {availabilityStatus}
                      </div>
                      {/* Price box - Bottom Left */}
                      <div
                        style={{
                          position: 'absolute',
                          bottom: 10,
                          left: 10,
                          background: 'rgba(0,0,0,0.7)',
                          color: '#fff',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontWeight: 'bold',
                        }}
                      >
                        {property.price}
                      </div>
                      {/* Favorite Icon - Top Right */}
                      {/* <div
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          cursor: 'pointer',
                          zIndex: 10,
                        }}
                        onClick={(e) => handleToggleFavorite(e, property.id, property.favorite)}
                      >
                        <FontAwesomeIcon
                          icon={property.favorite ? faHeartSolid : faHeartRegular}
                          style={{ color: property.favorite ? 'red' : 'white' }}
                        />
                      </div> */}
                    </div>

                    {/* Details */}
                    <div style={{ padding: 16, flex: 1 }}>
                      <h3 style={{ fontSize: 20, fontWeight: '600', marginBottom: 6 }}>
                        {property.title}
                      </h3>
                      <p style={{ fontSize: 14, color: '#777', marginBottom: 12 }}>
                        <FontAwesomeIcon icon={faMapMarkerAlt} /> {property.address}, {property.city}
                        <span style={{ fontWeight: 'bold', color: '#0e7490' }}>
                          {userLocation && property.latitude && property.longitude
                            ? ` - ${getDistanceFromLatLonInKm(
                                userLocation.latitude,
                                userLocation.longitude,
                                property.latitude,
                                property.longitude
                              ).toFixed(2)} km away`
                            : ''}
                        </span>
                      </p>

                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8,
                          fontSize: 13,
                          color: '#444',
                        }}
                      >
                        <span>
                          <FontAwesomeIcon icon={faHome} /> {property.type}
                        </span>
                        <span>
                          <FontAwesomeIcon icon={faUser} /> {property.owner.name}
                        </span>
                        <span>
                          <FontAwesomeIcon icon={faMapMarkerAlt} /> {property.area}
                        </span>
                        <span>
                          <FontAwesomeIcon icon={faMapMarkerAlt} /> {property.city}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: 6,
                        }}
                      >
                        {tags.map((tag, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#eef3f7',
                              padding: '4px 10px',
                              borderRadius: 6,
                              fontSize: 12,
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Link>
              </SwiperSlide>
            );
          })}
        </Swiper>
      )}
    </div>
  );
}

export default Banquetandhall;