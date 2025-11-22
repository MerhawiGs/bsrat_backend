const express = require('express');
const router = express.Router();
const database = require('../database/database.js');
const Appointment = require('../models/appointment');

router.get('/', (req, res) => {
    res.json("Welcome to the Appointment Service!");
});

// Create a new appointment (guest-facing)
// Accepts: fullName, email, phone, serviceType, appointmentAt, notes, location, source
router.post('/', async (req, res) => {
    try {
        const { fullName, email, phone, serviceType, appointmentAt, notes, location, source } = req.body;

        // Validate required fields
        if (!fullName || !fullName.trim()) {
            return res.status(400).json({ error: 'Full name is required' });
        }
        if (!email || !email.trim()) {
            return res.status(400).json({ error: 'Email is required' });
        }
        if (!phone || !phone.trim()) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        if (!appointmentAt) {
            return res.status(400).json({ error: 'Appointment date and time are required' });
        }

        const appointment = new Appointment({
            fullName: fullName.trim(),
            email: email.trim().toLowerCase(),
            phone: phone.trim(),
            appointmentAt: new Date(appointmentAt),
            serviceType: serviceType || 'consultation',
            notes: notes ? notes.trim() : '',
            location: location || 'office',
            source: source || 'website',
            status: 'scheduled'
        });

        await appointment.save();
        return res.status(201).json({ 
            message: 'Appointment request submitted successfully', 
            appointment: {
                id: appointment._id,
                fullName: appointment.fullName,
                email: appointment.email,
                phone: appointment.phone,
                appointmentAt: appointment.appointmentAt,
                serviceType: appointment.serviceType,
                status: appointment.status
            }
        });
    } catch (err) {
        console.error('Failed to create appointment:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all appointments (admin-facing)
router.get('/all', async (req, res) => {
    try {
        const { status, from, to, limit = 100 } = req.query;
        
        let query = {};
        
        // Filter by status if provided
        if (status) {
            query.status = status;
        }
        
        // Filter by date range if provided
        if (from || to) {
            query.appointmentAt = {};
            if (from) query.appointmentAt.$gte = new Date(from);
            if (to) query.appointmentAt.$lte = new Date(to);
        }
        
        const appointments = await Appointment.find(query)
            .sort({ appointmentAt: 1 })
            .limit(parseInt(limit));
            
        return res.status(200).json({ 
            count: appointments.length,
            appointments 
        });
    } catch (err) {
        console.error('Failed to fetch appointments:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get upcoming appointments (admin dashboard)
router.get('/upcoming', async (req, res) => {
    try {
        const { days = 7, limit = 20 } = req.query;
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + parseInt(days));
        
        const appointments = await Appointment.find({
            appointmentAt: { $gte: now, $lte: futureDate },
            status: { $in: ['scheduled', 'confirmed'] }
        })
            .sort({ appointmentAt: 1 })
            .limit(parseInt(limit));
            
        return res.status(200).json({ 
            count: appointments.length,
            appointments 
        });
    } catch (err) {
        console.error('Failed to fetch upcoming appointments:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single appointment by ID
router.get('/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        return res.status(200).json({ appointment });
    } catch (err) {
        console.error('Failed to fetch appointment:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid appointment ID' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Update appointment (admin-facing)
router.put('/:id', async (req, res) => {
    try {
        const { status, notes, appointmentAt, serviceType, location, assignedTo } = req.body;
        
        const updateData = {};
        if (status) updateData.status = status;
        if (notes !== undefined) updateData.notes = notes;
        if (appointmentAt) updateData.appointmentAt = new Date(appointmentAt);
        if (serviceType) updateData.serviceType = serviceType;
        if (location) updateData.location = location;
        if (assignedTo) updateData.assignedTo = assignedTo;
        
        // If cancelling, set cancelledAt
        if (status === 'cancelled') {
            updateData.cancelledAt = new Date();
        }
        
        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        return res.status(200).json({ 
            message: 'Appointment updated successfully',
            appointment 
        });
    } catch (err) {
        console.error('Failed to update appointment:', err);
        if (err.name === 'ValidationError') {
            return res.status(400).json({ error: err.message });
        }
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid appointment ID' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete appointment (admin-facing)
router.delete('/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndDelete(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({ error: 'Appointment not found' });
        }
        
        return res.status(200).json({ 
            message: 'Appointment deleted successfully',
            appointment 
        });
    } catch (err) {
        console.error('Failed to delete appointment:', err);
        if (err.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid appointment ID' });
        }
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Get appointment statistics (admin dashboard)
router.get('/stats/summary', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const weekFromNow = new Date(today);
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        
        const [total, todayCount, upcomingWeek, byStatus] = await Promise.all([
            Appointment.countDocuments(),
            Appointment.countDocuments({ 
                appointmentAt: { $gte: today, $lt: tomorrow } 
            }),
            Appointment.countDocuments({ 
                appointmentAt: { $gte: today, $lte: weekFromNow },
                status: { $in: ['scheduled', 'confirmed'] }
            }),
            Appointment.aggregate([
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ])
        ]);
        
        const statusCounts = {};
        byStatus.forEach(item => {
            statusCounts[item._id] = item.count;
        });
        
        return res.status(200).json({
            total,
            today: todayCount,
            upcomingWeek,
            byStatus: statusCounts
        });
    } catch (err) {
        console.error('Failed to fetch appointment stats:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;