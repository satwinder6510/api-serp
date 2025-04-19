form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const formData = new FormData(form);
  const type = formData.get("type");

  const results = document.getElementById("results");
  results.innerHTML = "Loading...";

  let url = "/api/flights?";
  const params = new URLSearchParams();

  // Common flags for all trip types
  params.append("deep_search", "true");
  params.append("show_hidden", "true");
  params.append("gl", "UK");
  params.append("hl", "EN");
  params.append("currency", "GBP");

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
    params.append("type", "3");
    params.append("multi_city_json", JSON.stringify(multiCity));
  } else {
    for (const [key, val] of formData.entries()) {
      params.append(key, val);
    }
  }

  url += params.toString();
  console.log("→ Fetching:", url);

  try {
    const res = await fetch(url);

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    console.log("→ Received:", data);

    const flights = data.best_flights?.length
      ? data.best_flights
      : data.other_flights?.length
        ? data.other_flights
        : [];

    if (flights.length === 0) {
      results.innerHTML = "<p class='text-gray-600'>No flights found for the selected route and dates.</p>";
      return;
    }

    results.innerHTML = flights.map((flight) => {
      const f = flight.flights[0];
      return `
        <div class="p-4 border rounded shadow mb-4">
          <p><strong>${f.airline}</strong> (${f.flight_number}) - ${f.airplane || "–"}</p>
          <p>${f.departure_airport.name} → ${f.arrival_airport.name}</p>
          <p>Departs: ${f.departure_airport.time}, Arrives: ${f.arrival_airport.time}</p>
          <p>Duration: ${flight.total_duration} min | Price: £${flight.price}</p>
        </div>
      `;
    }).join("");
  } catch (err) {
    results.innerHTML = "<p class='text-red-500'>Error fetching flight data.</p>";
    console.error("✖ Fetch failed:", err);
  }
});
