import React, { useState, useEffect } from 'react';
import './Pageheader.css';
import logo from '../assets/Nearprop 1.png';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { baseurl } from '../../BaseUrl';
import { FaHome, FaBuilding, FaUserTie, FaTools, FaVideo, FaPhoneAlt, FaPlus, FaUserCog, FaTimes, FaUserShield } from 'react-icons/fa';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleUser, faLocationDot, faPhoneVolume, faUser } from '@fortawesome/free-solid-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Pageheader = ({ path }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roleFormVisible, setRoleFormVisible] = useState(false);
  const [franchiseFormVisible, setFranchiseFormVisible] = useState(false);
  const [myFranchiseVisible, setMyFranchiseVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [reason, setReason] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [comingSoonVisible, setComingSoonVisible] = useState(false);
  const [roles, setRoles] = useState([]);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const navigate = useNavigate();
  const isLanding = path === '/';

  // Toast configuration
  const showToast = (message, type = 'error') => {
    toast[type](message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: 'light',
    });
  };

  // Toggle mobile menu
  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const redirectToDashboard = (role, token) => {
    // console.log('------ Redirecting with token:', token);
    const tokenPart = token ? `?token=${token}` : getToken() ? `?token=${getToken()}` : '';
    if (!tokenPart) {
      showToast('please try again', 'somthing went wrong');

      return;
    }
    const urls = {
      DEVELOPER: "https://developerdashboard.nearprop.com/",  // Add /landing
      ADVISOR: "https://propertyadviser.nearprop.com/",
      SELLER: "https://sellerdashboard.nearprop.com/",
      ADMIN: "https://admindashboard.nearprop.com/dashboard",
    };

    const url = `${urls[role.toUpperCase()]}${tokenPart}`;
    if (!url) {
      showToast("Invalid role selected.", "error");
      return;
    }

    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Open role request form or redirect if role already assigned
  const openRoleForm = () => {
    const token = getToken();
    if (!token) {
      showToast('Please log in to access all details.', 'info');
      navigate('/login');
      return;
    }
    setRoleFormVisible(true);
  };

  // Close role request form
  const closeRoleForm = () => {
    setRoleFormVisible(false);
    setSelectedRole('');
    setReason('');
  };

  // Handle role request submission
  const handleRoleRequest = async () => {
    if (isLoading) return;
    setIsLoading(true);

    if (!selectedRole || !reason.trim()) {
      showToast('Please select a role and provide a reason.', 'error');
      setIsLoading(false);
      return;
    }

    const token = getToken();
    if (!token) {
      showToast('Please log in to submit role request.', 'error');
      setIsLoading(false);
      navigate('/login');
      return;
    }

    const upperRole = selectedRole.toUpperCase();

    if (currentUser?.roles?.includes(upperRole)) {
      showToast(`You already have the ${selectedRole} role. Redirecting to dashboard.`, 'info');
      closeRoleForm();
      redirectToDashboard(upperRole, token);
      setIsLoading(false);
      return;
    }

    try {
      const payload = {
        role: upperRole,
        reason: reason.trim(),
      };

      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };

      console.log('Sending role request payload:', payload);

      const res = await axios.post(`${baseurl}/v1/auth/request-role`, payload, config);

      console.log('Role request response:', res);

      if (res.status === 200 || res.status === 201 || res.status === 500) {
        showToast('Role request submitted successfully! Redirecting to dashboard.', 'success');
        closeRoleForm();
        setCurrentUser((prev) => ({
          ...prev,
          roles: [...(prev?.roles || []), upperRole],
        }));
        redirectToDashboard(upperRole, token);
      }
    } catch (error) {
      console.error('Role request error:', error);

      let errorMsg = 'Failed to submit role request. Please try again.';
      let statusCode = error.response?.status;

      if (error.response) {
        const backendMessage = error.response.data?.error?.message || error.response.data?.message;

        if (backendMessage === 'User already has this role') {
          errorMsg = 'You are already registered. Redirecting to login...';
          redirectToDashboard(upperRole, token);
          return;
        }

        if (statusCode === 401) {
          errorMsg = 'Unauthorized: Please log in again.';
          toast.error(errorMsg);
          navigate('/login');
        } else if (statusCode === 403) {
          errorMsg = 'Forbidden: You lack permission to submit role request.';
          toast.error(errorMsg);
        } else if (backendMessage) {
          errorMsg = backendMessage;
          toast.error(errorMsg);
        } else {
          errorMsg = 'Something went wrong.';
          toast.error(errorMsg);
        }
      } else {
        toast.error('Network error. Please try again later.');
      }

      console.error('Status:', statusCode);
      console.error('Error Message:', errorMsg);
      console.error('Full Response:', error.response?.data);

      showToast(`${statusCode || 'Error'}: ${errorMsg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const [activeMain, setActiveMain] = useState('');

  const propertyItems = [
    { path: '/properties', label: 'Properties' },
    { path: '/residential', label: 'Residential' },
    { path: '/commercialProperty', label: 'Commercial' },
  ];

  const othersItems = [
    { path: '/about', label: 'About Us' },
    { path: '/enquiryform', label: 'Inquiry Form' },
    { path: '/contact', label: 'Contact Us' },
    { path: '/faq', label: 'FAQ' },
    { path: '/residential', label: 'Residential' },
    { path: '/commercialProperty', label: 'Commercial' },
    { path: '/termsandcondition', label: 'Terms and Conditions' },
    { path: '/privacyandpolicy', label: 'Privacy and Policy' },
    { path: '/RefundPolicy', label: 'Refund Policy' },
  ];

  const getAuthData = () => {
    const authData = localStorage.getItem('authData');
    if (authData) {
      try {
        return JSON.parse(authData);
      } catch (err) {
        console.error('Error parsing authData:', err);
        return null;
      }
    }
    return null;
  };

  const getToken = () => {
    const authData = getAuthData();
    const token = authData?.token || null;
    return token;
  };

  useEffect(() => {
    const authData = getAuthData();
    if (authData) {
      setCurrentUser(authData);
      if (authData.roles && Array.isArray(authData.roles)) {
        setRoles(authData.roles.map((r) => r.toUpperCase()));
      }
    }
  }, []);

  const fetchCurrentUser = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await axios.get(`${baseurl}/v1/users/me`, config);
      setCurrentUser(res.data);
      console.log('Current user data:', res.data);
    } catch (error) {
      console.error('Failed to fetch current user:', error.response || error);
    }
  };

  const getCurrentLocation = async (lat, lng) => {
    try {
      setLoadingLocation(true);
      const googleResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=AIzaSyAepBinSy2JxyEvbidFz_AnFYFsFlFqQo4`
      );

      if (googleResponse.data.status === "OK") {
        const addressComponents = googleResponse.data.results[0].address_components;
        console.log(googleResponse.data)
        let street = "";
        let colony = "";
        let place = "";
        let city = "";
        let state = "";
        let districtName = "";
        let pincode = "";

        for (const component of addressComponents) {
          if (component.types.includes("street_number")) street = component.long_name;
          if (component.types.includes("route")) place = component.long_name;
          if (
            component.types.includes("sublocality_level_1") ||
            component.types.includes("neighborhood") ||
            component.types.includes("sublocality")
          )
            colony = component.long_name;
          if (component.types.includes("locality")) {
            city = component.long_name;
          } else if (!city && component.types.includes("administrative_area_level_2")) {
            city = component.long_name;
          }
          if (component.types.includes("administrative_area_level_1"))
            state = component.long_name;
          if (
            component.types.includes("administrative_area_level_3") ||
            component.types.includes("administrative_area_level_2")
          )
            districtName = component.long_name;
          if (component.types.includes("postal_code")) pincode = component.long_name;
        }

        // ${street ? street + ", " : ""}
        // ${place ? place + ", " : ""
        // ${colony ? colony + ", " : ""}
        // console.log()
        const formattedLocation = `
          ${city}, ${state}`;

        setCurrentLocation(formattedLocation);
      } else {
        setCurrentLocation("Location not found");
      }
    } catch (error) {
      console.error("❌ Location fetch error:", error.response || error);
      setCurrentLocation("Location not found");
    } finally {
      setLoadingLocation(false);
    }
  };


  // const handleRefreshLocation = () => {
  //   if (navigator.geolocation) {
  //     setLoadingLocation(true);
  //     navigator.geolocation.getCurrentPosition(
  //       (position) => {
  //         const { latitude, longitude } = position.coords;
  //         // console.log("🔄 Refreshed coordinates:", latitude, longitude);
  //         getCurrentLocation(latitude, longitude);
  //       },
  //       (error) => {
  //         console.error("❌ Refresh location error:", error);
  //         setCurrentLocation("Location not found");
  //         setLoadingLocation(false);
  //       },
  //       { timeout: 1000 }
  //     );
  //   } else {
  //     alert("Geolocation is not supported by your browser");
  //   }
  // };



  const handleRefreshLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setLoadingLocation(true);

    // 🔥 STEP 1: Remove old location from localStorage
    localStorage.removeItem("currentLocation");
    localStorage.removeItem("latitude");
    localStorage.removeItem("longitude");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        // 🔥 STEP 2: Fetch new location (API / reverse geocode)
        getCurrentLocation(latitude, longitude);

        // 🔥 STEP 3: Store new location in localStorage
        localStorage.setItem("latitude", latitude);
        localStorage.setItem("longitude", longitude);

        setLoadingLocation(false);
      },
      (error) => {
        console.error("❌ Refresh location error:", error);
        setCurrentLocation("Location not found");
        setLoadingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0, // 🔥 ensures fresh location
      }
    );
  };


  const getTrimmedLocation = (location) => {
    if (!location) return 'Location not found';
    return location.length > 40 ? location.slice(0, 55) + '...' : location;
  };

  const token = getToken();

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    }

    if (!isLanding) return;

    const handleScroll = () => {
      const header = document.querySelector('header');
      if (window.scrollY > 50) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }
    };

    window.addEventListener('scroll', handleScroll);

    if (token && navigator.geolocation) {
      const requestLocation = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log('User coordinates:', latitude, longitude);
            localStorage.setItem('myLocation', JSON.stringify({ latitude, longitude }));
            getCurrentLocation(latitude, longitude);
          },
          (error) => {
            console.error('Geolocation error:', error);
            setCurrentLocation('Location not found');
          },
          { timeout: 1000 }
        );
      };

      requestLocation();
    }

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isLanding, token]);

  const location = useLocation();
  const isLandingPage = location.pathname === '/';
  const isLoggedIn = !!getToken();

  const handleDeveloperClick = () => {
    setComingSoonVisible(true);
  };

  // const closeComingSoonModal = () => {
  //   setComingSoonVisible(false);
  // };

  return (
    <>
      <header className={`${isLanding ? 'fixed transparent-header text-white' : 'relative white-header text-dark'}`}>
        <div
          className="nav"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            margin: '0',
            width: '100%',
            paddingTop: '8px',
            paddingBottom: '12px',
            paddingLeft: '20px',
            paddingRight: '20px',
          }}
        >
          <div className="mobile-left">
            <div className="menu-toggle" onClick={toggleMenu}>
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>

          <div className="logo-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <div className="mobile-center ms-4" style={{ display: 'flex', alignItems: 'center', width: '200px', marginTop: '5px' }}>
                <img src={logo} alt="Logo" className="me-4 mt-3" style={{ width: '60px', marginTop: '3px' }} />
                <span
                  className="nearprop-logo-text"
                  style={{
                    marginLeft: '-20px',
                    marginBottom: '5px',
                    fontSize: '30px',
                    fontWeight: 'bold',
                    marginTop: '10px',
                    color: isLandingPage ? 'white' : 'darkcyan',
                  }}
                >
                  Nearprop
                </span>
              </div>
            </Link>
            {isLoggedIn && currentLocation && !menuOpen && (
              <div className="dousy mt-1">
                <div className="location-wrapper">
                  <FontAwesomeIcon
                    icon={faLocationDot}
                    className="location-icon"
                    style={{ color: isLandingPage ? "white" : "black" }}
                  />

                  {loadingLocation ? (
                    <span style={{ marginLeft: "10px", fontStyle: "italic", color: "white" }}>
                      ⏳ Fetching location...
                    </span>
                  ) : (
                    <span
                      className={` ${isLandingPage ? "text-white" : "text-cyan-800"}`}
                      style={{ marginLeft: "2px", color: isLandingPage ? "white" : "black" }}
                    >
                      {getTrimmedLocation(currentLocation)}
                    </span>
                  )}

                  <button
                    onClick={handleRefreshLocation}
                    disabled={loadingLocation}
                    className="location-refresh-btn"
                    style={{
                      background: isLandingPage ? "white" : "#06b6d4",
                      color: isLandingPage ? "#06b6d4" : "white",
                      opacity: loadingLocation ? 0.6 : 1,
                      cursor: loadingLocation ? "not-allowed" : "pointer",
                    }}
                  >
                    {loadingLocation ? "..." : "↻"}
                  </button>
                </div>
              </div>
            )}
            <style jsx>{`
        @media (max-width: 768px) {
          .logo-container {
            margin-top: 70px; /* Add margin to push the logo down in mobile view */
            padding: 10px; /* Add padding for better spacing */
            justify-content: center; /* Center the content */
          }
          .mobile-center {
            width: 100%; /* Make the logo container full-width */
            justify-content: center; /* Center the logo and text */
            margin-left: 0; /* Remove left margin for mobile */
            margin-top: 15px; /* Adjust top margin */
          }
          .nearprop-logo-text {
            font-size: 24px; /* Slightly smaller font size for mobile */
            margin-left: -15px; /* Adjust margin for better alignment */
          }
          .dousy {
            margin-top: 10px; /* Adjust margin for location section */
          }
        }
      `}</style>
          </div>
          <nav className="desktop-nav" style={{ flexGrow: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <ul className="nav-links" style={{ justifyContent: 'flex-end', fontSize: '14px' }}>
              <li>
                <Link to="/" onClick={() => setActiveMain('')}>
                  <strong>Home</strong>
                </Link>
              </li>
              <li className="dropdown">
                <Link to="/properties" onClick={() => setActiveMain('')}>
                  <strong>{propertyItems.find((item) => location.pathname === item.path)?.label || 'Property'}</strong>
                </Link>
                <ul className="dropdown-menu">
                  {propertyItems.map((item) => (
                    <li key={item.path}>
                      <Link to={item.path} className="text-dark" onClick={() => setActiveMain('property')}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li>
                <Link to="/agent">
                  <strong>Property Advisor</strong>
                </Link>
              </li>
              <li>
                <a
                  href="/developer"
                  onClick={handleDeveloperClick}
                // style={{ color: 'gray', opacity: 0.7, cursor: 'pointer' }}
                >
                  <strong>Developer</strong>
                </a>
              </li>
              <li>
                <Link to="/reels">
                  <strong>Reel</strong>
                </Link>
              </li>
              <li className="dropdown">
                <a href="#" className="text-dark">
                  <strong>{othersItems.find((item) => location.pathname === item.path)?.label || 'Others'}</strong>
                </a>
                <ul className="dropdown-menu text-center">
                  {othersItems.map((item) => (
                    <li key={item.path}>
                      <Link to={item.path} className="text-dark" onClick={() => setActiveMain('others')}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
              <li className="user-profile-li">
                <Link to={isLoggedIn ? '/userprofile' : '/login'}>
                  <FontAwesomeIcon
                    icon={faCircleUser}
                    size="2xl"
                    className="nearprop-logo-text ms-2"
                    style={{
                      color: isLanding ? '#ffffff' : '#000000',
                      cursor: 'pointer',
                      transition: 'color 0.3s ease',
                    }}
                  />
                </Link>
              </li>
              <li>
                <label
                  className={isLandingPage ? 'text-white' : 'text-dark'}
                  style={{ fontWeight: '600', cursor: 'pointer' }}
                  onClick={openRoleForm}
                >
                  {isLoggedIn && !menuOpen && (
                    <div className="">
                      <div style={{}} className="">
                        Add Property
                      </div>
                    </div>
                  )}
                </label>
              </li>
            </ul>
          </nav>

          <div
            className="mobile-right abci mobile-left user-dropdown-container"
            style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '15px', position: 'relative' }}
          >
            <div
              className="user-location-container"
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}
            >
              <Link to={isLoggedIn ? '/userprofile' : '/login'}>
                <FontAwesomeIcon
                  icon={faCircleUser}
                  size="2xl"
                  className="nearprop-logo-text ms-2 abhi"
                  style={{
                    color: isLanding ? '#ffffff' : '#000000',
                    cursor: 'pointer',
                    transition: 'color 0.3s ease',
                  }}
                />
              </Link>
            </div>
          </div>
        </div>

        <div className={`mobile-menu ${menuOpen ? 'active' : ''}`}>
          <div className="logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <img src={logo} alt="Logo" style={{ height: '50px', marginLeft: '-30px' }} />
              <span
                className=""
                style={{ marginLeft: '5px', fontSize: '20px', fontWeight: 'bold', color: 'darkcyan' }}
              >
                Nearprop
              </span>
            </div>
            <button
              onClick={() => setMenuOpen(false)}
              className="ms-6"
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'black',
              }}
            >
              ×
            </button>
          </div>
          <ul className="scrollable-list">
            <li>
              <Link to="/" onClick={() => setMenuOpen(false)}>
                Home
              </Link>
            </li>
            <li className="dropdown">
              <a href="#" className="text-dark">
                Property
              </a>
              <ul className="dropdown-menu text-center">
                {propertyItems.map((item) => (
                  <li key={item.path}>
                    <Link to={item.path} className="text-dark" onClick={() => setMenuOpen(false)}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <Link to="/agent" onClick={() => setMenuOpen(false)}>
                Property Advisor
              </Link>
            </li>
            <li>
              <a
                href="#"
                onClick={() => {
                  handleDeveloperClick();
                  setMenuOpen(false);
                }}
                style={{ color: 'gray', opacity: 0.7, cursor: 'pointer' }}
              >
                Developer
              </a>
            </li>
            <li>
              <Link to="/reels" onClick={() => setMenuOpen(false)}>
                Reel
              </Link>
            </li>
            <li className="text-primary">Others</li>
            {othersItems.map((item) => (
              <li key={item.path}>
                <Link to={item.path} className="text-dark" onClick={() => setMenuOpen(false)}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <div
                className="user-location-container"
                style={{
                  alignItems: 'center',
                  gap: '5px',
                  marginTop: '-50px',
                }}
              >
                <Link to={isLoggedIn ? '/userprofile' : '/login'}>
                  <FontAwesomeIcon
                    icon={faCircleUser}
                    size="2xl"
                    className="nearprop-logo-text"
                    style={{ color: '#000000', cursor: 'pointer' }}
                  />
                </Link>
                {isLoggedIn && currentLocation && (
                  <div
                    className="location-display"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <FontAwesomeIcon icon={faLocationDot} style={{ color: '#000000' }} />
                    <span
                      className="nearprop-location-text"
                      style={{
                        color: '#000000',
                        fontSize: '10px',
                        fontWeight: '300',
                      }}
                    >
                      {getTrimmedLocation(currentLocation)}
                    </span>
                  </div>
                )}
              </div>
            </li>
            <li>
              <button
                className="mobile-create-listing-btn text-dark"
                style={{ fontWeight: '600', padding: '8px 15px', width: '100%', textAlign: 'left', marginLeft: '-12px' }}
                onClick={() => {
                  openRoleForm();
                  setMenuOpen(false);
                }}
              >
                Add Property
              </button>
            </li>
            <li>
              <a href="tel:+919155105666">
                <strong className="d-inline-flex">
                  <FontAwesomeIcon icon={faPhoneVolume} className="me-2" />
                  +91 91551-05666
                </strong>
              </a>
            </li>
          </ul>
        </div>

        <ToastContainer />

        {roleFormVisible && (
          <div className="role-modal-overlay">
            <div className="role-modal-dialog">
              <div className="role-modal-content">
                <button className="role-modal-close" onClick={closeRoleForm}>
                  <FaTimes />
                </button>
                <div className="role-modal-header">
                  <h5 className="role-modal-title">
                    {currentUser?.roles?.length > 0 ? "Your Dashboards" : "Request Role"}
                  </h5>
                </div>
                <div className="role-modal-body">
                  {currentUser?.roles?.length > 0 ? (
                    <>
                      <div className="dashboard-links">
                        {currentUser.roles.includes("DEVELOPER") && (
                          <button
                            className="dashboard-btn"
                            onClick={() => redirectToDashboard("DEVELOPER", token)}
                          >
                            <FaUserCog className="icon" /> Developer Dashboard
                          </button>
                        )}

                        <button
                          className="dashboard-btn"
                          onClick={() => window.open("https://pgandhostel.nearprop.com/", "_blank")}
                        >
                          🏠 PG & Hostel
                        </button>

                        <button
                          className="dashboard-btn"
                          onClick={() => window.open("https://hotelsandbanquets.nearprop.com/", "_blank")}
                        >
                          🏨 Hotel & Banquet
                        </button>

                        {currentUser.roles.includes("SELLER") && (
                          <button
                            className="dashboard-btn"
                            onClick={() => redirectToDashboard("SELLER", token)}
                          >
                            <FaUserTie className="icon" /> Seller/Owner Dashboard
                          </button>
                        )}
                        {currentUser.roles.includes("ADVISOR") && (
                          <button
                            className="dashboard-btn"
                            onClick={() => redirectToDashboard("ADVISOR", token)}
                          >
                            <FaUserShield className="icon" /> Advisor Dashboard
                          </button>
                        )}
                        {currentUser.roles.includes("ADMIN") && (
                          <button
                            className="dashboard-btn"
                            onClick={() => window.open("https://admindashboard.nearprop.com/", "_blank")}
                          >
                            <FaUserShield className="icon" /> Admin Dashboard
                          </button>
                        )}
                      </div>
                      <div className="divider">Or Apply for New Role</div>
                      <div className="role-form">
                        <label className="form-label">Choose Role</label>
                        <select
                          className="form-select"
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value)}
                        >
                          <option value="">Select a role</option>
                          {["DEVELOPER", "SELLER", "ADVISOR"].filter(
                            (role) => !currentUser?.roles?.includes(role)
                          ).map((role) => (
                            <option key={role} value={role}>
                              {role === "DEVELOPER"
                                ? "Developer"
                                : role === "SELLER"
                                  ? "Seller"
                                  : "Property Advisor"}
                            </option>
                          ))}
                        </select>
                        <label className="form-label">Reason for Role</label>
                        <textarea
                          className="form-control"
                          value={reason}
                          onChange={(e) => setReason(e.target.value)}
                          placeholder="Explain why you want this role"
                          rows="3"
                        ></textarea>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={handleRoleRequest}
                          disabled={isLoading}
                        >
                          {isLoading ? "Submitting..." : "Request Role"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="role-form">
                      <label className="form-label">Choose Role</label>
                      <select
                        className="form-select"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                      >
                        <option value="">Select a role</option>
                        <option value="DEVELOPER">Developer</option>
                        <option value="SELLER">Seller/Owner</option>
                        <option value="ADVISOR">Property Advisor</option>
                      </select>
                      <label className="form-label">Reason for Role</label>
                      <textarea
                        className="form-control"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Explain why you want this role"
                        rows="3"
                      ></textarea>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleRoleRequest}
                        disabled={isLoading}
                      >
                        {isLoading ? "Submitting..." : "Request Role"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* {comingSoonVisible && (
          <div className="modal-overlay">
            <div className="modal-dialog">
              <div className="modal-content">
                <button type="button" className="modal-close" onClick={closeComingSoonModal}>
                  &times;
                </button>
                <div className="modal-header">
                  <h5 className="modal-title">Coming Soon</h5>
                </div>
                <div className="modal-body">
                  <p>This feature is coming soon!</p>
                </div>
              </div>
            </div>
          </div>
        )} */}

        {menuOpen && <div className={`overlay ${menuOpen ? 'active' : ''}`} onClick={() => setMenuOpen(false)}></div>}
        {location.pathname === '/' && <hr className="divider" />}
      </header>
    </>
  );
};

export default Pageheader;