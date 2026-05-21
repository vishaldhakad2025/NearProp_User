import React from 'react';
import './privacyandpolicy.css';

function PrivacyPolicy() {
  return (
    <section className="about-section">
      <div className="about-banner">
        <div className="nav justify-content-center">
          <h1>Privacy & Policy</h1>
        </div>
      </div>

      <div className="privacy-container">
        {/* Sidebar Navigation */}
        <aside className="privacy-sidebar">
          <h2>Privacy Policy</h2>
          <ul>
            <li><a href="#introduction">Introduction</a></li>
            <li><a href="#data-collection">Data Collection</a></li>
            <li><a href="#use-of-data">Use of Data</a></li>
            <li><a href="#data-sharing">Data Sharing</a></li>
            <li><a href="#security">Security</a></li>
            <li><a href="#cookies">Cookies</a></li>
            <li><a href="#user-rights">Your Rights</a></li>
            <li><a href="#contact">Contact Us</a></li>
          </ul>
        </aside>

        {/* Main Content */}
        <div className="privacy-content">
          <section id="introduction">
            <h3>Introduction</h3>
            <p>NearProp (“we,” “our,” “us”) values your trust and is committed to protecting your personal information. This Privacy Policy explains how we collect, use, share, and safeguard your data when you use our website (nearprop.com), mobile application, and related services.</p>
            <p>This Privacy Policy outlines:</p>
            <ul>
              <li>The types of data we collect from you.</li>
              <li>How we use and share that data.</li>
              <li>Your rights regarding your personal information.</li>
              <li>The measures we take to keep your data secure.</li>
            </ul>
            <p>By using our platform, you agree to the terms described in this Privacy Policy. If you do not agree, please discontinue using our services.</p>
          </section>

          <section id="data-collection">
            <h3>Data Collection</h3>
            <p>We may collect the following types of data when you use NearProp:</p>
            <ul>
              <li><strong>Personal Information:</strong> Name, email address, phone number, contact details, and identity verification details.</li>
              <li><strong>Property Information:</strong> Details about the property you list, search, or inquire about.</li>
              <li><strong>Usage Data:</strong> Browser type, IP address, device information, operating system, and app/website activity.</li>
              <li><strong>Location Data:</strong> With your permission, we may collect geolocation data to provide location-based services.</li>
              <li><strong>Cookies & Tracking Data:</strong> Information collected via cookies, pixels, and similar technologies to enhance your experience.</li>
            </ul>
          </section>

          <section id="use-of-data">
            <h3>Use of Data</h3>
            <p>We use your data for purposes such as:</p>
            <ul>
              <li>To provide, personalize, and improve our services.</li>
              <li>To process property listings, inquiries, and transactions.</li>
              <li>To send updates, alerts, and promotional materials (you can opt out at any time).</li>
              <li>To analyze user behavior and improve website/app performance.</li>
              <li>To comply with legal obligations and prevent fraud.</li>
            </ul>
          </section>

          <section id="data-sharing">
            <h3>Data Sharing</h3>
            <p>We do not sell your personal information. However, we may share your data with:</p>
            <ul>
              <li><strong>Service Providers:</strong> Third-party vendors who help us with hosting, analytics, payments, or communication.</li>
              <li><strong>Business Partners:</strong> Property agents, owners, or developers you interact with through our platform.</li>
              <li><strong>Legal Authorities:</strong> When required by law or to protect our rights, property, and safety.</li>
              <li><strong>Corporate Transactions:</strong> In the event of a merger, acquisition, or business restructuring.</li>
            </ul>
          </section>

          <section id="security">
            <h3>Security</h3>
            <p>We implement industry-standard measures to safeguard your data against unauthorized access, alteration, or misuse. However, no method of online transmission or storage is 100% secure, and we cannot guarantee absolute protection.</p>
          </section>

          <section id="cookies">
            <h3>Cookies</h3>
            <p>We use cookies and similar tracking technologies to:</p>
            <ul>
              <li>Enhance user experience.</li>
              <li>Remember user preferences.</li>
              <li>Measure traffic and usage patterns.</li>
              <li>Deliver targeted advertisements.</li>
            </ul>
            <p>You can manage or disable cookies through your browser settings, though some features may not function properly without them.</p>
          </section>

          <section id="user-rights">
            <h3>Your Rights</h3>
            <p>Depending on your jurisdiction, you may have the following rights:</p>
            <ul>
              <li><strong>Access & Correction:</strong> Request a copy of the personal data we hold and correct inaccuracies.</li>
              <li><strong>Data Portability:</strong> Request a transfer of your data in a usable format.</li>
              <li><strong>Erasure:</strong> Request deletion of your data, subject to legal and contractual obligations.</li>
              <li><strong>Withdraw Consent:</strong> Opt out of marketing communications or revoke permissions previously granted.</li>
            </ul>
            <p>To exercise your rights, please contact us at <a href="mailto:support@nearprop.com">support@nearprop.com</a>.</p>
          </section>

          <section id="contact">
            <h3>Contact Us</h3>
            <p>If you have any questions or concerns regarding this Privacy Policy or your personal data, you can contact us at:</p>
            <p><strong>NearProp</strong></p>
            <p>Address: Ward No . 15, Kutumb Nagar, Etwa, Begusarai, Bihar – 851117</p>
            <p>Email: <a href="mailto:mail.nearprop@gmail.com">mail.nearprop@gmail.com</a></p>
            <p>Phone: <a href="tel:+919155105666">+91 91551 05666</a></p>
          </section>
        </div>
      </div>
    </section>
  );
}

export default PrivacyPolicy;