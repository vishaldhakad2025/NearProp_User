// import React, { useState, useEffect } from "react";
// import { Link } from "react-router-dom";
// import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
// import {
//   faBed,
//   faShower,
//   faCar,
//   faUser,
//   faPaperclip,
//   faComment,
//   faMapMarkerAlt,
// } from "@fortawesome/free-solid-svg-icons";
// import axios from "axios";
// import "./Properties.css";

// // 🔹 Local fallback images
// import Apartment from '../assets/A-1.avif';
// import Apartment2 from '../assets/c-2.avif';
// import Apartment3 from '../assets/apartment.avif';
// import Apartment4 from '../assets/studio.jpg';
// import Apartment6 from '../assets/penthouse.avif';
// import Apartment7 from '../assets/villa.avif';

// const fallbackImages = [Apartment, Apartment2, Apartment3, Apartment4, Apartment6, Apartment7];

// const API_CONFIG = {
//   pgHostelBaseUrl: 'https://pg-hostel.nearprop.com',
//   apiPrefix: 'api',
// };

// // 🔹 Helper function to pick first valid image
// const getValidImage = (images, fallback, baseUrl = "") => {
//   if (!Array.isArray(images) || images.length === 0) return fallback;
//   const validImg = images.find(
//     img => img && img.trim() !== "" && !img.toLowerCase().includes("white")
//   );
//   return validImg ? (validImg.startsWith("http") ? validImg : `${baseUrl}${validImg}`) : fallback;
// };

// function Hostels() {
//   const [properties, setProperties] = useState([]);
//   const [filteredProperties, setFilteredProperties] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   // Sidebar filters
//   const [searchQuery, setSearchQuery] = useState("");
//   const [filterPriceMin, setFilterPriceMin] = useState("");
//   const [filterPriceMax, setFilterPriceMax] = useState("");
//   const [filterBedrooms, setFilterBedrooms] = useState("");

//   // 🔹 Location filters
//   const [states, setStates] = useState([]);
//   const [districts, setDistricts] = useState([]);
//   const [filteredDistricts, setFilteredDistricts] = useState([]);
//   const [cities, setCities] = useState([]);

//   const [selectedState, setSelectedState] = useState("");
//   const [selectedDistrict, setSelectedDistrict] = useState("");
//   const [selectedCity, setSelectedCity] = useState("");

//   const { pgHostelBaseUrl, apiPrefix } = API_CONFIG;

//   // ✅ Fetch Hostel properties
//   useEffect(() => {
//     const fetchProperties = async () => {
//       try {
//         const url = `${pgHostelBaseUrl}/${apiPrefix}/public/properties`;
//         const response = await fetch(url);
//         const text = await response.text();
//         if (!response.ok) throw new Error(`Error: ${response.status} → ${text}`);

//         const data = JSON.parse(text);
//         const hostelProperties = (data.properties || [])
//           .filter(pg => pg.type?.toLowerCase() === "hostel")
//           .map(pg => ({
//             id: pg.id,
//             title: pg.name || "Untitled Hostel",
//             address: `${pg.location?.address || ""}, ${pg.location?.city || ""}, ${pg.location?.state || ""}`,
//             imageUrls: pg.images || [],
//             status: pg.availability?.hasAvailableRooms || pg.availability?.hasAvailableBeds ? "AVAILABLE" : "UNAVAILABLE",
//             reelCount: pg.reelCount || 0,
//             price: pg.pricing?.monthly || 0,
//             area: pg.area || 0,
//             bedrooms: pg.rooms?.length || 0,
//             bathrooms: pg.bathrooms || 0,
//             garages: pg.parking?.spaces || 0,
//             sizePostfix: "Sq Ft",
//             type: "Hostel",
//             owner: { name: pg.owner?.name || "Unknown" },
//             createdAt: pg.createdAt || new Date().toISOString(),
//             state: pg.location?.state || "",
//             district: pg.location?.district || "",
//             city: pg.location?.city || "",
//           }));

//         setProperties(hostelProperties);
//         setFilteredProperties(hostelProperties);
//       } catch (err) {
//         setError(err.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchProperties();
//   }, [pgHostelBaseUrl, apiPrefix]);

//   // ✅ Fetch districts/states/cities
//   useEffect(() => {
//     const fetchDistricts = async () => {
//       try {
//         const res = await axios.get(`${pgHostelBaseUrl}/${apiPrefix}/public/locations`);
//         const districtsData = res.data?.locations || [];
//         setDistricts(districtsData);

//         const uniqueStates = [...new Set(districtsData.map((d) => d.state))];
//         setStates(uniqueStates);

