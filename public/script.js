document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const tripFields = document.getElementById("tripFields");
  const results = document.getElementById("results");
  let multiCityLegs = [0, 1]; // start with two legs

  function createLegInput(index) {
    return `
      <div class="flex gap-4 items-center mb-2">
        <input name="multi_departure_${index}" placeholder="From (IATA)" class="border p-2 rounded flex-1" required />
        <input name="multi_arrival_${index}" placeholder="To (IATA)" class="border p-2 rounded flex-1" required />
        <input name="multi_date_${index}" type="date" class="border p-2 rounded" required />
        <button type="button" class="text-red-600" onclick="this.parentElement.remove()">✕</button>
      </div>
    `;
  }

  function renderTripFields(type) {
    if (type === "2") {
      tripFields.innerHTML = `
        <div class="flex gap-4">
          <input name="departure_id" placeholder="From (IATA)" class="border p-2 rounded flex-1" required />
          <input name="arrival_id" placeholder="To (IATA)" class="border p-2 rounded flex-1" required />
        </div>
        <input name="outbound_date" type="date" class="w-full border p-2 rounded" required />
      `;
    } else if (type === "1") {
      tripFields.innerHTML = `
        <div class="flex gap-4">
          <input name="departure_id" placeholder="From (IATA)" class="border p-2 rounded flex-1" required />
          <input name="arrival_id" placeholder="To (IATA)" class="border p-2 rounded flex-1" required />
        </div>
        <div class="flex gap-4">
          <input name="outbound_date" type="date" class="flex-1 border p-2 rounded" required />
          <input name="return_date" type="date" class="flex-1 border p-2 rounded" required />
        </div>
      `;
    } else if (type === "3") {
      // Multi-City: render two legs initially
      multiCityLegs = [0, 1];
      tripFields.innerHTML = `
        <div id="multiCityContainer">
          ${createLegInput(0)}
          ${createLegInput(1)}
        </div>
        <button type="button" id="addLeg" class="text-sm text-blue-600 mt-2 underline">+ Add Leg</button>
      `;
      document.getElementById("addLeg").onclick = () => {
        const newIndex = multiCityLegs.length;
        multiCityLegs.push(newIndex);
        document
          .getElementById("multiCityContainer")
          .insertAdjacentHTML("beforeend", createLegInput(newIndex));
      };
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const type = formData.get("type");
    results.innerHTML = "Loading...";

    const commonParams = {
      deep_search: "true",
      show_hidden: "true",
      gl: "UK",
      hl: "EN",
      currency: "GBP",
    };

    try {
      let allResultsHTML = "";

      if (type === "3") {
        // Build multi-city payload
        const multiCity = multiCityLegs.map((idx) => ({
          departure_id: formData.get(`multi_departure_${idx}`),
          arrival_id: formData.get(`multi_arrival_${idx}`),
          date: formData.get(`multi_date_${idx}`),
        })).filter(leg => leg.departure_id && leg.arrival_id && leg.date);

        const params = new URLSearchParams({
          type: "3",
          multi_city_json: JSON.stringify(multiCity), // raw JSON
          ...commonParams,
        });

        const res = await fetch(`/api/flights?${params.toString()}`);
        const data = await res.json();
        console.log("🧾 Multi-city response:", data);

        const best = Array.isArray(data.best_flights) ? data.best_flights : [];
        const other = Array.isArray(data.other_flights) ? data.other_flights : [];
        const flights = best.length > 0 ? best : other;

        allResultsHTML = flights.length
          ? renderFlightCards(flights, "Multi-City Itinerary")
          : "<p>No multi-city flights found.</p>";

      } else if (type === "2") {
        // One-Way
        const params = new URLSearchParams({
          type: "2",
          departure_id: formData.get("departure_id"),
          arrival_id: formData.get("arrival_id"),
          outbound_date: formData.get("outbound_date"),
          ...commonParams,
        });

        const res = await fetch(`/api/flights?${params.toString()}`);
        const data = await res.json();
        const flights = data.best_flights?.length ? data.best_flights : data.other_flights || [];

        allResultsHTML = flights.length
          ? renderFlightCards(flights, "One-Way Flights")
          : "<p>No one-way flights found.</p>";

      } else if (type === "1") {
        // Round-Trip as two one-way calls
        const outboundParams = new URLSearchParams({
          type: "2",
          departure_id: formData.get("departure_id"),
          arrival_id: formData.get("arrival_id"),
          outbound_date: formData.get("outbound_date"),
          ...commonParams,
        });
        const returnParams = new URLSearchParams({
          type: "2",
          departure_id: formData.get("arrival_id"),
          arrival_id: formData.get("departure_id"),
          outbound_date: formData.get("return_date"),
          ...commonParams,
        });

        const [outRes, returnRes] = await Promise.all([
          fetch(`/api/flights?${outboundParams}`),
          fetch(`/api/flights?${returnParams}`),
        ]);
        const outData = await outRes.json();
        const returnData = await returnRes.json();

        const outFlights = outData.best_flights?.length ? outData.best_flights : outData.other_flights || [];
        const returnFlights = returnData.best_flights?.length ? returnData.best_flights : returnData.other_flights || [];

        allResultsHTML =
          renderFlightCards(outFlights, "Outbound Flight") +
          renderFlightCards(returnFlights, "Return Flight");
      }

      results.innerHTML = allResultsHTML || "<p>No flights found.</p>";
    } catch (err) {
      console.error("✖ Fetch failed:", err);
      results.innerHTML = "<p class='text-red-500'>Error fetching flight data.</p>";
    }
  });

  // Wire up trip type radio buttons
  form.type.forEach(radio =>
    radio.addEventListener("change", e => renderTripFields(e.target.value))
  );

  // Initial render: default to One-Way
  renderTripFields("2");

  // Helper to render flight cards
  function renderFlightCards(flights, heading = "") {
    if (!flights.length) return "";
    return `
      <h2 class="text-xl font-semibold my-4">${heading}</h2>
      ${flights.map(flight => {
        const f = flight.flights[0];
        return `
          <div class="p-4 border rounded shadow mb-4">
            <p><strong>${f.airline}</strong> (${f.flight_number}) - ${f.airplane || "–"}</p>
            <p>${f.departure_airport.name} → ${f.arrival_airport.name}</p>
            <p>Departs: ${f.departure_airport.time}, Arrives: ${f.arrival_airport.time}</p>
            <p>Duration: ${flight.total_duration} min | Price: £${flight.price}</p>
          </div>
        `;
      }).join("")}
    `;
  }
});
