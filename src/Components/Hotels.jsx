import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBed,
  faShower,
  faCar,
  faUser,
  faPaperclip,
  faComment,
  faMapMarkerAlt,
  faWifi,
  faUtensils,
  faSwimmingPool,
  faDumbbell,
  faSpa,
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import "./Properties.css";

// Local fallback images
import Apartment from '../assets/A-1.avif';
import Apartment2 from '../assets/c-2.avif';
import Apartment3 from '../assets/apartment.avif';
import Apartment4 from '../assets/studio.jpg';
import Apartment6 from '../assets/penthouse.avif';
import Apartment7 from '../assets/villa.avif';

const fallbackImages = [Apartment, Apartment2, Apartment3, Apartment4, Apartment6, Apartment7];

const API_CONFIG = {
  hotelBanquetBaseUrl: 'https://hotel-banquet.nearprop.in',
  apiPrefix: 'api',
};

// Helper to pick first valid image
const getValidImage = (images, fallback, baseUrl = "") => {
  if (!Array.isArray(images) || images.length === 0) return fallback;
  const validImg = images.find(
    img => img && img.trim() !== "" && !img.toLowerCase().includes("white")
  );
  return validImg ? (validImg.startsWith("http") ? validImg : `${baseUrl}${validImg}`) : fallback;
};

