'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  GoogleMap as GoogleMapBase, 
  useJsApiLoader, 
  Marker, 
  InfoWindow, 
  MarkerClusterer,
  Circle
} from '@react-google-maps/api';
import { MapPin, Navigation, Star, Building2, ExternalLink, Loader2 } from 'lucide-react';
import { Business } from '@/lib/types';

const MAP_OPTIONS: google.maps.MapOptions = {
  disableDefaultUI: false,
  clickableIcons: false,
  mapId: process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID,
  styles: [
    {
      "featureType": "poi",
      "stylers": [{ "visibility": "off" }]
    }
  ]
};

const CONTAINER_STYLE = {
  width: '100%',
  height: '100%'
};

interface GoogleMapProps {
  userLat: number;
  userLng: number;
  businesses?: Business[];
  zoom?: number;
  height?: string;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  draggableMarker?: boolean;
  radius?: number;
  enableClustering?: boolean;
}

export default function GoogleMap({
  userLat,
  userLng,
  businesses = [],
  zoom = 12,
  height = '500px',
  onMarkerDragEnd,
  onMapClick,
  draggableMarker = false,
  radius = 0,
  enableClustering = false
}: GoogleMapProps) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: ['places']
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);

  const center = useMemo(() => ({ lat: userLat, lng: userLng }), [userLat, userLng]);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (onMapClick && e.latLng) {
      onMapClick(e.latLng.lat(), e.latLng.lng());
    }
  }, [onMapClick]);

  const handleMarkerDragEnd = useCallback((e: google.maps.MapMouseEvent) => {
    if (onMarkerDragEnd && e.latLng) {
      onMarkerDragEnd(e.latLng.lat(), e.latLng.lng());
    }
  }, [onMarkerDragEnd]);

  if (!isLoaded) {
    return (
      <div style={{ height }} className="w-full bg-gray-100 animate-pulse flex items-center justify-center text-gray-400 rounded-[6px] border border-gray-300">
        <Loader2 className="animate-spin mr-2" />
        Loading Google Maps...
      </div>
    );
  }

  return (
    <div style={{ height, width: '100%' }} className="rounded-[6px] overflow-hidden border border-gray-300 z-0 relative shadow-sm professional-map">
      <GoogleMapBase
        mapContainerStyle={CONTAINER_STYLE}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={MAP_OPTIONS}
      >
        {/* User's Current Location Marker */}
        <Marker
          position={center}
          draggable={draggableMarker}
          onDragEnd={handleMarkerDragEnd}
          icon={{
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: '#2a7db4',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 2,
            scale: 8
          }}
        />

        {/* Radius Circle */}
        {radius > 0 && (
          <Circle
            center={center}
            radius={radius}
            options={{
              fillColor: '#2a7db4',
              fillOpacity: 0.15,
              strokeColor: '#053765',
              strokeOpacity: 0.3,
              strokeWeight: 1,
              clickable: false,
              editable: false,
              zIndex: 1
            }}
          />
        )}

        {/* Business Markers with Clustering */}
        {enableClustering ? (
          <MarkerClusterer>
            {(clusterer) => (
              <>
                {businesses.map((biz) => (
                  <Marker
                    key={biz.id}
                    position={{ lat: biz.latitude, lng: biz.longitude }}
                    clusterer={clusterer}
                    onClick={() => setSelectedBusiness(biz)}
                    icon={{
                      url: '/map-marker-business.svg', // I should create this or use a simple path
                      scaledSize: new google.maps.Size(30, 30)
                    }}
                  />
                ))}
              </>
            )}
          </MarkerClusterer>
        ) : (
          businesses.map((biz) => (
            <Marker
              key={biz.id}
              position={{ lat: biz.latitude, lng: biz.longitude }}
              onClick={() => setSelectedBusiness(biz)}
              icon={{
                path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
                fillColor: '#000000',
                fillOpacity: 1,
                strokeColor: '#FFFFFF',
                strokeWeight: 1,
                scale: 5
              }}
            />
          ))
        )}

        {/* Info Window for Selected Business */}
        {selectedBusiness && (
          <InfoWindow
            position={{ lat: selectedBusiness.latitude, lng: selectedBusiness.longitude }}
            onCloseClick={() => setSelectedBusiness(null)}
          >
            <div className="w-64 bg-white rounded-[6px] overflow-hidden">
              {selectedBusiness.image_url && (
                <div className="h-24 w-full relative">
                  <img 
                    src={selectedBusiness.image_url} 
                    alt="" 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-3">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-1">{selectedBusiness.name}</h3>
                  {selectedBusiness.rating && (
                    <div className="flex items-center gap-1 bg-amber-50 px-1 rounded-[4px]">
                      <Star size={10} className="text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-bold text-amber-700">{selectedBusiness.rating}</span>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 line-clamp-1 mb-3">{selectedBusiness.address}</p>
                <button 
                  onClick={() => window.location.href = `/business/${selectedBusiness.id}`}
                  className="w-full py-2 bg-[#2a7db4] text-white text-[10px] font-bold rounded-[4px] hover:bg-[#053765] transition-all"
                >
                  View Profile
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMapBase>
    </div>
  );
}
