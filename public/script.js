document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const tripFields = document.getElementById("tripFields");
  const results = document.getElementById("results");
  let multiCityLegs = [0]; // default 1 leg

  // 🧠 Your renderTripFields and createLegInput functions go here (unchanged)
  // ...

  // 🛩️ Submit handler goes here
  form.addEventListener("submit", async (e) => {
    // (Insert the full block from my previous message here)
  });

  // 🔁 Handle trip type switching
  form.type.forEach((radio) =>
    radio.addEventListener("change", (e) => renderTripFields(e.target.value))
  );

  // 👇 Initial state
  renderTripFields("2");

  // 💡 Helper to create flight card UI
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
});
