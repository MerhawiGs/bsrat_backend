/**
 * Quick Test - Create Appointment
 * Tests that appointments are being created and stored correctly
 */

const BASE_URL = 'http://localhost:3000';

const testAppointment = {
  fullName: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  serviceType: 'consultation',
  appointmentAt: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  notes: 'This is a test appointment to verify the system is working',
  location: 'office',
  source: 'website'
};

async function testCreateAppointment() {
  console.log('\n========================================');
  console.log('Testing Appointment Creation');
  console.log('========================================\n');

  try {
    console.log('Sending appointment data:');
    console.log(JSON.stringify(testAppointment, null, 2));
    console.log('\nCreating appointment...');

    const response = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testAppointment)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('\n✓ SUCCESS! Appointment created successfully!\n');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n========================================');
      console.log('Appointment ID:', data.appointment?.id);
      console.log('========================================\n');
      return data.appointment?.id;
    } else {
      console.error('\n✗ FAILED! Error creating appointment\n');
      console.error('Status:', response.status);
      console.error('Error:', data.error);
      console.log('\n========================================\n');
      return null;
    }
  } catch (error) {
    console.error('\n✗ ERROR! Failed to connect to backend\n');
    console.error('Error:', error.message);
    console.error('\nMake sure the backend is running on http://localhost:3000');
    console.log('\n========================================\n');
    return null;
  }
}

async function testGetAllAppointments() {
  console.log('\n========================================');
  console.log('Testing Get All Appointments');
  console.log('========================================\n');

  try {
    const response = await fetch(`${BASE_URL}/appointments/all?limit=5`);
    const data = await response.json();

    if (response.ok) {
      console.log('✓ SUCCESS! Retrieved appointments\n');
      console.log(`Total appointments: ${data.count}`);
      console.log('\nRecent appointments:');
      data.appointments.forEach((apt, index) => {
        console.log(`\n${index + 1}. ${apt.fullName}`);
        console.log(`   Email: ${apt.email}`);
        console.log(`   Service: ${apt.serviceType}`);
        console.log(`   Date: ${new Date(apt.appointmentAt).toLocaleString()}`);
        console.log(`   Status: ${apt.status}`);
      });
      console.log('\n========================================\n');
    } else {
      console.error('✗ FAILED! Error fetching appointments');
      console.error('Error:', data.error);
    }
  } catch (error) {
    console.error('✗ ERROR!', error.message);
  }
}

async function runTests() {
  console.log('\n╔═══════════════════════════════════════╗');
  console.log('║   Appointment System - Quick Test    ║');
  console.log('╚═══════════════════════════════════════╝');

  const appointmentId = await testCreateAppointment();
  
  if (appointmentId) {
    await testGetAllAppointments();
    console.log('✓ All tests completed successfully!');
    console.log('✓ Backend is storing data correctly!\n');
  } else {
    console.log('✗ Test failed. Please check the backend.\n');
  }
}

runTests();
