document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("searchForm");
  const tripFields = document.getElementById("tripFields");
  const results = document.getElementById("results");
  let multiCityLegs = [0];

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
        const flightLegs = [];
        for (const index of multiCityLegs) {
          const from = formData.get(`multi_departure_${index}`);
          const to = formData.get(`multi_arrival_${index}`);
          const date = formData.get(`multi_date_${index}`);
          if (from && to && date) {
            const params = new URLSearchParams({
              type: "2",
              departure_id: from,
              arrival_id: to,
              outbound_date: date,
              ...commonParams,
            });
            const res = await fetch(`/api/flights?${params.toString()}`);
            const data = await res.json();
            const flights = data.best_flights?.length ? data.best_flights : data.other_flights || [];
            flightLegs.push(flights);
          }
        }

        const combinations = cartesianProduct(flightLegs).map((combo) => {
          const totalPrice = combo.reduce((sum, f) => sum + (f.price || 0), 0);
          return { combo, totalPrice };
        });

        combinations.sort((a, b) => a.totalPrice - b.totalPrice);
        allResultsHTML = combinations.slice(0, 5).map((itinerary, i) => {
          return `
            <div class="p-4 border rounded shadow mb-6 bg-white">
              <h3 class="text-lg font-bold mb-2">Itinerary ${i + 1} - Total Price: £${itinerary.totalPrice}</h3>
              ${itinerary.combo.map(renderFlightCard).join("")}
            </div>
          `;
        }).join("");
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

        allResultsHTML = renderFlightCards(flights, "One-Way Flights");
      } else if (type === "1") {
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

  form.type.forEach((radio) =>
    radio.addEventListener("change", (e) => renderTripFields(e.target.value))
  );

  renderTripFields("2");
});

function renderFlightCard(flight) {
  const f = flight.flights[0];
  return `
    <div class="p-3 border mb-2 rounded">
      <p><strong>${f.airline}</strong> (${f.flight_number}) - ${f.airplane || "–"}</p>
      <p>${f.departure_airport.name} → ${f.arrival_airport.name}</p>
      <p>Departs: ${f.departure_airport.time}, Arrives: ${f.arrival_airport.time}</p>
      <p>Duration: ${flight.total_duration} min | Price: £${flight.price}</p>
    </div>
  `;
}

function renderFlightCards(flights, heading = "") {
  if (!flights.length) return "";
  return `
    <h2 class="text-xl font-semibold my-4">${heading}</h2>
    ${flights.map(renderFlightCard).join("")}
  `;
}

function cartesianProduct(arrays) {
  return arrays.reduce((acc, curr) => {
    const res = [];
    acc.forEach(a => {
      curr.forEach(b => res.push([...a, b]));
    });
    return res;
  }, [[]]);
}
