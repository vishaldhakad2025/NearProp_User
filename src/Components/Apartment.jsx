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
import ApartmentImg from '../assets/A-1.avif';
import Apartment2 from '../assets/c-2.avif';
import Apartment3 from '../assets/apartment.avif';
import Apartment4 from '../assets/studio.jpg';
import Apartment6 from '../assets/penthouse.avif';
import Apartment7 from '../assets/villa.avif';
import AuthError from "../Components/AuthError";


const fallbackImages = [ApartmentImg, Apartment2, Apartment3, Apartment4, Apartment6, Apartment7];

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

function Apartment() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAuthError, setShowAuthError] = useState(false);


  // Sidebar filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState("");

  // 🔹 Location filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [cities, setCities] = useState([]);

  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const { baseUrl, apiPrefix } = API_CONFIG;

  // ✅ Fetch Apartment properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Authentication failed. Please log in again.");

        const url = `${baseUrl}/${apiPrefix}/properties`;
        const response = await fetch(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });

        const text = await response.text();
        if (!response.ok) throw new Error(`Error: ${response.status} → ${text}`);

        const data = JSON.parse(text);
        if (data.success) {
          const apartmentProperties = (data.data || [])
            .filter(property => property.type?.toLowerCase() === "apartment")
            .map(property => ({
              id: property.id || property._id,
              title: property.title || "Untitled Apartment",
              address: `${property.city || "Unknown"}, ${property.state || "Unknown"}`,
              imageUrls: property.imageUrls || [],
              status: property.status || "FOR_SALE",
              reelCount: property.reelCount || 0,
              price: property.price || 0,
              area: property.area || 0,
              bedrooms: property.bedrooms || 0,
              bathrooms: property.bathrooms || 0,
              garages: property.garages || 0,
              sizePostfix: "Sq Ft",
              type: "Apartment",
              owner: { name: property.owner?.name || "Unknown" },
              createdAt: property.createdAt || new Date().toISOString(),
              state: property.state || "",
              district: property.district || "",
              city: property.city || "",
            }));

          setProperties(apartmentProperties);
          setFilteredProperties(apartmentProperties);
        } else {
          throw new Error(data.message || "API error");
        }
      } catch (err) {
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
        if (!token) return;

        const res = await axios.get(
          `${baseUrl}/${apiPrefix}/property-districts`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const districtsData = res.data || [];
        setDistricts(districtsData);

        const uniqueStates = [...new Set(districtsData.map((d) => d.state))];
        setStates(uniqueStates);

        const uniqueCities = [
          ...new Set(districtsData.map((d) => d.city).filter(Boolean)),
        ];
        setCities(uniqueCities);
      } catch (err) {
        console.error("Failed to load location data:", err.message);
      }
    };
    fetchDistricts();
  }, [baseUrl, apiPrefix]);

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

  // ✅ Apply Filters
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

    // 🔹 Location filters
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
  };

  if (loading) return <div className="p-4">Loading apartments…</div>;
if (error && !showAuthError)
  return <div className="p-4 text-danger">Error: {error}</div>;

  return (
    <div>
      <div
        className="nav justify-content-center p-5"
        style={{ fontSize: "40px", fontWeight: "700", color: 'darkcyan' }}
      >
        Apartments
      </div>

      <div className="blog-main-container">
        {/* Left Section */}
        <div className="blog-left-section card-wrapper">
          {filteredProperties.map((property) => (
            <Link
              to={`/propertySell/${property.id}`}
              key={property.id}
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
                    src={getValidImage(property.imageUrls, fallbackImages[0], baseUrl)}
                    alt={property.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transition: "transform 0.3s ease",
                    }}
                    onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
                    onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                    onError={(e) => (e.target.src = fallbackImages[0])}
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
                  {/* <div className="landing-overlay-icons">
                    <span>
                      <FontAwesomeIcon icon={faComment} />{" "
                      }{property.reelCount || 0}
                    </span>
                  </div> */}
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
                      ₹
                      {property.price
                        ? Number(property.price).toLocaleString("en-IN")
                        : "N/A"}
                      <br />
                      <span style={{ fontSize: "0.75rem", fontWeight: "400" }}>
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
                    {property.title || "Untitled Apartment"}
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
                        marginRight: "8px", /* Gap between icon and address */
                      }}
                    >
                      <FontAwesomeIcon icon={faMapMarkerAlt} />
                      {property.address || "No Address"}
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
                      <FontAwesomeIcon icon={faShower} />{" "}
                      {property.bathrooms || 0}
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
                    <strong>{property.type || "Apartment"}</strong>
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
                      <FontAwesomeIcon icon={faUser} />{" "}
                      {property.owner?.name || "Unknown"}
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
          ))}
        </div>

        {/* Right Sidebar */}
        <div className="residential-blog-right-sidebar md:block">
          <aside className="residential">
            <div className="residential-filter">
              <h3 className="filter-title">Filter Apartments</h3>

              {/* 🔹 Location Filters */}
              <div className="filter-group">
                <label className="filter-label">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All States</option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
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
              </div>

              <div className="filter-group">
                <label className="filter-label">City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Cities</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Existing Filters */}
              <div className="filter-group">
                <label className="filter-label">Search by Title</label>
                <input
                  type="text"
                  placeholder="Enter apartment title"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Min Price (₹)</label>
                <input
                  type="number"
                  placeholder="e.g., 500000"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Max Price (₹)</label>
                <input
                  type="number"
                  placeholder="e.g., 5000000"
                  value={filterPriceMax}
                  onChange={(e) => setFilterPriceMax(e.target.value)}
                  className="filter-input"
                />
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

              <button className="filter-button" onClick={applyFilters}>
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

export default Apartment;