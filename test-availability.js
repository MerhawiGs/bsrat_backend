const mongoose = require('mongoose');
const { WorkingHours, BreakTime, BlackoutDate, RecurringPattern } = require('./models/availabilitySchedule');
const Appointment = require('./models/appointment');
const { checkAvailability, getAvailableSlots } = require('./services/availabilityService');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bisrat-travel-agency';

async function runTests() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✓ Connected to MongoDB\n');

        // Test 1: Create working hours
        console.log('Test 1: Creating working hours...');
        const mondayHours = await WorkingHours.findOneAndUpdate(
            { dayOfWeek: 1 },
            {
                dayOfWeek: 1,
                dayName: 'Monday',
                enabled: true,
                startTime: '09:00',
                endTime: '17:00'
            },
            { upsert: true, new: true }
        );
        console.log('✓ Created/Updated Monday hours:', mondayHours);

        // Test 2: Create a break time
        console.log('\nTest 2: Creating break time...');
        const lunchBreak = await BreakTime.create({
            name: 'Lunch Break',
            startTime: '12:00',
            endTime: '13:00',
            daysOfWeek: [1, 2, 3, 4, 5] // Mon-Fri
        });
        console.log('✓ Created lunch break:', lunchBreak);

        // Test 3: Create a blackout date
        console.log('\nTest 3: Creating blackout date...');
        const christmas = await BlackoutDate.create({
            name: 'Christmas Holiday',
            startDate: new Date('2025-12-25'),
            endDate: new Date('2025-12-26'),
            reason: 'Office closed for Christmas'
        });
        console.log('✓ Created blackout date:', christmas);

        // Test 4: Check availability for a valid time
        console.log('\nTest 4: Checking availability for valid time (Mon 10:00)...');
        const validDate = new Date('2025-12-01T10:00:00Z');
        const validCheck = await checkAvailability(validDate);
        console.log('Result:', validCheck);
        console.log(validCheck.available ? '✓ Correctly marked as available' : '✗ ERROR: Should be available');

        // Test 5: Check availability during break time
        console.log('\nTest 5: Checking availability during break (Mon 12:30)...');
        const breakDate = new Date('2025-12-01T12:30:00Z');
        const breakCheck = await checkAvailability(breakDate);
        console.log('Result:', breakCheck);
        console.log(!breakCheck.available ? '✓ Correctly blocked break time' : '✗ ERROR: Should be blocked');

        // Test 6: Check availability on blackout date
        console.log('\nTest 6: Checking availability on Christmas...');
        const blackoutDate = new Date('2025-12-25T10:00:00Z');
        const blackoutCheck = await checkAvailability(blackoutDate);
        console.log('Result:', blackoutCheck);
        console.log(!blackoutCheck.available ? '✓ Correctly blocked blackout date' : '✗ ERROR: Should be blocked');

        // Test 7: Get available slots for a day
        console.log('\nTest 7: Getting available slots for Monday...');
        const slotDate = new Date('2025-12-01');
        const slots = await getAvailableSlots(slotDate, 30);
        console.log(`✓ Found ${slots.length} time slots`);
        const availableSlots = slots.filter(s => s.available);
        const bookedSlots = slots.filter(s => !s.available);
        console.log(`  - Available: ${availableSlots.length}`);
        console.log(`  - Unavailable: ${bookedSlots.length}`);
        if (slots.length > 0) {
            console.log('  - Sample slots:', slots.slice(0, 5).map(s => `${s.time} (${s.available ? 'available' : 'blocked'})`));
        }

        // Test 8: Create an appointment
        console.log('\nTest 8: Creating test appointment...');
        const testAppointment = await Appointment.create({
            fullName: 'Test User',
            email: 'test@example.com',
            phone: '+1234567890',
            appointmentAt: new Date('2025-12-01T14:00:00Z'),
            serviceType: 'consultation'
        });
        console.log('✓ Created appointment:', testAppointment._id);

        // Test 9: Check availability for the booked slot
        console.log('\nTest 9: Checking availability for booked slot (Mon 14:00)...');
        const bookedSlotDate = new Date('2025-12-01T14:00:00Z');
        const bookedCheck = await checkAvailability(bookedSlotDate);
        console.log('Result:', bookedCheck);
        console.log(!bookedCheck.available ? '✓ Correctly blocked booked slot' : '✗ ERROR: Should be blocked');

        // Cleanup
        console.log('\n--- Cleanup ---');
        await BreakTime.deleteOne({ _id: lunchBreak._id });
        await BlackoutDate.deleteOne({ _id: christmas._id });
        await Appointment.deleteOne({ _id: testAppointment._id });
        console.log('✓ Cleaned up test data');

        console.log('\n========================================');
        console.log('All tests completed successfully! ✓');
        console.log('========================================\n');

        await mongoose.connection.close();
        console.log('Database connection closed.');
    } catch (error) {
        console.error('\n✗ Test failed:', error);
        console.error('Error details:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

runTests();
