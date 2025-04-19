document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("searchForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // ✅ Prevent the default form reload

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
            <p>${f.departure_airport.name} → ${f.arrival_airport.name}</p>
            <p>Departs: ${f.departure_airport.time}, Arrives: ${f.arrival_airport.time}</p>
            <p>Duration: ${flight.total_duration} min | Price: £${flight.price}</p>
          </div>
        `;
      }).join("");
    } catch (err) {
      results.innerHTML = "<p>Error fetching flight data.</p>";
      console.error(err);
    }
  });
});
