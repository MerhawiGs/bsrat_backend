const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bisrat-travel-agency';

const defaultSuperAdmin = {
    email: 'admin@bisrattravel.com',
    userName: 'superadmin',
    password: 'Admin@123',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'superadmin',
    isActive: true
};

async function createSuperAdmin() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGO_URI);
        console.log('✓ Connected to MongoDB\n');

        // Check if superadmin already exists
        const existingSuperAdmin = await User.findOne({ role: 'superadmin' });
        
        if (existingSuperAdmin && !process.argv.includes('--force')) {
            console.log('⚠ Superadmin already exists:');
            console.log(`   Email: ${existingSuperAdmin.email}`);
            console.log(`   Username: ${existingSuperAdmin.userName}`);
            console.log('\nUse --force to create anyway (not recommended).');
            await mongoose.connection.close();
            return;
        }

        // Check if email is already used
        const existingEmail = await User.findOne({ email: defaultSuperAdmin.email });
        if (existingEmail) {
            console.log('⚠ Email already in use. Skipping...');
            await mongoose.connection.close();
            return;
        }

        console.log('Creating superadmin user...');
        const superAdmin = new User(defaultSuperAdmin);
        await superAdmin.save();

        console.log('\n════════════════════════════════════════');
        console.log('✓ Superadmin created successfully!');
        console.log('════════════════════════════════════════');
        console.log('\n📧 Login Credentials:');
        console.log(`   Email:    ${defaultSuperAdmin.email}`);
        console.log(`   Password: ${defaultSuperAdmin.password}`);
        console.log('\n⚠  IMPORTANT: Change the password after first login!');
        console.log('════════════════════════════════════════\n');

        await mongoose.connection.close();
        console.log('Database connection closed.');
    } catch (error) {
        console.error('\n✗ Error creating superadmin:', error);
        console.error('Error details:', error.message);
        await mongoose.connection.close();
        process.exit(1);
    }
}

createSuperAdmin();