//         const uniqueCities = [
//           ...new Set(districtsData.map((d) => d.city).filter(Boolean)),
//         ];
//         setCities(uniqueCities);
//       } catch (err) {
//         console.error("Failed to load location data:", err.message);
//       }
//     };
//     fetchDistricts();
//   }, [pgHostelBaseUrl, apiPrefix]);

//   // ✅ Update filtered districts when state changes
//   useEffect(() => {
//     if (selectedState) {
//       const filtered = districts.filter((d) => d.state === selectedState);
//       setFilteredDistricts(filtered);
//       setSelectedDistrict("");
//       setSelectedCity("");
//     } else {
//       setFilteredDistricts([]);
//       setSelectedDistrict("");
//       setSelectedCity("");
//     }
//   }, [selectedState, districts]);

//   // ✅ Apply Filters
//   const applyFilters = () => {
//     let filtered = [...properties];

//     if (searchQuery) {
//       filtered = filtered.filter((p) =>
//         p.title?.toLowerCase().includes(searchQuery.toLowerCase())
//       );
//     }

//     if (filterPriceMin) {
//       filtered = filtered.filter((p) => Number(p.price) >= Number(filterPriceMin));
//     }

//     if (filterPriceMax) {
//       filtered = filtered.filter((p) => Number(p.price) <= Number(filterPriceMax));
//     }

//     if (filterBedrooms) {
//       filtered = filtered.filter((p) => Number(p.bedrooms) >= Number(filterBedrooms));
//     }

//     // 🔹 Location filters
//     if (selectedState) {
//       filtered = filtered.filter((p) => p.state === selectedState);
//     }
//     if (selectedDistrict) {
//       filtered = filtered.filter((p) => p.district === selectedDistrict);
//     }
//     if (selectedCity) {
//       filtered = filtered.filter((p) => p.city === selectedCity);
//     }

//     setFilteredProperties(filtered);
//   };

//   if (loading) return <div className="p-4">Loading hostels…</div>;
//   if (error) return <div className="p-4 text-danger">Error: {error}</div>;

//   return (
//     <div>
//       <div
//         className="nav justify-content-center p-5"
//         style={{ fontSize: "40px", fontWeight: "700", color: 'darkcyan' }}
//       >
//         Hostels
//       </div>

//       <div className="blog-main-container">
//         {/* Left Section */}
//         <div className="blog-left-section card-wrapper">
//           {filteredProperties.map((property) => (
//             <Link
//               to={`/Pgandhostel/${property.id}`}
//               key={property.id}
//               className="property-card-link"
//             >
//               <div
//                 className="landing-property-card"
//                 style={{
//                   background: "#ffffff",
//                   borderRadius: "12px",
//                   overflow: "hidden",
//                   boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
//                   transition: "transform 0.3s ease, box-shadow 0.3s ease",
//                   display: "flex",
//                   flexDirection: "column",
//                   height: "100%",
//                 }}
//                 onMouseEnter={(e) => {
//                   e.currentTarget.style.transform = "translateY(-8px)";
//                   e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 0, 0, 0.15)";
//                 }}
//                 onMouseLeave={(e) => {
//                   e.currentTarget.style.transform = "translateY(0)";
//                   e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
//                 }}
//               >
//                 <div
//                   className="landing-image-container"
//                   style={{
//                     position: "relative",
//                     height: "200px",
//                     width: "100%",
//                     overflow: "hidden",
//                   }}
//                 >
//                   <img
//                     src={getValidImage(property.imageUrls, fallbackImages[0], pgHostelBaseUrl)}
//                     alt={property.title}
//                     style={{
//                       width: "100%",
//                       height: "100%",
//                       objectFit: "cover",
//                       transition: "transform 0.3s ease",
//                     }}
//                     onMouseEnter={(e) => (e.target.style.transform = "scale(1.05)")}
//                     onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
//                     onError={(e) => (e.target.src = fallbackImages[0])}
//                   />
//                   {/* <span
//                     className={`landing-label landing-${
//                       property.status
//                         ? property.status.toLowerCase().replace("_", "-")
//                         : "available"
//                     }`}
//                     style={{
//                       position: "absolute",
//                       top: 10,
//                       left: 10,
//                       padding: "4px 8px",
//                       borderRadius: 4,
//                       fontSize: 12,
//                       fontWeight: "bold",
//                       zIndex: 10,
//                       backgroundColor: property.status === "AVAILABLE" ? "#28a745" : "#dc3545",
//                       color: "white"
//                     }}
//                   >
//                     {property.status?.replace("_", " ") || "Available"}
//                   </span>
//                   <div className="landing-overlay-icons">
//                     <span>
//                       <FontAwesomeIcon icon={faComment} />{" "}
//                       {property.reelCount || 0}
//                     </span>
//                   </div> */}
//                   <div
//                     className="landing-overlay-icons-left"
//                     style={{
//                       position: "absolute",
//                       bottom: "12px",
//                       left: "12px",
//                       background: "rgba(0,0,0,0.7)",
//                       color: "#ffffff",
//                       padding: "8px 12px",
//                       borderRadius: "8px",
//                       fontSize: "0.875rem",
//                       fontWeight: "500",
//                       display: "flex",
//                       flexDirection: "column",
//                       gap: "4px",
//                       wordBreak: "break-word",
//                     }}
//                   >
//                     <div>
//                       ₹
//                       {property.price
//                         ? Number(property.price).toLocaleString("en-IN")
//                         : "N/A"}
//                       <br />
//                       <span style={{ fontSize: "0.75rem", fontWeight: "400" }}>
//                         /month
//                       </span>
//                     </div>
//                   </div>
//                 </div>

