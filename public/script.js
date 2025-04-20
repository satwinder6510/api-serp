document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const tripFields = document.getElementById("tripFields");
  const results = document.getElementById("results");
  let multiCityLegs = [0, 1]; // start with two legs

  // Helper to render one leg input
  function createLegInput(i) {
    return `
      <div class="flex gap-4 items-center mb-2">
        <input name="multi_departure_${i}" placeholder="From (IATA)" class="border p-2 rounded flex-1" required />
        <input name="multi_arrival_${i}"   placeholder="To (IATA)"   class="border p-2 rounded flex-1" required />
        <input name="multi_date_${i}"      type="date"               class="border p-2 rounded"   required />
        <button type="button" class="text-red-600" onclick="this.parentElement.remove()">✕</button>
      </div>
    `;
  }

  // Show the right fields for One‑Way (2), Round‑Trip (1) or Multi‑City (3)
  function renderTripFields(type) {
    if (type === "2") {
      // One‑Way
      tripFields.innerHTML = `
        <div class="flex gap-4">
          <input name="departure_id"    placeholder="From (IATA)" class="border p-2 rounded flex-1" required />
          <input name="arrival_id"      placeholder="To (IATA)"   class="border p-2 rounded flex-1" required />
        </div>
        <input name="outbound_date" type="date" class="w-full border p-2 rounded" required />
      `;
    } else if (type === "1") {
      // Round‑Trip
      tripFields.innerHTML = `
        <div class="flex gap-4">
          <input name="departure_id" placeholder="From (IATA)" class="border p-2 rounded flex-1" required />
          <input name="arrival_id"   placeholder="To (IATA)"   class="border p-2 rounded flex-1" required />
        </div>
        <div class="flex gap-4">
          <input name="outbound_date" type="date" class="flex-1 border p-2 rounded" required />
          <input name="return_date"   type="date" class="flex-1 border p-2 rounded" required />
        </div>
      `;
    } else {
      // Multi‑City
      multiCityLegs = [0, 1];
      tripFields.innerHTML = `
        <div id="multiCityContainer">
          ${createLegInput(0)}
          ${createLegInput(1)}
        </div>
        <button type="button" id="addLeg" class="text-sm text-blue-600 mt-2 underline">+ Add Leg</button>
      `;
      document.getElementById("addLeg").onclick = () => {
        const i = multiCityLegs.length;
        multiCityLegs.push(i);
        document
          .getElementById("multiCityContainer")
          .insertAdjacentHTML("beforeend", createLegInput(i));
      };
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const type = formData.get("type");     // "1", "2", or "3"
    results.innerHTML = "Loading…";

    // Common flags & locale
    const common = {
      deep_search: "true",
      show_hidden: "true",
      gl: "UK",
      hl: "EN",
      currency: "GBP",
    };

    // Build params
    const params = new URLSearchParams({ type, ...common });

    if (type === "2") {
      // One‑Way
      params.append("departure_id",  formData.get("departure_id"));
      params.append("arrival_id",    formData.get("arrival_id"));
      params.append("outbound_date", formData.get("outbound_date"));
    } else if (type === "1") {
      // Round‑Trip
      params.append("departure_id",  formData.get("departure_id"));
      params.append("arrival_id",    formData.get("arrival_id"));
      params.append("outbound_date", formData.get("outbound_date"));
      params.append("return_date",   formData.get("return_date"));
    } else {
      // Multi‑City
      const legs = multiCityLegs
        .map(i => ({
          departure_id: formData.get(`multi_departure_${i}`),
          arrival_id:   formData.get(`multi_arrival_${i}`),
          date:         formData.get(`multi_date_${i}`)
        }))
        .filter(l => l.departure_id && l.arrival_id && l.date);
      params.append("multi_city_json", JSON.stringify(legs)); // raw JSON
    }

    const url = `/api/flights?${params.toString()}`;
    console.log("→ Fetching", url);

    try {
      const res  = await fetch(url);
      const data = await res.json();
      console.log("← Response:", data);

      // Pick your flights array
      let flights;
      if (type === "3") {
        const best  = Array.isArray(data.best_flights)  ? data.best_flights  : [];
        const other = Array.isArray(data.other_flights) ? data.other_flights : [];
        flights = best.length ? best : other;
      } else {
        flights = data.best_flights?.length ? data.best_flights : data.other_flights || [];
      }

      // Render
      if (flights.length) {
        const heading = type === "1"
          ? "Round‑Trip Results"
          : type === "2"
            ? "One‑Way Flights"
            : "Multi‑City Itinerary";
        results.innerHTML = renderFlightCards(flights, heading);
      } else {
        const label = type === "1"
          ? "return‑trip"
          : type === "2"
            ? "one‑way"
            : "multi‑city";
        results.innerHTML = `<p>No ${label} flights found.</p>`;
      }
    } catch (err) {
      console.error("✖ Fetch failed:", err);
      results.innerHTML = "<p class='text-red-500'>Error fetching flight data.</p>";
    }
  });

  // Listen to trip‑type radios
  form.querySelectorAll('input[name="type"]').forEach(radio =>
    radio.addEventListener("change", e => renderTripFields(e.target.value))
  );

  // Initial render (default = One‑Way)
  renderTripFields("2");

  // Render all segments per flight
  function renderFlightCards(flights, heading = "") {
    return `
      <h2 class="text-xl font-semibold my-4">${heading}</h2>
      ${flights.map(flight => {
        // Loop each segment/leg
        const segs = flight.flights.map((leg, i) => `
          <div class="mb-2">
            <p><strong>Leg ${i+1}: ${leg.airline} ${leg.flight_number}</strong></p>
            <p>${leg.departure_airport.name} → ${leg.arrival_airport.name}</p>
            <p>Departs: ${leg.departure_airport.time}, Arrives: ${leg.arrival_airport.time}</p>
            <p>Duration: ${leg.duration} min</p>
          </div>
        `).join("");
        return `
          <div class="p-4 border rounded shadow mb-4">
            ${segs}
            <p><strong>Total Duration:</strong> ${flight.total_duration} min</p>
            <p><strong>Price:</strong> £${flight.price}</p>
          </div>
        `;
      }).join("")}
    `;
  }
});
