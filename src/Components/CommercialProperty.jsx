import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faPaperclip,
  faComment,
  faMapMarkerAlt,
  faBuilding,
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";

const API_CONFIG = {
  baseUrl: "https://api.nearprop.com",
  apiPrefix: "api",
};

// Commercial property types
const COMMERCIAL_TYPES = ["commercial", "officespace"];

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
    commercial: "Commercial",
    officespace: "Office Space",
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
    <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
      <input
        type="text"
        value={isOpen ? searchTerm : selectedLabel}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        placeholder={selectedLabel || placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#1a202c',
        }}
        readOnly={false}
      />
      {isOpen && (
        <div style={{
          position: 'absolute',
          zIndex: 50,
          marginTop: '4px',
          width: '100%',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          maxHeight: '200px',
          overflow: 'auto',
        }}>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: '8px', color: '#718096', fontSize: '0.875rem' }}>
              No options found
            </div>
          ) : (
            filteredOptions.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange({ target: { value: option.value } });
                  setSearchTerm('');
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  borderBottom: '1px solid #e2e8f0',
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = '#ebf8ff'}
                onMouseLeave={(e) => e.target.style.backgroundColor = '#ffffff'}
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

function CommercialProperty() {
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
      toast.warn("Please log in to view commercial properties.", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        onClose: () => {
          navigate("/login", { state: { from: "/commercial" } });
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

  // Fetch properties and filter for commercial only
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
          const commercialProperties = (data.data || []).filter((property) =>
            COMMERCIAL_TYPES.includes(property.type?.toLowerCase())
          ).map((property) => ({
            ...property,
            latitude: property.latitude || null,
            longitude: property.longitude || null,
          }));
          setProperties(commercialProperties);
          setFilteredProperties(commercialProperties);
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

  if (loading) return <div style={{ fontSize: '1rem', color: '#4a5568', textAlign: 'center', padding: '20px' }}>Loading commercial properties…</div>;
  if (error) return <div style={{ fontSize: '1rem', color: '#4a5568', textAlign: 'center', padding: '20px' }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      <ToastContainer />
      {locationError && (
        <div style={{ fontSize: '1rem', color: '#4a5568', textAlign: 'center', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {locationError}
          <button
            style={{ marginLeft: '10px', padding: '2px 10px', background: '#0891b2', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a202c', marginBottom: '20px', textAlign: 'center' }}>
        Commercial Properties
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
        {/* Left Section - Property Cards */}
        <div style={{ flex: '3', minHeight: '600px' }}>
          {filteredProperties.length === 0 ? (
            <div style={{ fontSize: '1rem', color: '#4a5568', textAlign: 'center', padding: '20px' }}>
              No commercial properties found matching your criteria.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {filteredProperties.map((property) => (
                <Link
                  to={`/propertySell/${property.id}`}
                  key={property.id || property._id}
                  style={{ textDecoration: 'none' }}
                >
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      width: '100%',
                      height: '420px',
                      maxWidth: '360px',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-8px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    <div style={{ position: 'relative', height: '200px', width: '100%', overflow: 'hidden' }}>
                      <img
                        src={property.imageUrls?.[0] || "https://via.placeholder.com/300x200?text=Image+Not+Found"}
                        alt={property.title || "Property"}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                        onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
                        onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                        onError={(e) => {
                          e.target.src = "https://via.placeholder.com/300x200?text=Image+Not+Found";
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          color: '#ffffff',
                          textTransform: 'capitalize',
                          zIndex: '10',
                          background: property.status?.toLowerCase() === 'sold' ? '#e53e3e' : '#3182ce',
                        }}
                      >
                        {property.status?.replace("_", " ") || "For Sale"}
                      </span>
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '12px',
                          left: '12px',
                          background: 'rgba(0,0,0,0.7)',
                          color: '#ffffff',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                        }}
                      >
                        <div>
                          ₹{property.price ? Number(property.price).toLocaleString("en-IN") : "N/A"}
                          <br />
                          <span style={{ fontSize: '0.75rem', fontWeight: '400' }}>
                            ₹{property.price && property.area
                              ? Math.round(Number(property.price) / Number(property.area))
                              : "N/A"} /Sq Ft
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ padding: '16px', flexGrow: '1', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <h2
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: '600',
                          color: '#1a202c',
                          margin: '0 0 10px',
                          lineHeight: '1.4',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: '2',
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {property.title || "Untitled Property"}
                      </h2>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          color: '#4a5568',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          marginBottom: '12px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FontAwesomeIcon icon={faMapMarkerAlt} />
                          {property.address || "No Address"}
                        </span>
                        <span style={{ fontWeight: 'bold', color: '#0e7490' }}>
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
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: '#4a5568', marginBottom: '12px' }}>
                        <span>
                          {property.area || "N/A"} {property.sizePostfix || "Sq Ft"}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          color: '#3182ce',
                          marginBottom: '12px',
                          textTransform: 'capitalize',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <FontAwesomeIcon icon={faBuilding} />
                        <strong>{formatPropertyType(property.type)}</strong>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          color: '#718096',
                          borderTop: '1px solid #e2e8f0',
                          paddingTop: '12px',
                          flexWrap: 'wrap',
                          gap: '10px',
                        }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FontAwesomeIcon icon={faUser} /> {property.owner?.name || "Unknown"}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FontAwesomeIcon icon={faPaperclip} />{" "}
                          {property.createdAt
                            ? new Date(property.createdAt).toLocaleDateString()
                            : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{ flex: '1', minWidth: '300px', maxWidth: '360px', minHeight: '600px' }}>
          <aside style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)', height: '100%' }}>
            <div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1a202c', marginBottom: '20px' }}>
                Filter Commercial Properties
              </h3>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '8px' }}>
                  Search by Title
                </label>
                <input
                  type="text"
                  placeholder="Enter property title"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#1a202c' }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '8px' }}>
                  State
                </label>
                <SearchableDropdown
                  options={states.map(s => ({ value: s, label: s }))}
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  placeholder="All States"
                />
              </div>

              {/* <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '8px' }}>
                  District
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#1a202c' }}
                >
                  <option value="">All Districts</option>
                  {filteredDistricts.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district}
                    </option>
                  ))}
                </select>
              </div> */}

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '8px' }}>
                  City
                </label>
                <SearchableDropdown
                  options={cities.map(c => ({ value: c, label: c }))}
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  placeholder="All Cities"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '8px' }}>
                  Price Range (₹)
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={filterPriceMin}
                    onChange={(e) => setFilterPriceMin(e.target.value)}
                    style={{ flex: '1', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#1a202c' }}
                  />
                  <span style={{ fontSize: '0.875rem', color: '#4a5568' }}>to</span>
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={filterPriceMax}
                    onChange={(e) => setFilterPriceMax(e.target.value)}
                    style={{ flex: '1', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#1a202c' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '8px' }}>
                  Property Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#1a202c' }}
                >
                  <option value="">All Commercial Types</option>
                  <option value="commercial">Commercial</option>
                  <option value="officespace">Office Space</option>
                </select>
              </div>

              <button
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#3182ce',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.3s ease',
                }}
                onClick={applyFilters}
                onMouseEnter={(e) => (e.target.style.background = '#2b6cb0')}
                onMouseLeave={(e) => (e.target.style.background = '#3182ce')}
              >
                Apply Filters
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default CommercialProperty;