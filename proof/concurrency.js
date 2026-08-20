const axios = require('axios');

async function testConcurrency() {
  console.log("Starting Concurrency Proof...");

  const BASE_URL_1 = 'http://localhost:3001';
  const BASE_URL_2 = 'http://localhost:3002'; // Second server instance

  // Assume an event with capacity 50 is created, and we have an organizer token
  // For the sake of the proof script, we will just output the theoretical requests
  // In a real execution, you would first create the event and attendees.
  
  console.log("1. Duplicate Check-in Test (Same QR Token)");
  const fakeToken = "dummy-token"; // Assume this is a valid token
  const checkInPromises = [];
  
  // Fire 100 concurrent requests across both servers
  for (let i = 0; i < 100; i++) {
    const url = i % 2 === 0 ? BASE_URL_1 : BASE_URL_2;
    checkInPromises.push(
      axios.post(`${url}/api/checkin/scan`, {
        qr_token: fakeToken,
        client_timestamp: new Date().toISOString()
      }, {
        headers: { Authorization: `Bearer org_token` },
        validateStatus: () => true
      })
    );
  }

  const checkInResponses = await Promise.all(checkInPromises);
  const checkInSuccesses = checkInResponses.filter(r => r.status === 200).length;
  const checkInRejections = checkInResponses.filter(r => r.status === 409).length;

  console.log(`Check-in Successes: ${checkInSuccesses} (Expected: 1)`);
  console.log(`Check-in Rejections (Already checked in): ${checkInRejections} (Expected: 99)`);

  console.log("\n2. Capacity Enforcement (Waitlist) Test");
  const eventId = 1; // Assume capacity 50
  const regPromises = [];

  // Fire 500 concurrent registration requests across both servers
  for (let i = 0; i < 500; i++) {
    const url = i % 2 === 0 ? BASE_URL_1 : BASE_URL_2;
    regPromises.push(
      axios.post(`${url}/api/registrations`, {
        event_id: eventId
      }, {
        headers: { Authorization: `Bearer attendee_token_${i}` },
        validateStatus: () => true
      })
    );
  }

  const regResponses = await Promise.all(regPromises);
  const regSuccesses = regResponses.filter(r => r.status === 201 && r.data.status === 'registered').length;
  const regWaitlisted = regResponses.filter(r => r.status === 201 && r.data.status === 'waitlisted').length;

  console.log(`Registration Successes (Registered): ${regSuccesses} (Expected: 50)`);
  console.log(`Registration Successes (Waitlisted): ${regWaitlisted} (Expected: 450)`);

  console.log("\nConcurrency Proof Complete.");
}

testConcurrency().catch(console.error);
