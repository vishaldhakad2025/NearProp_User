import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBed,
  faShower,
  faCar,
  faUser,
  faPaperclip,
  faMapMarkerAlt,
} from "@fortawesome/free-solid-svg-icons";
import axios from "axios";

// 🔹 Local fallback images
import Apartment from '../assets/A-1.avif';
import Apartment2 from '../assets/c-2.avif';
import Apartment3 from '../assets/apartment.avif';
import Apartment4 from '../assets/studio.jpg';
import Apartment6 from '../assets/penthouse.avif';
import Apartment7 from '../assets/villa.avif';
import AuthError from "../Components/AuthError";

const fallbackImages = [Apartment, Apartment2, Apartment3, Apartment4, Apartment6, Apartment7];

const API_CONFIG = {
  baseUrl: "https://api.nearprop.com",
  apiPrefix: "api",
};

// 🔹 Helper function to pick first valid image
const getValidImage = (images, fallback, baseUrl = "") => {
  if (!Array.isArray(images) || images.length === 0) return fallback;
  const validImg = images.find(
    img => img && img.trim() !== "" && !img.toLowerCase().includes("white")
  );
  return validImg ? (validImg.startsWith("http") ? validImg : `${baseUrl}${validImg}`) : fallback;
};

// ✅ Get auth token from localStorage
const getToken = () => {
  try {
    const authData = localStorage.getItem("authData");
    if (!authData) return null;
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

// Searchable Dropdown Component
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
          width: "100%",
          padding: "8px",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          fontSize: "0.875rem",
        }}
        readOnly={false}
      />
      {isOpen && (
        <div style={{
          position: "absolute",
          zIndex: 50,
          marginTop: "4px",
          width: "100%",
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "6px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          maxHeight: "200px",
          overflow: "auto",
        }}>
          {filteredOptions.length === 0 ? (
            <div style={{ padding: "8px", color: "#718096", fontSize: "0.875rem" }}>
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
                  padding: "8px",
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  borderBottom: "1px solid #e2e8f0",
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = "#ebf8ff"}
                onMouseLeave={(e) => e.target.style.backgroundColor = "#ffffff"}
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

function ForRent() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [showAuthError, setShowAuthError] = useState(false);

  // Sidebar filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState("");
  const [filterType, setFilterType] = useState("");

  // 🔹 Location filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const { baseUrl, apiPrefix } = API_CONFIG;

  // Helper to check if type is residential (applicable for bedrooms filter and display)
  const isResidentialType = (type) => {
    if (!type) return true; // Default: show if no type selected
    const lowerType = type.toLowerCase();
    const nonResidential = ["plot", "shop", "commercial"];
    return !nonResidential.includes(lowerType);
  };

  // ✅ Fetch For Rent properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Authentication failed. Please log in again.");

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
          const forRentProperties = (data.data || [])
            .filter(property => property.status?.toLowerCase() === "for_rent")
            .map(property => ({
              id: property.id || property._id,
              title: property.title || "Untitled Property",
              address: `${property.city || "Unknown"}, ${property.state || "Unknown"}`,
              imageUrls: property.imageUrls || [],
              status: "FOR_RENT",
              reelCount: property.reelCount || 0,
              price: property.price || 0,
              area: property.area || 0,
              bedrooms: property.bedrooms || 0,
              bathrooms: property.bathrooms || 0,
              garages: property.garages || 0,
              sizePostfix: "Sq Ft",
              type: property.type || "Unknown",
              owner: { name: property.owner?.name || "Unknown" },
              createdAt: property.createdAt || new Date().toISOString(),
              state: property.state || "",
              districtName: property.districtName || property.district || "",
              city: property.city || "",
              latitude: property.latitude || null,
              longitude: property.longitude || null,
            }));

          setProperties(forRentProperties);
          setFilteredProperties(forRentProperties);
        } else {
          throw new Error(data.message || "API error");
        }
      } catch (err) {
        console.error("Fetch properties error:", err.message);

        if (err.message === "Authentication failed. Please log in again.") {
          setShowAuthError(true);
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [baseUrl, apiPrefix]);

  // ✅ Fetch districts/states/cities
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const token = getToken();
        if (!token) {
          console.error("No token found for fetching districts.");
          return;
        }

        const res = await axios.get(
          `${baseUrl}/${apiPrefix}/property-districts`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        console.log("Districts API response:", res.data);

        const districtsData = res.data || [];
        setDistricts(districtsData);

        const uniqueStates = [...new Set(districtsData.map((d) => d.state))].sort();
        setStates(uniqueStates);

        const uniqueCities = [
          ...new Set(districtsData.map((d) => d.city).filter(Boolean)),
        ].sort();
        setFilteredCities(uniqueCities);
      } catch (err) {
        console.error("Failed to load location data:", err.message);
      }
    };
    fetchDistricts();
  }, [baseUrl, apiPrefix]);

  // ✅ Update filtered districts and cities when state changes
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

  // ✅ Update filtered cities when district changes
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

  // ✅ Apply Filters and Sort by Distance
  const applyFilters = () => {
    let filtered = [...properties];

    if (searchQuery.trim()) {
      filtered = filtered.filter((p) =>
        p.title?.toLowerCase().includes(searchQuery.trim().toLowerCase())
      );
    }

    if (filterPriceMin && !isNaN(filterPriceMin)) {
      filtered = filtered.filter((p) => Number(p.price) >= Number(filterPriceMin));
    }

    if (filterPriceMax && !isNaN(filterPriceMax)) {
      filtered = filtered.filter((p) => Number(p.price) <= Number(filterPriceMax));
    }

    // Only apply bedrooms filter if current selected type is residential
    if (filterBedrooms && !isNaN(filterBedrooms) && isResidentialType(filterType)) {
      filtered = filtered.filter((p) => Number(p.bedrooms) >= Number(filterBedrooms));
    }

    if (filterType) {
      filtered = filtered.filter(
        (p) => p.type?.toLowerCase() === filterType.toLowerCase()
      );
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
          : null,
      }));

      filtered.sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
    }

    setFilteredProperties(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [
    properties,
    searchQuery,
    filterPriceMin,
    filterPriceMax,
    filterBedrooms,
    filterType,
    selectedState,
    selectedDistrict,
    selectedCity,
    location,
  ]);

  if (loading) return <div style={{ padding: "20px" }}>Loading properties for rent…</div>;
  if (error && !showAuthError)
    return <div className="p-4 text-danger">Error: {error}</div>;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "20px",
          fontSize: "30px",
          fontWeight: "500",
          color: "darkcyan",
        }}
      >
        Properties For Rent
      </div>

      {locationError && (
        <div
          style={{
            padding: "20px",
            color: "#ffc107",
          }}
        >
          {locationError}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "20px",
          padding: "20px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        {/* Left Section - Properties */}
        <div
          style={{
            flex: "3",
            minWidth: "280px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {filteredProperties.length === 0 && (
              <div style={{ padding: "20px", color: "#4a5568" }}>
                No properties match your filters. Try adjusting or resetting the filters.
              </div>
            )}
            {filteredProperties.map((property) => (
              <Link
                to={`/propertySell/${property.id}`}
                key={property.id}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: "12px",
                    overflow: "hidden",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                    transition: "transform 0.3s ease, box-shadow 0.3s ease",
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
                    style={{
                      position: "relative",
                      height: "200px",
                      width: "100%",
                    }}
                  >
                    <img
                      src={getValidImage(property.imageUrls, fallbackImages[0], baseUrl)}
                      alt={property.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => (e.target.src = fallbackImages[0])}
                    />
                    <span
                      style={{
                        position: "absolute",
                        top: "8px",
                        left: "8px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontWeight: "bold",
                        color: "#ffffff",
                        zIndex: "10",
                        backgroundColor: "#3182ce",
                      }}
                    >
                      For Rent
                    </span>
                    <div
                      style={{
                        position: "absolute",
                        bottom: "8px",
                        left: "8px",
                        background: "rgba(0, 0, 0, 0.7)",
                        color: "#ffffff",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "0.875rem",
                        fontWeight: "600",
                      }}
                    >
                      <div>
                        ₹
                        {property.price
                          ? Number(property.price).toLocaleString("en-IN")
                          : "N/A"}
                        <br />
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "400",
                          }}
                        >
                          ₹
                          {property.price && property.area
                            ? Math.round(
                                Number(property.price) / Number(property.area)
                              )
                            : "N/A"}
                          /Sq Ft
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      padding: "15px",
                      minHeight: "250px",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: "600",
                        color: "#1a202c",
                        margin: "0 0 10px",
                        lineHeight: "1.5",
                        overflow: "visible",
                        wordBreak: "break-word",
                      }}
                    >
                      {property.title || "Untitled Property"}
                    </h2>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        color: "#4a5568",
                        marginBottom: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <FontAwesomeIcon icon={faMapMarkerAlt} />{" "}
                      {property.address || "No Address"}
                    </div>

                    {/* Conditional rendering of bedrooms/bathrooms/garages */}
                    {isResidentialType(property.type) && (
                      <div
                        style={{
                          display: "flex",
                          gap: "12px",
                          fontSize: "0.875rem",
                          color: "#4a5568",
                          marginBottom: "10px",
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <FontAwesomeIcon icon={faBed} /> {property.bedrooms || 0}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <FontAwesomeIcon icon={faShower} />{" "}
                          {property.bathrooms || 0}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <FontAwesomeIcon icon={faCar} /> {property.garages || 0}
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {property.area || "N/A"} {property.sizePostfix || "Sq Ft"}
                        </span>
                      </div>
                    )}

                    {!isResidentialType(property.type) && (
                      <div
                        style={{
                          fontSize: "0.875rem",
                          color: "#4a5568",
                          marginBottom: "10px",
                        }}
                      >
                        {property.area || "N/A"} {property.sizePostfix || "Sq Ft"}
                      </div>
                    )}

                    <span
                      style={{
                        fontWeight: "bold",
                        color: "#0e7490",
                        marginBottom: "10px",
                        display: "block",
                      }}
                    >
                      {property.distance !== null
                        ? `${property.distance} km away`
                        : "Distance unavailable"}
                    </span>
                    <div
                      style={{
                        fontSize: "0.875rem",
                        fontWeight: "600",
                        color: "#3182ce",
                        marginBottom: "10px",
                        display: "block",
                      }}
                    >
                      <strong>{property.type || "Unknown"}</strong>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.75rem",
                        color: "#4a5568",
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: "10px",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <FontAwesomeIcon icon={faUser} />{" "}
                        {property.owner?.name || "Unknown"}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
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
        </div>

        {/* Right Sidebar - Filters */}
        <div
          style={{
            flex: "1",
            minWidth: "250px",
          }}
        >
          <aside
            style={{
              padding: "15px",
              background: "#f7fafc",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ marginBottom: "20px" }}>
              <h3
                style={{
                  fontSize: "1.125rem",
                  fontWeight: "600",
                  color: "#1a202c",
                  marginBottom: "15px",
                }}
              >
                Filter Properties For Rent
              </h3>

              {/* 🔹 State - Searchable */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#1a202c",
                    marginBottom: "5px",
                    display: "block",
                  }}
                >
                  State
                </label>
                <SearchableDropdown
                  options={states.map(s => ({ value: s, label: s }))}
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  placeholder="All States"
                />
              </div>

              {/* 🔹 District - Searchable */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#1a202c",
                    marginBottom: "5px",
                    display: "block",
                  }}
                >
                  District
                </label>
                <SearchableDropdown
                  options={filteredDistricts.map(d => ({ value: d, label: d }))}
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  placeholder="All Districts"
                  disabled={filteredDistricts.length === 0}
                />
              </div>

              {/* 🔹 Property Type */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#1a202c",
                    marginBottom: "5px",
                    display: "block",
                  }}
                >
                  Property Type
                </label>
                <select
                  value={filterType}
                  onChange={(e) => {
                    setFilterType(e.target.value);
                    if (!isResidentialType(e.target.value)) {
                      setFilterBedrooms(""); // Clear bedrooms filter for non-residential
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                >
                  <option value="">All Types</option>
                  <option value="villa">Villa</option>
                  <option value="multi_family_home">Multi Family Home</option>
                  <option value="single_family_home">Single Family Home</option>
                  <option value="commercial">Commercial / Shop</option>
                  <option value="house">House</option>
                  <option value="apartment">Apartment</option>
                  <option value="plot">Plot</option>
                </select>
              </div>

              {/* 🔹 City - Searchable */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#1a202c",
                    marginBottom: "5px",
                    display: "block",
                  }}
                >
                  City
                </label>
                <SearchableDropdown
                  options={filteredCities.map(c => ({ value: c, label: c }))}
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  placeholder="All Cities"
                  disabled={filteredCities.length === 0}
                />
              </div>

              {/* Remaining Filters */}
              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#1a202c",
                    marginBottom: "5px",
                    display: "block",
                  }}
                >
                  Search by Title
                </label>
                <input
                  type="text"
                  placeholder="Enter property title"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#1a202c",
                    marginBottom: "5px",
                    display: "block",
                  }}
                >
                  Min Price (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 5000"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "500",
                    color: "#1a202c",
                    marginBottom: "5px",
                    display: "block",
                  }}
                >
                  Max Price (₹)
                </label>
                <input
                  type="number"
                  placeholder="e.g., 50000"
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                  }}
                />
              </div>

              {/* Conditional Minimum Bedrooms Filter */}
              {isResidentialType(filterType) && (
                <div style={{ marginBottom: "15px" }}>
                  <label
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: "500",
                      color: "#1a202c",
                      marginBottom: "5px",
                      display: "block",
                    }}
                  >
                    Minimum Bedrooms
                  </label>
                  <select
                    value={filterBedrooms}
                    onChange={(e) => setFilterBedrooms(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      fontSize: "0.875rem",
                    }}
                  >
                    <option value="">Any</option>
                    <option value="1">1+</option>
                    <option value="2">2+</option>
                    <option value="3">3+</option>
                    <option value="4">4+</option>
                  </select>
                </div>
              )}

              <button
                style={{
                  width: "100%",
                  padding: "8px",
                  backgroundColor: "#3182ce",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                onClick={applyFilters}
                onMouseEnter={e => e.target.style.backgroundColor = "#2b6cb0"}
                onMouseLeave={e => e.target.style.backgroundColor = "#3182ce"}
              >
                Apply Filters
              </button>
            </div>
          </aside>
        </div>
      </div>

      <AuthError
        open={showAuthError}
        onClose={() => setShowAuthError(false)}
      />
    </div>
  );
}

export default ForRent;