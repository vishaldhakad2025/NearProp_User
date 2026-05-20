import React, { useState, useEffect } from "react";
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
import axios from "axios";

const baseUrl = "https://api.nearprop.com";
const apiPrefix = "api";

function Developer() {
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
  const [shareDeveloper, setShareDeveloper] = useState(null);

  // Location filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");

  // Searchable dropdown state
  const [stateSearch, setStateSearch] = useState("");
  const [districtSearch, setDistrictSearch] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false);

  const navigate = useNavigate();

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

  // Check authentication
  useEffect(() => {
    const token = getToken();
    if (!token) {
      toast.warn("Please log in to view developers.", {
        position: "top-right",
        autoClose: 2000,
        onClose: () => navigate("/login", { state: { from: "/developer" } }),
      });
    }
  }, [navigate]);

  // Fetch developers from public API
  useEffect(() => {
    const fetchDevelopers = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`${baseUrl}/${apiPrefix}/public/developers`);

        if (res.data.success) {
          const devs = res.data.data.filter(dev =>
            dev.roles && dev.roles.includes("DEVELOPER")
          );

          setDevelopers(devs);
          setFilteredDevelopers(devs);

          // Extract unique states and districts
          const uniqueStates = [...new Set(devs.map(d => d.state).filter(Boolean))];
          setStates(uniqueStates.sort());

          const allDistricts = devs.map(d => ({
            state: d.state,
            district: d.district
          })).filter(d => d.state && d.district);
          setDistricts(allDistricts);
        } else {
          setError("Failed to fetch developers");
        }
      } catch (err) {
        console.error("Error fetching developers:", err);
        setError("Failed to load developers. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDevelopers();
  }, []);

  // Update filtered districts when state changes
  useEffect(() => {
    if (selectedState) {
      const filtered = districts
        .filter(d => d.state === selectedState)
        .map(d => d.district)
        .filter(Boolean);
      setFilteredDistricts([...new Set(filtered)].sort());
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
        dev.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dev.mobileNumber?.includes(searchQuery)
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
    fetchDeveloperListings(developer.id);
    fetchDeveloperReviews(developer.id);
  };

  const closeDeveloperModal = () => {
    setSelectedDeveloper(null);
    document.body.style.overflow = "auto";
    setAgentListings([]);
    setReviews([]);
    setAverageRating(0);
    setReviewCount(0);
  };

  const openShareModal = (developer) => {
    setShareDeveloper(developer);
  };

  const closeShareModal = () => {
    setShareDeveloper(null);
  };

  const fetchDeveloperListings = async (developerId) => {
    try {
      const token = getToken();
      if (!token) return;

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

  const fetchDeveloperReviews = async (developerId) => {
    try {
      setReviewsLoading(true);
      setReviewsError(null);
      const token = getToken();
      if (!token) return;

      const propertiesRes = await fetch(`${baseUrl}/${apiPrefix}/properties`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!propertiesRes.ok) throw new Error("Failed to fetch properties");

      const propertiesData = await propertiesRes.json();
      const developerProperties = (propertiesData.data || []).filter(
        (property) => property.owner?.id === developerId
      );

      let allReviews = [];
      let totalRating = 0;
      let totalReviews = 0;

      for (const property of developerProperties) {
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

  // Filtered lists for searchable dropdown
  const filteredStates = states.filter(s =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredDistrictList = filteredDistricts.filter(d =>
    d.toLowerCase().includes(districtSearch.toLowerCase())
  );

  // Generate shareable URL
  const generateShareUrl = (developerId) => {
  return `${window.location.origin}/developer#${developerId}`;
};

useEffect(() => {
  if (window.location.hash) {
    const hashId = window.location.hash.substring(1); // remove #
    if (developers.length > 0) {
      const dev = developers.find(d => d.id === hashId);
      if (dev) {
        openDeveloperModal(dev);
        // Optional: clean hash after opening
        // window.history.replaceState({}, document.title, "/developer");
      }
    }
  }
}, [developers]);


  // Handle shared link opening
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const devId = params.get("dev");
    if (devId && developers.length > 0) {
      const dev = developers.find(d => d.id === devId);
      if (dev) {
        openDeveloperModal(dev);
        // Clean URL after opening
        window.history.replaceState({}, document.title, "/developer");
      }
    }
  }, [developers]);

  // If not authenticated, only show toast
  const token = getToken();
  if (!token) {
    return <ToastContainer />;
  }

  return (
    <>
      <div className="page-container">
        <div className="content-area">
          <h2 className="p-3">Developer</h2>
          {loading && <p>Loading developers...</p>}
          {error && <p className="error-message">Error: {error}</p>}
          {!loading && !error && filteredDevelopers.length === 0 && (
            <p>No developers found.</p>
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
                    "https://img.freepik.com/free-photo/medium-shot-man-working-as-real-estate-agent_23-2151064999.jpg"
                  }
                  alt={developer.name || "Developer"}
                  className="nearprop-agent-photo"
                />
                <div className="nearprop-agent-info">
                  <div className="nearprop-header d-inline-flex">
                    <h2 className="nearprop-agent-name">
                      {developer.name || "Unknown Developer"}
                    </h2>
                    <div className="nearprop-stars">★ ★ ★ ★ ☆</div>
                  </div>
                  <p className="nearprop-designation">
                    Developer • NearProp Verified
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
                        <a href={`tel:${developer.mobileNumber}`}>
                          <FaPhoneAlt className="contact-icon" />
                        </a>
                      </p>
                    </div>
                    <hr />
                    <div className="nearprop-row">
                      <span>WhatsApp</span>
                      <p>
                        <a
                          href={`https://wa.me/${developer.mobileNumber.replace(/\+/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FaWhatsappSolid className="contact-icon" style={{ color: "#25D366" }} />
                        </a>
                      </p>
                    </div>
                    <hr />
                    {developer.email && (
                      <>
                        <div className="nearprop-row">
                          <span>Email</span>
                          <p>
                            <a href={`mailto:${developer.email}`}>
                              <FaEnvelope className="contact-icon" />
                            </a>
                          </p>
                        </div>
                        <hr />
                      </>
                    )}
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
            <h3>Find Developer</h3>
            <input
              type="text"
              placeholder="Enter developer name or mobile"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />

            {/* State Dropdown */}
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

            {/* District Dropdown */}
            <div className="filter-group position-relative">
              <label className="filter-label">District</label>
              <div
                className="filter-select d-flex align-items-center justify-content-between cursor-pointer"
                onClick={() => setShowDistrictDropdown(!showDistrictDropdown)}
                style={{ opacity: selectedState ? 1 : 0.6, pointerEvents: selectedState ? "auto" : "none" }}
              >
                <span>{selectedDistrict || "Please select"}</span>
                <span>▼</span>
              </div>
              {showDistrictDropdown && (
                <div className="position-absolute w-100 bg-white border rounded shadow mt-1" style={{ zIndex: 1000, maxHeight: "300px", overflowY: "auto" }}>
                  <input
                    type="text"
                    placeholder="Search district..."
                    value={districtSearch}
                    onChange={(e) => setDistrictSearch(e.target.value)}
                    className="filter-input border-0 border-bottom"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div>
                    {filteredDistrictList.length === 0 ? (
                      <div className="p-2 text-muted">No districts found</div>
                    ) : (
                      filteredDistrictList.map((d) => (
                        <div
                          key={d}
                          className="p-2 hover-bg-light cursor-pointer"
                          onClick={() => {
                            setSelectedDistrict(d);
                            setShowDistrictDropdown(false);
                            setDistrictSearch("");
                          }}
                        >
                          {d}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button className="search-btn" onClick={applyFilters}>
              Search Developer
            </button>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {shareDeveloper && (
        <div className="agentlist-modal-fullpage" style={{ zIndex: 9999 }}>
          <div className="agentlist-modal-content" style={{ maxWidth: "500px" }}>
            <div className="agentlist-modal-header">
              <span className="agentlist-modal-title">Share Developer Profile</span>
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
                {generateShareUrl(shareDeveloper.id)}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateShareUrl(shareDeveloper.id));
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
              <span className="agentlist-modal-title">Developer Profile</span>
              <span className="agentlist-modal-close" onClick={closeDeveloperModal}>
                &times;
              </span>
            </div>

            <div className="agentlist-modal-profile">
              <img
                src={
                  selectedDeveloper.profileImageUrl ||
                  "https://img.freepik.com/free-photo/medium-shot-man-working-as-real-estate-agent_23-2151064999.jpg"
                }
                alt={selectedDeveloper.name}
                className="agentlist-modal-img"
              />
              <div className="agentlist-modal-info">
                <h2>
                  {selectedDeveloper.name || "Unknown Developer"}{" "}
                  <FaCheckCircle className="agentlist-verified" style={{ color: "#3498db" }} />
                </h2>
                <p className="agentlist-role-text">
                  Real Estate Developer
                </p>
                <div className="agentlist-rating">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <FaStar
                      key={i}
                      className={i < Math.round(averageRating) ? "star-filled" : "star-empty"}
                    />
                  ))}
                  <span>{averageRating} ({reviewCount} Reviews)</span>
                </div>
                <div style={{ margin: "10px 0", color: "#555", fontSize: "15px" }}>
                  <FaMapMarkerAlt style={{ marginRight: "8px", color: "#e74c3c" }} />
                  {selectedDeveloper.state && <span>{selectedDeveloper.state}</span>}
                  {selectedDeveloper.state && selectedDeveloper.district && <span>, </span>}
                  {selectedDeveloper.district && <span>{selectedDeveloper.district}</span>}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="agentlist-actions">
              {selectedDeveloper.email && (
                <a href={`mailto:${selectedDeveloper.email}`}>
                  <button className="agentlist-email">
                    <FaEnvelope /> Email
                  </button>
                </a>
              )}
              <a href={`tel:${selectedDeveloper.mobileNumber}`}>
                <button className="agentlist-call">
                  <FaPhoneAlt /> Call
                </button>
              </a>
              <a
                href={`https://wa.me/${selectedDeveloper.mobileNumber.replace(/\+/g, "")}`}
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
                  <h3>Contact Details</h3>
                  <p><FaPhoneAlt style={{ marginRight: "10px" }} /> {selectedDeveloper.mobileNumber}</p>
                  {selectedDeveloper.email && (
                    <p><FaEnvelope style={{ marginRight: "10px" }} /> {selectedDeveloper.email}</p>
                  )}
                  <p><FaMapMarkerAlt style={{ marginRight: "10px" }} />
                    {selectedDeveloper.district && `${selectedDeveloper.district}, `}
                    {selectedDeveloper.state || "Madhya Pradesh"}
                  </p>
                  <p><FaBuilding style={{ marginRight: "10px" }} /> Registered Developer on NearProp</p>
                  <p><FaHome /> Properties: {agentListings.length} listings</p>
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
                    <div className="no-results">No reviews yet for this developer's properties.</div>
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
                    <p className="no-results">No listings found for this developer.</p>
                  ) : (
                    <div className="listing-cards">
                      {agentListings.map((property) => {
                        const propertyTypeLower = property?.type?.toLowerCase();
                        const hideResidentialDetails = propertyTypeLower === "plot" || propertyTypeLower === "commercial";
                        return (
                          <Link
                            to={`/propertySell/${property.id}`}
                            key={property.id}
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
                                  className={`landing-label landing-${property.status?.toLowerCase().replace("_", "-") || "for-sale"}`}
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
                                  ₹{property.price ? Number(property.price).toLocaleString("en-IN") : "N/A"}
                                  <br />
                                  <span>
                                    ₹{property.price && property.area
                                      ? Math.round(Number(property.price) / Number(property.area))
                                      : "N/A"} /Sq Ft
                                  </span>
                                </div>
                              </div>

                              <div className="landing-property-info" style={{
                                padding: "15px",
                                minHeight: "300px",
                                display: "flex",
                                flexDirection: "column",
                                justifyContent: "space-between",
                              }}>
                                <div>
                                  <h2 style={{
                                    fontSize: "1.125rem",
                                    fontWeight: "600",
                                    color: "#1a202c",
                                    margin: "0 0 10px",
                                    lineHeight: "1.5",
                                  }}>
                                    {property.title || "Untitled Property"}
                                  </h2>
                                  <div style={{
                                    fontSize: "0.875rem",
                                    color: "#4a5568",
                                    marginBottom: "10px",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                  }}>
                                    {/* <FontAwesomeIcon icon={faMapMarkerAltSolid} /> */}
                                    <span style={{ lineHeight: "1.4" }}>
                                      {property.address || "No Address"}
                                    </span>
                                  </div>

                                  <div style={{
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
                                        <FontAwesomeIcon icon={faShower} /> {property.bathrooms || 0}
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

                                  <div style={{
                                    fontSize: "0.875rem",
                                    fontWeight: "600",
                                    color: "#3182ce",
                                    marginBottom: "10px",
                                  }}>
                                    <strong>{property.type || "Unknown"}</strong>
                                  </div>
                                </div>

                                <div style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  fontSize: "0.75rem",
                                  color: "#4a5568",
                                  borderTop: "1px solid #e2e8f0",
                                  paddingTop: "10px",
                                  flexWrap: "wrap",
                                  gap: "8px",
                                }}>
                                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <FontAwesomeIcon icon={faUser} /> {selectedDeveloper.name || "Unknown"}
                                  </span>
                                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                    <FontAwesomeIcon icon={faPaperclip} />
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

      {/* Inline CSS */}
      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .hover-bg-light:hover { background-color: #f8f9fa; }
      `}</style>
    </>
  );
}

export default Developer;