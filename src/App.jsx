import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, Anchor, Sun, Heart, Trash2, ExternalLink, ArrowLeft, Filter, MapPin, Navigation, X, Info, CalendarCheck, Loader2, ArrowRight } from 'lucide-react';

/**
 * CONFIGURATION
 */

const BRAND_COLOR = '#34a4b8';
const WP_TRIPS_API_URL = 'https://cruisytravel.com/wp-json/wp/v2/sandbar_trip?_embed&per_page=100';

// Generic "amazon_essential" CPT
const WP_ESSENTIALS_API_URL = 'https://cruisytravel.com/wp-json/wp/v2/amazon_essential?_embed&per_page=6'; 

// YOUR AMAZON STOREFRONT URL
const AMAZON_STOREFRONT_URL = 'https://amzn.to/4qswW40';

// Categories (Must match your WordPress "Vibe" slugs exactly!)
const CATEGORIES = [
  { id: 'private', label: 'Private Charter', icon: '🛥️' }, 
  { id: 'group', label: 'Social / Group', icon: '🎉' },
  { id: 'rental', label: 'Drive Yourself', icon: '🚗' }, 
  { id: 'sunset', label: 'Sunset Sandbar', icon: '🌅' },
  { id: 'clothing_optional', label: 'Clothing Optional', icon: '👙' },
  { id: 'eco', label: 'Eco / Kayak', icon: '🛶' }, 
  { id: 'dog_friendly', label: 'Dog Friendly', icon: '🐾' },
  { id: 'luxury', label: 'Luxury', icon: '💎' },
];

