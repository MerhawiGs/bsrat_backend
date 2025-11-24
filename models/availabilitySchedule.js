const mongoose = require('mongoose');

// Schema for working hours (weekly schedule)
const workingHoursSchema = new mongoose.Schema(
    {
        dayOfWeek: {
            type: Number,
            required: true,
            min: 0,
            max: 6,
            // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
        },
        dayName: {
            type: String,
            required: true,
            enum: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        },
        enabled: {
            type: Boolean,
            default: true,
        },
        startTime: {
            type: String,
            required: true,
            // Format: "HH:MM" (24-hour format, e.g., "09:00")
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        endTime: {
            type: String,
            required: true,
            // Format: "HH:MM" (24-hour format, e.g., "17:00")
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
    },
    { timestamps: true }
);

// Schema for break times
const breakTimeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Break name is required'],
            trim: true,
        },
        startTime: {
            type: String,
            required: true,
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        endTime: {
            type: String,
            required: true,
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        daysOfWeek: {
            type: [Number],
            required: true,
            // Array of day numbers, e.g., [1, 2, 3, 4, 5] for Monday-Friday
            validate: {
                validator: function(arr) {
                    return arr.length > 0 && arr.every(day => day >= 0 && day <= 6);
                },
                message: 'Days of week must be numbers between 0 and 6',
            },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Schema for blackout dates
const blackoutDateSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Blackout name is required'],
            trim: true,
        },
        startDate: {
            type: Date,
            required: [true, 'Start date is required'],
        },
        endDate: {
            type: Date,
            required: [true, 'End date is required'],
        },
        reason: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Validation: endDate must be >= startDate
blackoutDateSchema.pre('validate', function (next) {
    if (this.endDate < this.startDate) {
        return next(new Error('End date must be on or after start date'));
    }
    next();
});

// Schema for recurring patterns
const recurringPatternSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Pattern name is required'],
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        patternType: {
            type: String,
            enum: ['weekly', 'monthly', 'custom'],
            default: 'weekly',
        },
        // For weekly patterns
        daysOfWeek: {
            type: [Number],
            validate: {
                validator: function(arr) {
                    if (!arr || arr.length === 0) return true; // Optional
                    return arr.every(day => day >= 0 && day <= 6);
                },
                message: 'Days of week must be numbers between 0 and 6',
            },
        },
        // For monthly patterns
        daysOfMonth: {
            type: [Number],
            validate: {
                validator: function(arr) {
                    if (!arr || arr.length === 0) return true; // Optional
                    return arr.every(day => day >= 1 && day <= 31);
                },
                message: 'Days of month must be numbers between 1 and 31',
            },
        },
        // Time overrides for this pattern
        startTime: {
            type: String,
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        endTime: {
            type: String,
            match: /^([01]\d|2[0-3]):([0-5]\d)$/,
        },
        // Date range for when this pattern applies
        validFrom: {
            type: Date,
        },
        validTo: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Create indexes
workingHoursSchema.index({ dayOfWeek: 1 });
breakTimeSchema.index({ daysOfWeek: 1 });
blackoutDateSchema.index({ startDate: 1, endDate: 1 });
recurringPatternSchema.index({ validFrom: 1, validTo: 1 });

// Create models
const WorkingHours = mongoose.model('WorkingHours', workingHoursSchema);
const BreakTime = mongoose.model('BreakTime', breakTimeSchema);
const BlackoutDate = mongoose.model('BlackoutDate', blackoutDateSchema);
const RecurringPattern = mongoose.model('RecurringPattern', recurringPatternSchema);

module.exports = {
    WorkingHours,
    BreakTime,
    BlackoutDate,
    RecurringPattern,
};
