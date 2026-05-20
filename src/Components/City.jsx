import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function City() {
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentState, setCurrentState] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCitiesData();
  }, []);

  // Function to fetch city image using Google Places API
  const fetchCityImage = async (cityName, stateName) => {
    try {
      // First, get the place details using Geocoding API
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cityName + ', ' + stateName)}&key=AIzaSyAepBinSy2JxyEvbidFz_AnFYFsFlFqQo4`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();

      if (geocodeData.results && geocodeData.results[0]) {
        const location = geocodeData.results[0].geometry.location;
        const placeId = geocodeData.results[0].place_id;

        // Try to get place photo using Place Details API
        const placeDetailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=AIzaSyAepBinSy2JxyEvbidFz_AnFYFsFlFqQo4`;
        
        try {
          const placeResponse = await fetch(placeDetailsUrl);
          const placeData = await placeResponse.json();

          if (placeData.result && placeData.result.photos && placeData.result.photos.length > 0) {
            const photoReference = placeData.result.photos[0].photo_reference;
            return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=AIzaSyAepBinSy2JxyEvbidFz_AnFYFsFlFqQo4`;
          }
        } catch (err) {
          console.log('Place Details API not accessible, using Street View');
        }

        // Fallback to Street View Static API
        return `https://maps.googleapis.com/maps/api/streetview?size=400x300&location=${location.lat},${location.lng}&heading=0&pitch=0&key=AIzaSyAepBinSy2JxyEvbidFz_AnFYFsFlFqQo4`;
      }

      // Return default image if geocoding fails
      return null;
    } catch (err) {
      console.error('Error fetching city image:', err);
      return null;
    }
  };

  const fetchCitiesData = async () => {
    try {
      setLoading(true);
      
      // Get user's current location
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 10000,
          enableHighAccuracy: true
        });
      });

      const { latitude, longitude } = position.coords;

      // Fetch location details from Google Geocoding API
      const geoResponse = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=AIzaSyAepBinSy2JxyEvbidFz_AnFYFsFlFqQo4`
      );
      const geoData = await geoResponse.json();

      // Extract state from geocoding response
      let userState = '';
      if (geoData.results && geoData.results[0]) {
        const addressComponents = geoData.results[0].address_components;
        const stateComponent = addressComponents.find(component =>
          component.types.includes('administrative_area_level_1')
        );
        userState = stateComponent ? stateComponent.long_name : '';
      }

      setCurrentState(userState);

      // Fetch all properties
      const propertiesResponse = await fetch('https://api.nearprop.com/api/properties');
      const propertiesData = await propertiesResponse.json();

      if (propertiesData.success && propertiesData.data) {
        // Filter properties by user's state
        const stateProperties = propertiesData.data.filter(
          property => property.state === userState
        );

        // Count properties by city (using property.city field, not districtName)
        const cityData = {};
        stateProperties.forEach(property => {
          // Use property.city field to match with CityProperty filtering
          const cityName = property.city;
          if (cityName) {
            if (!cityData[cityName]) {
              cityData[cityName] = {
                name: cityName,
                count: 0,
                districtName: property.districtName,
                districtId: property.districtId,
                state: property.state,
                latitude: property.latitude,
                longitude: property.longitude
              };
            }
            cityData[cityName].count += 1;
          }
        });

        // Sort cities by property count and get top 5
        const sortedCities = Object.values(cityData)
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        // Default fallback images
        const defaultImages = [
          "https://img.freepik.com/free-photo/vertical-shot-buildings-cloudy-sky_181624-15055.jpg",
          "https://img.freepik.com/premium-photo/buildings-city-against-sky_1048944-3332402.jpg",
          "https://img.freepik.com/free-photo/city-skyline-with-residential-district_1359-108.jpg",
          "https://img.freepik.com/free-photo/glittering-glass-aluminium-cladded-skyscrapers-monsoon-mumbais-lower-parel-worli-areas_469504-19.jpg",
          "https://img.freepik.com/free-photo/indian-city-buildings-scene_23-2151823136.jpg"
        ];

        // Fetch images for each city
        const citiesWithImages = await Promise.all(
          sortedCities.map(async (city, index) => {
            // Try to fetch real city image
            const cityImage = await fetchCityImage(city.name, city.state);
            
            return {
              ...city,
              img: cityImage || defaultImages[index % defaultImages.length]
            };
          })
        );

        setCities(citiesWithImages);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load cities. Please enable location access.');
      setLoading(false);
    }
  };

  const handleCityClick = (cityName) => {
    // Navigate to CityProperty page with city query parameter
    navigate(`/cityproperty?city=${encodeURIComponent(cityName)}`);
  };

  if (loading) {
    return (
      <section className="city-section">
        <h2 className="section-title">Loading Cities...</h2>
        <p className="subheading">Fetching top cities in your state...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="city-section">
        <h2 className="section-title">Explore Cities</h2>
        <p style={{ color: 'red', marginBottom: '20px' }}>{error}</p>
        <button 
          onClick={fetchCitiesData}
          style={{
            padding: '10px 20px',
            background: 'darkcyan',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          Retry
        </button>
      </section>
    );
  }

  return (
    <>
      <section className="city-section">
        <h2 className="section-title">Explore Cities in {currentState}</h2>
        <p className="subheading">
          Discover vibrant neighborhoods and top-rated cities where lifestyle meets opportunity. 
        </p>
        <div className="menu">
          <div className="city-carousel">
            {cities.length > 0 ? (
              cities.map((city, i) => (
                <div key={i} className="city-card" onClick={() => handleCityClick(city.name)}>
                  <img 
                    src={city.img} 
                    alt={city.name} 
                    className="city-image"
                    onError={(e) => {
                      // Fallback to default image if Google image fails to load
                      e.target.src = "https://img.freepik.com/free-photo/vertical-shot-buildings-cloudy-sky_181624-15055.jpg";
                    }}
                  />
                  <div className="city-info">
                    <h3>{city.name}</h3>
                    <p>{city.count} {city.count === 1 ? 'property' : 'properties'} available in {city.name}.</p> 
                  </div>
                </div>
              ))
            ) : (
              <p style={{ textAlign: 'center', width: '100%', color: '#666', padding: '20px' }}>
                No cities found in your state.
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

export default City;