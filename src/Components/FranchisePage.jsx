import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { baseurl } from '../../BaseUrl';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './FranchisePage.css';

// Import react-select and highlighter
import Select from 'react-select';
import Highlighter from 'react-highlight-words';

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
  return authData?.token || null;
};

// Custom Option Component with Highlighted Search Text (blue bold like image)
const CustomOption = ({ innerProps, label, selectProps }) => {
  const searchText = selectProps.inputValue || '';
  return (
    <div {...innerProps} style={{ padding: '8px 12px', cursor: 'pointer' }}>
      <Highlighter
        highlightClassName="font-bold text-blue-600 bg-transparent"
        searchWords={[searchText]}
        textToHighlight={label}
        autoEscape={true}
      />
    </div>
  );
};

// Custom Styles for react-select to match your existing design and image
const customSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '40px',
    borderColor: '#d1d5db',
    borderRadius: '0.375rem',
    boxShadow: state.isFocused ? '0 0 0 1px #4285f4' : 'none',
    '&:hover': {
      borderColor: '#9ca3af',
    },
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
    borderRadius: '0.375rem',
    overflow: 'hidden',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected
      ? '#4285f4'
      : state.isFocused
      ? '#f3f4f6'
      : 'white',
    color: state.isSelected ? 'white' : '#1f2937',
    padding: '8px 12px',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#9ca3af',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#1f2937',
  }),
  dropdownIndicator: (provided) => ({
    ...provided,
    color: '#6b7280',
  }),
};

