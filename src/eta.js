/**
 * ETA Calculator — v2.0  (NEW in this release)
 * Estimates delivery time based on courier GPS position and destination.
 * ADO Feature: Delivery ETA Prediction (#11)
 * ADO Story: #30 — Delivery ETA shown and updated in real-time
 *
 * BUG (ADO #49): The estimated arrival time is returned as a raw UTC ISO string.
 * The customer's timezone is accepted as a request parameter but never used.
 * Customers in non-UTC timezones see an ETA that is offset by their UTC difference,
 * causing confusion (e.g. UTC+3 customer sees ETA 3 hours in the past).
 */

/**
 * GET /orders/:id/eta
 * Query params: courierLat, courierLng, destLat, destLng, timezone (IANA)
 */
async function getETA(req, res) {
  const { courierLat, courierLng, destLat, destLng, timezone } = req.query;

  if (!courierLat || !courierLng || !destLat || !destLng) {
    return res.status(400).json({ error: 'Missing required coordinates' });
  }

  const distanceKm = haversine(
    parseFloat(courierLat), parseFloat(courierLng),
    parseFloat(destLat),    parseFloat(destLng)
  );

  // Assume 20 km/h average speed + 3 min buffer
  const minutes = Math.ceil((distanceKm / 20) * 60) + 3;
  const estimatedArrival = new Date(Date.now() + minutes * 60 * 1000);

  // BUG (ADO #49): `timezone` query param is received but completely ignored.
  // The response always contains a UTC timestamp. The client has no way to know
  // the correct local arrival time without doing the conversion itself — and the
  // mobile app currently does NOT do this conversion.
  //
  // Fix should be: use Intl.DateTimeFormat with the provided timezone to return
  // a localised display string alongside the UTC timestamp.
  return res.json({
    orderId: req.params.id,
    minutesRemaining: minutes,
    estimatedArrival: estimatedArrival.toISOString(), // BUG: UTC only, timezone ignored
    customerTimezone: timezone || 'UTC',              // BUG: stored but not applied
  });
}

/**
 * Haversine formula — great-circle distance in km between two coordinates.
 */
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * Math.PI / 180; }

module.exports = { getETA, haversine };
