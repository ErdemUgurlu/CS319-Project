import React from "react";
import "./ProfilePage.css";

const profileData = {
  name: "Erdem Ugurlu",
  email: "erdem.ugurlu@ug.bilkent.edu.tr",
  role: "Teaching Assistant",
  academicLevel: "Master's",
  department: "Not specified",
  employmentType: "Part-Time",
  phone: "Not specified",
  iban: "Not specified",
  joinDate: "10 Mayıs 2025",
  accountStatus: ["Approved", "Email Verified"],
};

const ProfilePage = () => {
  const handleChangePassword = () => {
    alert("Redirecting to change password page...");
  };

  return (
    <div className="profile-container">
      <h2>My Profile</h2>
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar">👤</div>
          <div>
            <h3>{profileData.name}</h3>
            <p>{profileData.email}</p>
          </div>
        </div>

        <div className="profile-info">
          <div className="info-row">
            <span className="info-label">Role</span>
            <span className="badge role">{profileData.role}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Academic Level</span>
            <span>{profileData.academicLevel}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Department</span>
            <span>{profileData.department}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Employment Type</span>
            <span>{profileData.employmentType}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Phone Number</span>
            <span>{profileData.phone}</span>
          </div>
          <div className="info-row">
            <span className="info-label">IBAN</span>
            <span>{profileData.iban}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Join Date</span>
            <span>{profileData.joinDate}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Account Status</span>
            <span>
              {profileData.accountStatus.map((status, idx) => (
                <span key={idx} className="badge status">
                  {status}
                </span>
              ))}
            </span>
          </div>
        </div>

        <div className="button-container">
          <button className="change-password-btn" onClick={handleChangePassword}>
            CHANGE PASSWORD
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;