const FranchiseRequestForm = ({ onClose }) => {
  const [franchiseData, setFranchiseData] = useState({
    districtId: '',
    state: '',
    businessName: '',
    businessAddress: '',
    businessRegistrationNumber: '',
    gstNumber: '',
    panNumber: '',
    aadharNumber: '',
    contactEmail: '',
    contactPhone: '',
    yearsOfExperience: ''
  });
  const [documents, setDocuments] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [states, setStates] = useState([]);
  const [filteredDistricts, setFilteredDistricts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchDistricts = async () => {
    try {
      const token = getToken();
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };
      const res = await axios.get(`${baseurl}/property-districts`, config);
      const districtData = res.data || [];
      setDistricts(districtData);

      // Extract unique states and sort them alphabetically
      const uniqueStates = [...new Set(districtData.map((district) => district.state))].sort();
      setStates(uniqueStates);
    } catch (error) {
      console.error('District fetch error:', error.response || error);
      showToast('Failed to fetch districts. Please try again.');
    }
  };

  const filterDistrictsByState = (selectedState) => {
    if (!selectedState) {
      setFilteredDistricts([]);
      setFranchiseData((prev) => ({ ...prev, districtId: '' }));
      return;
    }
    const filtered = districts.filter((district) => district.state === selectedState);
    setFilteredDistricts(filtered);
    setFranchiseData((prev) => ({ ...prev, districtId: '' }));
  };

  const handleFranchiseInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'businessName') {
      const textOnly = value.replace(/[^a-zA-Z\s]/g, '');
      setFranchiseData((prev) => ({ ...prev, [name]: textOnly }));
      return;
    }
    
    if (name === 'contactPhone') {
      const numbersOnly = value.replace(/[^0-9]/g, '');
      if (numbersOnly.length <= 10) {
        setFranchiseData((prev) => ({ ...prev, [name]: numbersOnly }));
      }
      return;
    }
    
    if (name === 'panNumber') {
      const panFormatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (panFormatted.length <= 10) {
        setFranchiseData((prev) => ({ ...prev, [name]: panFormatted }));
      }
      return;
    }
    
    if (name === 'aadharNumber') {
      const numbersOnly = value.replace(/[^0-9]/g, '');
      if (numbersOnly.length <= 12) {
        setFranchiseData((prev) => ({ ...prev, [name]: numbersOnly }));
      }
      return;
    }
    
    if (name === 'gstNumber') {
      const gstFormatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      if (gstFormatted.length <= 15) {
        setFranchiseData((prev) => ({ ...prev, [name]: gstFormatted }));
      }
      return;
    }
    
    setFranchiseData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setDocuments((prev) => [...new Set([...prev, ...files])]);
  };

  const validateForm = () => {
    const {
      districtId,
      state,
      businessName,
      businessAddress,
      businessRegistrationNumber,
      gstNumber,
      panNumber,
      aadharNumber,
      contactEmail,
      contactPhone,
      yearsOfExperience
    } = franchiseData;

    if (!districtId || !state || !businessName || !businessAddress || !businessRegistrationNumber || 
        !gstNumber || !panNumber || !aadharNumber || !contactEmail || !contactPhone || 
        !yearsOfExperience || documents.length === 0) {
      showToast('Please fill all fields and upload at least one document.');
      return false;
    }

    if (contactPhone.length !== 10) {
      showToast('Contact phone must be exactly 10 digits.');
      return false;
    }

    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (!panRegex.test(panNumber)) {
      showToast('PAN number must be in format: ABCDE1234F');
      return false;
    }

    if (aadharNumber.length !== 12) {
      showToast('Aadhar number must be exactly 12 digits.');
      return false;
    }

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gstNumber)) {
      showToast('GST number must be in format: 22AAAAA0000A1Z5');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      showToast('Please enter a valid email address.');
      return false;
    }

    return true;
  };

  const handleFranchiseRequest = async () => {
    if (isLoading) return;
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);

    const {
      districtId,
      state,
      businessName,
      businessAddress,
      businessRegistrationNumber,
      gstNumber,
      panNumber,
      aadharNumber,
      contactEmail,
      contactPhone,
      yearsOfExperience
    } = franchiseData;

    const token = getToken();
    if (!token) {
      showToast('Please log in to submit franchise request.');
      setIsLoading(false);
      navigate('/login');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('districtId', districtId);
      formData.append('state', state);
      formData.append('businessName', businessName);
      formData.append('businessAddress', businessAddress);
      formData.append('businessRegistrationNumber', businessRegistrationNumber);
      formData.append('gstNumber', gstNumber);
      formData.append('panNumber', panNumber);
      formData.append('aadharNumber', aadharNumber);
      formData.append('contactEmail', contactEmail);
      formData.append('contactPhone', contactPhone);
      formData.append('yearsOfExperience', yearsOfExperience);
      documents.forEach((doc) => formData.append('documents', doc));

      const config = {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      };

      const res = await axios.post(`${baseurl}/franchisee/requests`, formData, config);
      if (res.status === 200 || res.status === 201) {
        showToast('Franchise request submitted successfully!', 'success');

        const confirmed = window.confirm(
          'Your franchise request has been submitted successfully! Do you want to go to the home page?'
        );

        if (confirmed) {
          setFranchiseData({
            districtId: '',
            state: '',
            businessName: '',
            businessAddress: '',
            businessRegistrationNumber: '',
            gstNumber: '',
            panNumber: '',
            aadharNumber: '',
            contactEmail: '',
            contactPhone: '',
            yearsOfExperience: ''
          });
          setDocuments([]);
          setFilteredDistricts([]);

          navigate('/');
        }
      }
    } catch (error) {
      console.error('Franchise request submission error:', error.response || error);
      const errorMsg = error.response?.status === 401 ? 'Unauthorized: Please log in again.' :
        error.response?.status === 403 ? 'Forbidden: You lack permission to submit franchise request.' :
          error.response?.data?.message || 'Failed to submit franchise request. Please try again.';
      showToast(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDistricts();
  }, []);

  // Prepare options for react-select (states sorted alphabetically)
  const stateOptions = states.map(state => ({ value: state, label: state }));
  const districtOptions = filteredDistricts.map(district => ({
    value: district.id,
    label: district.name
  }));

  const selectedState = stateOptions.find(opt => opt.value === franchiseData.state) || null;
  const selectedDistrict = districtOptions.find(opt => opt.value === franchiseData.districtId) || null;

  return (
    <div className="franchise-form-container">
      <div className="modal-header">
        <h2 className="modal-title text-dark mb-4">Franchise Request</h2>
        <label
            type="button" 
            className="close-button" 
            onClick={() => navigate('/')}
            aria-label="Close"
          >
            ×
          </label>
      </div>
      <div className="franchise-form">
        <label className="form-label text-dark">State</label>
        <Select
          options={stateOptions}
          value={selectedState}
          onChange={(selected) => {
            const newState = selected ? selected.value : '';
            setFranchiseData(prev => ({ ...prev, state: newState, districtId: '' }));
            filterDistrictsByState(newState);
          }}
          placeholder="Select a state"
          isSearchable={true}
          isClearable={true}
          styles={customSelectStyles}
          components={{ Option: CustomOption }}
          className="mb-3"
        />
        
        <label className="form-label text-dark">District</label>
        <Select
          options={districtOptions}
          value={selectedDistrict}
          onChange={(selected) => 
            setFranchiseData(prev => ({ ...prev, districtId: selected ? selected.value : '' }))
          }
          placeholder="Select a district"
          isSearchable={true}
          isClearable={true}
          isDisabled={!franchiseData.state}
          styles={customSelectStyles}
          components={{ Option: CustomOption }}
          className="mb-3"
        />
        
        {/* Rest of the form remains exactly the same */}
        <label className="form-label text-dark">Applicant Name</label>
        <input
          type="text"
          className="form-control mb-3"
          name="businessName"
          value={franchiseData.businessName}
          onChange={handleFranchiseInputChange}
          placeholder="Enter Applicant name (text only)"
        />
        
        <label className="form-label text-dark">Applicant Address</label>
        <input
          type="text"
          className="form-control mb-3"
          name="businessAddress"
          value={franchiseData.businessAddress}
          onChange={handleFranchiseInputChange}
          placeholder="Enter Applicant address"
        />
        
        <label className="form-label text-dark">Applicant Registration Number</label>
        <input
          type="text"
          className="form-control mb-3"
          name="businessRegistrationNumber"
          value={franchiseData.businessRegistrationNumber}
          onChange={handleFranchiseInputChange}
          placeholder="Enter Applicant registration number"
        />
        
        <label className="form-label text-dark">GST Number</label>
        <input
          type="text"
          className="form-control mb-3"
          name="gstNumber"
          value={franchiseData.gstNumber}
          onChange={handleFranchiseInputChange}
          placeholder="22AAAAA0000A1Z5 (15 characters)"
          maxLength="15"
        />
        
        <label className="form-label text-dark">PAN Number</label>
        <input
          type="text"
          className="form-control mb-3"
          name="panNumber"
          value={franchiseData.panNumber}
          onChange={handleFranchiseInputChange}
          placeholder="ABCDE1234F (10 characters)"
          maxLength="10"
        />
        
        <label className="form-label text-dark">Aadhar Number</label>
        <input
          type="text"
          className="form-control mb-3"
          name="aadharNumber"
          value={franchiseData.aadharNumber}
          onChange={handleFranchiseInputChange}
          placeholder="123456789012 (12 digits)"
          maxLength="12"
        />
        
        <label className="form-label text-dark">Contact Email</label>
        <input
          type="email"
          className="form-control mb-3"
          name="contactEmail"
          value={franchiseData.contactEmail}
          onChange={handleFranchiseInputChange}
          placeholder="example@email.com"
        />
        
        <label className="form-label text-dark">Contact Phone</label>
        <input
          type="text"
          className="form-control mb-3"
          name="contactPhone"
          value={franchiseData.contactPhone}
          onChange={handleFranchiseInputChange}
          placeholder="9876543210 (10 digits only)"
          maxLength="10"
        />
        
        <label className="form-label text-dark">Years of Experience</label>
        <input
          type="number"
          className="form-control mb-3"
          name="yearsOfExperience"
          value={franchiseData.yearsOfExperience}
          onChange={handleFranchiseInputChange}
          placeholder="Enter years of experience"
          min="0"
        />
        
        <label className="form-label text-dark">Upload Aadhar Front</label>
        <input
          type="file"
          name='documents'
          className="form-control mb-3"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
        
        <label className="form-label text-dark">Upload Aadhar Back</label>
        <input
          type="file"
          name='documents'
          className="form-control mb-3"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFileChange}
        />
        
        <button
          type="button"
          className="btn btn-primary w-100"
          onClick={handleFranchiseRequest}
          disabled={isLoading}
        >
          {isLoading ? 'Submitting...' : 'Submit Franchise Request'}
        </button>
      </div>
    </div>
  );
};

