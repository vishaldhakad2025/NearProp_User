import React, { useState, useEffect } from "react";
import "./UserProfile.css";
import axios from "axios";
import { baseurl } from "../../BaseUrl";
import { useNavigate } from "react-router-dom";
import { FiCopy } from "react-icons/fi";
import { FaCamera } from "react-icons/fa";

function UserProfile() {
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    permanentId: "",
    profileImageUrl:
      "https://nearprop-documents.s3.ap-south-1.amazonaws.com/defaults/default-user-profile.png",
  });

  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(profileData.profileImageUrl);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const navigate = useNavigate();

  // Inline CSS Styles
  const styles = {
    errorDialogOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999,
    },
    errorDialogBox: {
      background: 'white',
      padding: '30px',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
      textAlign: 'center',
      maxWidth: '400px',
      width: '90%',
    },
    errorDialogH3: {
      color: '#e74c3c',
      marginBottom: '15px',
      fontSize: '24px',
    },
    errorDialogP: {
      marginBottom: '20px',
      color: '#333',
      fontSize: '16px',
    },
    errorDialogBtn: {
      background: '#3498db',
      color: 'white',
      border: 'none',
      padding: '12px 30px',
      borderRadius: '5px',
      cursor: 'pointer',
      fontSize: '16px',
      fontWeight: '600',
      transition: 'background 0.3s',
    },
  };

  const getToken = () => {
    const authData = localStorage.getItem("authData");
    if (!authData) return null;
    try {
      return JSON.parse(authData).token || null;
    } catch {
      return null;
    }
  };

  const token = getToken();

  useEffect(() => {
    if (!token) navigate("/login");
  }, [token, navigate]);

  /* ================= FETCH PROFILE ================= */
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(`${baseurl}/v1/users/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          const {
            name,
            email,
            phoneNumber,
            permanentId,
            profileImageUrl,
          } = response.data.data;

          setProfileData({
            name,
            email,
            phoneNumber,
            permanentId,
            profileImageUrl:
              profileImageUrl || profileData.profileImageUrl,
          });

          setPreviewUrl(profileImageUrl || profileData.profileImageUrl);
        } else {
          setError(response.data.message);
          setShowErrorDialog(true);
        }
      } catch (err) {
        setError("Error fetching profile");
        setShowErrorDialog(true);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  /* ================= IMAGE ================= */
  const handleImageChange = (e) => {
    if (!isEditing) return;

    const file = e.target.files[0];
    if (!file) return;

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result);
    reader.readAsDataURL(file);
  };

  /* ================= UPDATE ================= */
  const handleProfileUpdate = async (e) => {
    e.preventDefault();

    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    setValidationError("");

    if (profileData.email) {
      const emailRegex =
        /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

      if (!emailRegex.test(profileData.email)) {
        setValidationError("Please enter a valid email address.");
        return;
      }
    }

    const formData = new FormData();
    formData.append("name", profileData.name);
    formData.append("email", profileData.email);
    if (selectedImage) formData.append("image", selectedImage);

    try {
      await axios.put(`${baseurl}/v1/users/profile-update`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      alert("Profile updated successfully!");
      setIsEditing(false);
    } catch {
      alert("Error updating profile");
    }
  };

  /* ================= COPY PERMANENT ID ================= */
  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(profileData.permanentId);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      alert("Failed to copy ID");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("authData");
    navigate("/login");
  };

  const handleGoToLogin = () => {
    setShowErrorDialog(false);
    navigate("/login");
  };

  if (loading) return <p className="userprofile-loading">Loading...</p>;

  return (
    <div className="userprofile-fullscreen">
      <div className="userprofile-overlay">
        {/* Error Dialog */}
        {showErrorDialog && (
          <div style={styles.errorDialogOverlay}>
            <div style={styles.errorDialogBox}>
              <h3 style={styles.errorDialogH3}>Error</h3>
              <p style={styles.errorDialogP}>{error}</p>
              <button 
                style={styles.errorDialogBtn}
                onMouseEnter={(e) => e.target.style.background = '#2980b9'}
                onMouseLeave={(e) => e.target.style.background = '#3498db'}
                onClick={handleGoToLogin}
              >
                Go to Login
              </button>
            </div>
          </div>
        )}

        <div className="userprofile-card">
          <h2 className="userprofile-title">Your Profile</h2>
          {validationError && (
            <p className="error-message">{validationError}</p>
          )}

          <form onSubmit={handleProfileUpdate}>
            <div className="userprofile-row">
              {/* IMAGE */}
              <div className="userprofile-left">
                <label className="userprofile-upload-box">
                  <img src={previewUrl} alt="Profile" />

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    disabled={!isEditing}
                  />

                  {isEditing && (
                    <span className="userprofile-camera-icon">
                      <FaCamera />
                    </span>
                  )}
                </label>
              </div>

              {/* INPUTS */}
              <div className="userprofile-right">
                <div className="userprofile-input-group">
                  <label>Permanent ID</label>
                  <div className="userprofile-id-container">
                    <input
                      type="text"
                      value={profileData.permanentId}
                      readOnly
                    />
                    <button
                      type="button"
                      className="userprofile-copy-btn"
                      onClick={handleCopyId}
                      title="Copy Permanent ID"
                    >
                      <FiCopy />
                    </button>
                  </div>
                  {copySuccess && (
                    <small className="userprofile-copy-success">
                      ID copied
                    </small>
                  )}
                </div>

                <div className="userprofile-input-group">
                  <label>Name</label>
                  <input
                    type="text"
                    value={profileData.name}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="userprofile-input-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    disabled={!isEditing}
                    onChange={(e) =>
                      setProfileData({
                        ...profileData,
                        email: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="userprofile-input-group">
                  <label>Mobile Number</label>
                  <input
                    type="text"
                    value={profileData.phoneNumber}
                    readOnly
                  />
                </div>
              </div>
            </div>

            <div className="userprofile-button-group">
              {isEditing ? (
                <>
                  <button type="submit" className="userprofile-btn">
                    Save Changes
                  </button>
                  <button
                    type="button"
                    className="userprofile-btn userprofile-cancel-btn"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="userprofile-btn"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              )}

              <button
                type="button"
                className="userprofile-btn userprofile-logout-btn"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default UserProfile;