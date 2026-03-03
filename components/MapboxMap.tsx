'use client';

import * as React from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, GeolocateControl, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useState, useEffect, useRef, useMemo } from 'react';
import { MapPin, Navigation, Star, Building2, ExternalLink } from 'lucide-react';
import { Business } from '@/lib/types';

interface MapboxMapProps {
  userLat: number;
  userLng: number;
  businesses?: Business[];
  zoom?: number;
  height?: string;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  draggableMarker?: boolean;
  radius?: number;
}

export default function MapboxMap({
  userLat,
  userLng,
  businesses = [],
  zoom = 12,
  height = '500px',
  onMarkerDragEnd,
  onMapClick,
  draggableMarker = false,
  radius = 0
}: MapboxMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const mapRef = useRef<any>(null);
  const [pulseOpacity, setPulseOpacity] = useState(0.15);

  // Pulse animation for the radius
  useEffect(() => {
    if (radius <= 0) return;
    const interval = setInterval(() => {
      setPulseOpacity((prev) => (prev === 0.15 ? 0.05 : 0.15));
    }, 2000);
    return () => clearInterval(interval);
  }, [radius]);

  // Generate a GeoJSON circle for the radius
  const radiusGeoJSON = useMemo(() => {
    if (radius <= 0) return null;
    const points = 64;
    const coords: any[] = [];
    const km = radius / 1000;
    const ret: [number, number][] = [];
    
    // R = Earth's radius in km
    const R = 6371;
    const latRad = (userLat * Math.PI) / 180;
    const lngRad = (userLng * Math.PI) / 180;
    const angDist = km / R;

    for (let i = 0; i <= points; i++) {
      const bearing = (i * 360) / points;
      const bearingRad = (bearing * Math.PI) / 180;

      const pLatRad = Math.asin(
        Math.sin(latRad) * Math.cos(angDist) +
        Math.cos(latRad) * Math.sin(angDist) * Math.cos(bearingRad)
      );
      const pLngRad = lngRad + Math.atan2(
        Math.sin(bearingRad) * Math.sin(angDist) * Math.cos(latRad),
        Math.cos(angDist) - Math.sin(latRad) * Math.sin(pLatRad)
      );

      ret.push([(pLngRad * 180) / Math.PI, (pLatRad * 180) / Math.PI]);
    }

    return {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [ret]
      }
    };
  }, [userLat, userLng, radius]);

  // Update map view when coordinates change
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [userLng, userLat],
        zoom: zoom,
        essential: true
      });
    }
  }, [userLat, userLng, zoom]);

  return (
    <div style={{ height, width: '100%' }} className="rounded-[6px] overflow-hidden border border-gray-300 z-0 relative shadow-sm professional-map">
      <style jsx global>{`
        .professional-map .mapboxgl-map {
          filter: saturate(1.2);
          transition: all 0.5s ease;
        }
        .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 6px !important;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
        }
        .mapboxgl-popup-tip {
          display: none !important;
        }
        .mapboxgl-ctrl-logo, .mapboxgl-ctrl-attrib {
          display: none !important;
        }
      `}</style>
      <Map
        ref={mapRef}
        mapboxAccessToken={mapboxToken}
        initialViewState={{
          latitude: userLat,
          longitude: userLng,
          zoom: zoom
        }}
        onClick={(e) => {
          if (onMapClick) {
            onMapClick(e.lngLat.lat, e.lngLat.lng);
          }
        }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
        style={{ width: '100%', height: '100%' }}
      >
        <NavigationControl position="bottom-right" />
        <FullscreenControl position="top-right" />
        <GeolocateControl 
          position="bottom-right" 
          trackUserLocation={true} 
          showUserHeading={true}
        />

        {/* Search Radius Circle with Pulse Effect */}
        {radiusGeoJSON && (
          <Source id="radius-source" type="geojson" data={radiusGeoJSON}>
            <Layer
              id="radius-fill"
              type="fill"
              paint={{
                'fill-color': '#10b981',
                'fill-opacity': pulseOpacity,
                'fill-outline-color': '#059669'
              }}
            />
            <Layer
              id="radius-outline"
              type="line"
              paint={{
                'line-color': '#10b981',
                'line-width': 2,
                'line-dasharray': [2, 2]
              }}
            />
          </Source>
        )}

        {/* User's Current Location Marker */}
        <Marker
          latitude={userLat}
          longitude={userLng}
          draggable={draggableMarker}
          onDragEnd={(e) => {
            if (onMarkerDragEnd) {
              onMarkerDragEnd(e.lngLat.lat, e.lngLat.lng);
            }
          }}
          anchor="bottom"
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute w-12 h-12 bg-emerald-500/20 rounded-[6px] animate-ping" />
            <div className="relative bg-white p-1 rounded-[6px] shadow-2xl border border-emerald-100">
              <div className="bg-emerald-600 p-2 rounded-[6px] shadow-inner">
                <Navigation size={18} className="text-white fill-white" />
              </div>
            </div>
          </div>
        </Marker>

        {/* Business Markers */}
        {businesses.map((biz) => (
          <Marker
            key={biz.id}
            latitude={biz.latitude}
            longitude={biz.longitude}
            anchor="bottom"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedBusiness(biz);
            }}
          >
            <div className="flex flex-col items-center cursor-pointer group">
              <div className="relative">
                <div className="absolute -inset-1 bg-emerald-500/20 rounded-[6px] blur-sm group-hover:bg-emerald-500/40 transition-all" />
                <div className="relative bg-white p-1.5 rounded-[6px] shadow-lg border border-emerald-100 group-hover:scale-110 group-hover:-translate-y-1 transition-all duration-300">
                  <div className="bg-gray-900 p-1.5 rounded-[6px]">
                    <Building2 size={14} className="text-white" />
                  </div>
                </div>
              </div>
              <div className="mt-2 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-[6px] shadow-xl border border-emerald-50 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <span className="text-[10px] font-medium text-gray-900 whitespace-nowrap">{biz.name}</span>
              </div>
            </div>
          </Marker>
        ))}

        {/* Popup for Businesses (Modern Design) */}
        {selectedBusiness && (
          <Popup
            latitude={selectedBusiness.latitude}
            longitude={selectedBusiness.longitude}
            anchor="top"
            onClose={() => setSelectedBusiness(null)}
            closeButton={false}
            closeOnClick={false}
            offset={20}
            className="z-50 rounded-[6px]"
          >
            <div className="w-64 bg-white rounded-[6px] overflow-hidden shadow-2xl border border-gray-300 animate-in fade-in zoom-in-95 duration-200">
              {selectedBusiness.image_url ? (
                <div className="h-24 w-full relative">
                  <img 
                    src={selectedBusiness.image_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-3">
                    <p className="text-white text-[10px] font-medium uppercase tracking-widest opacity-90">{selectedBusiness.category}</p>
                  </div>
                </div>
              ) : (
                <div className="h-16 bg-emerald-50 flex items-center justify-center">
                  <Building2 size={24} className="text-emerald-200" />
                </div>
              )}
              
              <div className="p-4">
                <div className="flex justify-between items-start gap-2 mb-2">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{selectedBusiness.name}</h3>
                  {selectedBusiness.rating && (
                    <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-[6px]">
                      <Star size={10} className="text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-bold text-amber-700">{selectedBusiness.rating}</span>
                    </div>
                  )}
                </div>
                
                <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 leading-relaxed">
                  {selectedBusiness.address}
                </p>
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => window.location.href = `/nearby?q=${selectedBusiness.name}`}
                    className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-bold rounded-[6px] hover:bg-emerald-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/10"
                  >
                    View Details
                  </button>
                  {selectedBusiness.website_url && (
                    <a 
                      href={selectedBusiness.website_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-gray-50 text-gray-400 hover:text-emerald-600 rounded-[6px] transition-colors border border-gray-300"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
