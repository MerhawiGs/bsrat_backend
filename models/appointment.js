const mongoose = require('mongoose');

// Schema for in-person / virtual appointments at the travel agency
const appointmentSchema = new mongoose.Schema(
    {
        fullName: {
            type: String,
            required: [true, 'Visitor full name is required'],
            trim: true,
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            trim: true,
            lowercase: true,
            match: [/.+@.+\..+/, 'Please enter a valid email address'],
        },
        phone: {
            type: String,
            required: [true, 'Phone number is required'],
            trim: true,
        },
        // Single timestamp for the scheduled appointment (date + time)
        appointmentAt: {
            type: Date,
            required: [true, 'Appointment date and time are required'],
        },
        serviceType: {
            type: String,
            enum: [
                'consultation',
                'flight-booking',
                'hotel-booking',
                'visa-assistance',
                'group-booking',
                'other',
            ],
            default: 'consultation',
        },
        notes: {
            type: String,
            trim: true,
        },
        status: {
            type: String,
            enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'],
            default: 'scheduled',
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        location: {
            type: String,
            enum: ['office', 'online', 'phone'],
            default: 'office',
        },
        source: {
            type: String,
            enum: ['website', 'phone', 'walk-in', 'email', 'referral'],
            default: 'website',
        },
        remindersSent: {
            type: Number,
            default: 0,
            min: 0,
        },
        reminderDates: [Date],
        cancelledAt: Date,
        cancelledBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    { timestamps: true }
);

// Index appointmentAt to make queries for upcoming appointments efficient
appointmentSchema.index({ appointmentAt: 1 });

// Optional: ensure appointmentAt is not in the past when creating
appointmentSchema.pre('validate', function (next) {
    if (this.appointmentAt && this.isNew) {
        const now = new Date();
        if (this.appointmentAt < now) {
            return next(new Error('Appointment date/time must be in the future'));
        }
    }
    next();
});

const Appointment = mongoose.model('Appointment', appointmentSchema);

module.exports = Appointment;