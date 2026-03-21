"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  Circle,
  ZoomControl,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Star, ExternalLink, MapPin, Building2 } from "lucide-react";
import VerifiedBadge from "@/app/components/VerifiedBadge";

// Fix for Leaflet default icon issues in Next.js
const fixLeafletIcon = () => {
  // @ts-ignore
  delete L.Icon.Default.prototype._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
};

interface LeafletMapProps {
  centerLat: number;
  centerLng: number;
  userLat?: number;
  userLng?: number;
  businesses?: any[]; // GeoJSON features or business objects
  zoom?: number;
  height?: string;
  radius?: number;
  enableClustering?: boolean;
  onMarkerClick?: (business: any) => void;
  draggableMarker?: boolean;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  onMapClick?: (lat: number, lng: number) => void;
  onMapMove?: (lat: number, lng: number, zoom: number) => void;
  showUserLocation?: boolean;
  wrapperClassName?: string;
}

// Custom SVG Marker Icon - Pin Shape with Dynamic Color
const getCustomIcon = (color: string = "#EA4335") =>
  L.divIcon({
    html: `<div class="marker-pin-container">
          <div class="marker-pin shadow-lg" style="background-color: ${color};">
            <div class="marker-pin-inner"></div>
          </div>
         </div>`,
    className: "custom-leaflet-icon",
    iconSize: [30, 40],
    iconAnchor: [15, 40],
    popupAnchor: [0, -40],
  });

// Category to Color Mapping (Google Maps style)
const getCategoryColor = (category: string = ""): string => {
  const cat = category.toLowerCase();

  // Dining & Food (Orange)
  if (
    cat.includes("food") ||
    cat.includes("restaurant") ||
    cat.includes("dining") ||
    cat.includes("cafe") ||
    cat.includes("bakery")
  )
    return "#FF9800";

  // Health & Medical (Red)
  if (
    cat.includes("health") ||
    cat.includes("medical") ||
    cat.includes("doctor") ||
    cat.includes("hospital") ||
    cat.includes("clinic")
  )
    return "#F44336";

  // Lodging (Purple)
  if (
    cat.includes("hotel") ||
    cat.includes("accommodation") ||
    cat.includes("resort") ||
    cat.includes("guest house") ||
    cat.includes("villa")
  )
    return "#9C27B0";

  // Shopping (Green)
  if (
    cat.includes("shopping") ||
    cat.includes("retail") ||
    cat.includes("store") ||
    cat.includes("supermarket") ||
    cat.includes("mall")
  )
    return "#4CAF50";

  // Education (Indigo)
  if (
    cat.includes("education") ||
    cat.includes("school") ||
    cat.includes("university") ||
    cat.includes("college") ||
    cat.includes("tuition")
  )
    return "#3F51B5";

  // Finance & Legal (Blue Grey)
  if (
    cat.includes("finance") ||
    cat.includes("bank") ||
    cat.includes("legal") ||
    cat.includes("law") ||
    cat.includes("audit")
  )
    return "#607D8B";

  // Travel & Transport (Cyan)
  if (
    cat.includes("travel") ||
    cat.includes("transport") ||
    cat.includes("taxi") ||
    cat.includes("logistics")
  )
    return "#00BCD4";

  // Beauty & Wellness (Pink)
  if (
    cat.includes("beauty") ||
    cat.includes("salon") ||
    cat.includes("spa") ||
    cat.includes("parlour")
  )
    return "#E91E63";

  // Agriculture & Nature (Light Green)
  if (
    cat.includes("agriculture") ||
    cat.includes("farming") ||
    cat.includes("garden")
  )
    return "#8BC34A";

  // Construction & Services (Brown)
  if (
    cat.includes("construction") ||
    cat.includes("hardware") ||
    cat.includes("repair") ||
    cat.includes("service")
  )
    return "#795548";

  // Government & Public (Deep Orange)
  if (
    cat.includes("government") ||
    cat.includes("police") ||
    cat.includes("emergency")
  )
    return "#FF5722";

  // Arts & Leisure (Deep Purple)
  if (
    cat.includes("art") ||
    cat.includes("entertainment") ||
    cat.includes("leisure") ||
    cat.includes("music")
  )
    return "#673AB7";

  return "#EA4335"; // Default Google Red
};