// MyFranchiseRequests and FranchisePage components remain unchanged
const MyFranchiseRequests = ({ onClose }) => {
  const [franchiseRequests, setFranchiseRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const fetchFranchiseRequests = async () => {
    setIsLoading(true);
    const token = getToken();
    if (!token) {
      showToast('Please log in to view franchise requests.');
      navigate('/login');
      return;
    }

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await axios.get(`${baseurl}/franchisee/requests/my-requests?page=0&size=10&sortBy=createdAt&direction=DESC`, config);
      setFranchiseRequests(res.data.content || []);
      if (res.data.content.length === 0) {
        showToast('No franchise requests found.', 'info');
      }
    } catch (error) {
      console.error('Franchise requests fetch error:', error.response || error);
      const errorMsg = error.response?.status === 401 ? 'Unauthorized: Please log in again.' :
        error.response?.status === 403 ? 'Forbidden: You lack permission to view franchise requests.' :
          error.response?.data?.message || 'Failed to fetch franchise requests. Please try again.';
      showToast(errorMsg);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const cancelFranchiseRequest = async (requestId) => {
    if (isLoading) return;
    setIsLoading(true);
    const token = getToken();
    if (!token) {
      showToast('Please log in to cancel franchise request.');
      navigate('/login');
      return;
    }

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      };
      const res = await axios.delete(`${baseurl}/franchisee/requests/${requestId}`, config);
      if (res.status === 200 || res.status === 204) {
        showToast('Franchise request canceled successfully.', 'success');
        await fetchFranchiseRequests();
      }
    } catch (error) {
      console.error('Cancel franchise request error:', error.response || error);
      const errorMsg = error.response?.status === 401 ? 'Unauthorized: Please log in again.' :
        error.response?.status === 403 ? 'Forbidden: You lack permission to cancel this request.' :
          error.response?.data?.message || 'Failed to cancel franchise request. Please try again.';
      showToast(errorMsg);
      if (error.response?.status === 401) {
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFranchiseRequests();
  }, []);

  return (
    <div className="franchise-requests-container">
      <div className="modal-header">
        <h2 className="modal-title text-dark mb-4">My Franchise Requests</h2>
        <button type="button" className="btn-close" onClick={() => navigate('/')}></button>
      </div>
      {isLoading ? (
        <p className="text-dark text-center">Loading...</p>
      ) : franchiseRequests.length === 0 ? (
        <p className="text-dark text-center">No franchise requests found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {franchiseRequests.map((request) => (
            <div
              key={request.id}
              className="border rounded-lg shadow-md p-4 bg-white hover:shadow-lg transition-shadow"
            >
              <h6 className="text-lg font-semibold text-dark mb-2">{request.businessName}</h6>
              <div className="grid grid-cols-1 text-dark gap-2 text-sm">
                <p><strong>District:</strong> {request.districtName}, {request.state}</p>
                <p><strong>Business Address:</strong> {request.businessAddress}</p>
                <p><strong>Registration Number:</strong> {request.businessRegistrationNumber}</p>
                <p><strong>GST Number:</strong> {request.gstNumber}</p>
                <p><strong>PAN Number:</strong> {request.panNumber}</p>
                <p><strong>Aadhar Number:</strong> {request.aadharNumber}</p>
                <p><strong>Contact Email:</strong> {request.contactEmail}</p>
                <p><strong>Contact Phone:</strong> {request.contactPhone}</p>
                <p><strong>Years of Experience:</strong> {request.yearsOfExperience}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span
                    className={
                      request.status === 'PENDING'
                        ? 'text-yellow-600 font-semibold'
                        : 'text-green-600 font-semibold'
                    }
                  >
                    {request.status}
                  </span>
                </p>
                <p><strong>Created At:</strong> {new Date(request.createdAt).toLocaleDateString()}</p>
                <p><strong>Updated At:</strong> {new Date(request.updatedAt).toLocaleDateString()}</p>
                <div>
                  <p className="font-semibold">Documents:</p>
                  {request.documentUrls && request.documentUrls.length > 0 ? (
                    <ul className="list-disc pl-5">
                      {request.documentUrls.map((url, index) => (
                        <li key={index}>
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            Document {index + 1}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>No documents uploaded.</p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                {request.status === 'PENDING' ? (
                  <button
                    className="btn btn-danger text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
                    onClick={() => cancelFranchiseRequest(request.id)}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Deleting...' : 'Delete Request'}
                  </button>
                ) : (
                  <span className="text-green-600 font-semibold">Confirmed</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const FranchisePage = () => {
  const location = useLocation();
  const isFranchiseRequest = location.pathname === '/franchise-request';
  const isMyFranchise = location.pathname === '/my-franchise';

  return (
    <div className="full-screen-container">
      <ToastContainer />
      {isFranchiseRequest && <FranchiseRequestForm />}
      {isMyFranchise && <MyFranchiseRequests />}
    </div>
  );
};

export default FranchisePage;