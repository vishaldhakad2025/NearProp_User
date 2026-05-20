import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPhone,
  faEnvelope,
  faGlobe,
} from "@fortawesome/free-solid-svg-icons";
import {
  faWhatsapp,
  faInstagram,
  faFacebook,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";

const StaticAdvertisement = () => {
  const defaultAd = {
    title: "Real Estate Opportunities",
    description:
      "Looking for exclusive property deals? Contact us for the best real estate investments.",
    bannerImageUrl:
      "/src/assets/staticad.png",
    propertyType: "Premium",
    phoneNumber: "+919155105666",
    whatsappNumber: "+919155105666",
    emailAddress: "mail.nearprop@gmail.com",
    websiteUrl: "https://nearprop.com",
    instagramUrl: "https://instagram.com/nearprop",
    facebookUrl: "https://facebook.com/nearprop",
    youtubeUrl: "https://youtube.com/nearprop",
    additionalInfo:
      "We specialize in premium residential and commercial properties across major cities.",
    active: true,
  };

  if (!defaultAd.active) return null;

  return (
    <>
      <style>{`
        .ad-section {
          margin: 24px 0;
          padding: 20px;
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          position: relative;
        }

        .ads {
          position: absolute;
          top: 10px;
          right: 16px;
          font-size: 0.75rem;
          color: #777;
        }

        .ad-layout {
          display: flex;
          gap: 20px;
          align-items: stretch;
        }

        .ad-image {
          width: 100%;
          height: 100%;
          min-height: 260px;
          object-fit: cover;
          border-radius: 10px;
        }

        .ad-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .ad-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: #222;
          margin-bottom: 4px;
        }

        .ad-badge {
          display: inline-block;
          background: #03718a;
          color: #fff;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.75rem;
          width: fit-content;
          margin-bottom: 10px;
        }

        .ad-description {
          font-size: 0.95rem;
          color: #555;
          line-height: 1.6;
          margin-bottom: 8px;
        }

        .ad-extra {
          font-size: 0.85rem;
          color: #666;
        }

        .ad-social-icons {
          display: flex;
          gap: 14px;
          margin-top: 14px;
        }

        .ad-social-icons a {
          font-size: 1.4rem;
          color: #03718a;
          transition: transform 0.2s ease, color 0.2s ease;
        }

        .ad-social-icons a:hover {
          transform: scale(1.1);
          color: #025d6f;
        }

        /* ========== Responsive ========== */

        @media (max-width: 900px) {
          .ad-layout {
            flex-direction: column;
          }

          .ad-image {
            min-height: 200px;
          }
        }

        @media (max-width: 600px) {
          .ad-section {
            padding: 14px;
          }

          .ad-title {
            font-size: 1.25rem;
          }

          .ad-description {
            font-size: 0.85rem;
          }

          .ad-social-icons {
            justify-content: center;
          }
        }
      `}</style>

        <div className="ad-container">
                    <div className="ad-image-wrapper">
                      <img
                        src="/src/assets/staticad.png"
                        alt="Real Estate Opportunities"
                        className="ad-image"
                        onError={(e) => { e.target.src = DEFAULT_AD_IMAGE; }}
                      />
                    </div>
                    <div className="ad-content">
                      <h5 className="ad-title">Real Estate Opportunities</h5>
                      <p className="ad-description">Looking for exclusive property deals? Contact us for the best real estate investments.</p>
                      <div className="ad-contact-icons">
                        <a
                          href="tel:+919155105666"
                          className="call"
                          aria-label="Call advertisement contact"
                        >
                          <FontAwesomeIcon icon={faPhone} />
                        </a>
                        <a
                          href="https://wa.me/919155105666"
                          className="whatsapp"
                          target="_blank"
                          aria-label="WhatsApp advertisement contact"
                        >
                          <FontAwesomeIcon icon={faWhatsapp} />
                        </a>
                        <a
                          href="mailto:mail.nearprop@gmail.com?subject=Inquiry about Real Estate Opportunities"
                          className="mail"
                        >
                          <FontAwesomeIcon icon={faEnvelope} />
                        </a>
                        <a href="https://nearprop.com" className="website" target="_blank">
                          <FontAwesomeIcon icon={faGlobe} />
                        </a>
                        <a href="https://instagram.com/nearprop" className="instagram" target="_blank">
                          <FontAwesomeIcon icon={faInstagram} />
                        </a>
                        <a href="https://facebook.com/nearprop" className="facebook" target="_blank">
                          <FontAwesomeIcon icon={faFacebookF} />
                        </a>
                        <a href="https://youtube.com/nearprop" className="youtube" target="_blank">
                          <FontAwesomeIcon icon={faYoutube} />
                        </a>
                      </div>
                    </div>
                  </div>
    </>
  );
};

export default StaticAdvertisement;
