import React, { useRef } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import "./App.css";
import FloatingChat from "./Components/Chat/FloatingChat";
import ScrollToTop from "./ScrollToTop";

/* Pages */
import LandingPage from "./Components/LandingPage";
import Pageheader from "./Components/Pageheader";
import Footer from "./Components/Footer";
import PropertySell from "./Components/PropertySell";
import Properties from "./Components/Properties";
import Agent from "./Components/Agent";
import About from "./Components/About";
import Enqiryform from "./Components/Enqiryform";
import Contact from "./Components/Contact";
import Faq from "./Components/Faq";
import Blog from "./Components/Blog";
import Residential from "./Components/Residential";
import Commercial from "./Components/Commercial";
import Termsandcondition from "./Components/Termsandcondition";
import Privacyandpolicy from "./Components/Privacyandpolicy";
import Reels from "./Components/Reels";
import Developer from "./Components/Developer";
import Login from "./Components/Login";
import Register from "./Components/Register";
import UserProfile from "./Components/UserProfile";
import FilteredProperties from "./Components/FilteredProperties";
import PgAndHosteldetails from "./Components/PgAndHosteldetails";
import CityProperty from "./Components/CityProperty";
import Savereels from "./Components/Savereels";
import FilterSection from "./Components/FilterSection";
import CommercialProperty from "./Components/CommercialProperty";
import HotelBanquetDetails from "./Components/HotelBanquetDetails";
import Forrent from "./Components/Forrent";
import Forsell from "./Components/Forsell";
import Apartment from "./Components/Apartment";
import Plot from "./Components/Plot";
import Hotels from "./Components/Hotels";
import Banquet from "./Components/Banquet";
import Pg from "./Components/Pg";
import Hostels from "./Components/Hostels";
import FranchisePage from "./Components/FranchisePage";
import MyFranchisePage from "./Components/MyFranchisePage";
import RoomDetails from "./Components/RoomDetails";
import HotelDetails from "./Components/HotelDetails";
import RefundPolicy from "./Components/RefundPolicy";
import WhatsAppClone from "./Components/WhatsAppClone/WhatsAppClone";
import AssetLinks from "./Components/AssetLinks";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


/* =========================
   Protected Route
========================= */
function ProtectedRoute({ children }) {
  const location = useLocation();

  const getToken = () => {
    try {
      const authData = localStorage.getItem("authData");
      if (!authData) return null;
      const parsed = JSON.parse(authData);
      return parsed.token || null;
    } catch {
      return null;
    }
  };

  const token = getToken();

  if (location.pathname !== "/" && !token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/* =========================
   Layout Wrapper
========================= */
function LayoutWrapper({ children }) {
  const location = useLocation();
  const path = location.pathname;

  const hideHeaderFooter =
    path === "/login" ||
    path === "/register" ||
    path === "/.well-known/assetlinks.json" ||
    path === "/reels" ||
    path === "/chat";

  return (
    <>
      {!hideHeaderFooter && <Pageheader path={path} />}
      {children}
      {!hideHeaderFooter && <Footer />}
    </>
  );
}

/* =========================
   App Content (IMPORTANT)
========================= */
function AppContent() {
  const chatRef = useRef();
  const location = useLocation();

  const hideFloatingChat =
    location.pathname === "/login" ||
    location.pathname === "/register" ||
    location.pathname === "/reels" ||
    location.pathname === "/chat";

  return (
    <>
      <ScrollToTop />

      <LayoutWrapper>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          {/* Protected Routes */}
          <Route
            path="/propertySell/:propertyId"
            element={
              <ProtectedRoute>
                <PropertySell />
              </ProtectedRoute>
            }
          />

          <Route
            path="/Pgandhostel/:pgandhosteltyId"
            element={
              <ProtectedRoute>
                <PgAndHosteldetails ref={chatRef} />
              </ProtectedRoute>
            }
          />

          <Route
            path="/userprofile"
            element={
              <ProtectedRoute>
                <UserProfile />
              </ProtectedRoute>
            }
          />

          <Route 
            path="/chat"
            element={
              <ProtectedRoute>
                <WhatsAppClone />
              </ProtectedRoute>
            }
          />

          {/* Public Routes */}
          <Route path="/properties" element={<Properties />} />
          <Route path="/HotelDetails/hotel/:id" element={<HotelDetails />} />
          <Route
            path="/HotelAndBanquetDetails/:type/:id"
            element={<HotelBanquetDetails />}
          />
          <Route path="/room-details/:id" element={<RoomDetails />} />
          <Route path="/agent" element={<Agent />} />
          <Route path="/about" element={<About />} />
          <Route path="/enquiryform" element={<Enqiryform />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/residential" element={<Residential />} />
          <Route path="/commercial" element={<Commercial />} />
          <Route path="/termsandcondition" element={<Termsandcondition />} />
          <Route path="/privacyandpolicy" element={<Privacyandpolicy />} />
          <Route path="/reels" element={<Reels />} />
          <Route path="/developer" element={<Developer />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cityproperty" element={<CityProperty />} />
          <Route path="/saved-reels" element={<Savereels />} />
          <Route path="/forrent" element={<Forrent />} />
          <Route path="/forsell" element={<Forsell />} />
          <Route path="/apartment" element={<Apartment />} />
          <Route path="/plot" element={<Plot />} />
          <Route path="/hotel" element={<Hotels />} />
          <Route path="/banquet" element={<Banquet />} />
          <Route path="/Pg" element={<Pg />} />
          <Route path="/hostel" element={<Hostels />} />
          <Route path="/franchise-request" element={<FranchisePage />} />
          <Route path="/my-franchise" element={<MyFranchisePage />} />
          <Route
            path="/filtered-properties"
            element={<FilteredProperties />}
          />
          <Route path="/FilterSection" element={<FilterSection />} />
          <Route
            path="/commercialProperty"
            element={<CommercialProperty />}
          />
          <Route path="/RefundPolicy" element={<RefundPolicy />} />

          <Route path="*" element={<div>404 - Page Not Found</div>} />
          <Route path="/.well-known/assetlinks.json" element={<AssetLinks />} />
        </Routes>
      </LayoutWrapper>

      {/* Floating Chat */}
      {!hideFloatingChat && (
        <FloatingChat
          isGuest={!localStorage.getItem("authData")}
          isBasicPlan={false}
          onOpenChat={() => chatRef.current?.openChat()}
        />
      )}

      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        pauseOnHover
        draggable
        theme="colored"
      />
    </>
  );
}

/* =========================
   Main App
========================= */
function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;