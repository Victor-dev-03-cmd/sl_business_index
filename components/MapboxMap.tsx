'use client';

import * as React from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, GeolocateControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation } from 'lucide-react';
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
}

export default function MapboxMap({
  userLat,
  userLng,
  businesses = [],
  zoom = 12,
  height = '500px',
  onMarkerDragEnd,
  onMapClick,
  draggableMarker = false
}: MapboxMapProps) {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const mapRef = useRef<any>(null);

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
    <div style={{ height, width: '100%' }} className="rounded-2xl overflow-hidden border border-gray-100 z-0 relative shadow-sm professional-map">
      <style jsx global>{`
        .professional-map .mapboxgl-map {
          filter: saturate(1.2);
          transition: all 0.5s ease;
        }
        .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 16px !important;
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
            <div className="absolute w-8 h-8 bg-emerald-500/20 rounded-full animate-ping" />
            <div className="relative bg-emerald-600 p-2 rounded-full border-2 border-white shadow-xl">
              <Navigation size={18} className="text-white fill-white" />
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
              <div className="bg-white p-1 rounded-full shadow-lg border border-gray-100 group-hover:scale-110 transition-transform duration-200">
                <div className="bg-gray-900 p-1.5 rounded-full">
                  <MapPin size={16} className="text-white fill-white" />
                </div>
              </div>
              <div className="mt-1 bg-white/95 backdrop-blur-sm px-2 py-0.5 rounded-full shadow-sm border border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px] font-bold text-gray-900 whitespace-nowrap">{biz.name}</span>
              </div>
            </div>
          </Marker>
        ))}

        {/* Popup for Businesses */}
        {selectedBusiness && (
          <Popup
            latitude={selectedBusiness.latitude}
            longitude={selectedBusiness.longitude}
            anchor="top"
            onClose={() => setSelectedBusiness(null)}
            closeButton={false}
            closeOnClick={true}
            offset={15}
            className="z-50"
          >
            <div className="p-2 min-w-[150px] bg-white rounded-xl">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                   <MapPin size={14} className="text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-xs leading-tight">{selectedBusiness.name}</h3>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{selectedBusiness.category}</p>
                </div>
              </div>
              <button 
                onClick={() => window.location.href = `/nearby?q=${selectedBusiness.name}`}
                className="w-full mt-2 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-lg hover:bg-gray-800 transition-colors"
              >
                View Details
              </button>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
