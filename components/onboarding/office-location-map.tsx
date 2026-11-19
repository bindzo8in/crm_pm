"use client";

import { useEffect, useRef, useState } from "react";
import type {
  LatLng,
  Map as LeafletMap,
  Marker as LeafletMarker,
  TileLayer,
} from "leaflet";
import { searchMapPlaces, type MapPlaceResult } from "@/actions/locations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoaderCircle, Locate, MapPin, Search } from "lucide-react";

export interface OfficeMapPosition {
  latitude: number;
  longitude: number;
}

interface OfficeLocationMapProps {
  initialPosition: OfficeMapPosition | null;
  onConfirm: (position: OfficeMapPosition) => void;
  onCancel: () => void;
}

type MapMode = "street" | "satellite";

const defaultMapPosition: OfficeMapPosition = {
  latitude: 20.5937,
  longitude: 78.9629,
};

function getLocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) {
    return "Location access is blocked. Allow it in your browser settings, or choose a point on the map.";
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return "Your location couldn't be determined. Try again or choose a point on the map.";
  }
  return "The location request timed out. Try again or choose a point on the map.";
}

function addBaseLayer(
  L: typeof import("leaflet"),
  map: LeafletMap,
  mode: MapMode,
): TileLayer[] {
  const layer =
    mode === "satellite"
      ? [
          {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attribution:
              'Imagery &copy; <a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> | Source: Esri, Vantor, Earthstar Geographics, and the GIS User Community',
          },
          {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}",
            attribution:
              'Transportation &copy; Esri, HERE, Garmin, and OpenStreetMap contributors',
          },
          {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
            attribution:
              'Labels &copy; Esri, HERE, Garmin, (c) OpenStreetMap contributors, and the GIS user community',
          },
        ]
      : {
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>',
        };

  const layers = Array.isArray(layer) ? layer : [layer];
  return layers.map(({ url, attribution }) =>
    L.tileLayer(url, {
      maxZoom: 19,
      attribution,
    }).addTo(map),
  );
}

