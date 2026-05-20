import React, { useState, useEffect } from "react";
import axios from "axios";
import Select from "react-select";
import {
  FaEnvelope,
  FaPhoneAlt,
  FaWhatsapp,
  FaBuilding,
  FaMapMarkerAlt,
  FaHome,
  FaStar,
  FaCheckCircle,
  FaGlobe,
} from "react-icons/fa";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./Agentlist.css";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_CONFIG = {
  baseUrl: "https://api.nearprop.com",
  apiPrefix: "api",
};

const agentsData = [
  {
    id: 1,
    name: "Barsha Kumari",
    role: "District Manager (Munger)",
    mobile: "9031638013, 9031638014",
    email: "munger@nearprop.com",
    rating: 4.5,
    reviews: 0,
    company: "Nearprop Pvt Ltd",
    website: "nearprop.com",
    address: "Ambedkar Chowk, Sitakund Road, Dariyapur, Munger, Bihar - 811202",
    state: "Bihar",
    district: "Munger",
    listings: 0,
    description: "Barsha Kumari is a dedicated District Manager serving the Munger area with expertise in property management.",
    img: "/IMG-20250824-WA0013.jpg",
  },
  {
    id: 2,
    name: "Kishalaya Mittlankar",
    role: "District Manager (Purnia)",
    mobile: "9031638017, 9031638018",
    email: "purnia@nearprop.com",
    rating: 4.0,
    reviews: 0,
    company: "Nearprop Pvt Ltd",
    website: "nearprop.com",
    address: "456 Central Avenue, Purnia, Bihar, India",
    state: "Bihar",
    district: "Purnia",
    listings: 0,
    description: "Kishalaya Mittlankar manages properties across Purnia, offering comprehensive real estate services.",
    img: "/jjj.jpg",
  },
  {
    id: 3,
    name: "Sonu Kumar",
    role: "District Manager (Lakhisarai)",
    mobile: "9031638011, 9031638012",
    email: "lakhisarai@nearprop.com",
    rating: 4.2,
    reviews: 0,
    company: "Nearprop Pvt Ltd",
    website: "nearprop.com",
    address: "Gadi Bishanpur, Near Buddha Hotel, Lakhisarai, Bihar - 811311",
    state: "Bihar",
    district: "Lakhisarai",
    listings: 0,
    description: "Sonu Kumar is a skilled District Manager focused on delivering top-notch property solutions in Lakhisarai.",
    img: "/IMG-20250823-WA0003.jpg",
  },
  {
    id: 4,
    name: "Chowdhury Md Irshad Alam",
    role: "District Manager (Begusarai)",
    mobile: "9031638019, 9031638020",
    email: "begusarai@nearprop.com",
    rating: 4.3,
    reviews: 0,
    company: "Nearprop Pvt Ltd",
    website: "nearprop.com",
    address: "Phool Chowk, Beside of Iqra Public School, Lakhminia, Ballia, Begusarai, Bihar - 851211",
    state: "Bihar",
    district: "Begusarai",
    listings: 0,
    description: "Chowdhury Md Irshad Alam provides expert property management services in Begusarai.",
    img: "/DS 99628.jpg",
  },
  {
    id: 5,
    name: "Kishalaya Mittlankar",
    role: "District Manager (Saharsa)",
    mobile: " 9031638015, 9031638016",
    email: "saharsa@nearprop.com",
    rating: 4.0,
    reviews: 0,
    company: "Nearprop Pvt Ltd",
    website: "nearprop.com",
    address: "Ward No. 18/32, Gokul Chowk, Gangjala, Saharsa, Bihar - 852201",
    state: "Bihar",
    district: "Saharsa",
    listings: 0,
    description: "Kishalaya Mittlankar manages properties across Saharsa, offering comprehensive real estate services.",
    img: "/jjj.jpg",
  },
];

const getToken = () => {
  try {
    const authData = localStorage.getItem("authData");
    if (!authData) {
      console.warn("No authData found in localStorage");
      return null;
    }
    const parsedData = JSON.parse(authData);
    const token = parsedData.token || null;
    console.log("Retrieved token:", token ? "Token exists" : "No token found");
    return token;
  } catch (err) {
    console.error("Error parsing authData:", err.message);
    return null;
  }
};

