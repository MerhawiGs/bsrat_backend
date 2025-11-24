const express = require('express');
const router = express.Router();
const { WorkingHours, BreakTime, BlackoutDate, RecurringPattern } = require('../models/availabilitySchedule');
const { checkAvailability, getAvailableSlots, getAvailableDates } = require('../services/availabilityService');

// ============================================
// WORKING HOURS ROUTES
// ============================================

// Get all working hours
router.get('/working-hours', async (req, res) => {
    try {
        const hours = await WorkingHours.find().sort({ dayOfWeek: 1 });
        return res.status(200).json({ workingHours: hours });
    } catch (err) {
        console.error('Failed to fetch working hours:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Create or update working hours for a specific day
router.post('/working-hours', async (req, res) => {
    try {
        const { dayOfWeek, dayName, enabled, startTime, endTime } = req.body;

        // Validate required fields
        if (dayOfWeek === undefined || !dayName || !startTime || !endTime) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Check if entry already exists
        const existing = await WorkingHours.findOne({ dayOfWeek });
        
        if (existing) {
            // Update existing
            existing.dayName = dayName;
            existing.enabled = enabled !== undefined ? enabled : true;
            existing.startTime = startTime;
            existing.endTime = endTime;
            await existing.save();
            return res.status(200).json({ 
                message: 'Working hours updated successfully', 
                workingHours: existing 
            });
        } else {
            // Create new
            const hours = new WorkingHours({
                dayOfWeek,
                dayName,
                enabled: enabled !== undefined ? enabled : true,
                startTime,
                endTime,
            });
            await hours.save();
            return res.status(201).json({ 
                message: 'Working hours created successfully', 
                workingHours: hours 
            });
        }
    } catch (err) {
        console.error('Failed to save working hours:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Update working hours by day
router.put('/working-hours/:dayOfWeek', async (req, res) => {
    try {
        const { dayOfWeek } = req.params;
        const { dayName, enabled, startTime, endTime } = req.body;

        const updateData = {};
        if (dayName) updateData.dayName = dayName;
        if (enabled !== undefined) updateData.enabled = enabled;
        if (startTime) updateData.startTime = startTime;
        if (endTime) updateData.endTime = endTime;

        const hours = await WorkingHours.findOneAndUpdate(
            { dayOfWeek: parseInt(dayOfWeek) },
            updateData,
            { new: true, runValidators: true }
        );

        if (!hours) {
            return res.status(404).json({ error: 'Working hours not found for this day' });
        }

        return res.status(200).json({ 
            message: 'Working hours updated successfully', 
            workingHours: hours 
        });
    } catch (err) {
        console.error('Failed to update working hours:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete working hours by day
router.delete('/working-hours/:dayOfWeek', async (req, res) => {
    try {
        const { dayOfWeek } = req.params;
        const hours = await WorkingHours.findOneAndDelete({ dayOfWeek: parseInt(dayOfWeek) });

        if (!hours) {
            return res.status(404).json({ error: 'Working hours not found for this day' });
        }

        return res.status(200).json({ 
            message: 'Working hours deleted successfully', 
            workingHours: hours 
        });
    } catch (err) {
        console.error('Failed to delete working hours:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// BREAK TIMES ROUTES
// ============================================

// Get all break times
router.get('/breaks', async (req, res) => {
    try {
        const breaks = await BreakTime.find().sort({ startTime: 1 });
        return res.status(200).json({ breaks });
    } catch (err) {
        console.error('Failed to fetch break times:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new break time
router.post('/breaks', async (req, res) => {
    try {
        const { name, startTime, endTime, daysOfWeek, isActive } = req.body;

        if (!name || !startTime || !endTime || !daysOfWeek || daysOfWeek.length === 0) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const breakTime = new BreakTime({
            name,
            startTime,
            endTime,
            daysOfWeek,
            isActive: isActive !== undefined ? isActive : true,
        });

        await breakTime.save();
        return res.status(201).json({ 
            message: 'Break time created successfully', 
            break: breakTime 
        });
    } catch (err) {
        console.error('Failed to create break time:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a break time
router.put('/breaks/:id', async (req, res) => {
    try {
        const { name, startTime, endTime, daysOfWeek, isActive } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (startTime) updateData.startTime = startTime;
        if (endTime) updateData.endTime = endTime;
        if (daysOfWeek) updateData.daysOfWeek = daysOfWeek;
        if (isActive !== undefined) updateData.isActive = isActive;

        const breakTime = await BreakTime.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!breakTime) {
            return res.status(404).json({ error: 'Break time not found' });
        }

        return res.status(200).json({ 
            message: 'Break time updated successfully', 
            break: breakTime 
        });
    } catch (err) {
        console.error('Failed to update break time:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid break time ID' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a break time
router.delete('/breaks/:id', async (req, res) => {
    try {
        const breakTime = await BreakTime.findByIdAndDelete(req.params.id);

        if (!breakTime) {
            return res.status(404).json({ error: 'Break time not found' });
        }

        return res.status(200).json({ 
            message: 'Break time deleted successfully', 
            break: breakTime 
        });
    } catch (err) {
        console.error('Failed to delete break time:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid break time ID' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// BLACKOUT DATES ROUTES
// ============================================

// Get all blackout dates
router.get('/blackout-dates', async (req, res) => {
    try {
        const { active, upcoming } = req.query;
        let query = {};

        if (active === 'true') {
            query.isActive = true;
        }

        if (upcoming === 'true') {
            query.endDate = { $gte: new Date() };
        }

        const blackoutDates = await BlackoutDate.find(query).sort({ startDate: 1 });
        return res.status(200).json({ blackoutDates });
    } catch (err) {
        console.error('Failed to fetch blackout dates:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new blackout date
router.post('/blackout-dates', async (req, res) => {
    try {
        const { name, startDate, endDate, reason, isActive } = req.body;

        if (!name || !startDate || !endDate) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const blackout = new BlackoutDate({
            name,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            reason: reason || '',
            isActive: isActive !== undefined ? isActive : true,
        });

        await blackout.save();
        return res.status(201).json({ 
            message: 'Blackout date created successfully', 
            blackoutDate: blackout 
        });
    } catch (err) {
        console.error('Failed to create blackout date:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a blackout date
router.put('/blackout-dates/:id', async (req, res) => {
    try {
        const { name, startDate, endDate, reason, isActive } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (startDate) updateData.startDate = new Date(startDate);
        if (endDate) updateData.endDate = new Date(endDate);
        if (reason !== undefined) updateData.reason = reason;
        if (isActive !== undefined) updateData.isActive = isActive;

        const blackout = await BlackoutDate.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!blackout) {
            return res.status(404).json({ error: 'Blackout date not found' });
        }

        return res.status(200).json({ 
            message: 'Blackout date updated successfully', 
            blackoutDate: blackout 
        });
    } catch (err) {
        console.error('Failed to update blackout date:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid blackout date ID' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a blackout date
router.delete('/blackout-dates/:id', async (req, res) => {
    try {
        const blackout = await BlackoutDate.findByIdAndDelete(req.params.id);

        if (!blackout) {
            return res.status(404).json({ error: 'Blackout date not found' });
        }

        return res.status(200).json({ 
            message: 'Blackout date deleted successfully', 
            blackoutDate: blackout 
        });
    } catch (err) {
        console.error('Failed to delete blackout date:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid blackout date ID' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// RECURRING PATTERNS ROUTES
// ============================================

// Get all recurring patterns
router.get('/recurring-patterns', async (req, res) => {
    try {
        const { active } = req.query;
        let query = {};

        if (active === 'true') {
            query.isActive = true;
        }

        const patterns = await RecurringPattern.find(query).sort({ createdAt: -1 });
        return res.status(200).json({ patterns });
    } catch (err) {
        console.error('Failed to fetch recurring patterns:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Create a new recurring pattern
router.post('/recurring-patterns', async (req, res) => {
    try {
        const { 
            name, description, patternType, daysOfWeek, daysOfMonth, 
            startTime, endTime, validFrom, validTo, isActive 
        } = req.body;

        if (!name || !patternType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const pattern = new RecurringPattern({
            name,
            description: description || '',
            patternType,
            daysOfWeek,
            daysOfMonth,
            startTime,
            endTime,
            validFrom: validFrom ? new Date(validFrom) : undefined,
            validTo: validTo ? new Date(validTo) : undefined,
            isActive: isActive !== undefined ? isActive : true,
        });

        await pattern.save();
        return res.status(201).json({ 
            message: 'Recurring pattern created successfully', 
            pattern 
        });
    } catch (err) {
        console.error('Failed to create recurring pattern:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Update a recurring pattern
router.put('/recurring-patterns/:id', async (req, res) => {
    try {
        const { 
            name, description, patternType, daysOfWeek, daysOfMonth,
            startTime, endTime, validFrom, validTo, isActive 
        } = req.body;

        const updateData = {};
        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (patternType) updateData.patternType = patternType;
        if (daysOfWeek) updateData.daysOfWeek = daysOfWeek;
        if (daysOfMonth) updateData.daysOfMonth = daysOfMonth;
        if (startTime) updateData.startTime = startTime;
        if (endTime) updateData.endTime = endTime;
        if (validFrom) updateData.validFrom = new Date(validFrom);
        if (validTo) updateData.validTo = new Date(validTo);
        if (isActive !== undefined) updateData.isActive = isActive;

        const pattern = await RecurringPattern.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!pattern) {
            return res.status(404).json({ error: 'Recurring pattern not found' });
        }

        return res.status(200).json({ 
            message: 'Recurring pattern updated successfully', 
            pattern 
        });
    } catch (err) {
        console.error('Failed to update recurring pattern:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid pattern ID' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete a recurring pattern
router.delete('/recurring-patterns/:id', async (req, res) => {
    try {
        const pattern = await RecurringPattern.findByIdAndDelete(req.params.id);

        if (!pattern) {
            return res.status(404).json({ error: 'Recurring pattern not found' });
        }

        return res.status(200).json({ 
            message: 'Recurring pattern deleted successfully', 
            pattern 
        });
    } catch (err) {
        console.error('Failed to delete recurring pattern:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid pattern ID' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================
// AVAILABILITY CHECK ROUTES
// ============================================

// Check if a specific date/time is available
router.post('/check', async (req, res) => {
    try {
        const { datetime } = req.body;

        if (!datetime) {
            return res.status(400).json({ error: 'Datetime is required' });
        }

        const result = await checkAvailability(new Date(datetime));
        return res.status(200).json(result);
    } catch (err) {
        console.error('Failed to check availability:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get available time slots for a specific date
router.get('/slots', async (req, res) => {
    try {
        const { date, duration } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        const checkDate = new Date(date);
        const slotDuration = duration ? parseInt(duration) : 30;

        const slots = await getAvailableSlots(checkDate, slotDuration);
        return res.status(200).json({ date, slots });
    } catch (err) {
        console.error('Failed to get available slots:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get available dates for the next N days
router.get('/dates', async (req, res) => {
    try {
        const { days } = req.query;
        const numDays = days ? parseInt(days) : 30;

        const dates = await getAvailableDates(numDays);
        return res.status(200).json({ dates });
    } catch (err) {
        console.error('Failed to get available dates:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
