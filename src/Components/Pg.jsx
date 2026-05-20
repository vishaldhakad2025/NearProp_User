import React, { useState, useEffect, useRef } from "react";
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
import Apartment from '../assets/A-1.avif';
import Apartment2 from '../assets/c-2.avif';
import Apartment3 from '../assets/apartment.avif';
import Apartment4 from '../assets/studio.jpg';
import Apartment6 from '../assets/penthouse.avif';
import Apartment7 from '../assets/villa.avif';

const fallbackImages = [Apartment, Apartment2, Apartment3, Apartment4, Apartment6, Apartment7];

const API_CONFIG = {
  pgHostelBaseUrl: 'https://pg-hostel.nearprop.com',
  apiPrefix: 'api',
};

// 🔹 Helper function to pick first valid image
const getValidImage = (images, fallback, baseUrl = "") => {
  if (!Array.isArray(images) || images.length === 0) return fallback;
  const validImg = images.find(
    img => img && img.trim() !== "" && !img.toLowerCase().includes("white")
  );
  return validImg ? (validImg.startsWith("http") ? validImg : `${baseUrl}${validImg}`) : fallback;
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

// 🔹 Searchable Dropdown Component (exact match with image)
const SearchableDropdown = ({ options, selected, onSelect, placeholder, disabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm("");
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const filtered = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allLabel = placeholder.includes("State") ? "All States" :
                   placeholder.includes("District") ? "All Districts" : "All Cities";

  if (disabled) {
    return (
      <div style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#a0aec0', backgroundColor: '#f7fafc' }}>
        {placeholder}
      </div>
    );
  }

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <div
        style={{
          width: '100%',
          padding: '10px',
          border: '1px solid #e2e8f0',
          borderRadius: '6px',
          fontSize: '0.875rem',
          color: '#1a202c',
          backgroundColor: '#ffffff',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ color: selected ? '#1a202c' : '#6c757d' }}>
          {selected || placeholder}
        </span>
        <span style={{ fontSize: '0.8rem' }}>▼</span>
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ced4da',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1050,
            marginTop: '4px',
          }}
        >
          <input
            type="text"
            placeholder="Search for an Item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              padding: '10px',
              border: 'none',
              borderBottom: '1px solid #ced4da',
              borderRadius: '6px 6px 0 0',
              fontSize: '0.875rem'
            }}
          />
          <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <div
              style={{
                padding: '10px',
                cursor: 'pointer',
                backgroundColor: !selected ? '#f8f9fa' : 'transparent'
              }}
              onClick={() => {
                onSelect("");
                setIsOpen(false);
                setSearchTerm("");
              }}
            >
              {allLabel}
            </div>
            {filtered.length === 0 ? (
              <div style={{ padding: '10px', color: '#6c757d' }}>No items found</div>
            ) : (
              filtered.map((option) => (
                <div
                  key={option}
                  style={{
                    padding: '10px',
                    cursor: 'pointer',
                    backgroundColor: selected === option ? '#f8f9fa' : 'transparent'
                  }}
                  onClick={() => {
                    onSelect(option);
                    setIsOpen(false);
                    setSearchTerm("");
                  }}
                >
                  {option}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

function Pg() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);

  // Sidebar filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState("");

  // 🔹 Location filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [filteredCities, setFilteredCities] = useState([]);

  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  const { pgHostelBaseUrl, apiPrefix } = API_CONFIG;

  // ✅ Track property view
  const trackPropertyView = async (propertyId) => {
    try {
      const url = `${pgHostelBaseUrl}/${apiPrefix}/landlord/property/view/${propertyId}`;
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      // API call is fire-and-forget, no need to handle response
    } catch (err) {
      // Silently fail - don't interrupt user experience
      console.error('Failed to track property view:', err);
    }
  };

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

  // ✅ Fetch PG properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const url = `${pgHostelBaseUrl}/${apiPrefix}/public/properties`;
        const response = await fetch(url);
        const text = await response.text();
        if (!response.ok) throw new Error(`Error: ${response.status} → ${text}`);
        const data = JSON.parse(text);
        const pgProperties = (data.properties || [])
          .filter(pg => pg.type?.toLowerCase() === "pg")
          .map(pg => ({
            id: pg.id,
            title: pg.name || "Untitled PG",
            address: `${pg.location?.address || ""}, ${pg.location?.city || ""}, ${pg.location?.state || ""}`,
            imageUrls: pg.images || [],
            status: pg.availability?.hasAvailableRooms || pg.availability?.hasAvailableBeds ? "AVAILABLE" : "UNAVAILABLE",
            reelCount: pg.reelCount || 0,
            price: pg.pricing?.monthly || 0,
            area: pg.area || 0,
            bedrooms: pg.rooms?.length || 0,
            bathrooms: pg.bathrooms || 0,
            garages: pg.parking?.spaces || 0,
            sizePostfix: "Sq Ft",
            type: "PG",
            owner: { name: pg.owner?.name || "Unknown" },
            createdAt: pg.createdAt || new Date().toISOString(),
            state: pg.location?.state || "",
            districtName: pg.location?.district || "", // Adjusted to districtName for consistency
            city: pg.location?.city || "",
            latitude: pg.location?.latitude || null,
            longitude: pg.location?.longitude || null,
          }));
        setProperties(pgProperties);
        setFilteredProperties(pgProperties);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchProperties();
  }, [pgHostelBaseUrl, apiPrefix]);

  // ✅ Fetch districts/states/cities from new API
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await axios.get('https://api.nearprop.com/api/property-districts');
        const locationsData = res.data || []; // array of objects

        setDistricts(locationsData);

        const uniqueStates = [...new Set(locationsData.map((d) => d.state).filter(Boolean))].sort();
        setStates(uniqueStates);
      } catch (err) {
        console.error("Failed to load location data:", err.message);
      }
    };
    fetchLocations();
  }, []);

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
    }
  }, [selectedDistrict, selectedState, districts]);

  // ✅ Apply Filters and Sort by Distance automatically on change
  useEffect(() => {
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
      filtered = filtered.filter((p) => p.state?.toLowerCase() === selectedState.toLowerCase());
    }
    if (selectedDistrict) {
      filtered = filtered.filter((p) => p.districtName?.toLowerCase() === selectedDistrict.toLowerCase());
    }
    if (selectedCity) {
      filtered = filtered.filter((p) => p.city?.toLowerCase() === selectedCity.toLowerCase());
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

    setFilteredProperties(filtered);
  }, [properties, searchQuery, filterPriceMin, filterPriceMax, filterBedrooms, selectedState, selectedDistrict, selectedCity, location]);

  if (loading) return <div style={{ fontSize: '1rem', color: '#4a5568', textAlign: 'center', padding: '20px' }}>Loading PGs…</div>;
  if (error) return <div style={{ fontSize: '1rem', color: '#4a5568', textAlign: 'center', padding: '20px' }}>Error: {error}</div>;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '20px' }}>
      {locationError && (
        <div style={{ fontSize: '1rem', color: '#4a5568', textAlign: 'center', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {locationError}
          <button
            style={{ marginLeft: '10px', padding: '2px 10px', background: '#0891b2', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
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
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1a202c', marginBottom: '20px', textAlign: 'center' }}>
        PGs
      </div>
      <div style={{ display: 'flex', gap: '20px', alignItems: 'stretch' }}>
        {/* Left Section - Property Cards */}
        <div style={{ flex: '3', minHeight: '600px' }}>
          {filteredProperties.length === 0 ? (
            <div style={{ fontSize: '1rem', color: '#4a5568', textAlign: 'center', padding: '20px' }}>
              No PGs found matching your criteria.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
              {filteredProperties.map((property) => (
                <Link
                  to={`/Pgandhostel/${property.id}`}
                  key={property.id}
                  style={{ textDecoration: 'none' }}
                  onClick={() => trackPropertyView(property.id)}
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
                        src={getValidImage(property.imageUrls, fallbackImages[0], pgHostelBaseUrl)}
                        alt={property.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                        onMouseEnter={(e) => (e.target.style.transform = 'scale(1.05)')}
                        onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                        onError={(e) => (e.target.src = fallbackImages[0])}
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
                          background: property.status === "AVAILABLE" ? '#28a745' : '#dc3545',
                        }}
                      >
                        {property.status?.replace("_", " ") || "Available"}
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
                            /month
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
                        {property.title || "Untitled PG"}
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
                          {property.distance !== null
                            ? ` - ${property.distance} km away`
                            : " - Distance unavailable"}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '0.875rem', color: '#4a5568', marginBottom: '12px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FontAwesomeIcon icon={faBed} /> {property.bedrooms || 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FontAwesomeIcon icon={faShower} /> {property.bathrooms || 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <FontAwesomeIcon icon={faCar} /> {property.garages || 0}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                        <strong>{property.type || "PG"}</strong>
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
                Filter PGs
              </h3>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '8px' }}>
                  State
                </label>
                <SearchableDropdown
                  options={states}
                  selected={selectedState}
                  onSelect={setSelectedState}
                  placeholder="-- Select State --"
                />
              </div>
              {/* <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '8px' }}>
                  District
                </label>
                <SearchableDropdown
                  options={filteredDistricts}
                  selected={selectedDistrict}
                  onSelect={setSelectedDistrict}
                  placeholder="-- Select District --"
                  disabled={!selectedState}
                />
              </div> */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '8px' }}>
                  City
                </label>
                <SearchableDropdown
                  options={filteredCities}
                  selected={selectedCity}
                  onSelect={setSelectedCity}
                  placeholder="-- Select City --"
                  disabled={!selectedState}
                />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: '#4a5568', marginBottom: '8px' }}>
                  Search by Name
                </label>
                <input
                  type="text"
                  placeholder="Enter PG name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#1a202c' }}
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
                  <span style={{ fontSize: '0.875rem', color: '#4a5568', }}>to</span>
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
                  Minimum Bedrooms
                </label>
                <select
                  value={filterBedrooms}
                  onChange={(e) => setFilterBedrooms(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.875rem', color: '#1a202c' }}
                >
                  <option value="">Any</option>
                  <option value="1">1+</option>
                  <option value="2">2+</option>
                  <option value="3">3+</option>
                  <option value="4">4+</option>
                </select>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default Pg;