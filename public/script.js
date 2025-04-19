document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const tripFields = document.getElementById("tripFields");
  let multiCityLegs = [];

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
      multiCityLegs = [0];
      tripFields.innerHTML = `
        <div id="multiCityContainer">${createLegInput(0)}</div>
        <button type="button" id="addLeg" class="text-sm text-blue-600 mt-2 underline">+ Add Leg</button>
      `;

      document.getElementById("addLeg").onclick = () => {
        const newIndex = multiCityLegs.length;
        multiCityLegs.push(newIndex);
        document.getElementById("multiCityContainer").insertAdjacentHTML("beforeend", createLegInput(newIndex));
      };
    }
  }

  const selectedType = form.querySelector('input[name="type"]:checked')?.value || "2";
  renderTripFields(selectedType);

  document.querySelectorAll('input[name="type"]').forEach(radio =>
    radio.addEventListener("change", e => renderTripFields(e.target.value))
  );

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const type = formData.get("type");

    const results = document.getElementById("results");
    results.innerHTML = "Loading...";

    let url = "/api/flights?";
    const params = new URLSearchParams();

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
      params.append("multi_city_json", JSON.stringify(multiCity)); // ✅ FIXED (no encodeURIComponent)
    } else {
      for (const [key, val] of formData.entries()) {
        params.append(key, val);
      }
    }

    url += params.toString();
    console.log("→ Fetching:", url); // Optional debug log

    try {
      const res = await fetch(url);
      const data = await res.json();
      const flights = data.best_flights?.length ? data.best_flights : data.other_flights;

      if (!flights || flights.length === 0) {
        results.innerHTML = "<p>No flights found.</p>";
        return;
      }

      results.innerHTML = flights.map((flight) => {
        const f = flight.flights[0];
        return `
          <div class="p-4 border rounded shadow">
            <p><strong>${f.airline}</strong> (${f.flight_number}) - ${f.airplane || "–"}</p>
            <p>${f.departure_airport.name} → ${f.arrival_airport.name}</p>
            <p>Departs: ${f.departure_airport.time}, Arrives: ${f.arrival_airport.time}</p>
            <p>Duration: ${flight.total_duration} min | Price: £${flight.price}</p>
          </div>
        `;
      }).join("");
    } catch (err) {
      results.innerHTML = "<p class='text-red-500'>Error fetching flight data.</p>";
      console.error("Fetch error:", err);
    }
  });
});
