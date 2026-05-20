import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBed,
  faShower,
  faCar,
  faUser,
  faPaperclip,
  faComment,
  faMapMarkerAlt,
  faHome,
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "./Properties.css";

const API_CONFIG = {
  baseUrl: "https://api.nearprop.com",
  apiPrefix: "api",
};

// Residential property types
const RESIDENTIAL_TYPES = [
  "multi_family_home",
  "single_family_home",
  "villa",
  "apartment",
  "house",
];

// Get auth token from localStorage
const getToken = () => {
  try {
    const authData = localStorage.getItem("authData");
    if (!authData) {
      console.error("No authData found in localStorage");
      return null;
    }
    const parsedData = JSON.parse(authData);
    return parsedData.token || null;
  } catch (err) {
    console.error("Error parsing authData:", err.message);
    return null;
  }
};

// Get user location from localStorage or Geolocation API
const getUserLocation = () => {
  return new Promise((resolve) => {
    try {
      const locationData = localStorage.getItem("myLocation");
      if (locationData) {
        const parsedLocation = JSON.parse(locationData);
        if (parsedLocation.latitude && parsedLocation.longitude) {
          console.log("User location retrieved from localStorage:", parsedLocation);
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
      console.error("Geolocation not supported by browser");
      return resolve(null);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        localStorage.setItem("myLocation", JSON.stringify(location));
        console.log("User location fetched from Geolocation API:", location);
        resolve(location);
      },
      (err) => {
        console.error("Geolocation error:", err.message, "Code:", err.code);
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

// Calculate distance between two coordinates
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format property type for display
const formatPropertyType = (type) => {
  const typeMap = {
    multi_family_home: "Multi Family Home",
    single_family_home: "Single Family Home",
    villa: "Villa",
    apartment: "Apartment",
    house: "House",
  };
  return typeMap[type?.toLowerCase()] || type || "Unknown";
};

// Searchable Dropdown Component (added for State & City)
const SearchableDropdown = ({ options, value, onChange, placeholder, disabled = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedLabel = options.find(opt => opt.value === value)?.label || '';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      <input
        type="text"
        value={isOpen ? searchTerm : selectedLabel}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        placeholder={selectedLabel || placeholder}
        disabled={disabled}
        className="filter-input"
        readOnly={false}
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-gray-500 text-sm">No options found</div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange({ target: { value: option.value } });
                  setSearchTerm('');
                  setIsOpen(false);
                }}
                className="p-2 hover:bg-blue-100 cursor-pointer text-sm"
              >
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

function Residential() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const navigate = useNavigate();

  // Sidebar filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState("");
  const [filterType, setFilterType] = useState("");

  // Location filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const { baseUrl, apiPrefix } = API_CONFIG;

  // Check authentication
  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.warn("Please log in to view residential properties.", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        onClose: () => {
          navigate("/login", { state: { from: "/residential" } });
        },
      });
    }
  }, [navigate]);

  // Fetch user location
  useEffect(() => {
    getUserLocation().then((loc) => {
      if (loc) {
        setLocation(loc);
        setLocationError(null);
      } else {
        setLocationError("Unable to fetch location. Distances unavailable.");
      }
    });
  }, []);

  // Fetch properties and filter for residential only
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const url = `${baseUrl}/${apiPrefix}/properties`;
        console.log("Fetching properties from:", url);

        const response = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const text = await response.text();
        if (!response.ok) throw new Error(`Error: ${response.status} → ${text}`);

        const data = JSON.parse(text);
        console.log("Properties API response:", data);

        if (data.success) {
          const residentialProperties = (data.data || []).filter((property) =>
            RESIDENTIAL_TYPES.includes(property.type?.toLowerCase())
          ).map((property) => ({
            ...property,
            latitude: property.latitude || null,
            longitude: property.longitude || null,
          }));
          setProperties(residentialProperties);
          setFilteredProperties(residentialProperties);
        } else {
          throw new Error(data.message || "API error");
        }
      } catch (err) {
        console.error("Fetch properties error:", err.message);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [baseUrl, apiPrefix]);

  // Fetch districts/states/cities
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const res = await axios.get(`${baseUrl}/${apiPrefix}/property-districts`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        console.log("Districts API response:", res.data);

        const districtsData = res.data || [];
        setDistricts(districtsData);

        const uniqueStates = [...new Set(districtsData.map((d) => d.state))].sort();
        setStates(uniqueStates);

        const uniqueCities = [...new Set(districtsData.map((d) => d.city).filter(Boolean))].sort();
        setCities(uniqueCities);
      } catch (err) {
        console.error("Failed to load location data:", err.message);
      }
    };
    fetchDistricts();
  }, [baseUrl, apiPrefix]);

  // Update filtered districts and cities
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

  // Apply Filters
  const applyFilters = () => {
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

    if (filterBedrooms) {
      filtered = filtered.filter((p) => Number(p.bedrooms) >= Number(filterBedrooms));
    }

    if (filterType) {
      filtered = filtered.filter(
        (p) => p.type?.toLowerCase() === filterType.toLowerCase()
      );
    }

    if (selectedState) {
      filtered = filtered.filter((p) => p.state?.toLowerCase() === selectedState.toLowerCase());
    }
    if (selectedDistrict) {
      filtered = filtered.filter((p) => p.districtName?.toLowerCase() === selectedDistrict.toLowerCase());
    }
    if (selectedCity) {
      filtered = filtered.filter((p) => p.city?.toLowerCase() === selectedCity.toLowerCase());
    }

    console.log("Filtered properties:", filtered);
    setFilteredProperties(filtered);
  };

  // Do not render if not authenticated
  const token = getToken();
  if (!token) {
    return <ToastContainer />;
  }

  if (loading) return <div className="loading">Loading residential properties…</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div>
      <ToastContainer />
      {locationError && (
        <div className="warning">
          {locationError}
          <button
            className="ml-2 px-2 py-1 bg-cyan-600 text-white rounded"
            onClick={() => {
              getUserLocation().then((loc) => {
                if (loc) {
                  setLocation(loc);
                  setLocationError(null);
                } else {
                  setLocationError("Unable to fetch location. Distances unavailable.");
                }
              });
            }}
          >
            Retry Location
          </button>
        </div>
      )}
      <div className="properties-title">Residential Properties</div>

      <div className="blog-main-container">
        {/* Left Section */}
        <div className="blog-left-section card-wrapper">
          {filteredProperties.length === 0 ? (
            <div className="no-properties">No residential properties found matching your criteria.</div>
          ) : (
            filteredProperties.map((property) => (
              <Link
                to={`/propertySell/${property.id}`}
                key={property.id || property._id}
                className="property-card-link"
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
                      src={property.imageUrls?.[0] || "https://via.placeholder.com/300x200?text=No+Image"}
                      alt={property.title || "Property"}
                      className="landing-property-image"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transition: "transform 0.3s ease",
                      }}
                      onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                      onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/300x200?text=No+Image";
                      }}
                    />
                    <span
                      className={`landing-label landing-${
                        property.status
                          ? property.status.toLowerCase().replace("_", "-")
                          : "for-sale"
                      }`}
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "bold",
                        zIndex: "10",
                        color: "#ffffff",
                        textTransform: "capitalize",
                        wordBreak: "break-word",
                      }}
                    >
                      {property.status?.replace("_", " ") || "For Sale"}
                    </span>
                    <div
                      className="landing-overlay-icons-right"
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: "rgba(0,0,0,0.7)",
                        color: "#fff",
                        fontSize: "12px",
                        zIndex: "10",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        wordBreak: "break-word",
                      }}
                    >
                      {/* <FontAwesomeIcon icon={faComment} /> {property.reelCount || 0} */}
                    </div>
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
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        wordBreak: "break-word",
                      }}
                    >
                      <div>
                        ₹{property.price ? Number(property.price).toLocaleString("en-IN") : "N/A"}
                        <br />
                        <span style={{ fontSize: "0.75rem", fontWeight: "400" }}>
                          ₹{property.price && property.area
                            ? Math.round(Number(property.price) / Number(property.area))
                            : "N/A"} /Sq Ft
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
                      wordBreak: "break-word",
                    }}
                  >
                    <h2
                      className="landing"
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
                        wordBreak: "break-word",
                      }}
                    >
                      {property.title || "Untitled Property"}
                    </h2>
                    <div
                      className="landing-location"
                      style={{
                        fontSize: "0.875rem",
                        color: "#4a5568",
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "0",
                        marginBottom: "12px",
                        flexWrap: "wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          whiteSpace: "nowrap",
                          marginRight: "8px", /* Added gap between icon and address */
                        }}
                      >
                        <FontAwesomeIcon icon={faMapMarkerAlt} />
                        {property.address || "No Address"}
                      </span>
                      <span
                        className="distance-text"
                        style={{
                          fontWeight: "bold",
                          color: "#0e7490",
                          marginLeft: "8px",
                          wordBreak: "break-word",
                        }}
                      >
                        {location && property.latitude && property.longitude
                          ? ` - ${getDistanceFromLatLonInKm(
                              location.latitude,
                              location.longitude,
                              property.latitude,
                              property.longitude
                            ).toFixed(2)} km away`
                          : " - Distance unavailable"}
                      </span>
                    </div>
                    <div
                      className="landing-details"
                      style={{
                        display: "flex",
                        gap: "16px",
                        fontSize: "0.875rem",
                        color: "#4a5568",
                        marginBottom: "12px",
                        flexWrap: "wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FontAwesomeIcon icon={faBed} /> {property.bedrooms || 0}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FontAwesomeIcon icon={faShower} /> {property.bathrooms || 0}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FontAwesomeIcon icon={faCar} /> {property.garages || 0}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        {property.area || "N/A"} {property.sizePostfix || "Sq Ft"}
                      </span>
                    </div>
                    <div
                      className="landing-type text-dark"
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#3182ce",
                        marginBottom: "12px",
                        textTransform: "capitalize",
                        display: "flex",
                        alignItems: "center",
                        wordBreak: "break-word",
                      }}
                    >
                      <FontAwesomeIcon icon={faHome} style={{ marginRight: "8px" }} />
                      <strong>{formatPropertyType(property.type)}</strong>
                    </div>
                    <div
                      className="landing-footer"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "#718096",
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: "12px",
                        flexWrap: "wrap",
                        gap: "10px",
                        wordBreak: "break-word",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FontAwesomeIcon icon={faUser} /> {property.owner?.name || "Unknown"}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <FontAwesomeIcon icon={faPaperclip} />{" "}
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

        {/* Right Sidebar */}
        <div className="residential-blog-right-sidebar">
          <aside className="residential">
            <div className="residential-filter">
              <h3 className="filter-title">Filter Residential Properties</h3>

              <div className="filter-group">
                <label className="filter-label">Search by Title</label>
                <input
                  type="text"
                  placeholder="Enter property title"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">State</label>
                <SearchableDropdown
                  options={states.map(s => ({ value: s, label: s }))}
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  placeholder="All States"
                />
              </div>

              {/* <div className="filter-group">
                <label className="filter-label">District</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Districts</option>
                  {filteredDistricts.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district}
                    </option>
                  ))}
                </select>
              </div> */}

              <div className="filter-group">
                <label className="filter-label">City</label>
                <SearchableDropdown
                  options={cities.map(c => ({ value: c, label: c }))}
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  placeholder="All Cities"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Price Range (₹)</label>
                <div className="price-range-inputs">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={filterPriceMin}
                    onChange={(e) => setFilterPriceMin(e.target.value)}
                    className="filter-input price-input"
                  />
                  <span className="price-range-divider">to</span>
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={filterPriceMax}
                    onChange={(e) => setFilterPriceMax(e.target.value)}
                    className="filter-input price-input"
                  />
                </div>
              </div>

              <div className="filter-group">
                <label className="filter-label">Minimum Bedrooms</label>
                <select
                  value={filterBedrooms}
                  onChange={(e) => setFilterBedrooms(e.target.value)}
                  className="filter-select"
                >
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </div>

              <div className="filter-group">
                <label className="filter-label">Property Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Residential Types</option>
                  <option value="multi_family_home">Multi Family Home</option>
                  <option value="single_family_home">Single Family Home</option>
                  {/* <option value="condo">Condo</option> */}
                  <option value="villa">Villa</option>
                  <option value="apartment">Apartment</option>
                  <option value="house">House</option>
                </select>
              </div>

              <button className="filter-button" onClick={applyFilters}>
                Apply Filters
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Residential;