import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuildingColumns, faStar, faHouse, faBuilding, faHotel, faBed, faMapMarkerAlt, faComment, faUser, faPaperclip, faShower, faCar } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import Slider from 'react-slick';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import './LandingPage.css';

import Apartment from '../assets/A-1.avif';
import Apartment2 from '../assets/c-2.avif';
import Apartment3 from '../assets/apartment.avif';
import Apartment4 from '../assets/studio.jpg';
import Apartment6 from '../assets/penthouse.avif';
import Apartment7 from '../assets/villa.avif';
import RealEstateForm from './RealEstateForm';
import City from './City';
import Explore from './Explore';
import Agentlist from './Agentlist';
import Testimonal from './Testimonal';
import Shopgrid from './Shopgrid';
import PgAndHostels from '../Components/PgAndHostels';
import Banquetandhalls from '../Components/Banquetandhall';
import FeaturedProperties from '../Components/FeaturedProperty';

// Toastify import
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { showToast } from '../utils/showToast';
import DownloadApp from './DownloadApp';

const API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  hotelBanquetBaseUrl: 'https://hotel-banquet.nearprop.in',
  pgHostelBaseUrl: 'https://pg-hostel.nearprop.com',
  apiPrefix: 'api',
};

// Local fallback images
const fallbackImages = [Apartment, Apartment2, Apartment3, Apartment4, Apartment6, Apartment7];

// Helper function to pick first valid image
const getValidImage = (images, fallback, baseUrl = "") => {
  if (!Array.isArray(images) || images.length === 0) return fallback;
  const validImg = images.find(
    img => img && img.trim() !== "" && !img.toLowerCase().includes("white")
  );
  return validImg ? (validImg.startsWith("http") ? validImg : `${baseUrl}${validImg}`) : fallback;
};

