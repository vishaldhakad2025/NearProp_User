import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import axios from "axios";

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

// Get user location from localStorage or Geolocation API
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
  const R = 6371; // Radius of the earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function CityProperty() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [finalProperties, setFinalProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Sidebar filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const locationHook = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(locationHook.search);
  const cityParam = params.get("city");

  const { baseUrl, apiPrefix } = API_CONFIG;

  // Check authentication
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
        onClose: () => {
          navigate("/login", { state: { from: locationHook.pathname + locationHook.search } });
        },
      });
    }
  }, [navigate, locationHook]);

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

  // Fetch properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const token = getToken();
        if (!token) return;

        const response = await fetch(`${baseUrl}/${apiPrefix}/properties`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) throw new Error("Failed to fetch properties");

        const data = await response.json();
        if (data.success) {
          const formattedProperties = (data.data || []).map((property) => ({
            ...property,
            latitude: property.latitude || null,
            longitude: property.longitude || null,
          }));
          setProperties(formattedProperties);
          if (cityParam) {
            const cityFiltered = formattedProperties.filter(
              (p) => p.city && p.city.toLowerCase() === cityParam.toLowerCase()
            );
            setFilteredProperties(cityFiltered);
            setFinalProperties(cityFiltered);
          } else {
            setFilteredProperties(formattedProperties);
            setFinalProperties(formattedProperties);
          }
        } else {
          throw new Error(data.message || "API error");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [baseUrl, apiPrefix, cityParam]);

  // Fetch districts/states/cities
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

  // Apply Filters
  const applyFilters = () => {
    let filtered = [...filteredProperties];

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

    setFinalProperties(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [
    filteredProperties,
    searchQuery,
    filterPriceMin,
    filterPriceMax,
    filterBedrooms,
    filterType,
    filterStatus,
    selectedState,
    selectedDistrict,
    selectedCity,
  ]);

  // Do not render properties if not authenticated
  const token = getToken();
  if (!token) {
    return <ToastContainer />;
  }

  return (
    <>
      <style>
        {`
          /* Container */
          .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 16px;
          }

          /* Flex Container */
          .flex-container {
            display: flex;
            flex-wrap: wrap;
            gap: 24px;
            align-items: flex-start;
          }

          /* Main Content */
          .main-content {
            flex: 3;
            min-width: 280px;
            padding-top: 0;
          }

          .main-content h2 {
            font-size: 1.5rem;
            font-weight: 700;
            color: #1a202c;
            margin: 0 0 16px;
          }

          /* Card Grid */
          .card-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 20px;
          }

          /* Property Card */
          .landing-property-card {
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            display: flex;
            flex-direction: column;
            height: 100%;
          }

          .landing-property-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
          }

          /* Image Container */
          .landing-image-container {
            position: relative;
            height: 200px;
            width: 100%;
            overflow: hidden;
          }

          .landing-property-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
          }

          .landing-property-card:hover .landing-property-image {
            transform: scale(1.05);
          }

          /* Labels */
          .landing-label {
            position: absolute;
            top: 12px;
            left: 12px;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 600;
            color: #ffffff;
            z-index: 10;
            text-transform: capitalize;
          }

          .landing-for-sale {
            background-color: #2f855a;
          }

          .landing-for-rent {
            background-color: #3182ce;
          }

          /* Overlay Icons */
          .landing-overlay-icons-left {
            position: absolute;
            bottom: 12px;
            left: 12px;
            background: rgba(0, 0, 0, 0.7);
            color: #ffffff;
            padding: 8px 12px;
            border-radius: 8px;
            font-size: 0.875rem;
            font-weight: 500;
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .landing-overlay-icons-left span {
            font-size: 0.75rem;
            font-weight: 400;
          }

          .landing-overlay-icons-right {
            position: absolute;
            top: 12px;
            right: 12px;
            background: rgba(0, 0, 0, 0.7);
            color: #ffffff;
            padding: 6px 10px;
            border-radius: 8px;
            font-size: 0.875rem;
            z-index: 10;
            display: flex;
            align-items: center;
            gap: 4px;
          }

          /* Property Info */
          .landing-property-info {
            padding: 16px;
            flex-grow: 1;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .landing-property-info h2 {
            font-size: 1.25rem;
            font-weight: 600;
            color: #1a202c;
            margin: 0 0 10px;
            line-height: 1.4;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .landing-location {
            font-size: 0.875rem;
            color: #4a5568;
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 12px;
            flex-wrap: wrap;
          }

          .landing-location svg {
            font-size: 0.875rem;
            color: #718096;
          }

          .distance-text {
            font-weight: 500;
            color: #0e7490;
            margin-left: 4px;
          }

          .landing-details {
            display: flex;
            gap: 16px;
            font-size: 0.875rem;
            color: #4a5568;
            margin-bottom: 12px;
            flex-wrap: wrap;
          }

          .landing-details span {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .landing-details svg {
            color: #718096;
          }

          .landing-type {
            font-size: 0.875rem;
            font-weight: 600;
            color: #3182ce;
            margin-bottom: 12px;
            text-transform: capitalize;
          }

          .landing-footer {
            display: flex;
            justify-content: space-between;
            font-size: 0.75rem;
            color: #718096;
            border-top: 1px solid #e2e8f0;
            padding-top: 12px;
            flex-wrap: wrap;
            gap: 10px;
          }

          .landing-footer span {
            display: flex;
            align-items: center;
            gap: 6px;
          }

          .landing-footer svg {
            color: #718096;
          }

          /* Sidebar */
          .sidebar {
            flex: 1;
            min-width: 280px;
            margin-top: 30px;
          }

          .filter-box {
            background: #f7fafc;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
            margin-bottom: 16px;
          }

          .filter-box h3 {
            font-size: 1.125rem;
            font-weight: 600;
            color: #1a202c;
            margin: 0 0 12px;
          }

          .filter-group {
            margin-bottom: 12px;
          }

          .filter-label {
            font-size: 0.875rem;
            font-weight: 500;
            color: #1a202c;
            margin-bottom: 6px;
            display: block;
          }

          .filter-box input,
          .filter-box select {
            width: 100%;
            padding: 8px;
            margin-bottom: 8px;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            font-size: 0.875rem;
            transition: border-color 0.2s ease;
          }

          .filter-box input:focus,
          .filter-box select:focus {
            outline: none;
            border-color: #3182ce;
            box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.2);
          }

          .price-range-group {
            margin-bottom: 12px;
          }

          .price-range-inputs {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .price-input {
            flex: 1;
          }

          .price-range-divider {
            font-size: 0.875rem;
            color: #4a5568;
          }

          .filter-box button {
            width: 100%;
            padding: 8px;
            background-color: #3182ce;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            font-size: 0.875rem;
            cursor: pointer;
            transition: background-color 0.2s ease;
          }

          .filter-box button:hover {
            background-color: #2b6cb0;
          }

          /* Featured Box */
          .featured-box {
            background: #f7fafc;
            padding: 16px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          }

          .featured-box h3 {
            font-size: 1.125rem;
            font-weight: 600;
            color: #1a202c;
            margin: 0 0 12px;
          }

          .featured-card img {
            width: 100%;
            height: 140px;
            object-fit: cover;
            border-radius: 6px;
            margin-bottom: 12px;
          }

          .featured-card .price {
            font-size: 1rem;
            font-weight: 600;
            color: #2f855a;
            margin: 0 0 8px;
          }

          .featured-card .address {
            font-size: 0.875rem;
            color: #4a5568;
          }

          /* Spinner */
          .spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 300px;
            font-size: 1rem;
            color: #4a5568;
          }

          .spinner-icon {
            width: 40px;
            height: 40px;
            border: 3px solid #e2e8f0;
            border-top: 3px solid #3182ce;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* Error */
          .error {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 300px;
            font-size: 1rem;
            color: #c53030;
          }

          .error button {
            margin-top: 12px;
            padding: 8px 16px;
            background-color: #3182ce;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          }

          .error button:hover {
            background-color: #2b6cb0;
          }

          /* No Data */
          .no-data {
            font-size: 1rem;
            color: #4a5568;
            text-align: center;
            padding: 16px;
          }

          /* Warning */
          .warning {
            font-size: 1rem;
            color: #c53030;
            margin-bottom: 12px;
            text-align: center;
          }

          .warning button {
            margin-left: 8px;
            padding: 6px 12px;
            background-color: #3182ce;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            cursor: pointer;
          }

          .warning button:hover {
            background-color: #2b6cb0;
          }

          /* Media Queries for Mobile Responsiveness */
          @media (max-width: 768px) {
            .container {
              padding: 12px;
            }

            .flex-container {
              flex-direction: column;
              align-items: stretch;
            }

            .main-content,
            .sidebar {
              min-width: 100%;
            }

            .main-content h2 {
              font-size: 1.25rem;
              margin-bottom: 12px;
            }

            .card-grid {
              grid-template-columns: 1fr;
              gap: 16px;
            }

            .landing-image-container {
              height: 180px;
            }

            .landing-property-info {
              padding: 12px;
            }

            .landing-property-info h2 {
              font-size: 1rem;
              -webkit-line-clamp: 1;
            }

            .landing-location {
              font-size: 0.75rem;
              gap: 6px;
            }

            .landing-location svg {
              font-size: 0.75rem;
            }

            .landing-details {
              font-size: 0.75rem;
              gap: 12px;
            }

            .landing-type {
              font-size: 0.75rem;
            }

            .landing-footer {
              font-size: 0.7rem;
              flex-direction: column;
              align-items: flex-start;
              gap: 6px;
            }

            .landing-label {
              font-size: 0.75rem;
              padding: 4px 8px;
            }

            .landing-overlay-icons-left {
              font-size: 0.75rem;
              padding: 6px 10px;
            }

            .landing-overlay-icons-left span {
              font-size: 0.65rem;
            }

            .landing-overlay-icons-right {
              font-size: 0.75rem;
              padding: 4px 8px;
            }

            .filter-box {
              padding: 12px;
            }

            .filter-box h3 {
              font-size: 1rem;
            }

            .filter-label {
              font-size: 0.75rem;
            }

            .filter-box input,
            .filter-box select {
              padding: 6px;
              font-size: 0.75rem;
            }

            .price-range-inputs {
              flex-direction: column;
              gap: 6px;
            }

            .price-range-divider {
              font-size: 0.75rem;
            }

            .filter-box button {
              padding: 6px;
              font-size: 0.75rem;
            }

            .featured-box {
              padding: 12px;
            }

            .featured-box h3 {
              font-size: 1rem;
            }

            .featured-card img {
              height: 120px;
            }

            .featured-card .price {
              font-size: 0.875rem;
            }

            .featured-card .address {
              font-size: 0.75rem;
            }

            .spinner,
            .error,
            .no-data,
            .warning {
              font-size: 0.875rem;
            }

            .spinner-icon {
              width: 32px;
              height: 32px;
              border-width: 2px;
            }
          }

          @media (max-width: 480px) {
            .container {
              padding: 8px;
            }

            .main-content h2 {
              font-size: 1.125rem;
            }

            .landing-image-container {
              height: 160px;
            }

            .landing-property-info h2 {
              font-size: 0.9rem;
            }

            .landing-location {
              font-size: 0.7rem;
            }

            .landing-details {
              font-size: 0.7rem;
            }

            .landing-type {
              font-size: 0.7rem;
            }

            .landing-footer {
              font-size: 0.65rem;
            }

            .landing-label {
              font-size: 0.7rem;
              padding: 3px 6px;
            }

            .landing-overlay-icons-left {
              font-size: 0.7rem;
              padding: 5px 8px;
            }

            .landing-overlay-icons-left span {
              font-size: 0.6rem;
            }

            .landing-overlay-icons-right {
              font-size: 0.7rem;
              padding: 3px 6px;
            }

            .filter-box h3 {
              font-size: 0.875rem;
            }

            .filter-label {
              font-size: 0.7rem;
            }

            .filter-box input,
            .filter-box select {
              padding: 5px;
              font-size: 0.7rem;
            }

            .price-range-divider {
              font-size: 0.7rem;
            }

            .filter-box button {
              padding: 5px;
              font-size: 0.7rem;
            }

            .featured-box h3 {
              font-size: 0.875rem;
            }

            .featured-card img {
              height: 100px;
            }

            .featured-card .price {
              font-size: 0.8rem;
            }

            .featured-card .address {
              font-size: 0.7rem;
            }

            .spinner,
            .error,
            .no-data,
            .warning {
              font-size: 0.8rem;
            }
          }
        `}
      </style>
      <div className="container">
        <ToastContainer />
        {locationError && (
          <div className="warning">
            {locationError}
            <button
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
        <div className="flex-container">
          {/* Main Content */}
          <div className="main-content">
            <h2>Properties in {cityParam || "All Cities"}</h2>

            {loading ? (
              <div className="">
                {/* <div className="spinner-icon"></div> */}
                <p>Loading properties...</p>
              </div>
            ) : error ? (
              <div className="error">
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
              </div>
            ) : finalProperties.length === 0 ? (
              <p className="no-data">⚠️ Data not found for {cityParam}</p>
            ) : (
              <div className="card-grid">
                {finalProperties.map((property) => {
                  const propertyTypeLower = property?.type.toLowerCase();
                  const hideResidentialDetails =
                    propertyTypeLower === "plot" || propertyTypeLower === "commercial";
                  return (
                    <Link
                      to={`/propertySell/${property.id}`}
                      key={property.id}
                      className="property-card-link"
                      aria-label={`View details for ${property.title || "Untitled Property"}`}
                    >
                      <div className="landing-property-card">
                        <div className="landing-image-container">
                          <img
                            src={property.imageUrls?.[0] || "https://via.placeholder.com/300x200?text=No+Image"}
                            alt={property.title || "Property"}
                            className="landing-property-image"
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
                          >
                            {property.status?.replace("_", " ") || "For Sale"}
                          </span>
                          <div className="landing-overlay-icons-right">
                            <FontAwesomeIcon icon={faComment} /> {property.reelCount || 0}
                          </div>
                          <div className="landing-overlay-icons-left">
                            <div>
                              ₹{property.price ? Number(property.price).toLocaleString("en-IN") : "N/A"}
                              <br />
                              <span>
                                ₹
                                {property.price && property.area
                                  ? Math.round(Number(property.price) / Number(property.area))
                                  : "N/A"}
                                /Sq Ft
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="landing-property-info">
                          <h2>{property.title || "Untitled Property"}</h2>
                          <div className="landing-location">
                            <FontAwesomeIcon icon={faMapMarkerAlt} />
                            {property.address || "No Address"}
                            <span className="distance-text">
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
                          <div className="landing-details">
                            {!hideResidentialDetails && (
                              <span>
                                <FontAwesomeIcon icon={faBed} /> {property.bedrooms || 0}
                              </span>
                            )}
                            {!hideResidentialDetails && (
                              <span>
                                <FontAwesomeIcon icon={faShower} /> {property.bathrooms || 0}
                              </span>
                            )}
                            {!hideResidentialDetails && (
                              <span>
                                <FontAwesomeIcon icon={faCar} /> {property.garages || 0}
                              </span>
                            )}
                            <span>
                              {property.area || "N/A"} {property.sizePostfix || "Sq Ft"}
                            </span>
                          </div>
                          <div className="landing-type">
                            <strong>{property.type || "Unknown"}</strong>
                          </div>
                          <div className="landing-footer">
                            <span>
                              <FontAwesomeIcon icon={faUser} /> {property.owner?.name || "Unknown"}
                            </span>
                            <span>
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

          {/* Sidebar */}
          <aside className="sidebar">
            <div className="filter-box">
              <h3>Filter Properties</h3>
              <div className="filter-group">
                <label className="filter-label">Search by Title</label>
                <input
                  type="text"
                  placeholder="Search by title"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Search properties by title"
                />
              </div>
              <div className="filter-group">
                <label className="filter-label">State</label>
                <select
                  value={selectedState}
                  onChange={(e) => setSelectedState(e.target.value)}
                  aria-label="Filter by state"
                >
                  <option value="">Select State</option>
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
                  aria-label="Filter by district"
                  disabled={!selectedState}
                >
                  <option value="">Select District</option>
                  {filteredDistricts.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">City</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  aria-label="Filter by city"
                  disabled={!selectedState}
                >
                  <option value="">Select City</option>
                  {filteredCities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="filter-group">
                <label className="filter-label">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  aria-label="Filter by status"
                >
                  <option value="All">All</option>
                  <option value="For Sale">For Sale</option>
                  <option value="For Rent">For Rent</option>
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
                    className="price-input"
                    aria-label="Minimum price filter"
                  />
                  <span className="price-range-divider">to</span>
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={filterPriceMax}
                    onChange={(e) => setFilterPriceMax(e.target.value)}
                    className="price-input"
                    aria-label="Maximum price filter"
                  />
                </div>
              </div>
              <div className="filter-group">
                <label className="filter-label">Minimum Bedrooms</label>
                <select
                  value={filterBedrooms}
                  onChange={(e) => setFilterBedrooms(e.target.value)}
                  aria-label="Filter by number of bedrooms"
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
                  aria-label="Filter by property type"
                >
                  <option value="">All Types</option>
                  <option value="villa">Villa</option>
                  <option value="condo">Condo</option>
                  <option value="multi_family_home">Multi Family Home</option>
                  <option value="single_family_home">Single Family Home</option>
                  <option value="commercial">Commercial</option>
                  <option value="house">House</option>
                  <option value="plot">Plot</option>
                </select>
              </div>
              <button onClick={applyFilters}>Apply Filters</button>
            </div>

            <div className="featured-box">
              <h3>Nearprop Trusted</h3>
              <div className="featured-card">
                <img
                  src="https://my-nearprop-bucket.s3.ap-south-1.amazonaws.com/properties/user/93_tese-for-property/37_tiranga-crest/37-tiranga-crest-aa3eb211-e43a-4360-8c4f-f48b9335fa94.jpg"
                  alt="Featured Property"
                />
                <p className="price">₹65,00,000</p>
                <p className="address">Satna, Madhya Pradesh</p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

export default CityProperty;