import React from 'react';
import './About.css';
import agent1 from '../assets/agent-1.avif';
import agent2 from '../assets/agent-3.avif';
import agent3 from '../assets/agent-4.avif';
import agent4 from '../assets/agent-2.jpg';
import agent5 from '../assets/agent-5.jpg';
import room1 from '../assets/room1.avif';
import room2 from '../assets/room2.avif';
import room3 from '../assets/room3.avif';
import room4 from '../assets/room4.avif';
import room5 from '../assets/room5.avif';
import room6 from '../assets/room6.avif';
import room7 from '../assets/room-7.avif';
import room8 from '../assets/room8.avif';
import room9 from '../assets/room9.avif';
import room10 from '../assets/room10.avif';
import Testimonal from './Testimonal';

function About() {
  return (
    <>
      <section className="about-section">
        <div className="about-banner">
           <div className="nav justify-content-center">
            <h1>About Us</h1>
          
          </div>
        </div>
        <div className="about-content">
          <h2 className="section-title">Your Vision, Our Craftsmanship</h2>
          <div className="about-grid">
            <div className="about-highlight">
              <h3>Who We Are</h3>
              <p>
                At Nearprop, we are pioneers in redefining real estate excellence. Born from a passion for innovation and a commitment to client success, we empower agents and agencies with cutting-edge tools and timeless design.
              </p>
            </div>
            <div className="about-highlight">
              <h3>What Sets Us Apart</h3>
              <p>
                Unlike traditional platforms, Nearprop offers a dynamic property management ecosystem. From customizable marketplaces to seamless agent coordination, we provide the freedom to craft bespoke solutions that elevate your brand.
              </p>
            </div>
            <div className="about-highlight">
              <h3>Our Promise</h3>
              <p>
                With Nearprop, expect limitless creativity and unparalleled support. We’re not just a theme—we’re your partner in building a legacy in the real estate world.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="city-section">
        <h2 style={{ fontSize: "30px", color: "darkcyan" }}>  m</h2>
        <p style={{ fontSize: "15px" }} className="subheading">
          At NearProp, our team of dedicated real estate professionals is committed to guiding you through every step of your property journey. With a deep understanding of the local market, we ensure personalized solutions tailored to your needs.
        </p>
        <div className="menu">
          <div className="city-carousel">
            <div className="city-card">
              <img src={agent1} alt="Indore" className="city-image" />
              <div className="city-info">
                <h3>Indore</h3>
                <p>The city of lights, filled with history, art, and culture.</p>
              </div>
            </div>
            <div className="city-card">
              <img src={agent2} alt="New York" className="city-image" />
              <div className="city-info">
                <h3>Delhi</h3>
                <p>The city that never sleeps, a vibrant mix of culture and skyscrapers.</p>
              </div>
            </div>
            <div className="city-card">
              <img src={agent3} alt="Benglore" className="city-image" />
              <div className="city-info">
                <h3>Benglore</h3>
                <p>The heart of innovation and tradition, blending old and new.</p>
              </div>
            </div>
            <div className="city-card">
              <img src={agent4} alt="Mumbai" className="city-image" />
              <div className="city-info">
                <h3>Mumbai</h3>
                <p>Beautiful beaches, stunning landmarks, and amazing culture.</p>
              </div>
            </div>
            <div className="city-card">
              <img src={agent5} alt="London" className="city-image" />
              <div className="city-info">
                <h3>Jaipur</h3>
                <p>Rich in history and modern culture, the heart of Europe.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="services-section">
        <div className="services-grid container">
          <div className="service-card">
            <img src={room1} alt="Property Management" />
            <div className="service-content">
              <span>Services</span>
              <h3>Property Management</h3>
              <a href="#">MORE DETAILS <span>&#9654;</span></a>
            </div>
          </div>
          <div className="service-card">
            <img src={room2} alt="Capital Improvements" />
            <div className="service-content">
              <span>Services</span>
              <h3>Capital Improvements</h3>
              <a href="#">MORE DETAILS <span>&#9654;</span></a>
            </div>
          </div>
          <div className="service-card tall">
            <img src={room3} alt="Finance Real Estate" />
            <div className="service-content">
              <span>Services</span>
              <h3>Finance Real Estate</h3>
              <a href="#">MORE DETAILS <span>&#9654;</span></a>
            </div>
          </div>
          <div className="service-card tall">
            <img src={room4} alt="Recover Asset Value" />
            <div className="service-content">
              <span>Services</span>
              <h3>Recover Asset Value</h3>
              <a href="#">MORE DETAILS <span>&#9654;</span></a>
            </div>
          </div>
          <div className="service-card">
            <img src={room5} alt="Financial Reporting" />
            <div className="service-content">
              <span>Services</span>
              <h3>Financial Reporting</h3>
              <a href="#">MORE DETAILS <span>&#9654;</span></a>
            </div>
          </div>
          <div className="service-card">
            <img src={room6} alt="Business Development" />
            <div className="service-content">
              <span>Services</span>
              <h3>Business Development</h3>
              <a href="#">MORE DETAILS <span>&#9654;</span></a>
            </div>
          </div>
        </div>
      </section>

      <section className="blog-section">
        <div className="blog-card">
          <img src={room7} alt="Blog 1" />
          <div className="blog-content">
            <p className="date">March 9, 2016 | Business</p>
            <h3>Skills That You Can Learn In The Real Estate Market</h3>
            <p>
              Discover essential skills like market analysis, negotiation, and property valuation to thrive in real estate. Learn how to identify investment opportunities and build client trust effectively.
            </p>
            <a href="#" className="read-more">Continue reading</a>
            <p className="author">by Mike Moore</p>
          </div>
        </div>
        <div className="blog-card">
          <img src={room8} alt="Blog 2" />
          <div className="blog-content">
            <p className="date">March 9, 2016 | Construction</p>
            <h3>Learn The Truth About Real Estate Industry</h3>
            <p>
              Uncover the realities of the real estate market, from understanding market trends to navigating legal complexities. Gain insights into what drives property values and buyer decisions.
            </p>
            <a href="#" className="read-more">Continue reading</a>
            <p className="author">by Mike Moore</p>
          </div>
        </div>
        <div className="blog-card">
          <img src={room9} alt="Blog 3" />
          <div className="blog-content">
            <p className="date">March 9, 2016 | Real Estate</p>
            <h3>10 Quick Tips About Business Development</h3>
            <p>
              Boost your real estate business with strategies like networking, leveraging technology, and optimizing client relationships. Learn practical tips to expand your market presence.
            </p>
            <a href="#" className="read-more">Continue reading</a>
            <p className="author">by Mike Moore</p>
          </div>
        </div>
        <div className="blog-card">
          <img src={room10} alt="Blog 4" />
          <div className="blog-content">
            <p className="date">March 9, 2016 | Real Estate</p>
            <h3>14 Common Misconceptions About Business Development</h3>
            <p>
              Debunk myths about real estate growth, such as the belief that high budgets guarantee success. Learn sustainable strategies for building a thriving property business.
            </p>
            <a href="#" className="read-more">Continue reading</a>
            <p className="author">by Mike Moore</p>
          </div>
        </div>
      </section>

      <Testimonal />
    </>
  );
}

export default About;