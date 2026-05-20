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
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import "./Properties.css";

// 🔹 Local fallback images
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

// 🔹 Helper function to pick first valid image
const getValidImage = (images, fallback, baseUrl = "") => {
  if (!Array.isArray(images) || images.length === 0) return fallback;
  const validImg = images.find(
    img => img && img.trim() !== "" && !img.toLowerCase().includes("white")
  );
  return validImg ? (validImg.startsWith("http") ? validImg : `${baseUrl}${validImg}`) : fallback;
};

function Banquet() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sidebar filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterCapacity, setFilterCapacity] = useState("");
  const [filterType, setFilterType] = useState("");

  // 🔹 Location filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Searchable dropdown states
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const { hotelBanquetBaseUrl, apiPrefix } = API_CONFIG;

  // ✅ Track property click (fire-and-forget) - Uses correct _id
  const trackPropertyClick = async (propertyId) => {
    if (!propertyId) return;
    try {
      const url = `${hotelBanquetBaseUrl}/${apiPrefix}/property-click/BanquetHall/${propertyId}/click`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // Silent success - no need to handle response
    } catch (err) {
      console.error('Failed to track banquet hall click:', err);
      // Silent fail - don't disturb user
    }
  };

  // ✅ Fetch banquet properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const url = `${hotelBanquetBaseUrl}/${apiPrefix}/banquet-halls`;
        const response = await fetch(url);
        const text = await response.text();
        if (!response.ok) throw new Error(`Error: ${response.status} → ${text}`);

        const data = JSON.parse(text);
        const banquetProperties = (data.data?.banquetHalls || []).map(hall => ({
          id: hall._id,  // ← Critical Fix: Use MongoDB _id directly
          title: hall.name || "Untitled Banquet Hall",
          address: `${hall.city || "Unknown"}, ${hall.state || "Unknown"}`,
          imageUrls: hall.images || [],
          status: hall.isAvailable ? "AVAILABLE" : "UNAVAILABLE",
          reelCount: hall.reelCount || 0,
          price: hall.pricing?.event || 0,
          area: hall.area || 0,
          capacity: hall.capacity || 0,
          parking: hall.parking?.spaces || 0,
          sizePostfix: "Sq Ft",
          type: "Banquet Hall",
          owner: { name: hall.owner?.name || "Unknown" },
          createdAt: hall.createdAt || new Date().toISOString(),
          state: hall.state || "",
          district: hall.district || "",
          city: hall.city || "",
        }));

        setProperties(banquetProperties);
        setFilteredProperties(banquetProperties);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [hotelBanquetBaseUrl, apiPrefix]);

  // ✅ Fetch districts/states/cities
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get('https://api.nearprop.com/api/property-districts');
        const locationsData = res.data || [];

        setDistricts(locationsData);

        const uniqueStates = [...new Set(locationsData.map((d) => d.state).filter(Boolean))].sort();
        setStates(uniqueStates);

        const uniqueCities = [...new Set(locationsData.map((d) => d.city).filter(Boolean))].sort();
        setCities(uniqueCities);
      } catch (err) {
        console.error("Failed to load location data:", err.message);
      }
    };
    fetchLocations();
  }, []);

  // ✅ Update filtered districts when state changes
  useEffect(() => {
    if (selectedState) {
      const filtered = districts.filter((d) => d.state === selectedState);
      setFilteredDistricts(filtered);
      setSelectedDistrict("");
      setSelectedCity("");
    } else {
      setFilteredDistricts([]);
      setSelectedDistrict("");
      setSelectedCity("");
    }
  }, [selectedState, districts]);

  // ✅ Real-time filtering
  useEffect(() => {
    let filtered = [...properties];

    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterPriceMin) {
      filtered = filtered.filter((p) => Number(p.price) >= Number(filterPriceMin));
    }

    if (filterPriceMax) {
      filtered = filtered.filter((p) => Number(p.price) <= Number(filterPriceMax));
    }

    if (filterCapacity) {
      filtered = filtered.filter((p) => Number(p.capacity) >= Number(filterCapacity));
    }

    if (filterType) {
      filtered = filtered.filter(
        (p) => p.type?.toLowerCase() === filterType.toLowerCase()
      );
    }

    if (selectedState) {
      filtered = filtered.filter((p) => p.state === selectedState);
    }
    if (selectedDistrict) {
      filtered = filtered.filter((p) => p.district === selectedDistrict);
    }
    if (selectedCity) {
      filtered = filtered.filter((p) => p.city === selectedCity);
    }

    setFilteredProperties(filtered);
  }, [
    properties,
    searchQuery,
    filterPriceMin,
    filterPriceMax,
    filterCapacity,
    filterType,
    selectedState,
    selectedDistrict,
    selectedCity
  ]);

  // Search filtering for dropdowns
  const filteredStates = states.filter(state =>
    state.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredCities = cities.filter(city =>
    city.toLowerCase().includes(citySearch.toLowerCase())
  );

  if (loading) return <div className="p-4">Loading banquet halls…</div>;
  if (error) return <div className="p-4 text-danger">Error: {error}</div>;

  return (
    <div>
      <div
        className="nav justify-content-center p-5"
        style={{ fontSize: "40px", fontWeight: "700", color: 'darkcyan' }}
      >
        Banquet Halls
      </div>

      <div className="blog-main-container">
        {/* Left Section - Cards */}
        <div className="blog-left-section card-wrapper">
          {filteredProperties.length === 0 ? (
            <div className="no-properties text-center py-5">
              <h5>No banquet halls found matching your criteria.</h5>
            </div>
          ) : (
            filteredProperties.map((property) => (
              <Link
                to={`/HotelAndBanquetDetails/banquet/${property.id}`}
                key={property.id}
                className="property-card-link"
                onClick={() => trackPropertyClick(property.id)}  // ← Correct ID sent to API
              >
                <div
                  className="landing-property-card"
                  style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-8px)";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.15)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
                  }}
                >
                  <div
                    className="landing-image-container"
                    style={{
                      position: "relative",
                      height: "200px",
                      width: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={getValidImage(property.imageUrls, fallbackImages[1], hotelBanquetBaseUrl)}
                      alt={property.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s ease",
                      }}
                      onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                      onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                      onError={(e) => (e.target.src = fallbackImages[1])}
                    />
                    <div
                      className="landing-overlay-icons-left"
                      style={{
                        position: "absolute",
                        bottom: "12px",
                        left: "12px",
                        background: "rgba(0,0,0,0.7)",
                        color: "#ffffff",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                      }}
                    >
                      <div>
                        ₹
                        {property.price
                          ? Number(property.price).toLocaleString("en-IN")
                          : "N/A"}
                        <br />
                        <span style={{ fontSize: "0.75rem", fontWeight: "400" }}>
                          /event
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className="landing-property-info"
                    style={{
                      padding: "16px",
                      flexGrow: "1",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: "600",
                        color: "#1a202c",
                        margin: "0 0 10px",
                        lineHeight: "1.4",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: "2",
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {property.title || "Untitled Banquet Hall"}
                    </h2>

                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "#4a5568",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        marginBottom: "12px",
                      }}
                    >
                      <FontAwesomeIcon icon={faMapMarkerAlt} />
                      {property.address || "No Address"}
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        fontSize: "0.875rem",
                        color: "#4a5568",
                        marginBottom: "12px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FontAwesomeIcon icon={faUser} /> {property.capacity || 0} Guests
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FontAwesomeIcon icon={faCar} /> {property.parking || 0}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {property.area || "N/A"} {property.sizePostfix}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#3182ce",
                        marginBottom: "12px",
                        textTransform: "capitalize",
                      }}
                    >
                      <strong>{property.type || "Banquet Hall"}</strong>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "#718096",
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: "12px",
                        flexWrap: "wrap",
                        gap: "10px",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FontAwesomeIcon icon={faUser} />
                        {property.owner?.name || "Unknown"}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FontAwesomeIcon icon={faPaperclip} />
                        {property.createdAt
                          ? new Date(property.createdAt).toLocaleDateString()
                          : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Right Sidebar - Filters */}
        <div className="residential-blog-right-sidebar md:block">
          <aside className="residential">
            <div className="residential-filter">
              <h3 className="filter-title">Filter Banquet Halls</h3>

              {/* State Dropdown */}
              <div className="filter-group position-relative">
                <label className="filter-label">State</label>
                <div
                  className="filter-input d-flex align-items-center justify-content-between cursor-pointer"
                  onClick={() => setShowStateDropdown(!showStateDropdown)}
                >
                  <span>{selectedState || "Please select"}</span>
                  <span>▼</span>
                </div>
                {showStateDropdown && (
                  <div className="position-absolute w-100 bg-white border rounded shadow mt-1" style={{ zIndex: 1000, maxHeight: "300px", overflowY: "auto" }}>
                    <input
                      type="text"
                      placeholder="Search state..."
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      className="filter-input border-0 border-bottom"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      {filteredStates.length === 0 ? (
                        <div className="p-2 text-muted">No states found</div>
                      ) : (
                        filteredStates.map((s) => (
                          <div
                            key={s}
                            className="p-2 hover-bg-light cursor-pointer"
                            onClick={() => {
                              setSelectedState(s);
                              setShowStateDropdown(false);
                              setStateSearch("");
                            }}
                          >
                            {s}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* City Dropdown */}
              <div className="filter-group position-relative">
                <label className="filter-label">City</label>
                <div
                  className="filter-input d-flex align-items-center justify-content-between cursor-pointer"
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                >
                  <span>{selectedCity || "Please select"}</span>
                  <span>▼</span>
                </div>
                {showCityDropdown && (
                  <div className="position-absolute w-100 bg-white border rounded shadow mt-1" style={{ zIndex: 1000, maxHeight: "300px", overflowY: "auto" }}>
                    <input
                      type="text"
                      placeholder="Search city..."
                      value={citySearch}
                      onChange={(e) => setCitySearch(e.target.value)}
                      className="filter-input border-0 border-bottom"
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div>
                      {filteredCities.length === 0 ? (
                        <div className="p-2 text-muted">No cities found</div>
                      ) : (
                        filteredCities.map((c) => (
                          <div
                            key={c}
                            className="p-2 hover-bg-light cursor-pointer"
                            onClick={() => {
                              setSelectedCity(c);
                              setShowCityDropdown(false);
                              setCitySearch("");
                            }}
                          >
                            {c}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="filter-group">
                <label className="filter-label">Search by Name</label>
                <input
                  type="text"
                  placeholder="Enter banquet hall name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Min Price per Event (₹)</label>
                <input
                  type="number"
                  placeholder="e.g., 50000"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Max Price per Event (₹)</label>
                <input
                  type="number"
                  placeholder="e.g., 500000"
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Minimum Capacity (Guests)</label>
                <select
                  value={filterCapacity}
                  onChange={(e) => setFilterCapacity(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Any</option>
                  <option value="50">50+</option>
                  <option value="100">100+</option>
                  <option value="200">200+</option>
                  <option value="500">500+</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Property Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Types</option>
                  <option value="banquet hall">Banquet Hall</option>
                </select>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .hover-bg-light:hover { background-color: #f8f9fa; }
      `}</style>
    </div>
  );
}

export default Banquet;