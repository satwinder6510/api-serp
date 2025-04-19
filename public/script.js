document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const tripFields = document.getElementById("tripFields");
  const results = document.getElementById("results");
  let multiCityLegs = [0, 1]; // two legs by default

  // Renders a single multi‑city leg input
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

  // Swap in the correct fields based on trip type
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
      // Multi‑City (type === "3")
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
    const type = formData.get("type");     // "1", "2", or "3"
    results.innerHTML = "Loading…";

    // Common flags & locale settings
    const common = {
      deep_search: "true",
      show_hidden: "true",
      gl: "UK",
      hl: "EN",
      currency: "GBP"
    };

    // Build our query params
    const params = new URLSearchParams({ type, ...common });

    if (type === "2") {
      // One‑Way
      params.append("departure_id", formData.get("departure_id"));
      params.append("arrival_id",   formData.get("arrival_id"));
      params.append("outbound_date", formData.get("outbound_date"));
    } 
    else if (type === "1") {
      // Round‑Trip
      params.append("departure_id",  formData.get("departure_id"));
      params.append("arrival_id",    formData.get("arrival_id"));
      params.append("outbound_date", formData.get("outbound_date"));
      params.append("return_date",   formData.get("return_date"));
    } 
    else {
      // Multi‑City (type === "3")
      const legs = multiCityLegs
        .map(i => ({
          departure_id: formData.get(`multi_departure_${i}`),
          arrival_id:   formData.get(`multi_arrival_${i}`),
          date:         formData.get(`multi_date_${i}`)
        }))
        .filter(leg => leg.departure_id && leg.arrival_id && leg.date);
      params.append("multi_city_json", JSON.stringify(legs)); // raw JSON
    }

    const url = `/api/flights?${params.toString()}`;
    console.log("→ Fetching", url);  // 👉 Make sure type=1/2/3 is correct here

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
        // For type 1 & 2:
        flights = data.best_flights?.length ? data.best_flights : data.other_flights || [];
      }

      results.innerHTML = flights.length
        ? renderFlightCards(flights, 
            type === "1" 
              ? "Round‑Trip Results" 
              : type === "2" 
                ? "One‑Way Flights" 
                : "Multi‑City Itinerary")
        : `<p>No ${type === "3" ? "multi‑city" : type === "1" ? "return‑trip" : "one‑way"} flights found.</p>`;
    } catch (err) {
      console.error("✖ Fetch failed:", err);
      results.innerHTML = "<p class='text-red-500'>Error fetching flight data.</p>";
    }
  });

  // Wire up the radio buttons & initial render
  form.querySelectorAll('input[name="type"]').forEach(r => 
    r.addEventListener("change", e => renderTripFields(e.target.value))
  );
  renderTripFields("2"); // default to One‑Way

  // Renders an array of flights under a heading
  function renderFlightCards(flights, heading = "") {
    return `
      <h2 class="text-xl font-semibold my-4">${heading}</h2>
      ${flights.map(f => {
        const x = f.flights[0];
        return `
          <div class="p-4 border rounded shadow mb-4">
            <p><strong>${x.airline}</strong> (${x.flight_number})</p>
            <p>${x.departure_airport.name} → ${x.arrival_airport.name}</p>
            <p>Departs: ${x.departure_airport.time}, Arrives: ${x.arrival_airport.time}</p>
            <p>Duration: ${f.total_duration} min | Price: £${f.price}</p>
          </div>
        `;
      }).join("")}
    `;
  }
});
