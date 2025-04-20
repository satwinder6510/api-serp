document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const tripFields = document.getElementById("tripFields");
  const results = document.getElementById("results");
  let multiCityLegs = [0, 1]; // two legs by default

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

  function renderTripFields(type) {
    if (type === "2") {
      tripFields.innerHTML = `
        <div class="flex gap-4">
          <input name="departure_id"    placeholder="From (IATA)" class="border p-2 rounded flex-1" required />
          <input name="arrival_id"      placeholder="To (IATA)"   class="border p-2 rounded flex-1" required />
        </div>
        <input name="outbound_date" type="date" class="w-full border p-2 rounded" required />
      `;
    } else if (type === "1") {
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

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const formData = new FormData(form);

    // Auto‑detect return searches
    let type = formData.get("type");                // "1", "2", or "3"
    if (formData.get("return_date")) {
      type = "1";
      console.warn("Detected return_date → forcing type=1 (Round‑Trip)");
    }

    results.innerHTML = "Loading…";

    const common = {
      deep_search: "true",
      show_hidden: "true",
      gl: "UK",
      hl: "EN",
      currency: "GBP"
    };

    const params = new URLSearchParams({ type, ...common });

    if (type === "2") {
      // One‑Way
      params.append("departure_id", formData.get("departure_id"));
      params.append("arrival_id",   formData.get("arrival_id"));
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
      params.append("multi_city_json", JSON.stringify(legs));
    }

    const url = `/api/flights?${params.toString()}`;
    console.log("→ Fetching", url);

    try {
      const res  = await fetch(url);
      const data = await res.json();
      console.log("← Response:", data);

      let flights;
      if (type === "3") {
        const best  = Array.isArray(data.best_flights)  ? data.best_flights  : [];
        const other = Array.isArray(data.other_flights) ? data.other_flights : [];
        flights = best.length ? best : other;
      } else {
        flights = data.best_flights?.length ? data.best_flights : data.other_flights || [];
      }

      results.innerHTML = flights.length
        ? renderFlightCards(flights, 
            type === "1" ? "Round‑Trip Results" :
            type === "2" ? "One‑Way Flights" :
                           "Multi‑City Itinerary")
        : `<p>No ${type === "3" ? "multi‑city" : type === "1" ? "return‑trip" : "one‑way"} flights found.</p>`;

    } catch (err) {
      console.error("✖ Fetch failed:", err);
      results.innerHTML = "<p class='text-red-500'>Error fetching flight data.</p>";
    }
  });

  // Wire up radio buttons & initial render
  form.querySelectorAll('input[name="type"]').forEach(r =>
    r.addEventListener("change", e => renderTripFields(e.target.value))
  );
  renderTripFields("2");

  // Improved renderer that shows all legs per flight
  function renderFlightCards(flights, heading = "") {
    if (!flights.length) return "";
    return `
      <h2 class="text-xl font-semibold my-4">${heading}</h2>
      ${flights.map(flight => {
        const segments = flight.flights.map((leg, i) => `
          <div class="mb-2">
            <p><strong>Leg ${i+1}: ${leg.airline} ${leg.flight_number}</strong></p>
            <p>${leg.departure_airport.name} → ${leg.arrival_airport.name}</p>
            <p>Departs: ${leg.departure_airport.time}, Arrives: ${leg.arrival_airport.time}</p>
            <p>Flight Duration: ${leg.duration} min</p>
          </div>
        `).join("");
        return `
          <div class="p-4 border rounded shadow mb-4">
            ${segments}
            <p><strong>Total Duration:</strong> ${flight.total_duration} min</p>
            <p><strong>Price:</strong> £${flight.price}</p>
          </div>
        `;
      }).join("")}
    `;
  }
});
