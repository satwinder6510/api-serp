document.getElementById("searchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const params = new URLSearchParams();
  for (const el of form.elements) {
    if (el.name && el.value) {
      params.append(el.name, el.value);
    }
  }

  const results = document.getElementById("results");
  results.innerHTML = "Loading...";

  try {
    const res = await fetch(`/api/flights?${params.toString()}`);
    const data = await res.json();

    if (!data.best_flights || data.best_flights.length === 0) {
      results.innerHTML = "<p>No flights found.</p>";
      return;
    }

    results.innerHTML = data.best_flights.map((flight) => {
      const f = flight.flights[0];
      return `
        <div class="p-4 border rounded shadow">
          <p><strong>${f.airline}</strong> (${f.flight_number}) - ${f.airplane}</p>
          <p>${f.departure_airport.name} (${f.departure_airport.id}) → ${f.arrival_airport.name} (${f.arrival_airport.id})</p>
          <p>Departs: ${f.departure_airport.time}, Arrives: ${f.arrival_airport.time}</p>
          <p>Duration: ${flight.total_duration} min | Price: £${flight.price}</p>
          <p>Emissions: ${flight.carbon_emissions?.this_flight / 1000 ?? "N/A"} kg</p>
        </div>
      `;
    }).join("");
  } catch (err) {
    results.innerHTML = "<p>Error fetching flight data.</p>";
    console.error(err);
  }
});
