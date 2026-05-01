const BASE_URL = "https://bus-reservation-backend-a2kg.onrender.com";

const state = {
  trips: [],
  selectedTrip: null,
  selectedSeats: new Set(),
  fare: 0,
  seatData: {} // Added to track individual seat prices
};

const els = {
  origin: document.querySelector("#origin"),
  destination: document.querySelector("#destination"),
  travelDate: document.querySelector("#travelDate"),
  searchForm: document.querySelector("#searchForm"),
  tripList: document.querySelector("#tripList"),
  seatMap: document.querySelector("#seatMap"),
  selectedTripTitle: document.querySelector("#selectedTripTitle"),
  bookingForm: document.querySelector("#bookingForm"),
  tripId: document.querySelector("#tripId"),
  passengerName: document.querySelector("#passengerName"),
  passengerEmail: document.querySelector("#passengerEmail"),
  passengerPhone: document.querySelector("#passengerPhone"),
  paymentMethod: document.querySelector("#paymentMethod"),
  seatSummary: document.querySelector("#seatSummary"),
  totalFare: document.querySelector("#totalFare"),
  bookingSubmitBtn: document.querySelector("#bookingForm button[type='submit']"),
  searchSubmitBtn: document.querySelector("#searchForm button[type='submit']"),
  lookupForm: document.querySelector("#lookupForm"),
  bookingRef: document.querySelector("#bookingRef"),
  ticketResult: document.querySelector("#ticketResult"),
  adminGrid: document.querySelector("#adminGrid"),
  recentBookings: document.querySelector("#recentBookings"),
  toast: document.querySelector("#toast"),
  statTrips: document.querySelector("#statTrips"),
  statBookings: document.querySelector("#statBookings"),
  statRevenue: document.querySelector("#statRevenue")
};

const money = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.setTimeout(() => els.toast.classList.remove("show"), 3200);
}

async function api(path, options = {}) {
  // Removed the extra /api/ from the fetch URL
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data;
}

function setDefaultDate() {
  const today = new Date();
  els.travelDate.value = today.toISOString().slice(0, 10);
}

async function loadLocations() {
  const locations = await api("/api/locations");
  const options = locations.map((city) => `<option value="${city}">${city}</option>`).join("");
  els.origin.innerHTML = options;
  els.destination.innerHTML = options;
  els.origin.value = "Delhi";
  els.destination.value = "Jaipur";
}

function renderTrips(trips) {
  if (!trips.length) {
    els.tripList.innerHTML = `<div class="trip-card"><div class="trip-main"><h3>No buses found</h3><p class="trip-meta">Try a different route or date.</p></div></div>`;
    return;
  }

  els.tripList.innerHTML = trips.map((trip) => `
    <article class="trip-card ${state.selectedTrip?.id === trip.id ? "active" : ""}">
      <div class="trip-main">
        <h3>${trip.name}</h3>
        <div class="trip-meta">
          <span>${trip.operator}</span>
          <span>${trip.bus_type}</span>
          <span>${trip.rating} rating</span>
          <span>${trip.available_seats} seats left</span>
        </div>
        <div class="time-row">
          <span>${trip.departure_time}</span>
          <span>${trip.origin}</span>
          <span>${trip.duration}</span>
          <span>${trip.arrival_time}</span>
          <span>${trip.destination}</span>
        </div>
        <div class="tags">${trip.amenities.map((item) => `<span>${item}</span>`).join("")}</div>
      </div>
      <div class="trip-price">
        <strong>${money.format(trip.fare)}</strong>
        <span>per seat</span>
        <button type="button" data-trip-id="${trip.id}">Select seats</button>
      </div>
    </article>
  `).join("");
}

async function searchTrips() {
  const params = new URLSearchParams({
    origin: els.origin.value,
    destination: els.destination.value,
    date: els.travelDate.value
  });
  state.trips = await api(`/api/trips?${params}`);
  renderTrips(state.trips);
}

function updateFare() {
  const seats = [...state.selectedSeats];
  
  // Calculate total dynamically using the specific price of each selected seat
  const total = seats.reduce((sum, seatNum) => sum + state.seatData[seatNum].price, 0);

  els.seatSummary.textContent = seats.length ? `${seats.length} seat(s): ${seats.join(", ")}` : "No seats selected";
  els.totalFare.textContent = money.format(total);
  
  // Disable the booking button if no seats are selected
  els.bookingSubmitBtn.disabled = seats.length === 0;
}

async function selectTrip(tripId) {
  const trip = state.trips.find((item) => item.id === tripId);
  if (!trip) return;

  state.selectedTrip = trip;
  state.selectedSeats.clear();
  state.seatData = {}; // Clear previous seat data
  state.fare = trip.fare;
  els.tripId.value = trip.id;
  els.selectedTripTitle.textContent = `${trip.origin} to ${trip.destination}`;

  els.seatMap.classList.remove("empty");
  els.seatMap.innerHTML = `<p style="grid-column: 1 / -1; text-align: center;">Loading seats...</p>`;

  const data = await api(`/api/trips/${tripId}/seats`);
  
  // Map over seats and inject an aisle element after every 2nd seat
  els.seatMap.innerHTML = data.seats.map((seat, index) => {
    // Left window (0), Left aisle (1), Right aisle (2), Right window (3)
    const isWindow = index % 4 === 0 || index % 4 === 3;
    const seatPrice = isWindow ? trip.fare + 100 : trip.fare; // Window seats cost ₹100 more
    
    // Store seat details in state for calculating later
    state.seatData[seat.number] = { price: seatPrice, isWindow };

    const seatHtml = `
      <button type="button" class="seat ${seat.booked ? "booked" : ""}" data-seat="${seat.number}" ${seat.booked ? "disabled" : ""} title=" Seat ${seat.number} - ${money.format(seatPrice)} ${isWindow ? '(Window)' : ''}">
        ${seat.number}
      </button>
    `;
    
    // Inject the aisle after index 1, 5, 9, 13 (2nd seat in roughly a 4-seat row spacing)
    if (index % 4 === 1) {
      return seatHtml + `<div class="aisle"></div>`;
    }
    return seatHtml;
  }).join "";

  renderTrips(state.trips);
  updateFare();
}