//                 <div
//                   className="landing-property-info"
//                   style={{
//                     padding: "16px",
//                     flexGrow: "1",
//                     display: "flex",
//                     flexDirection: "column",
//                     justifyContent: "space-between",
//                     wordBreak: "break-word",
//                   }}
//                 >
//                   <h2
//                     className="landing"
//                     style={{
//                       fontSize: "1.25rem",
//                       fontWeight: "600",
//                       color: "#1a202c",
//                       margin: "0 0 10px",
//                       lineHeight: "1.4",
//                       overflow: "hidden",
//                       textOverflow: "ellipsis",
//                       display: "-webkit-box",
//                       WebkitLineClamp: "2",
//                       WebkitBoxOrient: "vertical",
//                       wordBreak: "break-word",
//                     }}
//                   >
//                     {property.title || "Untitled Hostel"}
//                   </h2>
//                   <div
//                     className="landing-location"
//                     style={{
//                       fontSize: "0.875rem",
//                       color: "#4a5568",
//                       display: "flex",
//                       alignItems: "flex-start",
//                       gap: "0",
//                       marginBottom: "12px",
//                       flexWrap: "wrap",
//                       wordBreak: "break-word",
//                     }}
//                   >
//                     <span
//                       style={{
//                         display: "flex",
//                         alignItems: "center",
//                         whiteSpace: "nowrap",
//                         marginRight: "8px", /* Gap between icon and address */
//                       }}
//                     >
//                       <FontAwesomeIcon icon={faMapMarkerAlt} />{" "}
//                       {property.address || "No Address"}
//                     </span>
//                   </div>

//                   <div
//                     className="landing-details"
//                     style={{
//                       display: "flex",
//                       gap: "16px",
//                       fontSize: "0.875rem",
//                       color: "#4a5568",
//                       marginBottom: "12px",
//                       flexWrap: "wrap",
//                       wordBreak: "break-word",
//                     }}
//                   >
//                     <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
//                       <FontAwesomeIcon icon={faBed} /> {property.bedrooms || 0}
//                     </span>
//                     <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
//                       <FontAwesomeIcon icon={faShower} />{" "}
//                       {property.bathrooms || 0}
//                     </span>
//                     <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
//                       <FontAwesomeIcon icon={faCar} /> {property.garages || 0}
//                     </span>
//                     <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
//                       {property.area || "N/A"} {property.sizePostfix || "Sq Ft"}
//                     </span>
//                   </div>

//                   <div
//                     className="landing-type text-dark"
//                     style={{
//                       fontSize: "0.875rem",
//                       fontWeight: "600",
//                       color: "#3182ce",
//                       marginBottom: "12px",
//                       textTransform: "capitalize",
//                       display: "flex",
//                       alignItems: "center",
//                       wordBreak: "break-word",
//                     }}
//                   >
//                     <strong>{property.type || "Hostel"}</strong>
//                   </div>

//                   <div
//                     className="landing-footer"
//                     style={{
//                       display: "flex",
//                       justifyContent: "space-between",
//                       fontSize: "0.75rem",
//                       color: "#718096",
//                       borderTop: "1px solid #e2e8f0",
//                       paddingTop: "12px",
//                       flexWrap: "wrap",
//                       gap: "10px",
//                       wordBreak: "break-word",
//                     }}
//                   >
//                     <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
//                       <FontAwesomeIcon icon={faUser} />{" "}
//                       {property.owner?.name || "Unknown"}
//                     </span>
//                     <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
//                       <FontAwesomeIcon icon={faPaperclip} />{" "}
//                       {property.createdAt
//                         ? new Date(property.createdAt).toLocaleDateString()
//                         : "N/A"}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             </Link>
//           ))}
//         </div>

