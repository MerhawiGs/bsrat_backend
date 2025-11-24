const { WorkingHours, BreakTime, BlackoutDate, RecurringPattern } = require('../models/availabilitySchedule');
const Appointment = require('../models/appointment');

/**
 * Check if a specific date/time is available for booking
 * @param {Date} requestedDateTime - The date and time to check
 * @returns {Promise<{available: boolean, reason?: string}>}
 */
async function checkAvailability(requestedDateTime) {
    const date = new Date(requestedDateTime);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const timeString = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    
    // 1. Check if the date is in the past
    const now = new Date();
    if (date < now) {
        return { available: false, reason: 'Cannot book appointments in the past' };
    }
    
    // 2. Check working hours for this day
    const workingHours = await WorkingHours.findOne({ dayOfWeek, enabled: true });
    if (!workingHours) {
        return { available: false, reason: 'Office is closed on this day' };
    }
    
    // Check if time is within working hours
    if (timeString < workingHours.startTime || timeString >= workingHours.endTime) {
        return { 
            available: false, 
            reason: `Outside working hours (${workingHours.startTime} - ${workingHours.endTime})` 
        };
    }
    
    // 3. Check blackout dates
    const blackout = await BlackoutDate.findOne({
        isActive: true,
        startDate: { $lte: date },
        endDate: { $gte: date },
    });
    if (blackout) {
        return { available: false, reason: `Office closed: ${blackout.name}` };
    }
    
    // 4. Check break times
    const breaks = await BreakTime.find({
        isActive: true,
        daysOfWeek: dayOfWeek,
    });
    
    for (const breakTime of breaks) {
        if (timeString >= breakTime.startTime && timeString < breakTime.endTime) {
            return { available: false, reason: `During break time: ${breakTime.name}` };
        }
    }
    
    // 5. Check recurring patterns that might override working hours
    const patterns = await RecurringPattern.find({
        isActive: true,
        $or: [
            { validFrom: { $exists: false } },
            { validFrom: { $lte: date } }
        ],
        $or: [
            { validTo: { $exists: false } },
            { validTo: { $gte: date } }
        ],
    });
    
    for (const pattern of patterns) {
        // Check if pattern applies to this date
        const applies = checkPatternApplies(pattern, date);
        if (applies && pattern.startTime && pattern.endTime) {
            // Pattern overrides normal hours
            if (timeString < pattern.startTime || timeString >= pattern.endTime) {
                return { 
                    available: false, 
                    reason: `Outside special hours for ${pattern.name}` 
                };
            }
        }
    }
    
    // 6. Check if slot is already booked
    const slotStart = new Date(date);
    const slotEnd = new Date(date);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30); // Assuming 30-minute slots
    
    const existingAppointment = await Appointment.findOne({
        appointmentAt: { $gte: slotStart, $lt: slotEnd },
        status: { $in: ['scheduled', 'confirmed'] }
    });
    
    if (existingAppointment) {
        return { available: false, reason: 'This time slot is already booked' };
    }
    
    return { available: true };
}

/**
 * Check if a recurring pattern applies to a given date
 */
function checkPatternApplies(pattern, date) {
    if (pattern.patternType === 'weekly' && pattern.daysOfWeek && pattern.daysOfWeek.length > 0) {
        return pattern.daysOfWeek.includes(date.getDay());
    }
    
    if (pattern.patternType === 'monthly' && pattern.daysOfMonth && pattern.daysOfMonth.length > 0) {
        return pattern.daysOfMonth.includes(date.getDate());
    }
    
    return false;
}

/**
 * Get all available time slots for a specific date
 * @param {Date} date - The date to get available slots for
 * @param {number} slotDuration - Duration of each slot in minutes (default: 30)
 * @returns {Promise<Array<{time: string, available: boolean}>>}
 */
async function getAvailableSlots(date, slotDuration = 30) {
    const dayOfWeek = date.getDay();
    const slots = [];
    
    // Get working hours
    const workingHours = await WorkingHours.findOne({ dayOfWeek, enabled: true });
    if (!workingHours) {
        return slots; // No working hours, return empty array
    }
    
    // Parse start and end times
    const [startHour, startMin] = workingHours.startTime.split(':').map(Number);
    const [endHour, endMin] = workingHours.endTime.split(':').map(Number);
    
    // Generate all possible slots
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    for (let minutes = startMinutes; minutes < endMinutes; minutes += slotDuration) {
        const hour = Math.floor(minutes / 60);
        const min = minutes % 60;
        const timeString = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
        
        // Create a date object for this slot
        const slotDate = new Date(date);
        slotDate.setHours(hour, min, 0, 0);
        
        // Check availability
        const { available } = await checkAvailability(slotDate);
        
        slots.push({
            time: timeString,
            datetime: slotDate.toISOString(),
            available,
        });
    }
    
    return slots;
}

/**
 * Get available dates for the next N days
 * @param {number} days - Number of days to check (default: 30)
 * @returns {Promise<Array<{date: string, hasAvailability: boolean}>>}
 */
async function getAvailableDates(days = 30) {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < days; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        
        const dayOfWeek = checkDate.getDay();
        
        // Quick check: is there working hours for this day?
        const workingHours = await WorkingHours.findOne({ dayOfWeek, enabled: true });
        
        // Quick check: is this a blackout date?
        const blackout = await BlackoutDate.findOne({
            isActive: true,
            startDate: { $lte: checkDate },
            endDate: { $gte: checkDate },
        });
        
        const hasAvailability = workingHours && !blackout;
        
        dates.push({
            date: checkDate.toISOString().split('T')[0],
            dayOfWeek,
            hasAvailability,
        });
    }
    
    return dates;
}

module.exports = {
    checkAvailability,
    getAvailableSlots,
    getAvailableDates,
};