async function createBooking(event) {
  event.preventDefault();
  if (!state.selectedTrip) return showToast("Choose a trip first.");
  const seats = [...state.selectedSeats];
  if (!seats.length) return showToast("Select at least one seat.");

  const originalText = els.bookingSubmitBtn.textContent;
  els.bookingSubmitBtn.textContent = "Processing...";
  els.bookingSubmitBtn.disabled = true;

  try {
    const booking = await api("/api/bookings", {
      method: "POST",
      body: JSON.stringify({
        trip_id: els.tripId.value, // Removed Number() wrapper
        passenger_name: els.passengerName.value.trim(),
        passenger_email: els.passengerEmail.value.trim(),
        passenger_phone: els.passengerPhone.value.trim(),
        seats,
        payment_method: els.paymentMethod.value
      })
    });

    els.bookingForm.reset();
    state.selectedSeats.clear();
    showToast(`Booking confirmed: ${booking.booking_ref}`);
    els.bookingRef.value = booking.booking_ref;
    await selectTrip(state.selectedTrip.id);
    await lookupBooking(booking.booking_ref);
    await loadAdminStats();
    location.hash = "booking";
  } finally {
    els.bookingSubmitBtn.textContent = originalText;
    updateFare(); // resets button disabled state based on seats
  }
}

async function lookupBooking(reference) {
  const ref = reference || els.bookingRef.value.trim();
  if (!ref) return;

  const ticket = await api(`/api/bookings/${encodeURIComponent(ref)}`);
  els.ticketResult.innerHTML = `
    <div class="ticket">
      <h3>${ticket.booking_ref} · ${ticket.status}</h3>
      <p><strong>${ticket.passenger_name}</strong> · ${ticket.passenger_email} · ${ticket.passenger_phone}</p>
      <p>${ticket.name} by ${ticket.operator} · ${ticket.bus_type}</p>
      <p>${ticket.origin} to ${ticket.destination} on ${ticket.travel_date}, ${ticket.departure_time} - ${ticket.arrival_time}</p>
      <p>Seats: ${ticket.seats.join(", ")} · Total: <strong>${money.format(ticket.total_amount)}</strong></p>
    </div>
  `;
}

async function loadAdminStats() {
  const { stats, recent } = await api("/api/admin/stats");
  els.statTrips.textContent = stats.trips;
  els.statBookings.textContent = stats.bookings;
  els.statRevenue.textContent = money.format(stats.revenue);

  els.adminGrid.innerHTML = [
    ["Trips", stats.trips],
    ["Confirmed bookings", stats.bookings],
    ["Revenue", money.format(stats.revenue)],
    ["Fleet buses", stats.buses]
  ].map(([label, value]) => `<div class="admin-card"><strong>${value}</strong><span>${label}</span></div>`).join "";

  els.recentBookings.innerHTML = recent.length
    ? recent.map((booking) => `
        <div class="recent-row">
          <span><strong>${booking.booking_ref}</strong><br />${booking.passenger_name}</span>
          <strong>${money.format(booking.total_amount)}</strong>
        </div>
      `).join ""
    : `<p class="trip-meta">No bookings yet.</p>`;
}

els.searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const originalText = els.searchSubmitBtn.textContent;
  els.searchSubmitBtn.textContent = "Searching...";
  els.searchSubmitBtn.disabled = true;
  
  try {
    await searchTrips();
  } catch (error) {
    showToast(error.message);
  } finally {
    els.searchSubmitBtn.textContent = originalText;
    els.searchSubmitBtn.disabled = false;
  }
});

els.tripList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-trip-id]");
  if (!button) return;
  try {
    // Removed Number() wrapper to support MongoDB string IDs
    await selectTrip(button.dataset.tripId); 
  } catch (error) {
    showToast(error.message);
  }
});

els.seatMap.addEventListener("click", (event) => {
  const button = event.target.closest("[data-seat]");
  if (!button || button.classList.contains("booked")) return;

  const seat = button.dataset.seat;
  if (state.selectedSeats.has(seat)) {
    state.selectedSeats.delete(seat);
    button.classList.remove("selected");
  } else {
    if (state.selectedSeats.size >= 6) return showToast("You can select up to 6 seats.");
    state.selectedSeats.add(seat);
    button.classList.add("selected");
  }
  updateFare();
});

els.bookingForm.addEventListener("submit", async (event) => {
  try {
    await createBooking(event);
  } catch (error) {
    showToast(error.message);
  }
});

els.lookupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await lookupBooking();
  } catch (error) {
    showToast(error.message);
  }
});

async function boot() {
  setDefaultDate();
  await loadLocations();
  await searchTrips();
  await loadAdminStats();
}

boot().catch((error) => showToast(error.message));
