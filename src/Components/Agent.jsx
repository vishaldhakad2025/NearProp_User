import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "./agents.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBed,
  faShower,
  faCar,
  faUser,
  faPaperclip,
  faComment,
  faMapMarkerAlt as faMapMarkerAltSolid,
  faStar as faSolidStar,
  faShareAlt,
} from "@fortawesome/free-solid-svg-icons";
import { faStar as faRegularStar } from "@fortawesome/free-regular-svg-icons";
import {
  FaEnvelope,
  FaPhoneAlt,
  FaWhatsapp as FaWhatsappSolid,
  FaStar,
  FaBuilding,
  FaMapMarkerAlt,
  FaHome,
  FaCheckCircle,
  FaEye,
} from "react-icons/fa";
import villa1 from "../assets/villa-1.avif";
import nearpropLogo from "../assets/Nearprop 1.png";
import axios from "axios";

const baseUrl = "https://api.nearprop.com";
const apiPrefix = "api";

function Agent() {
  const [developers, setDevelopers] = useState([]);
  const [filteredDevelopers, setFilteredDevelopers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDeveloper, setSelectedDeveloper] = useState(null);
  const [activeTab, setActiveTab] = useState("about");
  const [agentListings, setAgentListings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState(null);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);

  // Share modal state
  const [shareAdvisor, setShareAdvisor] = useState(null);

  const navigate = useNavigate();

  // Location filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  const getAuthData = () => {
    const authData = localStorage.getItem("authData");
    if (authData) {
      try {
        return JSON.parse(authData);
      } catch (err) {
        console.error("Error parsing authData:", err);
        return null;
      }
    }
    return null;
  };

  const getToken = () => {
    const authData = getAuthData();
    return authData ? authData.token : null;
  };

  // Check authentication and show toast if not logged in
  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.warn("Please log in to view property advisors.", {
        position: "top-right",
        autoClose: 2000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        onClose: () => {
          navigate("/login", { state: { from: "/agents" } });
        },
      });
    }
  }, [navigate]);

  // Fetch advisors
  useEffect(() => {
    const fetchDevelopers = async () => {
      try {
        const token = getToken();
        if (!token) return;

        setLoading(true);
        setError(null);

        const response = await fetch(
          `${baseUrl}/api/public/users/advisors`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) throw new Error("Failed to fetch advisors");

        const data = await response.json();
        setDevelopers(data.data || []);
        setFilteredDevelopers(data.data || []);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchDevelopers();
  }, []);

  // Fetch districts/states
  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const res = await axios.get(`${baseUrl}/${apiPrefix}/property-districts`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const districtsData = res.data || [];
        setDistricts(districtsData);

        const uniqueStates = [...new Set(districtsData.map((d) => d.state))];
        setStates(uniqueStates);
      } catch (err) {
        console.error("Failed to load location data:", err.message);
      }
    };
    fetchDistricts();
  }, []);

  // Update filtered districts when state changes
  useEffect(() => {
    if (selectedState) {
      const filtered = districts.filter((d) => d.state === selectedState);
      setFilteredDistricts(filtered);
      setSelectedDistrict("");
    } else {
      setFilteredDistricts([]);
      setSelectedDistrict("");
    }
  }, [selectedState, districts]);

  const applyFilters = () => {
    let filtered = [...developers];

    if (searchQuery) {
      filtered = filtered.filter((dev) =>
        dev.name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedState) {
      filtered = filtered.filter((dev) => dev.state === selectedState);
    }
    if (selectedDistrict) {
      filtered = filtered.filter((dev) => dev.district === selectedDistrict);
    }

    setFilteredDevelopers(filtered);
  };

  const openDeveloperModal = (developer) => {
    setSelectedDeveloper(developer);
    setActiveTab("about");
    document.body.style.overflow = "hidden";
    fetchAgentListings(developer.id);
    fetchAdvisorReviews(developer.id);
  };

  const closeDeveloperModal = () => {
    setSelectedDeveloper(null);
    document.body.style.overflow = "auto";
    setAgentListings([]);
    setReviews([]);
    setAverageRating(0);
    setReviewCount(0);
  };

  const openShareModal = (advisor) => {
    setShareAdvisor(advisor);
  };

  const closeShareModal = () => {
    setShareAdvisor(null);
  };

  const fetchAgentListings = async (developerId) => {
    try {
      const token = getToken();
      if (!token) throw new Error("Authentication token missing");

      const res = await fetch(`${baseUrl}/${apiPrefix}/properties`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) throw new Error("Failed to fetch properties");

      const data = await res.json();
      const filteredListings = (data.data || []).filter(
        (property) => property.owner?.id === developerId
      );
      setAgentListings(filteredListings);
    } catch (err) {
      console.error("Failed to fetch listings:", err);
      setAgentListings([]);
    }
  };

  const fetchAdvisorReviews = async (developerId) => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);
      const token = getToken();
      if (!token) throw new Error("Authentication token missing");

      const propertiesRes = await fetch(`${baseUrl}/${apiPrefix}/properties`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!propertiesRes.ok) throw new Error("Failed to fetch properties");

      const propertiesData = await propertiesRes.json();
      const advisorProperties = (propertiesData.data || []).filter(
        (property) => property.owner?.id === developerId
      );

      let allReviews = [];
      let totalRating = 0;
      let totalReviews = 0;

      for (const property of advisorProperties) {
        const reviewsRes = await fetch(
          `${baseUrl}/${apiPrefix}/reviews/property/${property.id}?page=0&size=10&sortBy=createdAt&direction=DESC`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (reviewsRes.ok) {
          const reviewsData = await reviewsRes.json();
          const reviews = reviewsData.content || [];
          allReviews = [...allReviews, ...reviews];
          totalRating += reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
          totalReviews += reviews.length;
        }
      }

      setReviews(allReviews);
      setReviewCount(totalReviews);
      setAverageRating(totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : 0);
      setReviewsLoading(false);
    } catch (err) {
      console.error("Failed to fetch reviews:", err);
      setReviewsError("Failed to load reviews. Please try again later.");
      setReviewsLoading(false);
    }
  };

  // Searchable Dropdown Component
  const SearchableDropdown = ({ options, value, onChange, placeholder }) => {
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
      <div ref={wrapperRef} className="relative">
        <input
          type="text"
          value={isOpen ? searchTerm : selectedLabel}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          placeholder={selectedLabel || placeholder}
          className="filter-select"
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

  // Generate shareable URL
 const generateShareUrl = (advisorId) => {
  return `${window.location.origin}/agents#${advisorId}`;
};


useEffect(() => {
  if (window.location.hash) {
    const hashId = window.location.hash.substring(1);
    if (developers.length > 0) {
      const adv = developers.find(d => d.id === hashId);
      if (adv) {
        openDeveloperModal(adv);
      }
    }
  }
}, [developers]);
  // Handle shared link opening
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const advId = params.get("adv");
    if (advId && developers.length > 0) {
      const adv = developers.find(d => d.id === advId);
      if (adv) {
        openDeveloperModal(adv);
        window.history.replaceState({}, document.title, "/agents");
      }
    }
  }, [developers]);

  // Do not render content if not authenticated
  const token = getToken();
  if (!token) {
    return <ToastContainer />;
  }

  return (
    <>
      <div className="page-container">
        <div className="content-area">
          <h2 className="p-3">Property Advisor</h2>
          {loading && <p>Loading advisors...</p>}
          {error && <p className="error-message">Error: {error}</p>}
          {!loading && !error && filteredDevelopers.length === 0 && (
            <p>No advisors found.</p>
          )}

          <div className="agents-grid">
            {filteredDevelopers.map((developer) => (
              <div key={developer.id} className="nearprop-agent-card" style={{ position: "relative" }}>
                {/* Share Icon - Top Right */}
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "rgba(255,255,255,0.8)",
                    borderRadius: "50%",
                    width: "36px",
                    height: "36px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    zIndex: 10,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    openShareModal(developer);
                  }}
                >
                  <FontAwesomeIcon icon={faShareAlt} style={{ fontSize: "18px", color: "#3498db" }} />
                </div>

                <img
                  src={
                    developer.profileImageUrl ||
                    nearpropLogo
                  }
                  alt={developer.name || "Advisor"}
                  className="nearprop-agent-photo"
                  onError={(e) => {
                    e.target.src = nearpropLogo;
                  }}
                />
                <div className="nearprop-agent-info">
                  <div className="nearprop-header d-inline-flex p-2">
                    <h2 className="nearprop-agent-name">
                      {developer.name || "Unknown Advisor"}
                    </h2>
                    <div className="nearprop-stars">★★★★☆</div>
                  </div>
                  <p className="nearprop-designation p-2">
                    Property Advisor • NearProp Verified
                  </p>

                  {/* State & District Display */}
                  {(developer.state || developer.district) && (
                    <div style={{ margin: "10px 0", color: "#555", fontSize: "14px", padding: "0 16px", display: "flex", alignItems: "center", gap: "6px" }}>
                      <FaMapMarkerAlt style={{ color: "#e74c3c", flexShrink: 0 }} />
                      <span>
                        {developer.state && <span>{developer.state}</span>}
                        {developer.state && developer.district && <span>, </span>}
                        {developer.district && <span>{developer.district}</span>}
                      </span>
                    </div>
                  )}

                  <div className="nearprop-details">
                    <div className="nearprop-row">
                      <span>Call</span>
                      <p>
                        <a href={`tel:${developer.mobileNumber || "3214569874"}`}>
                          <FaPhoneAlt className="contact-icon" />
                        </a>
                      </p>
                    </div>
                    <hr />
                    <div className="nearprop-row">
                      <span>WhatsApp</span>
                      <p>
                        <a
                          href={`https://wa.me/${developer.mobileNumber?.replace(/\+/g, "") || "3214569874"}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FaWhatsappSolid className="contact-icon" style={{ color: "#25D366" }} />
                        </a>
                      </p>
                    </div>
                    <hr />
                    <div className="nearprop-row">
                      <span>Email</span>
                      <p>
                        <a href={`mailto:${developer.email || "advisor@nearprop.com"}`}>
                          <FaEnvelope className="contact-icon" />
                        </a>
                      </p>
                    </div>
                    <hr />
                    <div className="nearprop-row">
                      <span>Profile</span>
                      <label onClick={() => openDeveloperModal(developer)} style={{ cursor: "pointer" }}>
                        <FaEye style={{ fontSize: "18px", color: "#3498db" }} />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="agents-sidebar">
          <div className="widget">
            <h3>Find Advisor</h3>
            <input
              type="text"
              placeholder="Enter advisor name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="filter-group">
              <label className="filter-label">State</label>
              <SearchableDropdown
                options={states.map(s => ({ value: s, label: s }))}
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                placeholder="All States"
              />
            </div>
            <div className="filter-group">
              <label className="filter-label">District</label>
              <SearchableDropdown
                options={filteredDistricts.map(d => ({ value: d.name || d.district, label: d.name || d.district }))}
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                placeholder="All Districts"
                disabled={filteredDistricts.length === 0}
              />
            </div>
            <button className="search-btn" onClick={applyFilters}>Search Advisor</button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {shareAdvisor && (
        <div className="agentlist-modal-fullpage" style={{ zIndex: 9999 }}>
          <div className="agentlist-modal-content" style={{ maxWidth: "500px" }}>
            <div className="agentlist-modal-header">
              <span className="agentlist-modal-title">Share Advisor Profile</span>
              <span className="agentlist-modal-close" onClick={closeShareModal}>
                &times;
              </span>
            </div>
            <div style={{ padding: "30px", textAlign: "center" }}>
              <p>Copy this link to share:</p>
              <div style={{
                background: "#f1f1f1",
                padding: "12px",
                borderRadius: "8px",
                wordBreak: "break-all",
                margin: "15px 0",
                fontFamily: "monospace",
              }}>
                {generateShareUrl(shareAdvisor.id)}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateShareUrl(shareAdvisor.id));
                  toast.success("Link copied to clipboard!");
                }}
                style={{
                  padding: "10px 20px",
                  background: "#3498db",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Page Modal (Profile) */}
      {selectedDeveloper && (
        <div className="agentlist-modal-fullpage">
          <div className="agentlist-modal-content">
            <div className="agentlist-modal-header">
              <span className="agentlist-modal-title">Advisor Profile</span>
              <span className="agentlist-modal-close" onClick={closeDeveloperModal}>
                ×
              </span>
            </div>

            <div className="agentlist-modal-profile">
              <img
                src={
                  selectedDeveloper.profileImageUrl ||
                  nearpropLogo
                }
                alt={selectedDeveloper.name}
                className="agentlist-modal-img"
                onError={(e) => {
                  e.target.src = nearpropLogo;
                }}
              />
              <div className="agentlist-modal-info">
                <h2>
                  {selectedDeveloper.name || "Unknown Advisor"}{" "}
                  <FaCheckCircle className="agentlist-verified" />
                </h2>
                <p className="agentlist-role-text">
                  Property Advisor
                </p> 

                {/* State & District in Modal Header */}
                {(selectedDeveloper.state || selectedDeveloper.district) && (
                  <div style={{ margin: "10px 0", color: "#555", fontSize: "15px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FaMapMarkerAlt style={{ color: "#e74c3c", flexShrink: 0 }} />
                    <span>
                      {selectedDeveloper.state && <span>{selectedDeveloper.state}</span>}
                      {selectedDeveloper.state && selectedDeveloper.district && <span>, </span>}
                      {selectedDeveloper.district && <span>{selectedDeveloper.district}</span>}
                    </span>
                  </div>
                )}

                <div className="agentlist-rating">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FaStar
                      key={i}
                      className={i < Math.round(averageRating) ? "star-filled" : "star-empty"}
                    />
                  ))}
                  <span>{averageRating} ({reviewCount} Reviews)</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="agentlist-actions">
              <a href={`mailto:${selectedDeveloper.email || "advisor@nearprop.com"}`}>
                <button className="agentlist-email">
                  <FaEnvelope /> Email
                </button>
              </a>
              <a href={`tel:${selectedDeveloper.mobileNumber || "3214569874"}`}>
                <button className="agentlist-call">
                  <FaPhoneAlt /> Call
                </button>
              </a>
              <a
                href={`https://wa.me/${selectedDeveloper.mobileNumber?.replace(/\+/g, "") || "3214569874"}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <button className="agentlist-whatsapp">
                  <FaWhatsappSolid /> WhatsApp
                </button>
              </a>
            </div>

            {/* Tabs */}
            <div className="agentlist-tabs">
              <span
                className={activeTab === "about" ? "active" : ""}
                onClick={() => setActiveTab("about")}
              >
                About
              </span>
              <span
                className={activeTab === "reviews" ? "active" : ""}
                onClick={() => setActiveTab("reviews")}
              >
                Reviews
              </span>
              <span
                className={activeTab === "listings" ? "active" : ""}
                onClick={() => setActiveTab("listings")}
              >
                Listings
              </span>
            </div>

            <div className="agentlist-tab-content">
              {activeTab === "about" && (
                <div style={{ padding: "20px" }}>
                  <h3>Details</h3>
                  <p><FaBuilding /> Role: Property Advisor</p>
                  {(selectedDeveloper.state || selectedDeveloper.district) && (
                    <p style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <FaMapMarkerAlt />
                      {selectedDeveloper.district && `${selectedDeveloper.district}, `}
                      {selectedDeveloper.state || ""}
                    </p>
                  )}
                  <p><FaHome /> Properties: {agentListings.length || 0} listings</p>
                </div>
              )}

              {activeTab === "reviews" && (
                <div className="review-section">
                  <div className="review-header">
                    <h3>
                      <FontAwesomeIcon icon={faComment} className="comment-icon" /> {reviewCount} Reviews{' '}
                      <span>({averageRating} / 5)</span>
                    </h3>
                  </div>
                  {reviewsLoading ? (
                    <div className="loading">Loading reviews...</div>
                  ) : reviewsError ? (
                    <div className="error-message">{reviewsError}</div>
                  ) : reviews.length === 0 ? (
                    <div className="no-results">No reviews yet for this advisor's properties.</div>
                  ) : (
                    <div className="reviews-list">
                      {reviews.map((review) => (
                        <div key={review.id} className="review">
                          <div className="review-meta">
                            <div>
                              <p className="review-author">{review.user?.name || 'Anonymous'}</p>
                              <div className="review-stars">
                                {[1, 2, 3, 4, 5].map((num) => (
                                  <FontAwesomeIcon
                                    key={num}
                                    icon={num <= review.rating ? faSolidStar : faRegularStar}
                                    className="star"
                                  />
                                ))}
                              </div>
                            </div>
                            <p className="review-date">
                              {new Date(review.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="review-comment">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === "listings" && (
                <div className="agentlistings-container">
                  <h3>{agentListings.length} Property Listing(s)</h3>
                  {agentListings.length === 0 ? (
                    <p className="no-results">No listings found for this advisor.</p>
                  ) : (
                    <div className="listing-cards">
                      {agentListings.map((property) => {
                        const propertyTypeLower = property?.type.toLowerCase();
                        const hideResidentialDetails = propertyTypeLower === "plot" || propertyTypeLower === "commercial";
                        return (
                          <Link
                            to={`/propertySell/${property.id}`}
                            key={property.id || property._id}
                            className="property-card-link"
                          >
                            <div className="landing-property-card">
                              <div className="landing-image-container">
                                <img
                                  src={property.imageUrls?.[0] || villa1}
                                  alt={property.title || "Property"}
                                  className="landing-property-image"
                                  onError={(e) => {
                                    e.target.src = villa1;
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
                                    top: 10,
                                    left: 10,
                                    padding: "4px 10px",
                                    borderRadius: 6,
                                    fontSize: 12,
                                    fontWeight: "bold",
                                    zIndex: 10,
                                  }}
                                >
                                  {property.status?.replace("_", " ") || "For Sale"}
                                </span>
                                <div className="landing-overlay-icons-left">
                                  ₹
                                  {property.price
                                    ? Number(property.price).toLocaleString("en-IN")
                                    : "N/A"}
                                  <br />
                                  <span>
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

                              <div className="landing-property-info" style={{
                                padding: "15px",
                                minHeight: "300px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                                overflow: "visible",
                              }}>
                                <div>
                                  <h2 className="landing" style={{
                                    fontSize: "1.125rem",
                                    fontWeight: "600",
                                    color: "#1a202c",
                                    margin: "0 0 10px",
                                    lineHeight: "1.5",
                                    overflow: "visible",
                                    wordBreak: "break-word",
                                    maxWidth: "100%",
                                    ...(window.innerWidth <= 768 ? { fontSize: "0.9rem" } : {}),
                                  }}>
                                    {property.title || "Untitled Property"}
                                  </h2>
                                  <div className="landing-location" style={{
                                    fontSize: "0.875rem",
                                    color: "#4a5568",
                                    marginBottom: "10px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}>
                                    <FontAwesomeIcon icon={faMapMarkerAltSolid} style={{ flexShrink: 0 }} />
                                    <span style={{ wordBreak: "break-word" }}>
                                      {property.address || "No Address"}
                                    </span>
                                  </div>

                                  <div className="landing-details" style={{
                                    display: "flex",
                                    gap: "12px",
                                    fontSize: "0.875rem",
                                    color: "#4a5568",
                                    marginBottom: "10px",
                                    flexWrap: "wrap",
                                  }}>
                                    {!hideResidentialDetails && (
                                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <FontAwesomeIcon icon={faBed} /> {property.bedrooms || 0}
                                      </span>
                                    )}
                                    {!hideResidentialDetails && (
                                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <FontAwesomeIcon icon={faShower} />{" "}
                                        {property.bathrooms || 0}
                                      </span>
                                    )}
                                    {!hideResidentialDetails && (
                                      <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <FontAwesomeIcon icon={faCar} /> {property.garages || 0}
                                      </span>
                                    )}
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                      {property.area || "N/A"} {property.sizePostfix || "Sq Ft"}
                                    </span>
                                  </div>

                                  <div className="landing-type" style={{
                                    fontSize: "0.875rem",
                                    fontWeight: "600",
                                    color: "#3182ce",
                                    marginBottom: "10px",
                                    display: "block",
                                    wordBreak: "break-word",
                                  }}>
                                    <strong>{property.type || "Unknown"}</strong>
                                  </div>
                                </div>

                                <div className="landing-footer" style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.75rem",
                                  color: "#4a5568",
                                  borderTop: "1px solid #e2e8f0",
                                  paddingTop: "10px",
                                  flexWrap: "wrap",
                                  gap: "8px",
                                  wordBreak: "break-word",
                                }}>
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
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <ToastContainer />
    </>
  );
}

export default Agent;