//         {/* Right Sidebar */}
//         <div className="residential-blog-right-sidebar md:block">
//           <aside className="residential">
//             <div className="residential-filter">
//               <h3 className="filter-title">Filter Hostels</h3>

//               {/* 🔹 Location Filters */}
//               <div className="filter-group">
//                 <label className="filter-label">State</label>
//                 <select
//                   value={selectedState}
//                   onChange={(e) => setSelectedState(e.target.value)}
//                   className="filter-select"
//                 >
//                   <option value="">All States</option>
//                   {states.map((s) => (
//                     <option key={s} value={s}>
//                       {s}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="filter-group">
//                 <label className="filter-label">District</label>
//                 <select
//                   value={selectedDistrict}
//                   onChange={(e) => setSelectedDistrict(e.target.value)}
//                   className="filter-select"
//                 >
//                   <option value="">All Districts</option>
//                   {filteredDistricts.map((d) => (
//                     <option key={d.district} value={d.district}>
//                       {d.district}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="filter-group">
//                 <label className="filter-label">City</label>
//                 <select
//                   value={selectedCity}
//                   onChange={(e) => setSelectedCity(e.target.value)}
//                   className="filter-select"
//                 >
//                   <option value="">All Cities</option>
//                   {cities.map((c) => (
//                     <option key={c} value={c}>
//                       {c}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               {/* Existing Filters */}
//               <div className="filter-group">
//                 <label className="filter-label">Search by Name</label>
//                 <input
//                   type="text"
//                   placeholder="Enter hostel name"
//                   value={searchQuery}
//                   onChange={(e) => setSearchQuery(e.target.value)}
//                   className="filter-input"
//                 />
//               </div>

//               <div className="filter-group">
//                 <label className="filter-label">Min Price per Month (₹)</label>
//                 <input
//                   type="number"
//                   placeholder="e.g., 5000"
//                   value={filterPriceMin}
//                   onChange={(e) => setFilterPriceMin(e.target.value)}
//                   className="filter-input"
//                 />
//               </div>

//               <div className="filter-group">
//                 <label className="filter-label">Max Price per Month (₹)</label>
//                 <input
//                   type="number"
//                   placeholder="e.g., 50000"
//                   value={filterPriceMax}
//                   onChange={(e) => setFilterPriceMax(e.target.value)}
//                   className="filter-input"
//                 />
//               </div>

//               <div className="filter-group">
//                 <label className="filter-label">Minimum Bedrooms</label>
//                 <select
//                   value={filterBedrooms}
//                   onChange={(e) => setFilterBedrooms(e.target.value)}
//                   className="filter-select"
//                 >
//                   <option value="">Any</option>
//                   <option value="1">1+</option>
//                   <option value="2">2+</option>
//                   <option value="3">3+</option>
//                   <option value="4">4+</option>
//                 </select>
//               </div>

//               <button className="filter-button" onClick={applyFilters}>
//                 Apply Filters
//               </button>
//             </div>
//           </aside>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Hostels;

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

