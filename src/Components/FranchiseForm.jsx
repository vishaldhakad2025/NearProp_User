import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { baseurl, fetchDistricts } from './utils.js';
import { getToken } from './utils.js';

const FranchiseForm = ({ isVisible, onClose }) => {
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

  useEffect(() => {
    fetchDistricts(setDistricts, setStates);
  }, []);

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
    setFranchiseData((prev) => ({ ...prev, [name]: value }));
    if (name === 'state') {
      filterDistrictsByState(value);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setDocuments(files);
  };

  const handleFranchiseRequest = async () => {
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

    if (
      !districtId ||
      !state ||
      !businessName ||
      !businessAddress ||
      !businessRegistrationNumber ||
      !gstNumber ||
      !panNumber ||
      !aadharNumber ||
      !contactEmail ||
      !contactPhone ||
      !yearsOfExperience ||
      documents.length === 0
    ) {
      alert('Please fill all fields and upload at least one document.');
      return;
    }

    const token = getToken();
    if (!token) {
      alert('Please log in to submit a franchise request.');
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
      if (res.data.id) {
        alert('Franchise request submitted successfully!');
        onClose();
      } else {
        alert('Failed to submit franchise request.');
      }
    } catch (error) {
      const errorMessage = error.response
        ? error.response.data.message || error.response.statusText
        : error.request
        ? 'No response from server'
        : error.message;
      alert(`Error: ${errorMessage}`);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h5 className="text-lg font-semibold text-dark">Franchise Reques</h5>
          <button className="text-2xl text-dark" onClick={onClose}>×</button>
        </div>
        <div>
          <label className="block text-dark mb-2">State</label>
          <select
            className="w-full border rounded-md p-2 mb-4"
            name="state"
            value={franchiseData.state}
            onChange={handleFranchiseInputChange}
          >
            <option value="">Select a state</option>
            {states.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
          <label className="block text-dark mb-2">District</label>
          <select
            className="w-full border rounded-md p-2 mb-4"
            name="districtId"
            value={franchiseData.districtId}
            onChange={handleFranchiseInputChange}
            disabled={!franchiseData.state}
          >
            <option value="">Select a district</option>
            {filteredDistricts.map((district) => (
              <option key={district.id} value={district.id}>{district.name}</option>
            ))}
          </select>
          <label className="block text-dark mb-2">Business Address</label>
          <input
            type="text"
            className="w-full border rounded-md p-2 mb-4"
            name="businessAddress"
            value={franchiseData.businessAddress}
            onChange={handleFranchiseInputChange}
            placeholder="Enter business address"
          />
          <label className="block text-dark mb-2">Business Registration Number</label>
          <input
            type="text"
            className="w-full border rounded-md p-2 mb-4"
            name="businessRegistrationNumber"
            value={franchiseData.businessRegistrationNumber}
            onChange={handleFranchiseInputChange}
            placeholder="Enter business registration number"
          />
          <label className="block text-dark mb-2">PAN Number</label>
          <input
            type="text"
            className="w-full border rounded-md p-2 mb-4"
            name="panNumber"
            value={franchiseData.panNumber}
            onChange={handleFranchiseInputChange}
            placeholder="Enter PAN number"
          />
          <label className="block text-dark mb-2">Aadhar Number</label>
          <input
            type="text"
            className="w-full border rounded-md p-2 mb-4"
            name="aadharNumber"
            value={franchiseData.aadharNumber}
            onChange={handleFranchiseInputChange}
            placeholder="Enter Aadhar number"
          />
          <label className="block text-dark mb-2">Contact Email</label>
          <input
            type="email"
            className="w-full border rounded-md p-2 mb-4"
            name="contactEmail"
            value={franchiseData.contactEmail}
            onChange={handleFranchiseInputChange}
            placeholder="Enter contact email"
          />
          <label className="block text-dark mb-2">Contact Phone</label>
          <input
            type="text"
            className="w-full border rounded-md p-2 mb-4"
            name="contactPhone"
            value={franchiseData.contactPhone}
            onChange={handleFranchiseInputChange}
            placeholder="Enter contact phone"
          />
          <label className="block text-dark mb-2">Years of Experience</label>
          <input
            type="number"
            className="w-full border rounded-md p-2 mb-4"
            name="yearsOfExperience"
            value={franchiseData.yearsOfExperience}
            onChange={handleFranchiseInputChange}
            placeholder="Enter years of experience"
          />
          <label className="block text-dark mb-2">Upload Documents</label>
          <input
            type="file"
            className="w-full border rounded-md p-2 mb-4"
            multiple
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={handleFileChange}
          />
          <button
            className="w-full text-white rounded-md py-2 transition"
            onClick={handleFranchiseRequest}
          >
            Submit Franchise Request
          </button>
        </div>
      </div>
    </div>
  );
};

export default FranchiseForm;