export default function App() {
  // State for View Management (Home vs Saved)
  const [currentView, setCurrentView] = useState('home'); 

  // State for Data
  const [sandbarTrips, setSandbarTrips] = useState([]);
  const [essentials, setEssentials] = useState([]); 
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // State for Filters
  const [selectedCategories, setSelectedCategories] = useState([]);
  
  // State for Favorites (Persisted in LocalStorage)
  const [savedTripIds, setSavedTripIds] = useState(() => {
    const saved = localStorage.getItem('cruisy_saved_trips');
    return saved ? JSON.parse(saved) : [];
  });

  // State for Details Modal
  const [selectedTripForDetails, setSelectedTripForDetails] = useState(null);

  // Fetch Data from WordPress
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Trips
        const tripsResponse = await fetch(WP_TRIPS_API_URL);
        
        // 2. Fetch Essentials
        const essentialsResponse = await fetch(WP_ESSENTIALS_API_URL);

        if (!tripsResponse.ok) throw new Error('Failed to fetch trips');
        
        const tripsData = await tripsResponse.json();
        const essentialsData = essentialsResponse.ok ? await essentialsResponse.json() : [];
        
        // --- Transform Trips Data ---
        const formattedTrips = tripsData.map(trip => {
          // Extract Tags (Vibes)
          const tags = [];
          if (trip._embedded && trip._embedded['wp:term']) {
             trip._embedded['wp:term'].forEach(termList => {
                termList.forEach(term => {
                   if (term.taxonomy === 'trip_vibe') {
                      tags.push(term.slug);
                   }
                });
             });
          }

          // Extract Image
          const image = trip._embedded && trip._embedded['wp:featuredmedia'] 
             ? trip._embedded['wp:featuredmedia'][0].source_url 
             : 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&q=80&w=800'; // Fallback

          return {
            id: trip.id,
            title: trip.title.rendered,
            price: trip.acf?.price || '0',
            priceType: trip.acf?.price_type || '',
            duration: trip.acf?.duration || '',
            tags: tags,
            image: image,
            description: trip.acf?.short_description || 'No description available.',
            longDescription: trip.acf?.long_description || trip.acf?.short_description,
            affiliateLink: trip.acf?.affiliate_link || '#'
          };
        });

        // --- Transform Essentials Data ---
        const formattedEssentials = essentialsData.map(item => {
           const image = item._embedded && item._embedded['wp:featuredmedia'] 
             ? item._embedded['wp:featuredmedia'][0].source_url 
             : 'https://via.placeholder.com/150';

           return {
             id: item.id,
             name: item.title.rendered,
             price: item.acf?.price || '',
             link: item.acf?.affiliate_link || '#',
             img: image
           };
        });

        setSandbarTrips(formattedTrips);
        setEssentials(formattedEssentials);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError("Could not load trips. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Persist Favorites
  useEffect(() => {
    localStorage.setItem('cruisy_saved_trips', JSON.stringify(savedTripIds));
  }, [savedTripIds]);

  // Filter Logic
  const filteredTrips = useMemo(() => {
    if (selectedCategories.length === 0) return sandbarTrips;
    return sandbarTrips.filter(trip => 
      trip.tags.some(tag => selectedCategories.includes(tag))
    );
  }, [selectedCategories, sandbarTrips]);

  // Toggle Category Helper
  const toggleCategory = (catId) => {
    setSelectedCategories(prev => 
      prev.includes(catId) 
        ? prev.filter(id => id !== catId)
        : [...prev, catId]
    );
  };

  // Toggle Save Helper
  const toggleSave = (tripId, e) => {
    if (e) e.stopPropagation();
    setSavedTripIds(prev => 
      prev.includes(tripId)
        ? prev.filter(id => id !== tripId)
        : [...prev, tripId]
    );
  };

  const savedTripsData = sandbarTrips.filter(t => savedTripIds.includes(t.id));

  // Modal Component
  const DetailsModal = ({ trip, onClose }) => {
    if (!trip) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition z-10">
            <X size={20} />
          </button>
          
          <div className="h-64 relative">
             <img src={trip.image} alt={trip.title} className="w-full h-full object-cover" />
             <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-20">
                <h3 className="font-russo text-2xl text-white drop-shadow-md" dangerouslySetInnerHTML={{ __html: trip.title }} />
             </div>
          </div>

          <div className="p-6 md:p-8 space-y-6">
            <div className="flex flex-wrap gap-2">
              {trip.tags.map(tag => (
                <span key={tag} className="text-xs font-bold text-cyan-700 bg-cyan-100 px-3 py-1 rounded-full uppercase">
                   {tag.replace('_', ' ')}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
               <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Duration</div>
                  <div className="font-russo text-lg text-gray-800">{trip.duration}</div>
               </div>
               <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wider font-bold">Price</div>
                  <div className="font-russo text-lg brand-text">${trip.price} <span className="text-sm text-gray-500 font-normal">/ {trip.priceType}</span></div>
               </div>
            </div>

            <div>
              <h4 className="font-russo text-lg mb-2">About this Trip</h4>
              <p className="text-gray-600 leading-relaxed whitespace-pre-line">
                {trip.longDescription}
              </p>
            </div>

            <div className="pt-4 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                  <a 
                    href={trip.affiliateLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 brand-bg text-white py-3 rounded-xl font-bold text-center shadow-lg hover:brightness-110 transition flex items-center justify-center gap-2"
                  >
                    <CalendarCheck size={18} /> Book Now
                  </a>
                  <button 
                    onClick={(e) => { toggleSave(trip.id, e); onClose(); }}
                    className={`flex-1 border py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${
                      savedTripIds.includes(trip.id) 
                      ? 'border-red-200 bg-red-50 text-red-500' 
                      : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <Heart size={18} className={savedTripIds.includes(trip.id) ? "fill-red-500" : ""} />
                    {savedTripIds.includes(trip.id) ? 'Remove from Stash' : 'Save to Stash'}
                  </button>
                </div>
                
                {/* Affiliate Transparency Disclaimer */}
                <p className="text-[10px] text-gray-400 text-center leading-tight">
                   Transparency: Cruisy Travel may earn a small commission if you book through these links, at no extra cost to you. This allows us to keep our trip planning and concierge services free for you!
                </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-roboto text-slate-800 pb-12">
      
      {/* Styles for Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Russo+One&display=swap');
        .font-russo { font-family: 'Russo One', sans-serif; }
        .font-roboto { font-family: 'Roboto', sans-serif; }
        .brand-text { color: ${BRAND_COLOR}; }
        .brand-bg { background-color: ${BRAND_COLOR}; }
        .brand-border { border-color: ${BRAND_COLOR}; }
      `}</style>

      {/* GLOBAL HEADER */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative cursor-pointer" onClick={() => setCurrentView('home')}>
              <div className="w-12 h-12 rounded-full border-2 brand-border overflow-hidden p-0.5">
                <img 
                  src="https://cruisytravel.com/wp-content/uploads/2024/01/cropped-20240120_025955_0000.png" 
                  alt="Cruisy Travel Logo" 
                  className="w-full h-full object-cover rounded-full"
                />
              </div>
            </div>
            
            <div className="flex flex-col justify-center">
              <h1 className="font-russo text-xl tracking-wider hidden sm:block leading-none">
                CRUISY<span className="brand-text">TRAVEL</span>
              </h1>
            </div>
          </div>

          <button 
            onClick={() => setCurrentView(currentView === 'home' ? 'saved' : 'home')}
            className={`relative p-2 rounded-full transition ${currentView === 'saved' ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
          >
            <Heart className={`w-7 h-7 ${savedTripIds.length > 0 ? 'fill-red-400 text-red-400' : 'text-gray-400'}`} />
            {savedTripIds.length > 0 && (
              <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-xs flex items-center justify-center rounded-full font-bold">
                {savedTripIds.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      {currentView === 'home' ? (
        <div className="max-w-7xl mx-auto px-4 py-8">
          
          {/* BACK LINK */}
          <a href="https://cruisytravel.com/key-west/" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-cyan-600 mb-4 uppercase tracking-wide transition">
             <ArrowLeft size={14} /> Back to Cruisytravel.com
          </a>

          {/* DASHBOARD TOP SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
            
            {/* COL 1: HEADER BOX */}
            <div className="lg:col-span-5 relative h-72 lg:h-auto rounded-3xl overflow-hidden shadow-md group">
               <img 
                 src="https://images.pexels.com/photos/3426880/pexels-photo-3426880.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                 alt="Couple holding hands on sandbar" 
                 className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
               />
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent" />
               
               <div className="absolute bottom-0 left-0 p-8 w-full">
                 <h2 className="font-russo text-3xl md:text-4xl text-white leading-tight shadow-sm drop-shadow-md mb-3">
                   Find Your Perfect <br/><span className="text-cyan-300">Key West Sandbar</span>
                 </h2>
                 <p className="text-slate-200 text-sm md:text-base font-medium leading-relaxed drop-shadow-sm max-w-md">
                    There are over 170+ sandbar trips in Key West. Tell us your vibe, and we'll match you with the perfect boat.
                 </p>
               </div>
            </div>

            {/* COL 2: TOOLS & FILTERS */}
            <div className="lg:col-span-7 flex flex-col h-full">
               
               {/* Filters Panel - Now taking full height of this column */}
               <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 flex-1 flex flex-col justify-center relative">
                 
                 <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
                    <div>
                        <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 brand-text" />
                        <h3 className="font-russo text-lg text-gray-800">What's your vibe?</h3>
                        </div>
                        {/* Prompt Instructions */}
                        <p className="text-xs text-gray-400 mt-1 ml-7">
                            Tap a category below to filter the list
                        </p>
                    </div>
                    
                    {selectedCategories.length > 0 && (
                      <button 
                        onClick={() => setSelectedCategories([])}
                        className="text-xs text-red-500 font-bold hover:underline flex items-center gap-1 self-start md:self-auto"
                      >
                        <Trash2 size={12} /> Clear
                      </button>
                    )}
                 </div>
                 
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                   {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        className={`p-3 rounded-xl flex flex-col items-center justify-center gap-2 transition-all duration-200 border text-center h-24 ${
                          selectedCategories.includes(cat.id)
                            ? 'bg-cyan-50 brand-border border-2 shadow-sm'
                            : 'bg-gray-50 border-transparent hover:bg-white hover:border-gray-200 hover:shadow-sm'
                        }`}
                      >
                        <span className="text-2xl">{cat.icon}</span> 
                        <span className={`font-bold text-xs ${selectedCategories.includes(cat.id) ? 'brand-text' : 'text-gray-600'}`}>
                          {cat.label}
                        </span>
                      </button>
                    ))}
                 </div>
               </div>
            </div>
          </div>

          {/* RESULTS GRID */}
          <div className="mb-6 flex items-center justify-between">
             <h3 className="font-russo text-2xl text-gray-800">
               {selectedCategories.length > 0 ? 'Matched Trips' : 'All Adventures'}
               <span className="ml-3 text-sm font-roboto font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full align-middle">
                 {isLoading ? 'Loading...' : `${filteredTrips.length} Results`}
               </span>
             </h3>
          </div>

          {/* LOADING STATE */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20">
               <Loader2 className="w-12 h-12 brand-text animate-spin mb-4" />
               <p className="text-gray-500 font-russo text-lg">Loading your adventures...</p>
            </div>
          )}

          {/* ERROR STATE */}
          {error && (
            <div className="bg-red-50 text-red-500 p-8 rounded-xl text-center border border-red-100">
               <h3 className="font-bold text-lg mb-2">Oops!</h3>
               <p>{error}</p>
            </div>
          )}

          {/* SUCCESS GRID */}
          {!isLoading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTrips.map(trip => (
                <div key={trip.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 flex flex-col overflow-hidden group">
                  <div className="relative h-48 overflow-hidden cursor-pointer" onClick={() => setSelectedTripForDetails(trip)}>
                    <img 
                      src={trip.image} 
                      alt={trip.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <button 
                      onClick={(e) => toggleSave(trip.id, e)}
                      className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-md hover:bg-white transition z-10"
                    >
                      <Heart 
                        size={20} 
                        className={savedTripIds.includes(trip.id) ? "fill-red-500 text-red-500" : "text-gray-400 hover:text-red-400"} 
                      />
                    </button>
                    {/* LUXURY BADGE */}
                    {trip.tags.includes('luxury') && (
                      <span className="absolute top-3 left-3 bg-slate-900 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                        Luxury
                      </span>
                    )}
                    {/* ADULTS ONLY BADGE (If trip has 'adults_only' tag) */}
                    {trip.tags.includes('adults_only') && (
                      <span className={`absolute top-3 ${trip.tags.includes('luxury') ? 'left-24' : 'left-3'} bg-black text-amber-400 border border-amber-400/50 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md`}>
                        18+ Adults Only
                      </span>
                    )}
                  </div>
                  
                  <div className="p-5 flex-1 flex flex-col">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {trip.tags.slice(0,3).map(tag => (
                        <span key={tag} className="text-xs font-medium text-cyan-600 bg-cyan-50 px-2 py-1 rounded">
                            {tag.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                    
                    {/* Use dangerouslySetInnerHTML to handle HTML entities like &amp; in WP titles */}
                    <h4 
                      className="font-russo text-xl text-gray-800 mb-2 leading-snug flex-1 cursor-pointer hover:text-cyan-600 transition" 
                      onClick={() => setSelectedTripForDetails(trip)}
                      dangerouslySetInnerHTML={{ __html: trip.title }}
                    />
                    
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2">
                      {trip.description}
                    </p>

                    <div className="mt-auto pt-4 border-t border-gray-100">
                        <div className="mb-3">
                          <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Starting at</div>
                          <div className="font-russo text-xl brand-text">
                            ${trip.price} <span className="text-sm text-gray-500 font-roboto font-normal">/ {trip.priceType}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedTripForDetails(trip)}
                            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2.5 rounded-lg font-bold hover:bg-gray-200 transition text-sm flex items-center justify-center gap-1"
                          >
                            <Info size={16} /> Details
                          </button>
                          <a 
                            href={trip.affiliateLink}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 brand-bg text-white px-3 py-2.5 rounded-lg font-bold shadow-md hover:brightness-110 transition text-sm flex items-center justify-center text-center gap-1"
                          >
                            <CalendarCheck size={16} /> Book Now
                          </a>
                        </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && !error && filteredTrips.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center border-dashed border-2 border-gray-200 mt-6">
               <div className="text-4xl mb-4">⚓️</div>
               <h3 className="font-russo text-xl text-gray-800 mb-2">No trips match that exact combo</h3>
               <p className="text-gray-500 mb-6">Try removing one of the filters to see more options.</p>
               <button 
                 onClick={() => setSelectedCategories([])}
                 className="text-cyan-600 font-bold hover:underline"
               >
                 Clear all filters
               </button>
            </div>
          )}

          {/* SHORT TRANSPARENCY DISCLAIMER (For Results) */}
          {!isLoading && !error && (
            <div className="mt-8 mb-4">
              <p className="text-[10px] text-gray-400 text-center italic">
                Transparency: Cruisy Travel may earn a commission from bookings made through these links at no extra cost to you.
              </p>
            </div>
          )}

          {/* LARGE ESSENTIALS SECTION (Bottom) */}
          <div className="mt-16 bg-gradient-to-br from-orange-50 to-amber-50 rounded-3xl p-8 border border-orange-100 pb-12">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2 bg-orange-100 rounded-lg">
                    <Sun className="w-8 h-8 text-orange-500" />
                 </div>
                 <div>
                    <h3 className="font-russo text-2xl text-gray-900">Sandbar Essentials</h3>
                    <p className="text-sm text-gray-500">Don't head to the sandbar without these captain-approved picks!</p>
                 </div>
              </div>
              
              {essentials.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {essentials.map(item => (
                      <div key={item.id} className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition flex flex-col">
                          <div className="flex items-center gap-4 mb-4">
                             <img src={item.img} alt={item.name} className="w-20 h-20 rounded-xl bg-gray-100 object-cover" />
                             <div>
                                <div className="font-bold text-gray-800 text-lg leading-tight" dangerouslySetInnerHTML={{ __html: item.name }} />
                                <div className="text-sm text-gray-500 mt-1">{item.price}</div>
                             </div>
                          </div>
                          {/* UPDATED LINK ATTRIBUTES FOR SEO/AFFILIATE COMPLIANCE */}
                          <a 
                            href={item.link} 
                            target="_blank" 
                            rel="sponsored noopener noreferrer" 
                            className="mt-auto w-full bg-orange-500 text-white py-2.5 rounded-xl font-bold text-center hover:bg-orange-600 transition shadow-md shadow-orange-200"
                          >
                             View on Amazon
                          </a>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                   {isLoading ? 'Loading essentials...' : 'No essentials found.'}
                </div>
              )}
              
              {/* DISCLAIMER - Repositioned and Styled to Ensure Visibility */}
              <div className="mt-8 pt-4 border-t border-orange-100">
                <p className="text-xs text-gray-500 text-center max-w-3xl mx-auto leading-relaxed italic">
                   Transparency: As an Amazon Associate, Cruisy Travel earns from qualifying purchases at no extra cost to you. This helps support our free trip planning and concierge services!
                </p>
              </div>

              {/* VIEW FULL LIST BUTTON */}
              <div className="mt-6 text-center">
                 <a 
                   href={AMAZON_STOREFRONT_URL} 
                   target="_blank" 
                   rel="sponsored noopener noreferrer" 
                   className="inline-flex items-center gap-2 bg-white text-gray-600 border border-gray-200 px-6 py-3 rounded-full font-bold hover:bg-gray-50 hover:text-orange-500 hover:border-orange-200 transition shadow-sm"
                 >
                    View More Sandbar Essentials <ArrowRight size={18} />
                 </a>
              </div>
          </div>

        </div>
      ) : (
        /* SAVED TRIPS PAGE VIEW */
        <div className="max-w-5xl mx-auto px-4 py-8">
           <div className="mb-8">
             <button 
               onClick={() => setCurrentView('home')}
               className="text-gray-500 hover:text-cyan-600 font-bold flex items-center gap-2 mb-4"
             >
               <ArrowLeft size={20} /> Back to Search
             </button>
             <h2 className="font-russo text-3xl md:text-4xl text-gray-800">
               Your Sandbar Stash <Heart className="inline-block ml-2 fill-red-500 text-red-500" size={32} />
             </h2>
             <p className="text-gray-500 mt-2">
               You have saved {savedTripsData.length} trips. Compare them below or book your favorite.
             </p>
           </div>

           {savedTripsData.length > 0 ? (
             <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-gray-50">
                      <tr className="text-gray-500 text-xs uppercase tracking-wider">
                        <th className="py-4 px-6 font-bold">Trip Details</th>
                        <th className="py-4 px-6 font-bold">Duration</th>
                        <th className="py-4 px-6 font-bold">Price</th>
                        <th className="py-4 px-6 text-right font-bold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {savedTripsData.map(trip => (
                        <tr key={trip.id} className="group hover:bg-blue-50/30 transition">
                          <td className="py-4 px-6">
                             <div className="flex items-center gap-4 cursor-pointer" onClick={() => setSelectedTripForDetails(trip)}>
                               <img src={trip.image} className="w-16 h-16 rounded-lg object-cover shadow-sm" alt="" />
                               <div>
                                 <div className="font-bold text-gray-800 text-lg" dangerouslySetInnerHTML={{ __html: trip.title }} />
                                 <div className="flex gap-2 mt-1">
                                    {trip.tags.slice(0,2).map(tag => (
                                      <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">{tag.replace('_', ' ')}</span>
                                    ))}
                                 </div>
                               </div>
                             </div>
                          </td>
                          <td className="py-4 px-6 text-gray-600 font-medium">{trip.duration}</td>
                          <td className="py-4 px-6">
                            <div className="font-russo brand-text text-lg">${trip.price}</div>
                            <div className="text-xs text-gray-400">{trip.priceType}</div>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <div className="flex items-center justify-end gap-3">
                               <button 
                                  onClick={() => setSelectedTripForDetails(trip)}
                                  className="p-2 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-full transition"
                                  title="View Details"
                               >
                                  <Info size={20} />
                               </button>
                               <button 
                                 onClick={(e) => toggleSave(trip.id, e)} 
                                 className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                 title="Remove"
                               >
                                 <Trash2 size={20} />
                               </button>
                               <a 
                                 href={trip.affiliateLink} 
                                 target="_blank" 
                                 rel="noreferrer"
                                 className="brand-bg text-white px-5 py-2 rounded-lg font-bold shadow hover:brightness-110 transition ml-2 whitespace-nowrap"
                               >
                                 Book Now
                               </a>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
           ) : (
             <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <div className="text-6xl mb-4 opacity-50">🏝️</div>
                <h3 className="font-russo text-xl text-gray-400">Your stash is empty</h3>
                <button onClick={() => setCurrentView('home')} className="mt-4 text-cyan-600 font-bold hover:underline">
                  Go find some trips!
                </button>
             </div>
           )}
        </div>
      )}

      {/* MODAL OVERLAY */}
      {selectedTripForDetails && (
        <DetailsModal 
          trip={selectedTripForDetails} 
          onClose={() => setSelectedTripForDetails(null)} 
        />
      )}

    </div>
  );
}