// Get user location (promise-based)
const getUserLocation = () => {
  return new Promise((resolve) => {
    try {
      const locationData = localStorage.getItem("myLocation");
      if (locationData) {
        const parsedLocation = JSON.parse(locationData);
        if (parsedLocation.latitude && parsedLocation.longitude) {
          return resolve({
            latitude: parsedLocation.latitude,
            longitude: parsedLocation.longitude,
          });
        }
      }
    } catch (err) {
      console.error("Error parsing myLocation:", err.message);
    }

    if (!navigator.geolocation) {
      console.error("Geolocation not supported");
      return resolve(null);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        localStorage.setItem("myLocation", JSON.stringify(location));
        resolve(location);
      },
      (err) => {
        console.error("Geolocation error:", err.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  });
};

// Haversine formula
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (value) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return isNaN(distance) ? null : Number(distance.toFixed(2));
};

function Hotels() {
  const [hotels, setHotels] = useState([]);
  const [filteredHotels, setFilteredHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterRatingMin, setFilterRatingMin] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState([]);

  // Dropdown search
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  // Location data
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);

  const { hotelBanquetBaseUrl, apiPrefix } = API_CONFIG;

  // Track hotel click (fire-and-forget)
  const trackHotelClick = async (hotelId) => {
    if (!hotelId) return;
    try {
      const url = `${hotelBanquetBaseUrl}/${apiPrefix}/property-click/Hotel/${hotelId}/click`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // Silent success
    } catch (err) {
      console.error('Failed to track hotel click:', err);
      // Silent fail
    }
  };

  // Fetch user location
  useEffect(() => {
    getUserLocation().then((loc) => {
      if (loc) {
        setLocation(loc);
        setLocationError(null);
        fetchNearbyHotels(loc.latitude, loc.longitude);
      } else {
        setLocationError("Unable to fetch location. Showing all hotels.");
        fetchAllHotels();
      }
    });
  }, []);

  // Fetch nearby hotels
  const fetchNearbyHotels = async (lat, lng, radius = 50) => {
    try {
      setLoading(true);
      const url = `${hotelBanquetBaseUrl}/${apiPrefix}/hotels/nearby?latitude=${lat}&longitude=${lng}&radius=${radius * 1000}`;
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const data = JSON.parse(text);
      if (data.success) {
        const formattedHotels = (data.data?.hotels || []).map(hotel => ({
          id: hotel._id,                    // Use MongoDB _id for tracking
          hotelId: hotel.hotelId || hotel._id, // Keep hotelId for URL if needed
          title: hotel.name || "Untitled Hotel",
          address: hotel.address || `${hotel.city || "Unknown"}, ${hotel.state || "Unknown"}`,
          imageUrls: hotel.images || [],
          status: hotel.isAvailable ? "AVAILABLE" : "UNAVAILABLE",
          description: hotel.description || "",
          contactNumber: hotel.contactNumber || "",
          alternateContact: hotel.alternateContact || "",
          email: hotel.email || "",
          website: hotel.website || "",
          city: hotel.city || "",
          state: hotel.state || "",
          pincode: hotel.pincode || "",
          latitude: hotel.location?.coordinates?.[1] || null,
          longitude: hotel.location?.coordinates?.[0] || null,
          distance: hotel.distanceValue ? (hotel.distanceValue / 1000).toFixed(2) : null,
          averageRoomPrice: hotel.averageRoomPrice || 0,
          averageRating: hotel.averageRating || 0,
          reviewCount: hotel.reviewCount || 0,
          amenities: Array.isArray(hotel.amenities) ? hotel.amenities :
                    (typeof hotel.amenities === 'string' ? JSON.parse(hotel.amenities.replace(/^\[|\]$/g, '')) : []),
          createdAt: hotel.createdAt || new Date().toISOString(),
          ownerName: hotel.ownerName || "Hotel Management",
          verificationStatus: hotel.verificationStatus || "",
        }));

        formattedHotels.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
        setHotels(formattedHotels);
        setFilteredHotels(formattedHotels);
        extractLocationData(formattedHotels);
      }
    } catch (err) {
      console.error("Error fetching nearby hotels:", err);
      setError(err.message);
      fetchAllHotels();
    } finally {
      setLoading(false);
    }
  };

  // Fallback: fetch all hotels
  const fetchAllHotels = async () => {
    try {
      setLoading(true);
      const url = `${hotelBanquetBaseUrl}/${apiPrefix}/hotels`;
      const response = await fetch(url);
      const text = await response.text();
      if (!response.ok) throw new Error(`Error: ${response.status}`);

      const data = JSON.parse(text);
      if (data.success && data.data?.hotels) {
        const formattedHotels = data.data.hotels.map(hotel => ({
          id: hotel._id,
          hotelId: hotel.hotelId || hotel._id,
          title: hotel.name || "Untitled Hotel",
          address: hotel.address || `${hotel.city || "Unknown"}, ${hotel.state || "Unknown"}`,
          imageUrls: hotel.images || [],
          status: hotel.isAvailable ? "AVAILABLE" : "UNAVAILABLE",
          city: hotel.city || "",
          state: hotel.state || "",
          latitude: hotel.location?.coordinates?.[1] || null,
          longitude: hotel.location?.coordinates?.[0] || null,
          distance: null,
          averageRoomPrice: hotel.averageRoomPrice || 0,
          averageRating: hotel.averageRating || 0,
          reviewCount: hotel.reviewCount || 0,
          amenities: Array.isArray(hotel.amenities) ? hotel.amenities :
                    (typeof hotel.amenities === 'string' ? JSON.parse(hotel.amenities.replace(/^\[|\]$/g, '')) : []),
          createdAt: hotel.createdAt || new Date().toISOString(),
          ownerName: hotel.ownerName || "Hotel Management",
          verificationStatus: hotel.verificationStatus || "",
        }));

        setHotels(formattedHotels);
        setFilteredHotels(formattedHotels);
        extractLocationData(formattedHotels);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const extractLocationData = (hotelList) => {
    const uniqueStates = [...new Set(hotelList.map(h => h.state).filter(Boolean))].sort();
    const uniqueCities = [...new Set(hotelList.map(h => h.city).filter(Boolean))].sort();
    setStates(uniqueStates);
    setCities(uniqueCities);
  };

  // Real-time filtering
  useEffect(() => {
    let filtered = [...hotels];

    if (searchQuery) {
      filtered = filtered.filter(h =>
        h.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        h.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterPriceMin) filtered = filtered.filter(h => h.averageRoomPrice >= Number(filterPriceMin));
    if (filterPriceMax) filtered = filtered.filter(h => h.averageRoomPrice <= Number(filterPriceMax));
    if (filterRatingMin) filtered = filtered.filter(h => (h.averageRating || 0) >= Number(filterRatingMin));
    if (selectedState) filtered = filtered.filter(h => h.state?.toLowerCase() === selectedState.toLowerCase());
    if (selectedCity) filtered = filtered.filter(h => h.city?.toLowerCase() === selectedCity.toLowerCase());

    if (selectedAmenities.length > 0) {
      filtered = filtered.filter(hotel =>
        selectedAmenities.every(amenity =>
          hotel.amenities?.some(a => a.toLowerCase().includes(amenity.toLowerCase()))
        )
      );
    }

    // Distance sorting
    if (location) {
      filtered = filtered.map(h => ({
        ...h,
        calculatedDistance: h.latitude && h.longitude
          ? getDistanceFromLatLonInKm(location.latitude, location.longitude, h.latitude, h.longitude)
          : null
      }));
      filtered.sort((a, b) => (a.calculatedDistance ?? Infinity) - (b.calculatedDistance ?? Infinity));
    } else if (hotels.some(h => h.distance !== null)) {
      filtered.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }

    setFilteredHotels(filtered);
  }, [hotels, searchQuery, filterPriceMin, filterPriceMax, filterRatingMin, selectedState, selectedCity, selectedAmenities, location]);

  // Amenity icons
  const amenityIcons = {
    'WiFi': faWifi,
    'AC': faBed,
    'Swimming Pool': faSwimmingPool,
    'Gym': faDumbbell,
    'Spa': faSpa,
    'Restaurant': faUtensils,
    'Room Service': faUtensils,
    'Parking': faCar,
    'Laundry': faShower,
  };

  const filteredStates = states.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));
  const filteredCities = cities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

  if (loading) return <div className="p-4">Loading hotels nearby…</div>;
  if (error) return <div className="p-4 text-danger">Error: {error}</div>;

  return (
    <div>
      {locationError && (
        <div className="p-4 text-warning bg-warning-subtle p-3 rounded mb-3">
          <span>{locationError}</span>
          <button
            className="btn btn-sm btn-outline-warning ms-2"
            onClick={() => getUserLocation().then(loc => {
              if (loc) {
                setLocation(loc);
                setLocationError(null);
                fetchNearbyHotels(loc.latitude, loc.longitude);
              }
            })}
          >
            Retry Location
          </button>
        </div>
      )}

      <div className="nav justify-content-center p-5" style={{ fontSize: "40px", fontWeight: "700", color: 'darkcyan' }}>
        Nearby Hotels
      </div>

      <div className="blog-main-container">
        <div className="blog-left-section card-wrapper">
          {filteredHotels.length === 0 ? (
            <div className="no-properties text-center py-5">
              <h5>No hotels found matching your criteria.</h5>
            </div>
          ) : (
            filteredHotels.map((hotel) => (
              <Link
                to={`/HotelAndBanquetDetails/hotel/${hotel.hotelId || hotel.id}`}
                key={hotel.id}
                className="property-card-link"
                onClick={() => trackHotelClick(hotel.id)}  // Track using _id
              >
                <div className="landing-property-card"
                  style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = "translateY(-8px)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.15)";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                  }}
                >
                  <div style={{ position: "relative", height: "200px", overflow: "hidden" }}>
                    <img
                      src={getValidImage(hotel.imageUrls, fallbackImages[2], hotelBanquetBaseUrl)}
                      alt={hotel.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.3s ease" }}
                      onMouseEnter={e => e.target.style.transform = "scale(1.05)"}
                      onMouseLeave={e => e.target.style.transform = "scale(1)"}
                      onError={e => e.target.src = fallbackImages[2]}
                    />
                    {hotel.averageRating > 0 && (
                      <span style={{
                        position: "absolute", top: "10px", right: "10px",
                        background: "#ffc107", color: "#000", padding: "4px 8px",
                        borderRadius: "4px", fontWeight: "bold", fontSize: "12px"
                      }}>
                        ⭐ {hotel.averageRating}
                      </span>
                    )}
                    <div style={{
                      position: "absolute", bottom: "12px", left: "12px",
                      background: "rgba(0,0,0,0.7)", color: "#fff",
                      padding: "8px 12px", borderRadius: "8px", fontSize: "0.875rem"
                    }}>
                      ₹{hotel.averageRoomPrice ? Number(hotel.averageRoomPrice).toLocaleString("en-IN") : "N/A"}
                      <br /><small>/night</small>
                    </div>
                  </div>

                  <div style={{ padding: "16px", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <h2 style={{
                      fontSize: "1.25rem", fontWeight: "600", color: "#1a202c",
                      margin: "0 0 10px", lineHeight: "1.4",
                      overflow: "hidden", textOverflow: "ellipsis",
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical"
                    }}>
                      {hotel.title}
                    </h2>

                    <div style={{ fontSize: "0.875rem", color: "#4a5568", display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                      <span style={{ display: "flex", alignItems: "center" }}>
                        <FontAwesomeIcon icon={faMapMarkerAlt} className="me-2" />
                        {hotel.city}, {hotel.state}
                      </span>
                      <span style={{ color: "#0e7490", fontWeight: "bold" }}>
                        {hotel.distance ? `${hotel.distance} km away` : "Distance unavailable"}
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: "16px", fontSize: "0.85rem", color: "#4a5568", marginBottom: "12px", flexWrap: "wrap" }}>
                      <span style={{ display: "flex", alignItems: "center" }}>
                        <FontAwesomeIcon icon={faComment} className="me-1" /> {hotel.reviewCount || 0} reviews
                      </span>
                    </div>

                    <div style={{ fontSize: "0.875rem", fontWeight: "600", color: "#3182ce", marginBottom: "12px" }}>
                      <strong>{hotel.verificationStatus === "verified" ? "Verified" : "Pending"}</strong>
                    </div>

                    <div style={{
                      display: "flex", justifyContent: "space-between",
                      fontSize: "0.75rem", color: "#718096",
                      borderTop: "1px solid #e2e8f0", paddingTop: "12px", flexWrap: "wrap"
                    }}>
                      <span style={{ display: "flex", alignItems: "center" }}>
                        <FontAwesomeIcon icon={faUser} className="me-1" /> {hotel.ownerName}
                      </span>
                      <span style={{ display: "flex", alignItems: "center" }}>
                        <FontAwesomeIcon icon={faPaperclip} className="me-1" />
                        {new Date(hotel.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Sidebar Filters */}
        <div className="residential-blog-right-sidebar md:block">
          <aside className="residential">
            <div className="residential-filter">
              <h3 className="filter-title">Filter Hotels</h3>

              <div className="filter-group">
                <label className="filter-label">Search Hotels</label>
                <input type="text" placeholder="Name or description" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="filter-input" />
              </div>

              <div className="filter-group position-relative">
                <label className="filter-label">State</label>
                <div className="filter-input d-flex align-items-center justify-content-between cursor-pointer" onClick={() => setShowStateDropdown(!showStateDropdown)}>
                  <span>{selectedState || "-Select State-"}</span> <span>Down Arrow</span>
                </div>
                {showStateDropdown && (
                  <div className="position-absolute w-100 bg-white border rounded shadow mt-1" style={{ zIndex: 1000, maxHeight: "300px", overflowY: "auto" }}>
                    <input type="text" placeholder="Search state..." value={stateSearch} onChange={e => setStateSearch(e.target.value)} className="filter-input border-0 border-bottom" autoFocus onClick={e => e.stopPropagation()} />
                    {filteredStates.map(s => (
                      <div key={s} className="p-2 hover-bg-light cursor-pointer" onClick={() => { setSelectedState(s); setShowStateDropdown(false); setStateSearch(""); }}>
                        {s}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="filter-group position-relative">
                <label className="filter-label">City</label>
                <div className="filter-input d-flex align-items-center justify-content-between cursor-pointer" onClick={() => setShowCityDropdown(!showCityDropdown)}>
                  <span>{selectedCity || "-Select City-"}</span> <span>Down Arrow</span>
                </div>
                {showCityDropdown && (
                  <div className="position-absolute w-100 bg-white border rounded shadow mt-1" style={{ zIndex: 1000, maxHeight: "300px", overflowY: "auto" }}>
                    <input type="text" placeholder="Search city..." value={citySearch} onChange={e => setCitySearch(e.target.value)} className="filter-input border-0 border-bottom" autoFocus onClick={e => e.stopPropagation()} />
                    {filteredCities.map(c => (
                      <div key={c} className="p-2 hover-bg-light cursor-pointer" onClick={() => { setSelectedCity(c); setShowCityDropdown(false); setCitySearch(""); }}>
                        {c}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="filter-group">
                <label className="filter-label">Price Range (₹/night)</label>
                <div className="d-flex gap-2">
                  <input type="number" placeholder="Min" value={filterPriceMin} onChange={e => setFilterPriceMin(e.target.value)} className="filter-input" />
                  <span className="align-self-center">to</span>
                  <input type="number" placeholder="Max" value={filterPriceMax} onChange={e => setFilterPriceMax(e.target.value)} className="filter-input" />
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">Minimum Rating</label>
                <select value={filterRatingMin} onChange={e => setFilterRatingMin(e.target.value)} className="filter-select">
                  <option value="">Any</option>
                  <option value="1">1+ Star</option>
                  <option value="2">2+ Star</option>
                  <option value="3">3+ Star</option>
                  <option value="4">4+ Star</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Amenities</label>
                <div className="amenities-checkboxes">
                  {['WiFi', 'AC', 'Swimming Pool', 'Gym', 'Spa', 'Restaurant', 'Parking', 'Room Service'].map(amenity => (
                    <label key={amenity} className="d-block mb-1">
                      <input
                        type="checkbox"
                        checked={selectedAmenities.includes(amenity)}
                        onChange={e => setSelectedAmenities(prev =>
                          e.target.checked ? [...prev, amenity] : prev.filter(a => a !== amenity)
                        )}
                        className="me-2"
                      />
                      <FontAwesomeIcon icon={amenityIcons[amenity] || faBed} className="me-1" />
                      {amenity}
                    </label>
                  ))}
                </div>
              </div>

              {location && (
                <button className="btn btn-outline-primary w-100 mb-3" onClick={() => fetchNearbyHotels(location.latitude, location.longitude)}>
                  Update Nearby Hotels
                </button>
              )}
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .hover-bg-light:hover { background-color: #f8f9fa; }
        .amenities-checkboxes { max-height: 200px; overflow-y: auto; }
      `}</style>
    </div>
  );
}

export default Hotels;