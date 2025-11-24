const mongoose = require('mongoose');
const { WorkingHours } = require('./models/availabilitySchedule');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bisrat-travel-agency';

const defaultWorkingHours = [
    { dayOfWeek: 1, dayName: 'Monday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 2, dayName: 'Tuesday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 3, dayName: 'Wednesday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 4, dayName: 'Thursday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 5, dayName: 'Friday', enabled: true, startTime: '09:00', endTime: '17:00' },
    { dayOfWeek: 6, dayName: 'Saturday', enabled: true, startTime: '10:00', endTime: '14:00' },
    { dayOfWeek: 0, dayName: 'Sunday', enabled: false, startTime: '09:00', endTime: '17:00' },
];

async function seedWorkingHours() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        console.log('Checking for existing working hours...');
        const existingCount = await WorkingHours.countDocuments();
        
        if (existingCount > 0) {
            console.log(`Found ${existingCount} existing working hours entries.`);
            console.log('Skipping seed. Use --force to override.');
            
            if (!process.argv.includes('--force')) {
                await mongoose.connection.close();
                return;
            }
            
            console.log('Clearing existing working hours...');
            await WorkingHours.deleteMany({});
        }

        console.log('Seeding default working hours...');
        await WorkingHours.insertMany(defaultWorkingHours);
        
        console.log('✓ Successfully seeded working hours!');
        console.log('\nDefault Schedule:');
        console.log('Monday - Friday: 9:00 AM - 5:00 PM');
        console.log('Saturday: 10:00 AM - 2:00 PM');
        console.log('Sunday: Closed');
        
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    } catch (error) {
        console.error('Error seeding working hours:', error);
        process.exit(1);
    }
}

seedWorkingHours();
