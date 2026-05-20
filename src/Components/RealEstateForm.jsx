import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './RealEstateForm.css';

const API_CONFIG = {
  baseUrl: 'https://api.nearprop.com',
  apiPrefix: 'api',
};

const GOOGLE_MAPS_API_KEY = 'AIzaSyAepBinSy2JxyEvbidFz_AnFYFsFlFqQo4';

const getToken = () => {
  try {
    const authData = localStorage.getItem('authData');
    if (!authData) {
      console.warn('No authData found in localStorage');
      return null;
    }
    const parsedData = JSON.parse(authData);
    const token = parsedData.token || null;
    console.log('Retrieved token:', token ? 'Token exists' : 'No token found');
    return token;
  } catch (err) {
    console.error('Error parsing authData:', err.message);
    return null;
  }
};

// Searchable Dropdown Component (jaise image mein tha)
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
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        type="text"
        value={isOpen ? searchTerm : selectedLabel}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => setIsOpen(true)}
        onClick={() => setIsOpen(true)}
        placeholder={selectedLabel || placeholder}
        disabled={disabled}
        className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-gray-100"
        readOnly={false}
      />
      {isOpen && (
        <div style={{
          position: 'absolute',
          zIndex: 1000,
          marginTop: '4px',
          width: '100%',
          backgroundColor: 'white',
          border: '1px solid #d1d5db',
          borderRadius: '6px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          maxHeight: '240px',
          overflowY: 'auto'
        }}>
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

const RealEstateForm = () => {
  const [inquiryFormData, setInquiryFormData] = useState({
    name: '',
    email: '',
    mobileNumber: '',
    infoType: '',
    propertyType: '',
    maxPrice: '',
    bedrooms: '',
    bathrooms: '',
    minSize: '',
    state: '',
    city: '',
    area: '',
    zipCode: '',
    districtId: '',
    latitude: '',
    longitude: '',
    message: '',
    gdprConsent: false,
  });

  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [locationError, setLocationError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Property Type Options
  const propertyTypeOptions = [
    { value: 'APARTMENT', label: 'Apartment' },
    { value: 'VILLA', label: 'Villa' },
    { value: 'OFFICE', label: 'Office' },
    { value: 'HOTEL', label: 'Hotel' },
    { value: 'MULTI_FAMILY_HOME', label: 'Multi Family Home' },
    { value: 'SINGLE_FAMILY_HOME', label: 'Single Family Home' },
    { value: 'STUDIO', label: 'Studio' },
    { value: 'SHOP', label: 'Shop' },
    { value: 'PG', label: 'PG' },
    { value: 'HOSTEL', label: 'Hostel' },
  ];

  // Residential types jisme bedrooms/bathrooms dikhane hain
  const residentialTypes = [
    'APARTMENT',
    'VILLA',
    'SINGLE_FAMILY_HOME',
    'MULTI_FAMILY_HOME',
    'STUDIO',
    'PG',
    'HOSTEL',
  ];

  const shouldShowBedBath = residentialTypes.includes(inquiryFormData.propertyType);

  // Improved fetchDistricts (aapke diye gaye logic se)
  useEffect(() => {
    const fetchDistricts = async () => {
      setIsLocationLoading(true);
      setLocationError('');
      try {
        const token = getToken();
        const config = {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        };
        const res = await axios.get(`${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/property-districts`, config);
        const districtData = res.data || [];
        setDistricts(districtData);

        // Unique states alphabetically sorted
        const uniqueStates = [...new Set(districtData.map((district) => district.state))].sort();
        setStates(uniqueStates);
        setFilteredDistricts([]);
      } catch (error) {
        console.error('District fetch error:', error.response || error);
        setLocationError('Failed to fetch districts. Please try again.');
      } finally {
        setIsLocationLoading(false);
      }
    };

    fetchDistricts();
  }, []);

  // State change pe districts filter karo
  useEffect(() => {
    if (inquiryFormData.state) {
      const filtered = districts.filter(district => district.state === inquiryFormData.state);
      setFilteredDistricts(filtered);
      setInquiryFormData(prev => ({ ...prev, districtId: '', city: '', zipCode: '' }));
    } else {
      setFilteredDistricts([]);
    }
  }, [inquiryFormData.state, districts]);

  // Geolocation logic (unchanged)
  const getCurrentLocation = async (lat, lng) => {
    try {
      setIsLocationLoading(true);
      const googleResponse = await axios.get(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
      );
      if (googleResponse.data.status === 'OK') {
        const results = googleResponse.data.results[0];
        let districtName = '', stateName = '', cityName = '', zipCode = '';
        const addressComponents = results.address_components;
        for (const component of addressComponents) {
          if (component.types.includes('administrative_area_level_3')) districtName = component.long_name;
          else if (!districtName && component.types.includes('administrative_area_level_2')) districtName = component.long_name;
          if (component.types.includes('administrative_area_level_1')) stateName = component.long_name;
          if (component.types.includes('locality')) cityName = component.long_name;
          if (component.types.includes('postal_code')) zipCode = component.long_name;
        }
        setInquiryFormData(prev => ({
          ...prev,
          latitude: lat.toString(),
          longitude: lng.toString(),
          state: stateName,
          city: cityName || prev.city,
          zipCode: zipCode || prev.zipCode,
        }));

        const token = getToken();
        try {
          const districtsResponse = await axios.get(
            `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/property-districts`,
            {
              headers: {
                'Content-Type': 'application/json',
                ...(token && { Authorization: `Bearer ${token}` }),
              },
            }
          );
          const districts = districtsResponse.data || [];
          const matchingDistrict = districts.find(
            district =>
              districtName.toLowerCase() === district.name?.toLowerCase() ||
              districtName.toLowerCase() === district.city?.toLowerCase()
          );
          if (matchingDistrict) {
            setInquiryFormData(prev => ({
              ...prev,
              districtId: matchingDistrict.id || '',
              city: matchingDistrict.city || cityName,
              zipCode: matchingDistrict.pincode || zipCode,
              state: matchingDistrict.state || stateName,
            }));
            setFilteredDistricts(districts.filter(d => d.state === matchingDistrict.state));
          } else {
            setLocationError('No matching district found. Please select manually.');
          }
        } catch (districtError) {
          setLocationError('Failed to match district. Select manually.');
        }
      } else {
        setLocationError('Failed to fetch location from Google Maps.');
      }
    } catch (error) {
      setLocationError('Error fetching location. Enter manually.');
    } finally {
      setIsLocationLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();
    if (token && navigator.geolocation) {
      setIsLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        position => {
          const { latitude, longitude } = position.coords;
          getCurrentLocation(latitude, longitude);
        },
        error => {
          let errorMessage = 'Location error. Enter details manually.';
          if (error.code === error.PERMISSION_DENIED) errorMessage = 'Location access denied.';
          else if (error.code === error.POSITION_UNAVAILABLE) errorMessage = 'Location unavailable.';
          else if (error.code === error.TIMEOUT) errorMessage = 'Location request timed out.';
          setLocationError(errorMessage);
          setIsLocationLoading(false);
        },
        { timeout: 10000 }
      );
    } else if (!token) {
      setLocationError('Please log in to use location features.');
    } else {
      setLocationError('Geolocation not supported.');
    }
  }, []);

  const handleInquiryChange = e => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setInquiryFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }
    if (name === 'name') {
      if (value === '' || /^[A-Za-z\s]+$/.test(value)) {
        setInquiryFormData(prev => ({ ...prev, [name]: value }));
        setFieldErrors(prev => ({ ...prev, name: '' }));
      }
      return;
    }
    if (name === 'mobileNumber') {
      if (value === '' || /^[0-9]{0,10}$/.test(value)) {
        setInquiryFormData(prev => ({ ...prev, [name]: value }));
        setFieldErrors(prev => ({ ...prev, mobileNumber: value.length === 10 ? '' : 'Mobile must be 10 digits' }));
      }
      return;
    }
    setInquiryFormData(prev => ({ ...prev, [name]: value }));
    const numericFields = ['maxPrice', 'bedrooms', 'bathrooms', 'minSize'];
    if (numericFields.includes(name)) {
      if (value && parseFloat(value) < 0) {
        setFieldErrors(prev => ({
          ...prev,
          [name]: `${name.replace(/([A-Z])/g, ' $1').trim()} cannot be negative`,
        }));
      } else {
        setFieldErrors(prev => ({ ...prev, [name]: '' }));
      }
    }
  };

  const handleDistrictSelect = (selectedName) => {
    const district = filteredDistricts.find(d => d.name === selectedName);
    setInquiryFormData(prev => ({
      ...prev,
      districtId: district?.id || '',
      city: district?.city || prev.city,
      zipCode: district?.pincode || prev.zipCode,
    }));
    setFieldErrors(prev => ({ ...prev, districtId: '' }));
  };

  const handleInquirySubmit = async e => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setFieldErrors({});
    const newErrors = {};

    if (!/^[A-Za-z\s]+$/.test(inquiryFormData.name.trim())) {
      newErrors.name = 'Name should contain only letters and spaces';
    }
    if (!/^\d{10}$/.test(inquiryFormData.mobileNumber)) {
      newErrors.mobileNumber = 'Mobile number must be exactly 10 digits';
    }
    if (!/^\d{6}$/.test(inquiryFormData.zipCode)) {
      newErrors.zipCode = 'Pin number must be exactly 6 digits';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inquiryFormData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      setError('Please correct the errors in the form.');
      setIsLoading(false);
      return;
    }

    try {
      const token = getToken();
      if (!token) throw new Error('No authentication token found. Please log in.');
      if (!inquiryFormData.gdprConsent) {
        setError('Please consent to data storage before submitting.');
        setIsLoading(false);
        return;
      }

      const requiredFields = ['name', 'email', 'mobileNumber', 'propertyType', 'state', 'districtId'];
      for (const field of requiredFields) {
        if (!inquiryFormData[field]) {
          newErrors[field] = `${field.replace(/([A-Z])/g, ' $1').trim()} is required`;
        }
      }
      if (Object.keys(newErrors).length > 0) {
        setFieldErrors(newErrors);
        setError('Please fill all required fields.');
        setIsLoading(false);
        return;
      }

      await axios.post(
        `${API_CONFIG.baseUrl}/${API_CONFIG.apiPrefix}/inquiries`,
        {
          name: inquiryFormData.name,
          email: inquiryFormData.email,
          mobileNumber: inquiryFormData.mobileNumber,
          infoType: inquiryFormData.infoType || 'RENT',
          propertyType: inquiryFormData.propertyType,
          maxPrice: parseFloat(inquiryFormData.maxPrice) || 0,
          bedrooms: parseInt(inquiryFormData.bedrooms) || 0,
          bathrooms: parseInt(inquiryFormData.bathrooms) || 0,
          minSize: inquiryFormData.minSize || '',
          state: inquiryFormData.state || '',
          city: inquiryFormData.city || '',
          area: inquiryFormData.area || '',
          zipCode: inquiryFormData.zipCode || '',
          districtId: parseInt(inquiryFormData.districtId) || 0,
          latitude: parseFloat(inquiryFormData.latitude) || 0,
          longitude: parseFloat(inquiryFormData.longitude) || 0,
          message: inquiryFormData.message || '',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        }
      );
      setShowSuccessDialog(true);
    } catch (error) {
      console.error('Error submitting inquiry:', error);
      const errorMessage = error.response?.data?.message || 'Please try again.';
      setError(`Failed to submit inquiry: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessDialogClose = () => {
    setShowSuccessDialog(false);
    setInquiryFormData({
      name: '', email: '', mobileNumber: '', infoType: '', propertyType: '',
      maxPrice: '', bedrooms: '', bathrooms: '', minSize: '', state: '',
      city: '', area: '', zipCode: '', districtId: '', latitude: '',
      longitude: '', message: '', gdprConsent: false,
    });
    setFilteredDistricts([]);
    setFieldErrors({});
  };

  return (
    <div className="landing-container">
      <div className="landing-left">
        <div className="landing-grid">
          <div className="landing-point">
            <h2>Why Nearprop?</h2>
            <hr />
            <p>Discover your dream property with ease.</p>
          </div>
          <div className="landing-point">
            <h3>01. For Agents & Agencies</h3>
            <p>Convert leads into clients seamlessly.</p>
            <hr />
          </div>
          <div className="landing-point">
            <h3>02. Custom Lead Forms</h3>
            <p>Track leads without external CRM.</p>
            <hr />
          </div>
          <div className="landing-point">
            <h3>03. Customizable Theme</h3>
            <p>Tailor your website to your brand.</p>
            <hr />
          </div>
        </div>
      </div>

      <div className="landing-right">
        <div className="landing-form">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Property Inquiry</h2>
          <p className="text-sm text-gray-600">Find your perfect property with Nearprop.</p>
          {error && <div className="p-2 bg-red-100 text-red-700 rounded-md text-sm mb-4">{error}</div>}

          <form onSubmit={handleInquirySubmit} className="space-y-4">
            <div className="form-row">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">Inquiry Type</label>
                <select
                  name="infoType"
                  value={inquiryFormData.infoType}
                  onChange={handleInquiryChange}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition"
                >
                  <option value="">Select Type</option>
                  <option value="RENT">Rent</option>
                  <option value="PURCHASE">Purchase</option>
                  <option value="SELL">Sell</option>
                </select>
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">Property Type</label>
                <SearchableDropdown
                  options={propertyTypeOptions}
                  value={inquiryFormData.propertyType}
                  onChange={(e) => handleInquiryChange({ target: { name: 'propertyType', value: e.target.value } })}
                  placeholder="Select Property"
                />
                {fieldErrors.propertyType && <div className="text-red-600 text-sm mt-1">{fieldErrors.propertyType}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input type="text" name="name" value={inquiryFormData.name} onChange={handleInquiryChange}
                  placeholder="Enter your name (letters only)" required
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition" />
                {fieldErrors.name && <div className="text-red-600 text-sm mt-1">{fieldErrors.name}</div>}
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">Mobile</label>
                <input type="text" name="mobileNumber" value={inquiryFormData.mobileNumber} onChange={handleInquiryChange}
                  placeholder="10-digit mobile number" maxLength="10" required
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition" />
                {fieldErrors.mobileNumber && <div className="text-red-600 text-sm mt-1">{fieldErrors.mobileNumber}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" name="email" value={inquiryFormData.email} onChange={handleInquiryChange}
                  placeholder="example@domain.com" required
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition" />
                {fieldErrors.email && <div className="text-red-600 text-sm mt-1">{fieldErrors.email}</div>}
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">Location</label>
                {isLocationLoading && <div className="text-blue-600 text-sm mt-1">Loading location...</div>}
                {locationError && <div className="text-red-600 text-sm mt-1">{locationError}</div>}
                <SearchableDropdown
                  options={states.map(s => ({ value: s, label: s }))}
                  value={inquiryFormData.state}
                  onChange={(e) => handleInquiryChange({ target: { name: 'state', value: e.target.value } })}
                  placeholder="Select State"
                />
                {fieldErrors.state && <div className="text-red-600 text-sm mt-1">{fieldErrors.state}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">District</label>
                <SearchableDropdown
                  options={filteredDistricts.map(d => ({ value: d.name, label: d.name }))}
                  value={filteredDistricts.find(d => d.id === inquiryFormData.districtId)?.name || ''}
                  onChange={(e) => handleDistrictSelect(e.target.value)}
                  placeholder="Select District"
                  disabled={!inquiryFormData.state}
                />
                {fieldErrors.districtId && <div className="text-red-600 text-sm mt-1">{fieldErrors.districtId}</div>}
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700 ">Pin Code</label>
                <input type="text" maxLength="6" name="zipCode" value={inquiryFormData.zipCode} onChange={handleInquiryChange}
                  placeholder="Enter zip code"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition" />
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">City</label>
                <input type="text" name="city" value={inquiryFormData.city} onChange={handleInquiryChange}
                  placeholder="Enter city"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">Max Price</label>
                <input type="number" name="maxPrice" value={inquiryFormData.maxPrice} onChange={handleInquiryChange}
                  placeholder="Enter max price"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition" />
                {fieldErrors.maxPrice && <div className="text-red-600 text-sm mt-1">{fieldErrors.maxPrice}</div>}
              </div>
              <div className="form-group">
                <label className="block text-sm font-medium text-gray-700">Min Size (sq ft)</label>
                <input type="number" name="minSize" value={inquiryFormData.minSize} onChange={handleInquiryChange}
                  placeholder="Enter min size"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition" />
                {fieldErrors.minSize && <div className="text-red-600 text-sm mt-1">{fieldErrors.minSize}</div>}
              </div>
            </div>

            {shouldShowBedBath && (
              <div className="form-row">
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700">Bedrooms</label>
                  <input type="number" name="bedrooms" value={inquiryFormData.bedrooms} onChange={handleInquiryChange}
                    placeholder="Number of bedrooms"
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition" />
                  {fieldErrors.bedrooms && <div className="text-red-600 text-sm mt-1">{fieldErrors.bedrooms}</div>}
                </div>
                <div className="form-group">
                  <label className="block text-sm font-medium text-gray-700">Bathrooms</label>
                  <input type="number" name="bathrooms" value={inquiryFormData.bathrooms} onChange={handleInquiryChange}
                    placeholder="Number of bathrooms"
                    className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition" />
                  {fieldErrors.bathrooms && <div className="text-red-600 text-sm mt-1">{fieldErrors.bathrooms}</div>}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="block text-sm font-medium text-gray-700">Message</label>
              <textarea name="message" value={inquiryFormData.message} onChange={handleInquiryChange}
                placeholder="Enter your message" rows="4"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 transition"></textarea>
            </div>

            <div className="d-inline-flex">
              <input type="checkbox" id="gdpr" name="gdprConsent" checked={inquiryFormData.gdprConsent} onChange={handleInquiryChange}
                className="h-4 w-4 me-3 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" required style={{ width: '20px' }} />
              <label htmlFor="gdpr" className="ml-2 text-sm text-gray-600">"I agree" to complete the form</label>
            </div>

            <div>
              <button type="submit"
                className="w-full p-2 bg-blue-600 kuibutton text-white rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 transition"
                disabled={isLoading || Object.values(fieldErrors).some(error => error)}>
                {isLoading ? 'Submitting...' : 'Submit Inquiry'}
              </button>
            </div>
          </form>

          {showSuccessDialog && (
            <div className="success-dialog-overlay">
              <div className="success-dialog">
                <h3>Inquiry Submitted Successfully!</h3>
                <p>Your inquiry has been submitted. We will get back to you soon.</p>
                <div className="dialog-buttons">
                  <button className="btn btn-success" onClick={handleSuccessDialogClose}>OK</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RealEstateForm;