import React, { useState, useEffect } from "react";
import "./AllProperty.css";
import { useNavigate } from "react-router-dom";

// 🔹 Local fallback images
import Apartment from '../assets/A-1.avif';
import Apartment2 from '../assets/c-2.avif';
import Apartment3 from '../assets/apartment.avif';
import Apartment4 from '../assets/studio.jpg';
import Apartment6 from '../assets/penthouse.avif';
import Apartment7 from '../assets/villa.avif';

const fallbackImages = [Apartment, Apartment2, Apartment3, Apartment4, Apartment6, Apartment7];

const API_CONFIG = {
  featuredBaseUrl: 'https://api.nearprop.com',
  hotelBanquetBaseUrl: 'https://hotel-banquet.nearprop.com',
  pgHostelBaseUrl: 'https://pg-hostel.nearprop.com',
  apiPrefix: 'api',
};

// 🔹 Helper function to pick first valid image
const getValidImage = (images, fallback, baseUrl = "") => {
  if (!Array.isArray(images) || images.length === 0) return fallback;
  const validImg = images.find(
    img => img && img.trim() !== "" && !img.toLowerCase().includes("white")
  );
  return validImg ? (validImg.startsWith("http") ? validImg : `${baseUrl}${validImg}`) : fallback;
};

function AllProperties() {
  const [category, setCategory] = useState("Hotel/Banquet");
  const [activeCard, setActiveCard] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [propertiesByCategory, setPropertiesByCategory] = useState({
    "Hotel/Banquet": [],
    "PG/Hostel": [],
    "Featured Property": [],
  });

  const navigate = useNavigate();
  const { featuredBaseUrl, hotelBanquetBaseUrl, pgHostelBaseUrl, apiPrefix } = API_CONFIG;

  // 🔹 LocalStorage token for featured API
  const getToken = () => {
    try {
      const authData = localStorage.getItem('authData');
      if (!authData) return null;
      const parsedData = JSON.parse(authData);
      return { token: parsedData.token || null, userId: parsedData.userId || null };
    } catch {
      return null;
    }
  };

  // 🔹 Check favorite status for featured properties
  const checkFavoriteStatus = async (propertyId, token) => {
    try {
      const response = await fetch(`${featuredBaseUrl}/${apiPrefix}/favorites/${propertyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return false;
      const data = await response.json();
      return data.isFavorite || data.favorite || false;
    } catch {
      return false;
    }
  };

  // 🔹 Fetch All Properties
  const fetchProperties = async () => {
    try {
      setLoading(true);
      setError(null);

      const auth = getToken();

      /** 🔹 Featured Properties */
      const featuredRes = await fetch(`${featuredBaseUrl}/${apiPrefix}/properties/featured`, {
        headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}
      });
      const featuredJson = await featuredRes.json();
      const featuredData =
        Array.isArray(featuredJson.content) ? featuredJson.content :
        Array.isArray(featuredJson.data) ? featuredJson.data :
        Array.isArray(featuredJson.properties) ? featuredJson.properties : [];

      const featuredProperties = await Promise.all(
        featuredData.map(async property => ({
          id: property.id || property._id,
          name: property.title || "Untitled Property",
          location: property.address || `${property.city || ""}, ${property.state || ""}`,
          img: getValidImage(property.imageUrls, fallbackImages[0]),
          type: property.type || "Property",
          favorite: auth?.token ? await checkFavoriteStatus(property.id, auth.token) : false,
          approved: property.approved || property.verificationStatus === 'verified',
          active: property.active,
          featured: true,
          source: 'featured',
        }))
      );

      /** 🔹 Hotel & Banquet */
      const banquetRes = await fetch(`${hotelBanquetBaseUrl}/${apiPrefix}/banquet-halls`);
      const banquetJson = await banquetRes.json();
      const banquetProperties = (banquetJson.data?.banquetHalls || []).map(hall => ({
        id: hall.banquetHallId || hall._id,
        name: hall.name || "Untitled Banquet Hall",
        location: `${hall.city || "Unknown"}, ${hall.state || "Unknown"}`,
        img: getValidImage(hall.images, fallbackImages[1], hotelBanquetBaseUrl),
        type: "Banquet Hall",
        favorite: false,
        approved: hall.verificationStatus === 'verified',
        active: hall.isAvailable,
        featured: false,
        source: 'hotel-banquet',
      }));

      const hotelRes = await fetch(`${hotelBanquetBaseUrl}/${apiPrefix}/hotels`);
      const hotelJson = await hotelRes.json();
      const hotelProperties = (hotelJson.data?.hotels || []).map(hotel => ({
        id: hotel.hotelId || hotel._id,
        name: hotel.name || "Untitled Hotel",
        location: `${hotel.city || "Unknown"}, ${hotel.state || "Unknown"}`,
        img: getValidImage(hotel.images, fallbackImages[2], hotelBanquetBaseUrl),
        type: "Hotel",
        favorite: false,
        approved: hotel.verificationStatus === 'verified',
        active: hotel.isAvailable,
        featured: hotel.subscriptions?.[0]?.isActive,
        source: 'hotel-banquet',
      }));

      /** 🔹 PG & Hostel API */
      const pgRes = await fetch(`${pgHostelBaseUrl}/api/public/properties`);
      const pgJson = await pgRes.json();
      const pgProperties = (pgJson.properties || []).map(pg => ({
        id: pg.id,
        name: pg.name || "Untitled PG/Hostel",
        location: `${pg.location?.address || ""}, ${pg.location?.city || ""}, ${pg.location?.state || ""}`,
        img: getValidImage(pg.images, fallbackImages[3]),
        type: pg.type || "PG/Hostel",
        favorite: false,
        approved: true,
        active: pg.availability?.hasAvailableRooms || pg.availability?.hasAvailableBeds,
        featured: false,
        source: 'pg-hostel',
      }));

      /** 🔹 Categorize */
      setPropertiesByCategory({
        "Hotel/Banquet": [...banquetProperties, ...hotelProperties],
        "PG/Hostel": pgProperties,
        "Featured Property": featuredProperties,
      });

    } catch (err) {
      setError(err.message);
      setPropertiesByCategory({ "Hotel/Banquet": [], "PG/Hostel": [], "Featured Property": [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProperties(); }, []);

  // 🔹 Auto slide
  const cardsData = propertiesByCategory[category] || [];
  useEffect(() => {
    if (cardsData.length <= 1) return;
    const interval = setInterval(() => {
      setActiveCard(prev => (prev === cardsData.length - 1 ? 0 : prev + 1));
    }, 3000);
    return () => clearInterval(interval);
  }, [cardsData]);

  const getVisibleCards = () => {
    if (cardsData.length === 0) return [];
    const prev = (activeCard - 1 + cardsData.length) % cardsData.length;
    const next = (activeCard + 1) % cardsData.length;
    return [cardsData[prev], cardsData[activeCard], cardsData[next]];
  };

  const handlePropertyClick = (id, type, source) => {
    console.log('Navigating to:', { id, type, source });
    if (source === 'pg-hostel') {
      navigate(`/Pgandhostel/${id}`);
    } else if (source === 'featured') {
      navigate(`/propertySell/${id}`);
    } else if (source === 'hotel-banquet') {
      navigate(`/HotelAndBanquetDetails/${type.toLowerCase()}/${id}`, { state: { type } });
    }
  };

  // ✅ Default background image
  const currentBg = cardsData[activeCard]?.img || fallbackImages[0];

  return (
    <div className="travel-slider hi12" >
      <div className="background" style={{ backgroundImage: `url(${currentBg})` }}></div>
      <div className="overlay"></div>

      {/* Category Buttons */}
      <div className="category-buttons glass-effect">
        {Object.keys(propertiesByCategory).map(cat => (
          <button
            key={cat}
            className={`category-btn ${category === cat ? "active" : ""}`}
            onClick={() => { setCategory(cat); setActiveCard(0); }}
          >
            {cat}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '20px' }}>Loading properties...</div>}
      {error && <div style={{ textAlign: 'center', padding: '20px', color: 'red' }}>{error}</div>}

      {!loading && !error && (
        <div className="content">
          <div className="left">
            {cardsData[activeCard] ? (
              <>
                <h3 className="subtitle">{cardsData[activeCard].location}</h3>
                <h1 className="title">{cardsData[activeCard].name}</h1>
              </>
            ) : <p>No properties in {category}</p>}
          </div>

          <div className="right">
            <div className="cards fixed">
              {getVisibleCards().map(card => (
                <div
                  key={card.id}
                  className={`card ${card.id === cardsData[activeCard]?.id ? "active" : ""}`}
                  onClick={() => handlePropertyClick(card.id, card.type, card.source)}
                >
                  <img src={card.img} alt={card.name} onError={e => e.target.src = fallbackImages[0]} />
                  <div className="card-info">
                    <h4>{card.name}</h4>
                    <span className="tag">{card.location}</span>
                    {card.featured && (
                      <span className="tag" style={{ background: '#FFD700', color: '#000', marginLeft: '5px' }}>
                        Featured
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AllProperties;