export function OfficeLocationMap({
  initialPosition,
  onConfirm,
  onCancel,
}: OfficeLocationMapProps) {
  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapControlsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const placeMarkerRef = useRef<((latLng: LatLng) => void) | null>(null);
  const tileLayersRef = useRef<TileLayer[]>([]);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const mapModeRef = useRef<MapMode>("street");
  const isMountedRef = useRef(false);
  const initialPositionRef = useRef(initialPosition);
  const lastPlaceSearchAtRef = useRef(0);
  const placeSearchCacheRef = useRef(new Map<string, MapPlaceResult[]>());
  const [selectedPosition, setSelectedPosition] = useState(initialPosition);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapMode, setMapMode] = useState<MapMode>("street");
  const [mapReady, setMapReady] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [placeQuery, setPlaceQuery] = useState("");
  const [placeResults, setPlaceResults] = useState<MapPlaceResult[]>([]);
  const [hasSearchedPlaces, setHasSearchedPlaces] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [placeSearchError, setPlaceSearchError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<{
    message: string;
    isError: boolean;
  } | null>(null);

  const searchPlaces = async () => {
    const query = placeQuery.trim();
    if (query.length < 2) {
      setPlaceSearchError("Enter at least 2 characters to search for a place.");
      return;
    }

    const cacheKey = query.toLowerCase();
    const cachedResults = placeSearchCacheRef.current.get(cacheKey);
    if (cachedResults) {
      setPlaceResults(cachedResults);
      setHasSearchedPlaces(true);
      setPlaceSearchError(null);
      return;
    }

    if (Date.now() - lastPlaceSearchAtRef.current < 1000) {
      setPlaceSearchError("Wait a moment before searching again.");
      return;
    }

    lastPlaceSearchAtRef.current = Date.now();
    setIsSearchingPlaces(true);
    setPlaceSearchError(null);
    setHasSearchedPlaces(false);
    try {
      const response = await searchMapPlaces(query);
      if (!isMountedRef.current) return;

      if (!response.success || !response.data) {
        setPlaceResults([]);
        setPlaceSearchError(response.message);
        return;
      }

      placeSearchCacheRef.current.set(cacheKey, response.data);
      setPlaceResults(response.data);
      setHasSearchedPlaces(true);
    } catch (error) {
      console.error("Place search request failed.", {
        errorName: error instanceof Error ? error.name : "UnknownError",
      });
      if (isMountedRef.current) {
        setPlaceResults([]);
        setPlaceSearchError("Place search is temporarily unavailable. Try again.");
      }
    } finally {
      if (isMountedRef.current) setIsSearchingPlaces(false);
    }
  };

  const selectPlace = (place: MapPlaceResult) => {
    const map = mapRef.current;
    const leaflet = leafletRef.current;
    const placeMarker = placeMarkerRef.current;
    if (!map || !leaflet || !placeMarker) {
      setPlaceSearchError("The map isn't ready yet. Try again in a moment.");
      return;
    }

    const position = leaflet.latLng(place.latitude, place.longitude);
    map.setView(position, 16, { animate: true });
    placeMarker(position);
    setPlaceQuery(place.name);
    setPlaceResults([]);
    setHasSearchedPlaces(false);
    setLocationNotice({
      message: `Map moved to ${place.name}. Check the pin before using this location.`,
      isError: false,
    });
  };

  const changeMapMode = (mode: MapMode) => {
    mapModeRef.current = mode;
    setMapMode(mode);

    const map = mapRef.current;
    const leaflet = leafletRef.current;
    if (!map || !leaflet) return;

    tileLayersRef.current.forEach((layer) => layer.remove());
    tileLayersRef.current = addBaseLayer(leaflet, map, mode);
  };

  const locateCurrentPosition = () => {
    if (!navigator.geolocation) {
      setLocationNotice({
        message:
          "Location access isn't supported by this browser. Choose a point on the map instead.",
        isError: true,
      });
      return;
    }

    setLocationNotice(null);
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!isMountedRef.current) return;

        setIsLocating(false);
        const map = mapRef.current;
        const leaflet = leafletRef.current;
        const placeMarker = placeMarkerRef.current;
        if (!map || !leaflet || !placeMarker) {
          setLocationNotice({
            message: "The map isn't ready yet. Try again in a moment.",
            isError: true,
          });
          return;
        }

        const { latitude, longitude } = coords;
        if (
          !Number.isFinite(latitude) ||
          latitude < -90 ||
          latitude > 90 ||
          !Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180
        ) {
          setLocationNotice({
            message:
              "Your device returned invalid coordinates. Choose a point on the map instead.",
            isError: true,
          });
          return;
        }

        const position = leaflet.latLng(latitude, longitude);
        map.setView(position, 17, { animate: true });
        placeMarker(position);
        setLocationNotice({
          message: "Current location found. Confirm it matches your office.",
          isError: false,
        });
      },
      (error) => {
        if (!isMountedRef.current) return;
        setIsLocating(false);
        setLocationNotice({
          message: getLocationErrorMessage(error),
          isError: true,
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    let cancelled = false;
    let resizeTimer: number | undefined;
    isMountedRef.current = true;

    void import("leaflet")
      .then(({ default: L }) => {
        const element = mapElementRef.current;
        if (cancelled || !element) return;

        const position = initialPositionRef.current;
        const center = position ?? defaultMapPosition;
        const map = L.map(element, {
          scrollWheelZoom: true,
        }).setView([center.latitude, center.longitude], position ? 16 : 5);
        mapRef.current = map;
        leafletRef.current = L;
        tileLayersRef.current = addBaseLayer(L, map, mapModeRef.current);
        if (mapControlsRef.current) {
          L.DomEvent.disableClickPropagation(mapControlsRef.current);
          L.DomEvent.disableScrollPropagation(mapControlsRef.current);
        }

        const markerIcon = L.divIcon({
          className: "",
          html: '<div style="width:22px;height:22px;border:3px solid white;border-radius:50% 50% 50% 0;background:#4f46e5;box-shadow:0 1px 5px #0008;transform:rotate(-45deg)"></div>',
          iconSize: [22, 22],
          iconAnchor: [11, 22],
        });

        const placeMarker = (latLng: LatLng) => {
          const nextPosition = {
            latitude: latLng.lat,
            longitude: latLng.lng,
          };
          setSelectedPosition(nextPosition);
          setLocationNotice(null);

          if (markerRef.current) {
            markerRef.current.setLatLng(latLng);
          } else {
            markerRef.current = L.marker(latLng, {
              draggable: true,
              icon: markerIcon,
              title: "Selected office location",
            })
              .addTo(map)
              .on("dragend", (event) => {
                const markerPosition = event.target.getLatLng();
                setSelectedPosition({
                  latitude: markerPosition.lat,
                  longitude: markerPosition.lng,
                });
                setLocationNotice(null);
              });
          }
        };

        placeMarkerRef.current = placeMarker;
        if (position) {
          placeMarker(L.latLng(position.latitude, position.longitude));
        }
        map.on("click", ({ latlng }) => placeMarker(latlng));
        setMapReady(true);
        resizeTimer = window.setTimeout(() => map.invalidateSize(), 150);
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        console.error("Could not load the office location map:", cause);
        setMapError("The map could not be loaded. Please try again.");
      });

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      if (resizeTimer !== undefined) window.clearTimeout(resizeTimer);
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      placeMarkerRef.current = null;
      tileLayersRef.current = [];
      leafletRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div role="search" aria-label="Search for a place" className="flex gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              id="office-place-search"
              type="search"
              value={placeQuery}
              maxLength={160}
              placeholder="Search a place or address"
              aria-label="Search a place or address"
              aria-describedby="office-place-search-help"
              className="pl-9"
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void searchPlaces();
                }
              }}
              onChange={(event) => {
                setPlaceQuery(event.target.value);
                setPlaceResults([]);
                setHasSearchedPlaces(false);
                setPlaceSearchError(null);
              }}
            />
          </div>
          <Button
            type="button"
            disabled={!mapReady || isSearchingPlaces || placeQuery.trim().length < 2}
            onClick={() => void searchPlaces()}
          >
            {isSearchingPlaces ? (
              <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            ) : (
              <Search aria-hidden="true" />
            )}
            Search
          </Button>
        </div>
        <p id="office-place-search-help" className="text-xs text-muted-foreground">
          Search sends your place name to the configured provider. By default, that is{" "}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            OpenStreetMap
          </a>
          . Results appear when you submit.
        </p>
        {placeSearchError && (
          <p role="alert" className="text-xs text-destructive">
            {placeSearchError}
          </p>
        )}
        {placeResults.length > 0 && (
          <div
            role="listbox"
            aria-label="Place search results"
            className="max-h-36 overflow-y-auto rounded-md border bg-popover p-1 shadow-sm"
          >
            {placeResults.map((place) => (
              <Button
                key={place.id}
                type="button"
                role="option"
                aria-selected={false}
                variant="ghost"
                className="h-auto w-full justify-start gap-2 whitespace-normal px-2 py-2 text-left"
                onClick={() => selectPlace(place)}
              >
                <MapPin aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{place.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {place.address}
                  </span>
                </span>
              </Button>
            ))}
          </div>
        )}
        {hasSearchedPlaces && placeResults.length === 0 && !placeSearchError && (
          <p role="status" className="text-xs text-muted-foreground">
            No places found. Try a nearby town, street, or postal code.
          </p>
        )}
      </div>
      {mapError ? (
        <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {mapError}
        </p>
      ) : (
        <div className="relative">
          <div
            ref={mapElementRef}
            aria-label={`${mapMode === "street" ? "Street" : "Satellite"} map location picker`}
            className="h-[min(48vh,24rem)] min-h-64 w-full overflow-hidden rounded-lg border bg-muted"
          />
          <div
            ref={mapControlsRef}
            className="absolute right-2 top-2 z-[1000] flex flex-col items-end gap-2"
          >
            <div
              role="group"
              aria-label="Map view"
              className="flex gap-1 rounded-lg border bg-background/95 p-1 shadow-md"
            >
              <Button
                type="button"
                size="sm"
                variant={mapMode === "street" ? "default" : "outline"}
                aria-pressed={mapMode === "street"}
                onClick={() => changeMapMode("street")}
              >
                Map
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mapMode === "satellite" ? "default" : "outline"}
                aria-pressed={mapMode === "satellite"}
                onClick={() => changeMapMode("satellite")}
              >
                Satellite
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="bg-background/95 shadow-md"
              aria-label="Go to current location"
              title="Go to current location"
              aria-busy={isLocating}
              disabled={!mapReady || isLocating || Boolean(mapError)}
              onClick={locateCurrentPosition}
            >
              {isLocating ? (
                <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Locate aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      )}
      {locationNotice && (
        <p
          role={locationNotice.isError ? "alert" : "status"}
          className={`text-xs ${locationNotice.isError ? "text-destructive" : "text-muted-foreground"}`}
        >
          {locationNotice.message}
        </p>
      )}
      <div className="grid gap-3 border-t pt-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
        <div className="flex min-w-0 items-center gap-2 rounded-md border bg-muted/35 px-3 py-2">
          <MapPin aria-hidden="true" className="size-4 shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {selectedPosition ? "Location selected" : "Choose a location"}
            </p>
            <p className="truncate text-xs text-muted-foreground" aria-live="polite">
              {selectedPosition
                ? `${selectedPosition.latitude.toFixed(6)}, ${selectedPosition.longitude.toFixed(6)}`
                : "Click the map or use current location"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!selectedPosition || !mapReady || Boolean(mapError)}
            className="w-full sm:w-auto"
            onClick={() => {
              if (selectedPosition) onConfirm(selectedPosition);
            }}
          >
            Use this location
          </Button>
        </div>
      </div>
    </div>
  );
}