function Hostels() {
  const [properties, setProperties] = useState([]);
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sidebar filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriceMin, setFilterPriceMin] = useState("");
  const [filterPriceMax, setFilterPriceMax] = useState("");
  const [filterBedrooms, setFilterBedrooms] = useState("");

  // 🔹 Location filters - ab properties se derive karenge
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]); // agar backend mein district hai to use, warna ignore
  const [cities, setCities] = useState([]);

  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Searchable dropdown states
  const [stateSearch, setStateSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

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

  // ✅ Fetch Hostel properties
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        const url = `${pgHostelBaseUrl}/${apiPrefix}/public/properties`;
        const response = await fetch(url);
        const text = await response.text();
        if (!response.ok) throw new Error(`Error: ${response.status} → ${text}`);

        const data = JSON.parse(text);
        const hostelProperties = (data.properties || [])
          .filter(pg => pg.type?.toLowerCase() === "hostel" || pg.type?.toLowerCase() === "pg")
          .map(pg => ({
            id: pg.id || pg.propertyId,
            title: pg.name || "Untitled Hostel",
            address: `${pg.location?.address || ""}, ${pg.location?.city || ""}, ${pg.location?.state || ""}`,
            imageUrls: pg.images || [],
            status: pg.hasAvailability || pg.availableRooms > 0 || pg.availableBeds > 0 ? "AVAILABLE" : "UNAVAILABLE",
            reelCount: pg.commentCount || 0,
            price: pg.lowestPrice || pg.pricing?.monthly || 0,
            area: pg.area || 0,
            bedrooms: pg.totalRooms || pg.rooms?.length || 0,
            bathrooms: pg.bathrooms || 0,
            garages: pg.parking?.spaces || 0,
            sizePostfix: "Sq Ft",
            type: pg.type || "Hostel",
            owner: { name: pg.landlordInfo?.name || "Unknown" },
            createdAt: pg.createdAt || new Date().toISOString(),
            state: pg.location?.state || "",
            district: pg.location?.district || "",
            city: pg.location?.city || "",
          }));

        setProperties(hostelProperties);
        setFilteredProperties(hostelProperties);

        // 🔹 Extract unique States, Cities (aur District agar hai)
        const uniqueStates = [...new Set(hostelProperties.map(p => p.state).filter(Boolean))];
        const uniqueCities = [...new Set(hostelProperties.map(p => p.city).filter(Boolean))];
        const uniqueDistricts = [...new Set(hostelProperties.map(p => p.district).filter(Boolean))];

        setStates(uniqueStates.sort());
        setCities(uniqueCities.sort());
        setDistricts(uniqueDistricts.sort());

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [pgHostelBaseUrl, apiPrefix]);

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

  // Reset district & city jab state change ho
  useEffect(() => {
    setSelectedDistrict("");
    setSelectedCity("");
  }, [selectedState]);

  // Filter states and cities based on search
  const filteredStates = states.filter(s =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const filteredCities = cities.filter(c =>
    c.toLowerCase().includes(citySearch.toLowerCase())
  );

  if (loading) return <div className="p-4">Loading hostels…</div>;
  if (error) return <div className="p-4 text-danger">Error: {error}</div>;

  return (
    <div>
      <div
        className="nav justify-content-center p-5"
        style={{ fontSize: "40px", fontWeight: "700", color: 'darkcyan' }}
      >
        Hostels
      </div>

      <div className="blog-main-container">
        {/* Left Section */}
        <div className="blog-left-section card-wrapper">
          {filteredProperties.map((property) => (
            <Link
              to={`/Pgandhostel/${property.id}`}
              key={property.id}
              className="property-card-link"
              onClick={() => trackPropertyView(property.id)}
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
                    src={getValidImage(property.imageUrls, fallbackImages[0], pgHostelBaseUrl)}
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
                        /month
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
                    {property.title || "Untitled Hostel"}
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
                      <FontAwesomeIcon icon={faMapMarkerAlt} />{" "}
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
                    <strong>{property.type || "Hostel"}</strong>
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
              <h3 className="filter-title">Filter Hostels</h3>

              {/* 🔹 State - Searchable Dropdown */}
              <div className="filter-group position-relative">
                <label className="filter-label">State</label>
                <div
                  className="filter-input d-flex align-items-center justify-content-between cursor-pointer"
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

              {/* District filter - sirf tab dikhao jab districts available ho */}
              {districts.length > 0 && (
                <div className="filter-group">
                  <label className="filter-label">District</label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="filter-select"
                    disabled={!selectedState}
                  >
                    <option value="">All Districts</option>
                    {districts
                      .filter(d => !selectedState || properties.find(p => p.district === d && p.state === selectedState))
                      .map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* 🔹 City - Searchable Dropdown */}
              <div className="filter-group position-relative">
                <label className="filter-label">City</label>
                <div
                  className="filter-input d-flex align-items-center justify-content-between cursor-pointer"
                  onClick={() => setShowCityDropdown(!showCityDropdown)}
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
                      {filteredCities.length === 0 ? (
                        <div className="p-2 text-muted">No cities found</div>
                      ) : (
                        filteredCities.map((c) => (
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

              {/* Existing Filters */}
              <div className="filter-group">
                <label className="filter-label">Search by Name</label>
                <input
                  type="text"
                  placeholder="Enter hostel name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Min Price per Month (₹)</label>
                <input
                  type="number"
                  placeholder="e.g., 5000"
                  value={filterPriceMin}
                  onChange={(e) => setFilterPriceMin(e.target.value)}
                  className="filter-input"
                />
              </div>

              <div className="filter-group">
                <label className="filter-label">Max Price per Month (₹)</label>
                <input
                  type="number"
                  placeholder="e.g., 50000"
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

      {/* Additional CSS */}
      <style jsx>{`
        .cursor-pointer { cursor: pointer; }
        .hover-bg-light:hover { background-color: #f8f9fa; }
      `}</style>
    </div>
  );
}

export default Hostels;