// RoomDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faStar as faSolidStar } from '@fortawesome/free-regular-svg-icons';
import { FaStar } from 'react-icons/fa';
const API_CONFIG = {
  baseUrl: 'https://hotel-banquet.nearprop.com',
  apiPrefix: 'api',
};
const RoomDetails = () => {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const fetchRoom = async () => {
    try {
      setLoading(true);
      setError(null);
      const auth = getToken();
      const headers = auth?.token
        ? { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };

      const response = await fetch(`${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/rooms/${roomId}`, { headers });
      if (!response.ok) throw new Error(`Failed to fetch room: ${response.status}`);
      const data = await response.json();
      const roomData = data.data || data;

      if (!roomData || Object.keys(roomData).length === 0) {
        throw new Error('No room data returned from the server.');
      }

      setRoom({
        roomNumber: roomData.roomNumber || 'N/A',
        type: roomData.type || 'Unknown',
        price: roomData.price || 0,
        seasonalPrice: roomData.seasonalPrice || {},
        features: roomData.features || [],
        services: roomData.services || [],
        images: roomData.images?.length > 0 ? roomData.images : [],
        videos: roomData.videos?.length > 0 ? roomData.videos : [],
        rating: roomData.rating?.average || 0,
        reviews: roomData.reviews || [],
        hotelName: roomData.hotelDetails?.name || 'Unknown Hotel',
      });
      setMainImage(roomData.images?.length > 0 ? roomData.images[0] : '');
    } catch (err) {
      console.error('Fetch Room Error:', err.message);
      setError(err.message || 'Failed to fetch room data.');
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (index) => {
    setCurrentIndex(index);
  };

  const handleNext = () => {
    const images = room?.images || [];
    setCurrentIndex((currentIndex + 1) % images.length);
  };

  const handlePrev = () => {
    const images = room?.images || [];
    setCurrentIndex(currentIndex === 0 ? images.length - 1 : currentIndex - 1);
  };

  useEffect(() => {
    const token = getToken()?.token;
    if (token) {
      fetchRoom();
    } else {
      navigate('/login', { state: { from: `/room-details/${roomId}` } });
    }
  }, [roomId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">
          {error}
          <button
            className="mt-4 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={() => navigate('/properties')}
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <div className="text-sm text-gray-500 mb-2">
                <Link to="/" className="hover:underline">
                  <FontAwesomeIcon icon={faBuilding} /> Home
                </Link>{' '}
                &gt;{' '}
                <Link to="/properties" className="hover:underline">
                  Hotels
                </Link>{' '}
                &gt; {room?.hotelName} &gt; {room?.roomNumber}
              </div>
              <h1 className="text-3xl font-bold text-gray-800">
                Room {room?.roomNumber} - {room?.type}
              </h1>
              <p className="text-gray-600 mt-1">Hotel: {room?.hotelName}</p>
            </div>
            <div className="mt-4 md:mt-0">
              <span className="text-2xl font-semibold text-blue-600">₹{room?.price.toLocaleString()}/night</span>
            </div>
          </div>
        </div>

        {/* Image Slider */}
        <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
          <button
            className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-gray-800 bg-opacity-50 text-white p-2 rounded-full z-10"
            onClick={handlePrev}
            aria-label="Previous Image"
          >
            ‹
          </button>
          <img
            src={room?.images[currentIndex] || '/placeholder.jpg'}
            alt={room?.roomNumber}
            className="w-full h-96 object-cover"
            onError={(e) => (e.target.src = '/placeholder.jpg')}
          />
          <button
            className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-gray-800 bg-opacity-50 text-white p-2 rounded-full z-10"
            onClick={handleNext}
            aria-label="Next Image"
          >
            ›
          </button>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto">
          {room?.images.map((img, index) => (
            <img
              key={index}
              src={img}
              alt={`Thumbnail ${index + 1}`}
              className={`w-20 h-20 object-cover rounded cursor-pointer ${currentIndex === index ? 'border-2 border-blue-500' : ''}`}
              onClick={() => handleImageClick(index)}
              onError={(e) => (e.target.src = '/placeholder.jpg')}
            />
          ))}
        </div>

        {/* Overview */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-2xl font-semibold mb-4">Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="block font-semibold">Room Type: {room?.type}</span>
            </div>
            <div>
              <span className="block font-semibold">Price: ₹{room?.price.toLocaleString()}/night</span>
            </div>
            <div>
              <span className="block font-semibold">Rating: {room?.rating || 'N/A'}</span>
            </div>
          </div>
          <h3 className="text-xl font-semibold mt-6">Features</h3>
          <div className="flex gap-2 mt-2">
            {room?.features.map((feature, index) => (
              <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                {feature}
              </span>
            ))}
          </div>
          <h3 className="text-xl font-semibold mt-6">Services</h3>
          <div className="flex gap-2 mt-2">
            {room?.services.map((service, index) => (
              <span key={index} className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                {service}
              </span>
            ))}
          </div>
        </div>

        {/* Seasonal Pricing */}
        {room?.seasonalPrice && Object.keys(room.seasonalPrice).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-2xl font-semibold mb-4">Seasonal Pricing</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(room.seasonalPrice).map(([season, price]) => (
                <div key={season}>
                  <span className="block font-semibold capitalize">{season}: ₹{price.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-2xl font-semibold mb-4">Reviews ({room?.reviews.length})</h2>
          {room?.reviews.length === 0 ? (
            <p className="text-gray-600">No reviews yet.</p>
          ) : (
            <div className="space-y-4">
              {room.reviews.map((review, index) => (
                <div key={index} className="border-b pb-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{review.userId || 'Anonymous'}</span>
                    <div>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <FontAwesomeIcon
                          key={num}
                          icon={num <= review.rating ? faSolidStar : FaStar}
                          className={num <= review.rating ? 'text-yellow-400' : 'text-gray-300'}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="text-gray-600 mt-1">{review.comment || 'No comment provided'}</p>
                  <small className="text-gray-500">
                    {new Date(review.createdAt || Date.now()).toLocaleDateString()}
                  </small>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Video Tour */}
        {room?.videos?.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mt-6">
            <h2 className="text-2xl font-semibold mb-4">Video Tour</h2>
            <div className="relative" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={room.videos[0]}
                title="Room Video"
                className="absolute top-0 left-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default RoomDetails;