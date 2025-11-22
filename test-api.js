/**
 * Simple API Test Script
 * Run with: node test-api.js
 */

const BASE_URL = 'http://localhost:3000';

// Test data
const testAppointment = {
  fullName: 'Test User',
  email: 'test@example.com',
  phone: '+1234567890',
  serviceType: 'consultation',
  appointmentAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  notes: 'This is a test appointment',
  location: 'office',
  source: 'website'
};

// Colored console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset} ${msg}`),
  test: (msg) => console.log(`${colors.blue}➜${colors.reset} ${msg}`)
};

async function testEndpoint(name, url, options = {}) {
  try {
    log.test(`Testing ${name}...`);
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (response.ok) {
      log.success(`${name} - Status: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
      return { success: true, data };
    } else {
      log.error(`${name} - Status: ${response.status}`);
      console.log(JSON.stringify(data, null, 2));
      return { success: false, data };
    }
  } catch (error) {
    log.error(`${name} - ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(50));
  console.log('Bisrat Travel Agency API Test Suite');
  console.log('='.repeat(50) + '\n');

  let createdAppointmentId;

  // Test 1: Health Check
  await testEndpoint(
    'Health Check',
    `${BASE_URL}/health`
  );
  console.log('');

  // Test 2: Create Appointment
  const createResult = await testEndpoint(
    'Create Appointment',
    `${BASE_URL}/appointments`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testAppointment)
    }
  );
  
  if (createResult.success && createResult.data.appointment) {
    createdAppointmentId = createResult.data.appointment.id;
  }
  console.log('');

  // Test 3: Get All Appointments
  await testEndpoint(
    'Get All Appointments',
    `${BASE_URL}/appointments/all?limit=5`
  );
  console.log('');

  // Test 4: Get Upcoming Appointments
  await testEndpoint(
    'Get Upcoming Appointments',
    `${BASE_URL}/appointments/upcoming?days=7`
  );
  console.log('');

  // Test 5: Get Appointment Stats
  await testEndpoint(
    'Get Appointment Statistics',
    `${BASE_URL}/appointments/stats/summary`
  );
  console.log('');

  // Test 6: Get Single Appointment (if created)
  if (createdAppointmentId) {
    await testEndpoint(
      'Get Single Appointment',
      `${BASE_URL}/appointments/${createdAppointmentId}`
    );
    console.log('');

    // Test 7: Update Appointment
    await testEndpoint(
      'Update Appointment',
      `${BASE_URL}/appointments/${createdAppointmentId}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'confirmed',
          notes: 'Updated test appointment - confirmed'
        })
      }
    );
    console.log('');

    // Test 8: Delete Appointment
    log.info('Cleaning up test data...');
    await testEndpoint(
      'Delete Appointment',
      `${BASE_URL}/appointments/${createdAppointmentId}`,
      { method: 'DELETE' }
    );
    console.log('');
  }

  console.log('='.repeat(50));
  log.success('All tests completed!');
  console.log('='.repeat(50) + '\n');
}

// Check if server is running before testing
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    if (response.ok) {
      runTests();
    } else {
      log.error('Server is not responding correctly');
      process.exit(1);
    }
  } catch (error) {
    log.error(`Cannot connect to server at ${BASE_URL}`);
    log.info('Make sure the server is running with: npm start');
    process.exit(1);
  }
}

checkServer();
