form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const type = formData.get("type");

  const results = document.getElementById("results");
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
      const multiCity = [];
      for (const index of multiCityLegs) {
        const from = formData.get(`multi_departure_${index}`);
        const to = formData.get(`multi_arrival_${index}`);
        const date = formData.get(`multi_date_${index}`);
        if (from && to && date) {
          multiCity.push({ departure_id: from, arrival_id: to, date });
        }
      }

      const params = new URLSearchParams({
        type: "3",
        multi_city_json: JSON.stringify(multiCity),
        ...commonParams,
      });

      const res = await fetch(`/api/flights?${params.toString()}`);
      const data = await res.json();
      const flights = data.best_flights?.length ? data.best_flights : data.other_flights || [];

      allResultsHTML = flights.length
        ? renderFlightCards(flights, "Multi-City Itinerary")
        : "<p>No multi-city flights found.</p>";

    } else if (type === "2") {
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
      // Two one-way requests for round-trip
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

function renderFlightCards(flights, heading = "") {
  if (!flights.length) return "";
  return `
    <h2 class="text-xl font-semibold my-4">${heading}</h2>
    ${flights.map((flight) => {
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