// User Location Icon (Google Style Blue Dot)
const userIcon = L.divIcon({
  html: `<div class="relative flex h-6 w-6">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-40"></span>
          <span class="relative inline-flex rounded-full h-4 w-4 m-1 bg-[#4285F4] border-2 border-white shadow-md"></span>
         </div>`,
  className: "user-location-icon",
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function MapUpdater({
  lat,
  lng,
  zoom,
}: {
  lat: number;
  lng: number;
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    const currentCenter = map.getCenter();
    const currentZoom = map.getZoom();

    // Only update if the target is significantly different or zoom changed
    const isSame =
      Math.abs(currentCenter.lat - lat) < 0.0001 &&
      Math.abs(currentCenter.lng - lng) < 0.0001 &&
      currentZoom === zoom;

    if (!isSame) {
      map.setView([lat, lng], zoom, { animate: true });
    }
  }, [lat, lng, zoom, map]);
  return null;
}

function MapEvents({
  onMapClick,
  onMapMove,
}: {
  onMapClick?: (lat: number, lng: number) => void;
  onMapMove?: (lat: number, lng: number, zoom: number) => void;
}) {
  const map = useMapEvents({
    click(e) {
      if (onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    },
    dragstart() {
      if (onMapMove) {
        const center = map.getCenter();
        onMapMove(center.lat, center.lng, map.getZoom());
      }
    },
    zoomstart() {
      if (onMapMove) {
        const center = map.getCenter();
        onMapMove(center.lat, center.lng, map.getZoom());
      }
    },
  });
  return null;
}

export default React.memo(function LeafletMap({
  centerLat,
  centerLng,
  userLat,
  userLng,
  businesses = [],
  zoom = 8,
  height = "500px",
  radius = 0,
  enableClustering = true,
  onMarkerClick,
  draggableMarker = false,
  onMarkerDragEnd,
  onMapClick,
  onMapMove,
  showUserLocation = true,
  wrapperClassName,
}: LeafletMapProps) {
  useEffect(() => {
    fixLeafletIcon();
  }, []);

  const center: [number, number] = useMemo(
    () => [centerLat, centerLng],
    [centerLat, centerLng],
  );
  const userPosition: [number, number] | null = useMemo(
    () => (userLat && userLng ? [userLat, userLng] : null),
    [userLat, userLng],
  );

  const eventHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        if (marker != null && onMarkerDragEnd) {
          const { lat, lng } = marker.getLatLng();
          onMarkerDragEnd(lat, lng);
        }
      },
    }),
    [onMarkerDragEnd],
  );

  return (
    <div
      style={{ height, width: "100%" }}
      className={
        wrapperClassName ??
        "rounded-[8px] overflow-hidden border border-gray-200 z-0 relative shadow-md"
      }
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="h-full w-full"
        zoomControl={false}
        preferCanvas={true}
      >
        <TileLayer
          attribution="&copy; Google Maps"
          url="https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
          subdomains={["mt0", "mt1", "mt2", "mt3"]}
          maxZoom={20}
        />

        <ZoomControl position="bottomright" />
        <MapUpdater lat={centerLat} lng={centerLng} zoom={zoom} />
        <MapEvents onMapClick={onMapClick} onMapMove={onMapMove} />

        {/* Draggable Marker for Registration */}
        {draggableMarker && (
          <Marker
            position={center}
            icon={getCustomIcon()}
            draggable={true}
            eventHandlers={eventHandlers}
          />
        )}

        {/* User Location Marker (Blue Dot) */}
        {showUserLocation && userPosition && (
          <Marker position={userPosition} icon={userIcon}>
            <Popup>
              <div className="text-sm font-semibold">Your Location</div>
            </Popup>
          </Marker>
        )}

        {/* Radius Circle */}
        {radius > 0 && (
          <Circle
            center={center}
            radius={radius}
            pathOptions={{
              fillColor: "#2a7db4",
              fillOpacity: 0.1,
              color: "#2a7db4",
              weight: 1,
              dashArray: "5, 5",
            }}
          />
        )}

        {/* Business Markers */}
        {enableClustering ? (
          <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={60}
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            disableClusteringAtZoom={16}
          >
            {businesses.map((biz, idx) => {
              const coords = biz.geometry?.coordinates || [
                biz.longitude,
                biz.latitude,
              ];
              const props = biz.properties || biz;

              if (!coords[1] || !coords[0]) return null;

              const markerColor = getCategoryColor(props.category);

              return (
                <Marker
                  key={biz.id || idx}
                  position={[coords[1], coords[0]]}
                  icon={getCustomIcon(markerColor)}
                  eventHandlers={{
                    click: () => onMarkerClick?.(biz),
                  }}
                >
                  <Popup className="business-popup">
                    <div className="w-64 p-0">
                      {props.image_url && (
                        <div className="h-28 w-full relative mb-2">
                          <img
                            src={props.image_url}
                            alt={props.name}
                            className="w-full h-full object-cover rounded-t-md"
                          />
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex justify-between items-start mb-1 gap-2">
                          <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 flex items-center gap-1">
                            {props.name}
                            {(props.is_verified ||
                              props.verification_status === "verified") &&
                              props.can_show_badge && (
                                <VerifiedBadge size={10} />
                              )}
                          </h3>
                          {(props.rating || 0) > 0 && (
                            <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-[4px] shrink-0">
                              <Star
                                size={10}
                                className="text-amber-500 fill-amber-500"
                              />
                              <span className="text-[10px] font-bold text-amber-700">
                                {props.rating}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="text-[11px] text-[#2a7db4] font-medium mb-1 uppercase tracking-wider">
                          {props.category}
                        </p>
                        <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 leading-relaxed flex items-start gap-1">
                          <MapPin
                            size={10}
                            className="shrink-0 mt-0.5 text-[#2a7db4]"
                          />
                          <span>
                            {props.address || props.location || "Sri Lanka"}
                          </span>
                        </p>
                        <a
                          href={`/business/${props.id}`}
                          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#2a7db4] text-white text-[11px] font-bold rounded-[6px] hover:bg-[#053765] transition-all shadow-sm"
                        >
                          View Details
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        ) : (
          businesses.map((biz, idx) => {
            const coords = biz.geometry?.coordinates || [
              biz.longitude,
              biz.latitude,
            ];
            const props = biz.properties || biz;
            if (!coords[1] || !coords[0]) return null;

            const markerColor = getCategoryColor(props.category);

            return (
              <Marker
                key={biz.id || idx}
                position={[coords[1], coords[0]]}
                icon={getCustomIcon(markerColor)}
                eventHandlers={{
                  click: () => onMarkerClick?.(biz),
                }}
              >
                <Popup className="business-popup">
                  <div className="w-64 p-0">
                    {props.image_url && (
                      <div className="h-28 w-full relative mb-2">
                        <img
                          src={props.image_url}
                          alt={props.name}
                          className="w-full h-full object-cover rounded-t-md"
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <div className="flex justify-between items-start mb-1 gap-2">
                        <h3 className="font-bold text-gray-900 text-sm leading-tight line-clamp-2 flex items-center gap-1">
                          {props.name}
                          {(props.is_verified ||
                            props.verification_status === "verified") &&
                            props.can_show_badge && <VerifiedBadge size={10} />}
                        </h3>
                        {(props.rating || 0) > 0 && (
                          <div className="flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded-[4px] shrink-0">
                            <Star
                              size={10}
                              className="text-amber-500 fill-amber-500"
                            />
                            <span className="text-[10px] font-bold text-amber-700">
                              {props.rating}
                            </span>
                          </div>
                        )}
                      </div>
                      <p className="text-[11px] text-[#2a7db4] font-medium mb-1 uppercase tracking-wider">
                        {props.category}
                      </p>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mb-4 leading-relaxed flex items-start gap-1">
                        <MapPin
                          size={10}
                          className="shrink-0 mt-0.5 text-[#2a7db4]"
                        />
                        <span>
                          {props.address || props.location || "Sri Lanka"}
                        </span>
                      </p>
                      <a
                        href={`/business/${props.id}`}
                        className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#2a7db4] text-white text-[11px] font-bold rounded-[6px] hover:bg-[#053765] transition-all shadow-sm"
                      >
                        View Details
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })
        )}
      </MapContainer>
      <style jsx global>{`
        .business-popup .leaflet-popup-content-wrapper {
          padding: 0;
          overflow: hidden;
          border-radius: 12px;
          border: none;
          box-shadow:
            0 10px 25px -5px rgba(0, 0, 0, 0.1),
            0 8px 10px -6px rgba(0, 0, 0, 0.1);
        }
        .business-popup .leaflet-popup-content {
          margin: 0;
          width: 256px !important;
        }
        .business-popup .leaflet-popup-tip-container {
          display: block;
        }
        .custom-leaflet-icon {
          background: transparent !important;
          border: none !important;
        }
        .marker-pin-container {
          position: relative;
          width: 30px;
          height: 40px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .marker-pin {
          width: 26px;
          height: 26px;
          border-radius: 50% 50% 50% 0;
          background: #ea4335;
          position: absolute;
          transform: rotate(-45deg);
          left: 50%;
          top: 0;
          margin: 0 0 0 -13px;
          border: 1px solid #fff;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .marker-pin-inner {
          width: 8px;
          height: 8px;
          background: #000;
          opacity: 0.3;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
        }
        .marker-pin-container:hover .marker-pin {
          background: #d32f2f;
          transform: rotate(-45deg) scale(1.15);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
        }
        /* Modern Leaflet Styling */
        .leaflet-tile-pane {
          filter: contrast(1.05) saturate(1.1);
        }
        .leaflet-container {
          background: #f8f9fa;
        }
        /* Custom Marker Cluster Style */
        .marker-cluster-small,
        .marker-cluster-medium,
        .marker-cluster-large {
          background-color: rgba(66, 133, 244, 0.6) !important;
        }
        .marker-cluster-small div,
        .marker-cluster-medium div,
        .marker-cluster-large div {
          background-color: rgba(66, 133, 244, 1) !important;
          color: white !important;
          font-weight: bold !important;
          font-size: 12px !important;
        }
      `}</style>
    </div>
  );
});
