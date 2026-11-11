"use client";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

const API = process.env.NEXT_PUBLIC_API_URL || "https://loan-system-h794.onrender.com";
const DEFAULT_CENTER: [number, number] = [-0.7, 37.35]; // Mwea area

type Props = {
  customer?: any;
  customerId: string | string[];
  token: string | null;
  onSaved: () => void;
};

const toNum = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

// Shrinks phone photos (often 3-8 MB) to ~1280px JPEG before upload.
const compressImage = (file: File, maxSize = 1280, quality = 0.8): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(url); reject(new Error("Could not process image")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error("Could not compress image"))), "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image")); };
    img.src = url;
  });

// ── Outer: loads the saved location + photo, then shows the editor ───────────
export default function LocationCard({ customer, customerId, token, onSaved }: Props) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${API}/api/customers/${customerId}/location`, {
          headers: { Authorization: "Bearer " + token },
        });
        const d = await res.json();
        if (!alive) return;
        if (d.error) setError(d.error); else setData(d);
      } catch {
        if (alive) setError("Could not load the location details.");
      }
    })();
    return () => { alive = false; };
  }, [customerId]);

  if (error) return <div className="bg-white rounded-xl shadow p-6 text-sm text-red-500">{error}</div>;
  if (!data) return <div className="bg-white rounded-xl shadow p-6 text-sm text-gray-400">Loading location…</div>;
  return <LocationEditor data={data} customerName={customer?.name || data.name} customerId={customerId} token={token} onSaved={onSaved} />;
}

// ── Inner: map, GPS capture, photo ───────────────────────────────────────────
function LocationEditor({ data, customerName, customerId, token, onSaved }: {
  data: any; customerName: string; customerId: string | string[]; token: string | null; onSaved: () => void;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const tilesRef = useRef<any>({});
  const watchRef = useRef<number | null>(null);
  const timerRef = useRef<any>(null);

  const startLat = toNum(data.latitude);
  const startLng = toNum(data.longitude);
  const startAcc = toNum(data.location_accuracy);

  const [point, setPoint] = useState<{ lat: number; lng: number } | null>(
    startLat !== null && startLng !== null ? { lat: startLat, lng: startLng } : null
  );
  const [accuracy, setAccuracy] = useState<number | null>(startAcc !== null ? Math.round(startAcc) : null);
  const [location, setLocation] = useState<string>(data.location || "");
  const [landmark, setLandmark] = useState<string>(data.nearest_landmark || "");
  const [meta, setMeta] = useState<{ by: string | null; at: string | null }>({
    by: data.location_updated_by || null,
    at: data.location_updated_at || null,
  });
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [layer, setLayer] = useState<"street" | "satellite">("street");
  const [mapReady, setMapReady] = useState(false);

  const [photoUrl, setPhotoUrl] = useState<string | null>(data.premises_photo_url || null);
  const [photoMeta, setPhotoMeta] = useState<{ by: string | null; at: string | null }>({
    by: data.premises_photo_updated_by || null,
    at: data.premises_photo_updated_at || null,
  });
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoMsg, setPhotoMsg] = useState("");

  const stopWatch = () => {
    if (watchRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const placeMarker = (lat: number, lng: number, zoom?: number) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;
    if (!markerRef.current) {
      const icon = L.divIcon({
        html: '<div style="font-size:30px;line-height:36px;text-align:center">📍</div>',
        className: "",
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      });
      const m = L.marker([lat, lng], { draggable: true, icon }).addTo(map);
      m.on("dragend", () => {
        const p = m.getLatLng();
        setPoint({ lat: p.lat, lng: p.lng });
        setAccuracy(null); // manual placement
        setDirty(true);
      });
      markerRef.current = m;
    } else {
      markerRef.current.setLatLng([lat, lng]);
    }
    if (zoom) map.setView([lat, lng], zoom);
  };

  // Build the map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod: any = await import("leaflet");
      const L = mod.default || mod;
      if (cancelled || !mapEl.current || mapRef.current) return;
      leafletRef.current = L;

      const map = L.map(mapEl.current, {
        center: point ? [point.lat, point.lng] : DEFAULT_CENTER,
        zoom: point ? 17 : 12,
      });
      tilesRef.current.street = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap contributors",
      });
      tilesRef.current.satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19, attribution: "Tiles © Esri" }
      );
      tilesRef.current.street.addTo(map);

      map.on("click", (e: any) => {
        placeMarker(e.latlng.lat, e.latlng.lng);
        setPoint({ lat: e.latlng.lat, lng: e.latlng.lng });
        setAccuracy(null);
        setDirty(true);
      });

      mapRef.current = map;
      if (point) placeMarker(point.lat, point.lng);
      setMapReady(true);
      setTimeout(() => map.invalidateSize(), 200);
    })();

    return () => {
      cancelled = true;
      stopWatch();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Street / satellite switch
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const wanted = layer === "street" ? tilesRef.current.street : tilesRef.current.satellite;
    const other = layer === "street" ? tilesRef.current.satellite : tilesRef.current.street;
    if (map.hasLayer(other)) map.removeLayer(other);
    if (!map.hasLayer(wanted)) wanted.addTo(map);
  }, [layer, mapReady]);

  // GPS capture: listens up to 15s and keeps the most accurate fix
  const captureGps = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoMsg("This device or browser does not support GPS.");
      return;
    }
    stopWatch();
    setLocating(true);
    setGeoMsg("Getting GPS fix… stand at the customer's gate or door and wait a few seconds.");

    let best = Infinity;
    let gotFix = false;
    const finish = () => { stopWatch(); setLocating(false); };

    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, accuracy: acc } = pos.coords;
        if (acc < best) {
          best = acc;
          gotFix = true;
          setPoint({ lat: latitude, lng: longitude });
          setAccuracy(Math.round(acc));
          setDirty(true);
          placeMarker(latitude, longitude, 18);
        }
        if (acc <= 15) {
          setGeoMsg("Excellent GPS fix captured.");
          finish();
        }
      },
      (err) => {
        finish();
        setGeoMsg(
          err.code === 1
            ? "Location permission denied. Allow location access for this site in your browser settings, then try again."
            : err.code === 2
            ? "GPS signal unavailable. Move outdoors and try again."
            : "GPS timed out. Move outdoors and try again."
        );
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
    );

    timerRef.current = setTimeout(() => {
      finish();
      setGeoMsg(
        gotFix
          ? "Best available fix captured. If accuracy is weak, drag the pin to the exact spot."
          : "Could not get a GPS fix. Move outdoors or tap the map to place the pin."
      );
    }, 15000);
  };

  const save = async () => {
    if (!point) { alert("Pin the location first — use GPS or tap the map."); return; }
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/customers/${customerId}/location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          location,
          nearest_landmark: landmark,
          latitude: point.lat,
          longitude: point.lng,
          location_accuracy: accuracy,
        }),
      });
      const d = await res.json();
      if (d.error) alert(d.error);
      else {
        setDirty(false);
        setMeta({ by: d.location_updated_by || null, at: d.location_updated_at || null });
        onSaved();
      }
    } catch { alert("Failed to save location"); }
    setSaving(false);
  };

  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhotoBusy(true);
    setPhotoMsg("Preparing photo…");
    try {
      const blob = await compressImage(file);
      const form = new FormData();
      form.append("photo", blob, "premises.jpg");
      setPhotoMsg("Uploading…");
      const res = await fetch(`${API}/api/customers/${customerId}/premises-photo`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: form,
      });
      const d = await res.json();
      if (d.error) setPhotoMsg("❌ " + d.error);
      else {
        setPhotoUrl(d.url);
        setPhotoMeta({ by: d.updated_by || null, at: d.updated_at || null });
        setPhotoMsg("✅ Photo saved");
        onSaved();
      }
    } catch (err: any) {
      setPhotoMsg("❌ " + (err?.message || "Upload failed"));
    }
    setPhotoBusy(false);
  };

  const mapsLink = point ? `https://www.google.com/maps?q=${point.lat},${point.lng}` : "";
  const directionsLink = point
    ? `https://www.google.com/maps/dir/?api=1&destination=${point.lat},${point.lng}&travelmode=driving`
    : "";
  const whatsappLink = point
    ? `https://wa.me/?text=${encodeURIComponent(
        `${customerName || "Customer"} — location${location ? " (" + location + ")" : ""}: ${mapsLink}`
      )}`
    : "";

  const accBadge =
    accuracy === null
      ? { text: "Placed manually on map", cls: "bg-gray-100 text-gray-600" }
      : accuracy <= 20
      ? { text: `GPS accuracy ±${accuracy} m — excellent`, cls: "bg-green-100 text-green-700" }
      : accuracy <= 50
      ? { text: `GPS accuracy ±${accuracy} m — good`, cls: "bg-yellow-100 text-yellow-700" }
      : { text: `GPS accuracy ±${accuracy} m — weak, drag the pin to adjust`, cls: "bg-red-100 text-red-700" };

  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <h3 className="font-bold text-lg">📍 Customer Location</h3>
        {point && (
          <div className="flex gap-2 flex-wrap">
            <a href={directionsLink} target="_blank" rel="noreferrer"
              className="bg-[#04342C] text-white px-4 py-1.5 rounded-lg text-sm hover:bg-[#0F6E56]">
              🧭 Get Directions
            </a>
            <a href={whatsappLink} target="_blank" rel="noreferrer"
              className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700">
              💬 Share on WhatsApp
            </a>
          </div>
        )}
      </div>

      {/* Capture controls */}
      <div className="bg-[#F0FDF4] border border-[#1D9E75] rounded-xl p-4">
        <p className="text-sm text-gray-700 mb-3">
          <strong>Standing at the customer's home or business?</strong> Tap the button and the phone's GPS
          will pin the exact spot. You can also tap anywhere on the map, or drag the pin, to correct it.
        </p>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={captureGps} disabled={locating}
            className="bg-[#04342C] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#0F6E56] disabled:opacity-60">
            {locating ? "📡 Locking GPS…" : "📡 Use my current location"}
          </button>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-sm">
            <button onClick={() => setLayer("street")}
              className={`px-3 py-2 ${layer === "street" ? "bg-[#04342C] text-white" : "bg-white text-gray-600"}`}>Map</button>
            <button onClick={() => setLayer("satellite")}
              className={`px-3 py-2 ${layer === "satellite" ? "bg-[#04342C] text-white" : "bg-white text-gray-600"}`}>Satellite</button>
          </div>
        </div>
        {geoMsg && <p className="text-xs text-gray-600 mt-3">{geoMsg}</p>}
      </div>

      {/* Map */}
      <div style={{ isolation: "isolate" }} className="relative z-0">
        <div ref={mapEl} className="w-full h-80 rounded-lg border border-gray-200" />
      </div>

      {point && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${accBadge.cls}`}>{accBadge.text}</span>
          <span className="font-mono text-xs text-gray-500">{point.lat.toFixed(6)}, {point.lng.toFixed(6)}</span>
        </div>
      )}

      {/* Descriptive details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Area / Location</label>
          <input value={location} onChange={e => { setLocation(e.target.value); setDirty(true); }}
            placeholder="e.g. Wanguru, behind the market"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nearest Landmark</label>
          <input value={landmark} onChange={e => { setLandmark(e.target.value); setDirty(true); }}
            placeholder="e.g. Next to the water kiosk"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#1D9E75]" />
        </div>
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-xs text-gray-400">
          {meta.at ? `Last pinned by ${meta.by || "officer"} on ${fmtDate(meta.at)}` : "No pin saved yet"}
        </p>
        <button onClick={save} disabled={saving || !point || !dirty}
          className="bg-[#04342C] text-white px-5 py-2 rounded-lg text-sm hover:bg-[#0F6E56] disabled:opacity-50">
          {saving ? "Saving…" : dirty ? "✅ Save Location" : "Saved"}
        </button>
      </div>

      {/* Premises photo */}
      <div className="border-t border-gray-100 pt-4">
        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
          <h4 className="font-semibold text-gray-700">🏠 Premises photo</h4>
          <div className="flex gap-2">
            <label className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs text-white ${photoBusy ? "bg-gray-400" : "bg-[#04342C] hover:bg-[#0F6E56]"}`}>
              {photoBusy ? "Please wait…" : "📷 Take photo"}
              <input type="file" accept="image/*" capture="environment" className="hidden" disabled={photoBusy} onChange={onPhoto} />
            </label>
            <label className={`cursor-pointer px-3 py-1.5 rounded-lg text-xs bg-gray-100 text-gray-700 ${photoBusy ? "opacity-50" : "hover:bg-gray-200"}`}>
              🖼️ Gallery
              <input type="file" accept="image/*" className="hidden" disabled={photoBusy} onChange={onPhoto} />
            </label>
          </div>
        </div>

        {photoUrl ? (
          <img src={photoUrl} alt="Customer premises"
            className="w-full max-h-72 object-cover rounded-lg border border-gray-200 cursor-pointer"
            onClick={() => window.open(photoUrl, "_blank")} />
        ) : (
          <div className="w-full h-32 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
            <p className="text-gray-400 text-sm">No photo yet</p>
          </div>
        )}

        <p className="text-xs text-gray-400 mt-2">
          {photoUrl && photoMeta.at ? `Photo by ${photoMeta.by || "officer"} on ${fmtDate(photoMeta.at)}. ` : ""}
          Photograph the gate, shop front or house so the next officer can recognise it on arrival.
        </p>
        {photoMsg && <p className="text-xs text-gray-600 mt-1">{photoMsg}</p>}
      </div>
    </div>
  );
}