// Custom styles for react-select
const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    minHeight: '42px',
    borderColor: state.isFocused ? '#0072ff' : '#ddd',
    borderWidth: '2px',
    borderRadius: '8px',
    boxShadow: state.isFocused ? '0 0 0 3px rgba(0, 114, 255, 0.1)' : 'none',
    '&:hover': {
      borderColor: '#0072ff',
    },
  }),
  placeholder: (base) => ({
    ...base,
    color: '#999',
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    zIndex: 100,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected ? '#0072ff' : state.isFocused ? '#e3f2fd' : 'white',
    color: state.isSelected ? 'white' : '#333',
    cursor: 'pointer',
    '&:active': {
      backgroundColor: '#0072ff',
    },
  }),
};

function Agentlist() {
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [activeTab, setActiveTab] = useState("about");
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [ticketFormData, setTicketFormData] = useState({
    email: "",
    message: "",
  });
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [showNumberOptions, setShowNumberOptions] = useState(false);
  const [optionType, setOptionType] = useState("");

  const sliderSettings = {
    dots: true,
    infinite: true,
    speed: 500,
    slidesToShow: 1,
    slidesToScroll: 1,
    autoplay: true,
    autoplaySpeed: 3000,
    centerMode: true,
    centerPadding: "0px",
  };

  useEffect(() => {
    const fetchDistricts = async () => {
      setIsLoading(true);
      try {
        const token = getToken();
        if (!token) throw new Error("No authentication token found. Please log in.");
        const response = await axios.get(
          `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/property-districts`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const districtsData = response.data || [];
        setDistricts(districtsData);

        const uniqueStates = [...new Set(districtsData.map((item) => item.state))].sort();
        setStates(uniqueStates);
        setFilteredDistricts([]);
      } catch (err) {
        console.error("Error fetching districts:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (selectedState) {
      const filtered = districts.filter((district) => district.state === selectedState.value);
      setFilteredDistricts(filtered);
      setSelectedDistrict(null);
    } else {
      setFilteredDistricts([]);
      setSelectedDistrict(null);
    }
  }, [selectedState, districts]);

  // Convert states to react-select format
  const stateOptions = states.map((state) => ({ value: state, label: state }));

  // Convert districts to react-select format
  const districtOptions = filteredDistricts.map((district) => ({
    value: district.name,
    label: district.name,
  }));

  // Filter agents
  const filteredAgents = agentsData.map((agent) => {
    const agentDistricts = agent.district.split(", ").map((d) => d.trim());
    return {
      ...agent,
      displayDistrict: selectedDistrict
        ? agentDistricts.includes(selectedDistrict.value)
          ? selectedDistrict.value
          : agent.district
        : agent.district,
    };
  }).filter((agent) => {
    const agentDistricts = agent.district.split(", ").map((d) => d.trim());
    
    const stateMatch = selectedState ? agent.state === selectedState.value : true;
    const districtMatch = selectedDistrict ? agentDistricts.includes(selectedDistrict.value) : true;
    
    return stateMatch && districtMatch;
  });

  const handleTicketChange = (e) => {
    const { name, value } = e.target;
    setTicketFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTicketSubmit = async (e) => {
    e.preventDefault();
    setTicketSubmitting(true);
    try {
      const token = getToken();
      if (!token) throw new Error("No authentication token found.");
      await axios.post(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/complaints`,
        {
          email: ticketFormData.email,
          message: ticketFormData.message,
          managerId: selectedAgent.id,
          managerEmail: selectedAgent.email,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Ticket raised successfully!");
      setTicketFormData({ email: "", message: "" });
    } catch (err) {
      toast.error("Failed to raise ticket. Please try again.");
    } finally {
      setTicketSubmitting(false);
    }
  };

  return (
    <>
      <section className="hrtc-agents-section">
        <h2 className="hrtc-section-title">Meet Our District Managers</h2>
        <p className="hrtc-section-subtitle">
          Filter managers by <b>State</b> & <b>District</b>
        </p>

        {/* Search Bar with Searchable Dropdowns */}
        <div className="agentlist-searchbar">
          {isLoading && <div className="text-blue-600 text-sm mb-2">Loading states and districts...</div>}
          
          {/* State Searchable Dropdown */}
          <div className="select-wrapper">
            <Select
              options={stateOptions}
              value={selectedState}
              onChange={(option) => {
                setSelectedState(option);
                setSelectedDistrict(null);
              }}
              placeholder="Select State"
              isClearable
              isSearchable
              isDisabled={isLoading}
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>

          {/* District Searchable Dropdown */}
          <div className="select-wrapper">
            <Select
              options={districtOptions}
              value={selectedDistrict}
              onChange={(option) => setSelectedDistrict(option)}
              placeholder="Select District"
              isClearable
              isSearchable
              isDisabled={!selectedState || isLoading}
              styles={customSelectStyles}
              className="react-select-container"
              classNamePrefix="react-select"
            />
          </div>

          <button className="my-search-btn" disabled={isLoading}>
            Search
          </button>
        </div>

        {/* Desktop / Tablet layout */}
        <div className="agentlist-cards desktop-view">
          {filteredAgents.length > 0 ? (
            filteredAgents.map((agent) => (
              <div key={agent.id} className="hrtc-agent-card">
                <img src={agent.img} alt={agent.name} className="hrtc-agent-img" />
                <h3 className="hrtc-agent-name">{agent.name}</h3>
                <p className="hrtc-agent-role">{agent.role}</p>
                <p className="hrtc-agent-desc">{agent.description}</p>
                <p className="hrtc-agent-district">District: {agent.displayDistrict}</p>
                <button
                  className="hrtc-view-profile"
                  onClick={() => {
                    setSelectedAgent({ ...agent, displayDistrict: agent.displayDistrict });
                    setActiveTab("about");
                  }}
                >
                  View Profile
                </button>
              </div>
            ))
          ) : (
            <p className="no-results">No managers found for the selected filters.</p>
          )}
        </div>

        {/* Mobile slider */}
        <div className="mobile-slider">
          {filteredAgents.length > 0 ? (
            <Slider {...sliderSettings}>
              {filteredAgents.map((agent) => (
                <div key={agent.id} className="hrtc-agent-card">
                  <img src={agent.img} alt={agent.name} className="hrtc-agent-img" />
                  <h3 className="hrtc-agent-name">{agent.name}</h3>
                  <p className="hrtc-agent-role">{agent.role}</p>
                  <p className="hrtc-agent-desc">{agent.description}</p>
                  <p className="hrtc-agent-district">District: {agent.displayDistrict}</p>
                  <button
                    className="hrtc-view-profile"
                    onClick={() => {
                      setSelectedAgent({ ...agent, displayDistrict: agent.displayDistrict });
                      setActiveTab("about");
                    }}
                  >
                    View Profile
                  </button>
                </div>
              ))}
            </Slider>
          ) : (
            <p className="no-results">No managers found for the selected filters.</p>
          )}
        </div>
      </section>

      {/* Modal */}
      {selectedAgent && (
        <div className="modal-overlay">
          <div className="modal-content">
            <span className="modal-close" onClick={() => setSelectedAgent(null)}>
              &times;
            </span>
            <h2 className="modal-title">Manager Profile</h2>
            <div className="modal-profile">
              <img src={selectedAgent.img} alt={selectedAgent.name} className="modal-img" />
              <div className="modal-info">
                <h3 className="modal-name">
                  {selectedAgent.name} <FaCheckCircle className="verified-icon" />
                </h3>
                <p className="modal-role">{selectedAgent.role}</p>
                <p className="modal-email">{selectedAgent.email}</p>
                <div className="modal-rating">
                  {Array.from({ length: Math.floor(selectedAgent.rating) }).map((_, i) => (
                    <FaStar key={i} className="star-icon" />
                  ))}
                  {selectedAgent.rating % 1 !== 0 && <FaStar className="star-icon half" />}
                  <span className="rating-text">
                    {selectedAgent.rating} ({selectedAgent.reviews} Review{selectedAgent.reviews > 1 ? "s" : ""})
                  </span>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              {/* href={`mailto:${selectedAgent.email}`} */}
              <p  className="action-btn email-btn">
                <FaEnvelope /> Email
              </p>
              <button className="action-btn call-btn"
              //  onClick={() => { setOptionType("call"); setShowNumberOptions(true); }}
               >
                <FaPhoneAlt /> Call
              </button>
              <button className="action-btn whatsapp-btn" 
              // onClick={() => { setOptionType("whatsapp"); setShowNumberOptions(true); }}
              >
                <FaWhatsapp /> WhatsApp
              </button>
            </div>
            <div className="modal-tabs">
              <span
                className={`tab-item ${activeTab === "about" ? "active" : ""}`}
                onClick={() => setActiveTab("about")}
              >
                About
              </span>
              <span
                className={`tab-item ${activeTab === "reviews" ? "active" : ""}`}
                onClick={() => setActiveTab("reviews")}
              >
                Reviews
              </span>
              <span
                className={`tab-item ${activeTab === "ticket" ? "active" : ""}`}
                onClick={() => setActiveTab("ticket")}
              >
                Raise Ticket
              </span>
            </div>
            <div className="modal-tab-content">
              {activeTab === "about" && (
                <div className="about-section">
                  <h4>Details</h4>
                  <p>
                    <FaBuilding className="icon" /> Company: {selectedAgent.company}
                  </p>
                  <p>
                    <FaGlobe className="icon" /> Website:{" "}
                    <a href={`https://${selectedAgent.website}`} target="_blank" rel="noopener noreferrer">
                      {selectedAgent.website}
                    </a>
                  </p>
                  <p>
                    <FaMapMarkerAlt className="icon" /> Address:{" "}
                    {selectedAgent.address.replace(
                      /Saharsa|Purnia|Munger|Lakhisarai|Begusarai/,
                      selectedAgent.displayDistrict
                    )}
                  </p>
                  <p>
                    <FaHome className="icon" /> Properties: {selectedAgent.listings} listings
                  </p>
                </div>
              )}
              {activeTab === "reviews" && (
                <div className="reviews-section">
                  <h4>Reviews</h4>
                  {selectedAgent.reviews > 0 ? (
                    <p>{selectedAgent.reviews} customer review(s) available.</p>
                  ) : (
                    <>
                      <p className="no-reviews">No reviews yet. Be the first to leave one!</p>
                      <div className="review-placeholder">
                        <p>We value your feedback. Share your experience with {selectedAgent.name}.</p>
                      </div>
                    </>
                  )}
                </div>
              )}
              {activeTab === "ticket" && (
                <div className="ticket-section">
                  <h4>Raise a Ticket</h4>
                  <form onSubmit={handleTicketSubmit} className="ticket-form">
                    <input
                      type="email"
                      name="email"
                      value={ticketFormData.email}
                      onChange={handleTicketChange}
                      placeholder="Your Email"
                      required
                      className="form-input"
                    />
                    <textarea
                      name="message"
                      value={ticketFormData.message}
                      onChange={handleTicketChange}
                      placeholder="Your Message"
                      rows="2"
                      required
                      className="form-textarea"
                    ></textarea>
                    <button type="submit" className="submit-btn" disabled={ticketSubmitting}>
                      {ticketSubmitting ? "Submitting..." : "Submit Ticket"}
                    </button>
                  </form>
                </div>
              )}
            </div>
            {showNumberOptions && (
              <div className="number-options-overlay">
                <div className="number-options-content">
                  <span className="modal-close" onClick={() => setShowNumberOptions(false)}>
                    &times;
                  </span>
                  <h4>Select {optionType.charAt(0).toUpperCase() + optionType.slice(1)} Number</h4>
                  <div className="number-options-list">
                    {selectedAgent.mobile.split(", ").map((num, index) => (
                      <a
                        key={index}
                        href={optionType === "call" ? `tel:${num}` : `https://wa.me/${num}`}
                        className="number-option-btn"
                      >
                        {num}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      <ToastContainer />
    </>
  );
}

export default Agentlist;