import React from 'react';
import './termsandcondition.css';

function Termsandcondition() {
  return (
    <div className="terms-page">
      <section className="terms-banner">
        <div className="nav justify-content-center">
          <h1>Terms & Conditions</h1>
        </div>
      </section>

      <div className="terms-container">
        {/* Sidebar Navigation */}
        <aside className="terms-sidebar">
          <h2>Terms & Conditions</h2>
          <ul>
            <li><a href="#acceptance">Acceptance of Terms</a></li>
            <li><a href="#use">Use of Website & Services</a></li>
            <li><a href="#accounts">User Accounts</a></li>
            <li><a href="#property">Property Information</a></li>
            <li><a href="#intellectual">Intellectual Property</a></li>
            <li><a href="#liability">Limitation of Liability</a></li>
            <li><a href="#thirdparty">Third-Party Links</a></li>
            <li><a href="#privacy">Privacy</a></li>
            <li><a href="#law">Governing Law</a></li>
            <li><a href="#changes">Changes to Terms</a></li>
            <li><a href="#contact">Contact Us</a></li>
          </ul>
        </aside>

        {/* Main Content */}
        <div className="terms-content">
          <section id="acceptance">
            <h3>1. Acceptance of Terms</h3>
            <p>Welcome to NearProp (“we,” “our,” “us”). By accessing or using our website (nearprop.com) and mobile application, you agree to comply with and be bound by these Terms & Conditions. Please read them carefully.</p>
            <p>By accessing or using NearProp, you agree to these Terms & Conditions and our Privacy Policy. If you do not agree, you must discontinue using our platform.</p>
          </section>

          <section id="use">
            <h3>2. Use of Website & Services</h3>
            <p>You agree to use NearProp only for lawful purposes related to property search, listing, or related services.</p>
            <ul>
              <li>You shall not engage in fraudulent activities, spam, or misuse of the platform.</li>
              <li>Unauthorized access, hacking, or tampering with the platform is strictly prohibited.</li>
            </ul>
          </section>

          <section id="accounts">
            <h3>3. User Accounts</h3>
            <p>To access certain features, you may need to create an account.</p>
            <ul>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>Any activity conducted under your account will be your responsibility.</li>
              <li>We reserve the right to suspend or terminate accounts for violation of these Terms.</li>
            </ul>
          </section>

          <section id="property">
            <h3>4. Property Information</h3>
            <p>All property listings, descriptions, images, and related content are provided by property owners, agents, or third parties.</p>
            <ul>
              <li>NearProp does not guarantee the accuracy, completeness, or legality of property information.</li>
              <li>Users are responsible for conducting due diligence before entering into any transactions.</li>
            </ul>
          </section>

          <section id="intellectual">
            <h3>5. Intellectual Property</h3>
            <p>All content on NearProp (logo, design, text, images, software, and features) is owned by or licensed to NearProp.</p>
            <p>You may not copy, reproduce, distribute, or modify any content without prior written consent.</p>
          </section>

          <section id="liability">
            <h3>6. Limitation of Liability</h3>
            <p>NearProp acts as a platform to connect property seekers with property providers. We are not liable for:</p>
            <ul>
              <li>Accuracy of property details.</li>
              <li>Transactions, agreements, or disputes between users and third parties.</li>
              <li>Any direct, indirect, or incidental damages arising from use of our platform.</li>
            </ul>
          </section>

          <section id="thirdparty">
            <h3>7. Third-Party Links</h3>
            <p>NearProp may include links to third-party websites or services.</p>
            <ul>
              <li>We are not responsible for the content, practices, or policies of such third parties.</li>
              <li>Accessing third-party sites is at your own risk.</li>
            </ul>
          </section>

          <section id="privacy">
            <h3>8. Privacy</h3>
            <p>Your use of NearProp is also governed by our <a href="/privacyandpolicy">Privacy Policy</a>. By using our services, you consent to the collection and use of your data as outlined in that policy.</p>
          </section>

          <section id="law">
            <h3>9. Governing Law</h3>
            <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes shall fall under the exclusive jurisdiction of the courts in Begusarai, Bihar.</p>
          </section>

          <section id="changes">
            <h3>10. Changes to Terms</h3>
            <p>We reserve the right to update or modify these Terms at any time. Changes will be effective upon posting on our website/app. Continued use of NearProp after such changes constitutes your acceptance of the revised Terms.</p>
          </section>

          <section id="contact">
            <h3>11. Contact Us</h3>
            <p>If you have any questions or concerns regarding these Terms & Conditions, you can contact us at:</p>
            <p><strong>NearProp</strong></p>
            <p>Address: Ward No. 15, Kutumb Nagar, Etwa, Begusarai, Bihar – 851117</p>
            <p>Email: <a href="mailto:mail.nearprop@gmail.com">mail.nearprop@gmail.com</a></p>
            <p>Phone: <a href="tel:+919155105666">+91 91551 05666</a></p>
          </section>
        </div>
      </div>
    </div>
  );
}

export default Termsandcondition;