'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default Leaflet icons not appearing correctly in Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to handle map centering and zooming when props change
function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface Business {
  id: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
}

interface LeafletMapProps {
  userLat: number;
  userLng: number;
  businesses?: Business[];
  zoom?: number;
  height?: string;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  draggableMarker?: boolean;
}

export default function LeafletMap({ 
  userLat, 
  userLng, 
  businesses = [], 
  zoom = 13, 
  height = '500px',
  onMarkerDragEnd,
  draggableMarker = false
}: LeafletMapProps) {
  
  const center: [number, number] = [userLat, userLng];

  return (
    <div style={{ height, width: '100%' }} className="rounded-2xl overflow-hidden border border-gray-100 z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <MapController center={center} zoom={zoom} />

        {/* User's Current Location or Selected Point */}
        <Marker 
          position={center} 
          icon={customIcon}
          draggable={draggableMarker}
          eventHandlers={{
            dragend: (e) => {
              const marker = e.target;
              const position = marker.getLatLng();
              if (onMarkerDragEnd) {
                onMarkerDragEnd(position.lat, position.lng);
              }
            },
          }}
        >
          <Popup>You are here!</Popup>
        </Marker>

        {/* Registered Businesses */}
        {businesses.map((biz) => (
          <Marker 
            key={biz.id} 
            position={[biz.latitude, biz.longitude]} 
            icon={customIcon}
          >
            <Popup>
              <div className="font-medium">{biz.name}</div>
              <div className="text-xs text-gray-500">{biz.category}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
