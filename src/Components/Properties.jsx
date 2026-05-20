import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBed,
  faShower,
  faCar,
  faUser,
  faPaperclip,
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

// 🔹 Calculate distance using Haversine formula
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
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

function Properties() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const navigate = useNavigate();
  const locationHook = useLocation();

  // Sidebar filters
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // Location filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Searchable dropdown states
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const { baseUrl, apiPrefix } = API_CONFIG;

  // Extract type from URL query parameter
  useEffect(() => {
    const queryParams = new URLSearchParams(locationHook.search);
    const type = queryParams.get('type') || '';
    if (type) {
      setFilterType(type); // Set initial filter type from URL
    }
  }, [locationHook]);

  // Check authentication and show toast if not logged in
  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.warn("Please log in to view properties.", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        onClose: () => {
          navigate("/login", { state: { from: "/properties" } });
        },
      });
    }
  }, [navigate]);

  // ✅ Get user location
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const locationData = localStorage.getItem("myLocation");
        if (locationData) {
          const parsedLocation = JSON.parse(locationData);
          if (parsedLocation.latitude && parsedLocation.longitude) {
            setLocation(parsedLocation);
            setLocationError(null);
            return;
          }
        }

        if (!navigator.geolocation) {
          setLocationError("Geolocation not supported by browser");
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const location = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            };
            localStorage.setItem("myLocation", JSON.stringify(location));
            setLocation(location);
            setLocationError(null);
          },
          (err) => {
            setLocationError(`Geolocation error: ${err.message}`);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000,
          }
        );
      } catch (err) {
        setLocationError("Error fetching location");
      }
    };

    getUserLocation();
  }, []);

  // Fetch properties
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
          const formattedProperties = (data.data || []).map((property) => ({
            ...property,
            latitude: property.latitude || null,
            longitude: property.longitude || null,
          }));
          setProperties(formattedProperties);
          setFilteredProperties(formattedProperties);
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
      } catch (err) {
        console.error("Failed to load location data:", err.message);
      }
    };
    fetchDistricts();
  }, [baseUrl, apiPrefix]);

  // Update filtered districts and cities when state changes
  useEffect(() => {
    if (selectedState) {
      const stateData = districts.filter((d) => d.state === selectedState);
      const uniqueDistricts = [...new Set(stateData.map((d) => d.name))].sort();
      setFilteredDistricts(uniqueDistricts);

      const uniqueCities = [...new Set(stateData.map((d) => d.city).filter(Boolean))].sort();
      setFilteredCities(uniqueCities);

      setSelectedDistrict("");
      setSelectedCity("");
    } else {
      setFilteredDistricts([]);
      setFilteredCities([]);
      setSelectedDistrict("");
      setSelectedCity("");
    }
  }, [selectedState, districts]);

  // Update filtered cities when district changes
  useEffect(() => {
    if (selectedDistrict && selectedState) {
      const districtData = districts.filter(
        (d) => d.state === selectedState && d.name === selectedDistrict
      );
      const uniqueCities = [...new Set(districtData.map((d) => d.city).filter(Boolean))].sort();
      setFilteredCities(uniqueCities);
      setSelectedCity("");
    } else if (selectedState) {
      const stateData = districts.filter((d) => d.state === selectedState);
      const uniqueCities = [...new Set(stateData.map((d) => d.city).filter(Boolean))].sort();
      setFilteredCities(uniqueCities);
    }
  }, [selectedDistrict, selectedState, districts]);

  // ✅ Apply Filters and Sort by Distance
  useEffect(() => {
    let filtered = [...properties];

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

    if (filterStatus !== "All") {
      const statusKey = filterStatus.toUpperCase().replace(" ", "_");
      filtered = filtered.filter((p) => p.status === statusKey);
    }

    if (selectedState) {
      filtered = filtered.filter(
        (p) => p.state?.toLowerCase() === selectedState.toLowerCase()
      );
    }
    if (selectedDistrict) {
      filtered = filtered.filter(
        (p) => p.districtName?.toLowerCase() === selectedDistrict.toLowerCase()
      );
    }
    if (selectedCity) {
      filtered = filtered.filter(
        (p) => p.city?.toLowerCase() === selectedCity.toLowerCase()
      );
    }

    // Sort by distance if user location is available
    if (location && location.latitude && location.longitude) {
      filtered = filtered.map(property => ({
        ...property,
        distance: property.latitude && property.longitude
          ? getDistanceFromLatLonInKm(
              location.latitude,
              location.longitude,
              property.latitude,
              property.longitude
            )
          : null
      }));

      filtered.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    console.log("Filtered properties:", filtered);
    setFilteredProperties(filtered);
  }, [properties, filterPriceMin, filterPriceMax, filterBedrooms, filterType, filterStatus, selectedState, selectedDistrict, selectedCity, location]);

  // Filter states and cities for search
  const filteredStates = states.filter(s => s.toLowerCase().includes(stateSearch.toLowerCase()));
  const filteredCitiesList = filteredCities.filter(c => c.toLowerCase().includes(citySearch.toLowerCase()));

  // Do not render properties if not authenticated
  const token = getToken();
  if (!token) {
    return <ToastContainer />;
  }

  if (loading) return <div className="p-4 loading">Loading properties…</div>;
  if (error) return <div className="p-4 error">Error: {error}</div>;

  return (
    <div>
      <ToastContainer />
      {locationError && (
        <div className="p-4 warning">
          {locationError}
          <button
            className="ml-2 px-2 py-1 bg-cyan-600 text-white rounded"
            onClick={() => {
              const getUserLocation = async () => {
                try {
                  const locationData = localStorage.getItem("myLocation");
                  if (locationData) {
                    const parsedLocation = JSON.parse(locationData);
                    if (parsedLocation.latitude && parsedLocation.longitude) {
                      setLocation(parsedLocation);
                      setLocationError(null);
                      return;
                    }
                  }
        
                  if (!navigator.geolocation) {
                    setLocationError("Geolocation not supported by browser");
                    return;
                  }
        
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                      };
                      localStorage.setItem("myLocation", JSON.stringify(location));
                      setLocation(location);
                      setLocationError(null);
                    },
                    (err) => {
                      setLocationError(`Geolocation error: ${err.message}`);
                    },
                    {
                      enableHighAccuracy: true,
                      timeout: 10000,
                      maximumAge: 300000,
                    }
                  );
                } catch (err) {
                  setLocationError("Error fetching location");
                }
              };
              getUserLocation();
            }}
          >
            Retry Location
          </button>
        </div>
      )}
      <div className="properties-title">{filterType ? `${filterType.replace('_', ' ').toUpperCase()} Properties` : 'Properties'}</div>

      <div className="blog-main-container">
        {/* Left Section */}
        <div className="blog-left-section card-wrapper">
          {filteredProperties.length === 0 ? (
            <div className="no-properties">No properties found matching your criteria.</div>
          ) : (
            filteredProperties.map((property) => {
              const propertyTypeLower = property?.type.toLowerCase();
              const hideResidentialDetails = propertyTypeLower === "plot" || propertyTypeLower === "commercial";
              return (
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
                      <div>
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
                              marginRight: "8px",
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
                            {property.distance !== null
                              ? ` - ${property.distance} km away`
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
                          {!hideResidentialDetails && (
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <FontAwesomeIcon icon={faBed} /> {property.bedrooms || 0}
                            </span>
                          )}
                          {!hideResidentialDetails && (
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <FontAwesomeIcon icon={faShower} /> {property.bathrooms || 0}
                            </span>
                          )}
                          {!hideResidentialDetails && (
                            <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <FontAwesomeIcon icon={faCar} /> {property.garages || 0}
                            </span>
                          )}
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
                          <strong>{property.type || "Unknown"}</strong>
                        </div>
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
              );
            })
          )}
        </div>

        {/* Right Sidebar */}
        <div className="residential-blog-right-sidebar">
          <aside className="residential">
            <div className="residential-filter">
              <h3 className="filter-title">Filter Properties</h3>

              {/* State - Searchable Dropdown */}
              <div className="filter-group position-relative">
                <label className="filter-label">State</label>
                <div
                  className="filter-select d-flex align-items-center justify-content-between cursor-pointer"
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

              {/* City - Searchable Dropdown */}
              <div className="filter-group position-relative">
                <label className="filter-label">City</label>
                <div
                  className="filter-select d-flex align-items-center justify-content-between cursor-pointer"
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
                  style={{ opacity: !selectedState ? 0.6 : 1 }}
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
                      {filteredCitiesList.length === 0 ? (
                        <div className="p-2 text-muted">No cities found</div>
                      ) : (
                        filteredCitiesList.map((c) => (
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
                <label className="filter-label">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All</option>
                  <option value="For Rent">For Rent</option>
                  <option value="For Sale">For Sale</option>
                </select>
              </div>

              <div className="filter-group price-range-group">
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
                  <option value="">All Types</option>
                  <option value="villa">Villa</option>
                  <option value="multi_family_home">Multi Family Home</option>
                  <option value="single_family_home">Single Family Home</option>
                  <option value="commercial">Commercial</option>
                  <option value="house">House</option>
                  <option value="plot">Plot</option>
                  <option value="apartment">Apartment</option>
                </select>
              </div>

              <button className="filter-button" onClick={() => {}}>
                Apply Filters
              </button>
            </div>
          </aside>
        </div>
      </div>

      {/* Additional CSS */}
      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .hover-bg-light:hover { background-color: #f8f9fa; }
      `}</style>
    </div>
  );
}

export default Properties;