const getToken = () => {
  try {
    const authData = localStorage.getItem('authData');
    if (!authData) {
      console.warn('No authData found in localStorage');
      return null;
    }
    const parsedData = JSON.parse(authData);
    const token = parsedData.token || null;
    return token;
  } catch (err) {
    console.error('Error parsing authData:', err.message);
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

// 🔹 Get user location
const getUserLocation = () => {
  return new Promise((resolve) => {
    try {
      const locationData = localStorage.getItem("myLocation");
      if (locationData) {
        const parsedLocation = JSON.parse(locationData);
        if (parsedLocation.latitude && parsedLocation.longitude) {
          return resolve(parsedLocation);
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
        console.error("Geolocation error:", err.message);
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

// 🔹 Reusable Searchable Dropdown with Type + Select
const SearchableDropdown = ({ label, name, value, onChange, options, placeholder, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleInputChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange({ target: { name, value: val } });
    setIsOpen(true);
  };

  const handleOptionClick = (val) => {
    setSearchTerm(val);
    onChange({ target: { name, value: val } });
    setIsOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <label style={{ fontSize: '13px' }}>{label}</label>
      <input
        type="text"
        className="search-select"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        style={{ width: '100%', padding: '8px', fontSize: '15px' }}
      />
      {isOpen && filteredOptions.length > 0 && (
        <ul
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'white',
            border: '1px solid #ccc',
            borderRadius: '6px',
            maxHeight: '200px',
            overflowY: 'auto',
            zIndex: 10,
            margin: 0,
            padding: 0,
            listStyle: 'none',
            boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
          }}
        >
          {filteredOptions.map((option) => (
            <li
              key={option.value}
              onMouseDown={() => handleOptionClick(option.value)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                backgroundColor: option.value === value ? '#f0f0f0' : 'white',
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
              onMouseLeave={(e) => e.target.style.backgroundColor = option.value === value ? '#f0f0f0' : 'white'}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// 🔹 CitySearch Component (unchanged)
const CitySearch = ({ formData, handleFormChange, isLoading, cities }) => {
  const [searchTerm, setSearchTerm] = useState(formData.city || '');
  const [isOpen, setIsOpen] = useState(false);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    handleFormChange({ target: { name: 'city', value } });
    setIsOpen(value.trim().length > 0);
  };

  const handleOptionClick = (city) => {
    setSearchTerm(city);
    handleFormChange({ target: { name: 'city', value: city } });
    setIsOpen(false);
  };

  const filteredCities = cities
    .filter((city) => city.toLowerCase().includes(searchTerm.toLowerCase()))
    .slice(0, 6);

  return (
    <div className="local" style={{ position: 'relative' }}>
      <label className="locations" style={{ fontSize: '13px' }}>CITY</label>
      <input
        type="text"
        name="city"
        className="search-select"
        value={searchTerm}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        placeholder="Type or select a city"
        disabled={isLoading}
        style={{ width: '100%', padding: '8px', fontSize: '15px' }}
      />
      {isOpen && filteredCities.length > 0 && (
        <ul
          onMouseLeave={() => setIsOpen(false)}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "15px",
            color: "#333",
            border: "1px solid #ccc",
            borderRadius: "6px",
            outline: "none",
            transition: "border 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
            position: "absolute",
            zIndex: 10,
            background: "white",
            listStyle: "none",
            margin: 0,
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            top: "50px",
          }}
        >
          <li
            key="all-cities"
            onClick={() => handleOptionClick('')}
            style={{
              padding: '8px',
              cursor: 'pointer',
              fontSize: '15px',
              background: searchTerm === '' ? '#f0f0f0' : '#fff',
            }}
            onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
            onMouseLeave={(e) => e.target.style.background = searchTerm === '' ? '#f0f0f0' : '#fff'}
          >
            All Cities
          </li>
          {filteredCities.map((city) => (
            <li
              key={city}
              onMouseDown={() => handleOptionClick(city)}
              style={{
                padding: '8px',
                cursor: 'pointer',
                fontSize: '15px',
                background: searchTerm === city ? '#f0f0f0' : '#fff',
              }}
              onMouseEnter={(e) => e.target.style.background = '#f0f0f0'}
              onMouseLeave={(e) => e.target.style.background = searchTerm === city ? '#f0f0f0' : '#fff'}
            >
              {city}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

function LandingPage() {
  const [formData, setFormData] = useState({
    propertyType: '',
    city: '',
    state: '',
    district: '',
    bedrooms: '',
    areaRange: '',
    priceRange: '',
    status: 'all',
  });
  const [activeTab, setActiveTab] = useState('all');
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const navigate = useNavigate();

  // Fetch user location
  useEffect(() => {
    getUserLocation().then((loc) => {
      if (loc) {
        setUserLocation(loc);
        setLocationError(null);
      } else {
        setLocationError("Unable to fetch location. Using default filters.");
      }
    });
  }, []);

  // Fetch states, districts, and cities
  useEffect(() => {
    const fetchDistricts = async () => {
      setIsLoading(true);
      try {
        const token = getToken();
        if (!token) throw new Error('No authentication token found. Please log in.');
        const response = await axios.get(`${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/property-districts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const districtsData = response.data || [];
        setDistricts(districtsData);
        const uniqueStates = [...new Set(districtsData.map(item => item.state))].sort();
        setStates(uniqueStates);
        const uniqueCities = [...new Set(districtsData.map(item => item.city).filter(city => city))].sort();
        setCities(uniqueCities);
        setFilteredDistricts([]);
      } catch (err) {
        console.error('Error fetching districts:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDistricts();
  }, []);

  // Update filtered districts when state changes
  useEffect(() => {
    if (formData.state) {
      const filtered = districts.filter(district => district.state === formData.state);
      setFilteredDistricts(filtered);
      setFormData(prev => ({ ...prev, district: '', city: '' }));
    } else {
      setFilteredDistricts([]);
      setFormData(prev => ({ ...prev, district: '', city: '' }));
    }
  }, [formData.state, districts]);

  // Update formData.status when activeTab changes
  useEffect(() => {
    setFormData(prev => ({ ...prev, status: activeTab }));
  }, [activeTab]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!formData.propertyType && !formData.city && !formData.bedrooms && !formData.areaRange && !formData.priceRange && formData.status === 'all') {
      toast.error("Please select at least one filter to search!", {
        position: 'top-center',
        autoClose: 3000,
        theme: "colored",
      });
      return;
    }

    setIsLoading(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      let properties = [];
      let apiUrl = '';
      let isMainAPI = true;

      if (formData.status === 'pg' || formData.status === 'hostel' || formData.propertyType === 'PG' || formData.propertyType === 'HOSTEL') {
        apiUrl = `${API_CONFIG.pgHostelBaseUrl}/${API_CONFIG.apiPrefix}/public/properties`;
        isMainAPI = false;
      } else if (formData.status === 'hotel' || formData.status === 'banquet' || formData.propertyType === 'HOTEL' || formData.propertyType === 'BANQUET') {
        const endpoint = formData.status === 'hotel' || formData.propertyType === 'HOTEL' ? 'hotels' : 'banquet-halls';
        const response = await fetch(`${API_CONFIG.hotelBanquetBaseUrl}/${API_CONFIG.apiPrefix}/${endpoint}`);
        const data = await response.json();
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        properties = (data.data?.[endpoint] || []).map(item => ({
          ...item,
          type: formData.status === 'hotel' || formData.propertyType === 'HOTEL' ? 'HOTEL' : 'BANQUET',
          id: item.hotelId || item.banquetHallId || item._id,
          title: item.name,
          address: `${item.city || ""}, ${item.state || ""}`,
          imageUrls: item.images || [],
          status: item.isAvailable ? "AVAILABLE" : "UNAVAILABLE",
          price: item.pricing?.nightly || item.pricing?.event || 0,
          bedrooms: item.rooms?.length || 0,
          bathrooms: item.bathrooms || 0,
          garages: item.parking?.spaces || 0,
          area: item.area || 0,
          owner: { name: item.owner?.name || "Unknown" },
          createdAt: item.createdAt,
          state: item.state || "",
          district: item.districtId || "",
          city: item.city || "",
          latitude: item.location?.coordinates?.[1] || null,
          longitude: item.location?.coordinates?.[0] || null,
        }));
        isMainAPI = false;
      } else {
        apiUrl = `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/properties`;
      }

      if (isMainAPI) {
        const queryParams = new URLSearchParams();
        if (formData.propertyType) queryParams.append('type', formData.propertyType);
        if (formData.state) queryParams.append('state', formData.state);
        if (formData.district) queryParams.append('district', formData.district);
        if (formData.city) queryParams.append('city', formData.city);
        if (formData.bedrooms && formData.propertyType !== 'PLOT') queryParams.append('bedrooms', formData.bedrooms);
        if (formData.areaRange && formData.propertyType === 'PLOT') {
          const [minArea, maxArea] = formData.areaRange.split('-');
          queryParams.append('minArea', minArea);
          queryParams.append('maxArea', maxArea);
        }
        if (formData.priceRange) {
          const [minPrice, maxPrice] = formData.priceRange.split('-');
          queryParams.append('minPrice', minPrice);
          queryParams.append('maxPrice', maxPrice);
        }
        if (formData.status && formData.status !== 'all') {
          const statusMap = {
            rent: 'FOR_RENT',
            sale: 'FOR_SALE',
          };
          queryParams.append('status', statusMap[formData.status] || formData.status);
        }

        apiUrl += `?${queryParams.toString()}`;
        const response = await fetch(apiUrl, {
          method: 'GET',
        });

        const text = await response.text();
        if (!response.ok) throw new Error(`Error: ${response.status} → ${text}`);

        const data = JSON.parse(text);
        if (data.success) {
          properties = (data.data || []).map(property => ({
            id: property.id || property._id,
            title: property.title || "Untitled Property",
            address: `${property.city || "Unknown"}, ${property.state || "Unknown"}`,
            imageUrls: property.imageUrls || [],
            status: property.status || "UNKNOWN",
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
            district: property.district || "",
            city: property.city || "",
            latitude: property.latitude || null,
            longitude: property.longitude || null,
            distance: userLocation && property.latitude && property.longitude
              ? getDistanceFromLatLonInKm(
                userLocation.latitude,
                userLocation.longitude,
                property.latitude,
                property.longitude
              )
              : null,
          }));
        } else {
          throw new Error(data.message || "API error");
        }
      } else if (formData.status === 'pg' || formData.status === 'hostel' || formData.propertyType === 'PG' || formData.propertyType === 'HOSTEL') {
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (!response.ok) throw new Error(`Error: ${response.status}`);
        properties = (data.properties || []).map(pg => ({
          id: pg.id,
          title: pg.name || "Untitled PG/Hostel",
          address: `${pg.location?.address || ""}, ${pg.location?.city || ""}, ${pg.location?.state || ""}`,
          imageUrls: pg.images || [],
          status: pg.availability?.hasAvailableRooms || pg.availability?.hasAvailableBeds ? "AVAILABLE" : "UNAVAILABLE",
          reelCount: pg.reelCount || 0,
          price: pg.pricing?.monthly || 0,
          area: pg.area || 0,
          bedrooms: pg.rooms?.length || 0,
          bathrooms: pg.bathrooms || 0,
          garages: pg.parking?.spaces || 0,
          type: pg.type || "PG/Hostel",
          owner: { name: pg.owner?.name || "Unknown" },
          createdAt: pg.createdAt || new Date().toISOString(),
          state: pg.location?.state || "",
          district: pg.location?.district || "",
          city: pg.location?.city || "",
          latitude: pg.location?.coordinates?.[1] || null,
          longitude: pg.location?.coordinates?.[0] || null,
          distance: userLocation && pg.location?.coordinates?.[1] && pg.location?.coordinates?.[0]
            ? getDistanceFromLatLonInKm(
              userLocation.latitude,
              userLocation.longitude,
              pg.location.coordinates[1],
              pg.location.coordinates[0]
            )
            : null,
        }));
      }

      // Client-side filtering (areaRange and priceRange now support free text)
      properties = properties.filter(p => {
        let matches = true;
        if (formData.state && p.state !== formData.state) matches = false;
        if (formData.district && p.district !== formData.district) matches = false;
        if (formData.city && p.city !== formData.city) matches = false;
        if (formData.bedrooms && formData.propertyType !== 'PLOT' && Number(p.bedrooms) < Number(formData.bedrooms)) matches = false;

        // Free text area range support for PLOT
        if (formData.areaRange && formData.propertyType === 'PLOT') {
          const input = formData.areaRange.trim();
          if (input.includes('-')) {
            const [min, max] = input.split('-').map(Number);
            if (isNaN(min) || isNaN(max) || p.area < min || p.area > max) matches = false;
          } else {
            const val = Number(input);
            if (!isNaN(val) && p.area !== val) matches = false;
          }
        }

        // Free text price range support
        if (formData.priceRange) {
          const input = formData.priceRange.trim();
          if (input.includes('-')) {
            const [min, max] = input.split('-').map(Number);
            if (isNaN(min) || isNaN(max) || p.price < min || p.price > max) matches = false;
          } else {
            const val = Number(input);
            if (!isNaN(val) && p.price !== val) matches = false;
          }
        }

        if (formData.propertyType && p.type.toUpperCase() !== formData.propertyType) matches = false;
        if (formData.status && formData.status !== 'all' && formData.status !== 'rent' && formData.status !== 'sale') {
          if (p.type.toUpperCase() !== formData.status.toUpperCase()) matches = false;
        }
        return matches;
      });

      // Sort by distance if user location is available
      if (userLocation) {
        properties.sort((a, b) => {
          if (a.distance === null && b.distance === null) return 0;
          if (a.distance === null) return 1;
          if (b.distance === null) return -1;
          return a.distance - b.distance;
        });
      }

      setSearchResults(properties);
      toast.success(`Found ${properties.length} properties matching your criteria.`, {
        position: 'top-center',
        autoClose: 3000,
        theme: "colored",
      });
    } catch (err) {
      setSearchError(err.message);
      toast.error(`Failed to fetch properties: ${err.message}`, {
        position: 'top-center',
        autoClose: 3000,
        theme: "colored",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { key: "rent", label: "Rent", icon: faHouse, color: "#2ecc71", path: "/forrent" },
    { key: "sale", label: "Sale", icon: faHouse, color: "#3498db", path: "/forsell" },
    { key: "apartment", label: "Apartment", icon: faBuilding, color: "#9b59b6", path: "/apartment" },
    { key: "plot", label: "Plot", icon: faBuildingColumns, color: "#e74c3c", path: "/plot" },
    { key: "hotel", label: "Hotel", icon: faHotel, color: "#f1c40f", path: "/hotel" },
    { key: "banquet", label: "Banquet", icon: faStar, color: "#e67e22", path: "/banquet" },
    { key: "pg", label: "PG", icon: faBed, color: "#8e44ad", path: "/pg" },
    { key: "hostel", label: "Hostel", icon: faBed, color: "#16a085", path: "/hostel" },
  ];

  const handleClick = (cat) => {
    setActiveTab(cat.key);
    navigate(cat.path);
  };

  const areaOptions = [
    { value: '', label: 'Any Area' },
    { value: '500-1000', label: '500-1000 Sq Ft' },
    { value: '1000-2000', label: '1000-2000 Sq Ft' },
    { value: '2000-5000', label: '2000-5000 Sq Ft' },
    { value: '5000-10000', label: '5000-10000 Sq Ft' },
  ];

  const priceOptions = [
    { value: '', label: 'Any Price' },
    { value: '10000-20000', label: 'Rs 10K-20K' },
    { value: '30000-40000', label: 'Rs 30K-40K' },
    { value: '50000-100000', label: 'Rs 50K-100K' },
    { value: '100000-500000', label: 'Rs 100K-500K' },
  ];

  const renderForm = () => (
    <form className="search-form" onSubmit={handleSearch}>
      <div className="form-grid">
        <div className='search-form-container'>
          <label className="looking" style={{ fontSize: '13px' }}>LOOKING FOR</label>
          <select name="propertyType" className="search-select" value={formData.propertyType} onChange={handleFormChange} disabled={isLoading}>
            <option value="">Select Property</option>
            <option value="APARTMENT">Apartment</option>
            <option value="VILLA">Villa</option>
            <option value="OFFICE">Office</option>
            <option value="HOTEL">Hotel</option>
            <option value="BANQUET">Banquet</option>
            <option value="MULTI_FAMILY_HOME">Multi Family Home</option>
            <option value="SINGLE_FAMILY_HOME">Single Family Home</option>
            <option value="STUDIO">Studio</option>
            <option value="SHOP">Shop</option>
            <option value="PG">PG</option>
            <option value="HOSTEL">Hostel</option>
            <option value="PLOT">Plot</option>
          </select>
        </div>

        <CitySearch
          formData={formData}
          handleFormChange={handleFormChange}
          isLoading={isLoading}
          cities={cities}
        />

        {/* Conditional Fields */}
        {formData.propertyType ? (
          <>
            {['APARTMENT', 'VILLA', 'SINGLE_FAMILY_HOME', 'MULTI_FAMILY_HOME', 'STUDIO'].includes(formData.propertyType) && (
              <div>
                <label className="property" style={{ fontSize: '13px' }}>BEDROOMS</label>
                <select
                  name="bedrooms"
                  className="search-select"
                  value={formData.bedrooms}
                  onChange={handleFormChange}
                  disabled={isLoading}
                >
                  <option value="">Select Bedrooms</option>
                  <option value="1">1 BHK</option>
                  <option value="2">2 BHK</option>
                  <option value="3">3 BHK</option>
                  <option value="4">4+ BHK</option>
                </select>
              </div>
            )}

            {formData.propertyType === 'PLOT' && (
              <SearchableDropdown
                label="AREA RANGE (Sq Ft)"
                name="areaRange"
                value={formData.areaRange}
                onChange={handleFormChange}
                options={areaOptions}
                placeholder="Type or select area range"
                disabled={isLoading}
              />
            )}
          </>
        ) : (
          <div>
            <label className="property" style={{ fontSize: '13px', color: '#888' }}>
              FIRST SELECT PROPERTY TYPE
            </label>
            <select className="search-select" disabled style={{ backgroundColor: '#f5f5f5', color: '#aaa' }}>
              <option value="">— Choose property first —</option>
            </select>
          </div>
        )}

        {/* PRICE RANGE - Now searchable + typeable */}
        <SearchableDropdown
          label="PRICE RANGE"
          name="priceRange"
          value={formData.priceRange}
          onChange={handleFormChange}
          options={priceOptions}
          placeholder="Type or select price range"
          disabled={isLoading}
        />

        <div>
          <button
            type="submit"
            className="mt-4 search-button bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-4 rounded"
            disabled={isLoading}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
    </form>
  );

  const renderSearchResults = () => {
    if (isLoading) {
      return <div className="p-4 text-center">Loading properties…</div>;
    }
    if (searchError) {
      return <div className="p-4 text-center text-danger">Error: {searchError}</div>;
    }
    return (
      <div className="blog-main-container" style={{ marginTop: '40px' }}>
        <div className="blog-left-section card-wrapper">
          {searchResults.map((property) => (
            <Link
              to={`/propertySell/${property.id}`}
              key={property.id}
              className="property-card-link"
            >
              <div className="landing-property-card">
                <div className="landing-image-container">
                  <img
                    src={getValidImage(property.imageUrls, fallbackImages[0])}
                    alt={property.title}
                    onError={(e) => (e.target.src = fallbackImages[0])}
                  />
                  <span
                    className={`landing-label landing-${property.status
                      ? property.status.toLowerCase().replace("_", "-")
                      : "available"
                      }`}
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      padding: "4px 8px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: "bold",
                      zIndex: 10,
                      color: "white"
                    }}
                  >
                    {property.status?.replace("_", " ") || "Available"}
                  </span>

                  <div className="landing-overlay-icons-left">
                    <div>
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
                </div>

                <div className="landing-property-info">
                  <h2 className="landing">
                    {property.title || "Untitled Property"}
                  </h2>
                  <div className="landing-location">
                    <FontAwesomeIcon icon={faMapMarkerAlt} />{" "}
                    {property.address || "No Address"}
                    {property.distance !== null && (
                      <span
                        className="distance-text"
                        style={{ fontWeight: "bold", color: "#0e7490", marginLeft: "10px" }}
                      >
                        {property.distance} km away
                      </span>
                    )}
                  </div>

                  <div className="landing-details">
                    {property.type !== 'PLOT' && (
                      <>
                        <span>
                          <FontAwesomeIcon icon={faBed} /> {property.bedrooms || 0} BHK
                        </span>
                        <span>
                          <FontAwesomeIcon icon={faShower} />{" "}
                          {property.bathrooms || 0}
                        </span>
                        <span>
                          <FontAwesomeIcon icon={faCar} /> {property.garages || 0}
                        </span>
                      </>
                    )}
                    <span>
                      {property.area || "N/A"} {property.sizePostfix || "Sq Ft"}
                    </span>
                  </div>

                  <div className="landing-type text-dark">
                    <strong>{property.type || "Unknown"}</strong>
                  </div>

                  <div className="landing-footer">
                    <span>
                      <FontAwesomeIcon icon={faUser} />{" "}
                      {property.owner?.name || "Unknown"}
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
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="hero">
        <div className="hero-content container mb-2" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: '50vh', padding: '20px' }}>
          <div className="welcome">
            <h1 style={{ color: 'white', fontWeight: '400' }}>
              Welcome To Nearprop
            </h1>
            <p style={{ color: 'white', fontSize: '20px' }}>
              Nearprop is your smart real estate companion — discover, list, and connect with the right properties near you. From dream homes to investment-ready spaces, NearProp makes buying, selling, and renting seamless, fast, and location-focused.
            </p>
          </div>

          <div className="search-box" style={{ color: 'white', opacity: 0.9, padding: '10px', borderRadius: '10px' }}>
            <div className="tabs responsive-tabs" style={{ marginTop: '240px' }}>
              {[
                { key: 'rent', label: 'Rent', path: '/forrent' },
                { key: 'sale', label: 'Sale', path: '/forsell' },
                { key: 'hotel', label: 'Hotel', path: '/hotel' },
                { key: 'banquet', label: 'Banquet', path: '/banquet' },
                { key: 'pg', label: 'PG', path: '/pg' },
                { key: 'hostel', label: 'Hostel', path: '/hostel' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={activeTab === tab.key ? 'active' : ''}
                  style={{
                    opacity: activeTab === tab.key ? 1 : 0.95,
                    backgroundColor: 'white',
                    color: 'darkcyan',
                    padding: '5px',
                    width: '100px',
                    height: '55px',
                    border: 'none',
                    borderRadius: '0px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.3s ease',
                  }}
                  onClick={() => handleClick({ key: tab.key, path: tab.path })}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bottle-mobile-categories">
              <div className="bottle-categories-grid">
                {categories.map((cat) => (
                  <button
                    key={cat.key}
                    className={`bottle-category-card ${activeTab === cat.key ? "active" : ""}`}
                    onClick={() => handleClick(cat)}
                  >
                    <div className="bottle-category-icon" style={{ color: cat.color }}>
                      <FontAwesomeIcon icon={cat.icon} size="lg" />
                    </div>
                    <span className="bottle-category-label">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className='reder-form' style={{ backgroundColor: 'white', boxShadow: '1px 1px 5px rgba(0, 0, 0, 0.5)' }}>
              <div>
                {renderForm()}
              </div>
            </div>
          </div>
        </div>
      </div>
      {locationError && (
        <div className="p-4 text-warning bg-warning-subtle rounded mb-3">
          <span>{locationError}</span>
          <button
            className="btn btn-sm btn-outline-warning ms-2"
            onClick={() => getUserLocation().then(loc => {
              if (loc) {
                setUserLocation(loc);
                setLocationError(null);
              }
            })}
          >
            Retry Location
          </button>
        </div>
      )}
      <div className="containerfilter">
        {renderSearchResults()}
      </div>

      <FeaturedProperties />
      <Banquetandhalls />
      <PgAndHostels />
      <Shopgrid />
      <RealEstateForm />
      <Explore />
      <City />
      <Agentlist />
      <DownloadApp />
      <Testimonal />
    </>
  );
}

export default LandingPage;