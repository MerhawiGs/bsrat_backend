const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { verifyToken, requireSuperAdmin } = require('../middleware/auth');

// All routes require authentication
router.use(verifyToken);

/**
 * GET /users
 * Get all users (superadmin only)
 */
router.get('/', requireSuperAdmin, async (req, res) => {
    try {
        const { role, isActive, search } = req.query;
        
        let query = {};
        
        if (role) {
            query.role = role;
        }
        
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }
        
        if (search) {
            query.$or = [
                { email: { $regex: search, $options: 'i' } },
                { userName: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } }
            ];
        }
        
        const users = await User.find(query)
            .select('-password')
            .populate('createdBy', 'userName email')
            .sort({ createdAt: -1 });
        
        return res.status(200).json({
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Get users error:', error);
        return res.status(500).json({ error: 'Failed to fetch users' });
    }
});

/**
 * GET /users/:id
 * Get user by ID (superadmin only)
 */
router.get('/:id', requireSuperAdmin, async (req, res) => {
    try {
        const user = await User.findById(req.params.id)
            .select('-password')
            .populate('createdBy', 'userName email');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        return res.status(200).json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        return res.status(500).json({ error: 'Failed to fetch user' });
    }
});

/**
 * POST /users
 * Create new user (superadmin only)
 */
router.post('/', requireSuperAdmin, async (req, res) => {
    try {
        const { email, userName, password, firstName, lastName, role } = req.body;
        
        // Validate required fields
        if (!email || !userName || !password) {
            return res.status(400).json({ error: 'Email, username, and password are required' });
        }
        
        // Check if email already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        // Create user
        const user = new User({
            email: email.toLowerCase(),
            userName,
            password,
            firstName,
            lastName,
            role: role || 'admin',
            createdBy: req.user.id
        });
        
        await user.save();
        
        // Return user without password
        const userResponse = await User.findById(user._id).select('-password');
        
        return res.status(201).json({
            message: 'User created successfully',
            user: userResponse
        });
    } catch (error) {
        console.error('Create user error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: 'Failed to create user' });
    }
});

/**
 * PUT /users/:id
 * Update user (superadmin only)
 */
router.put('/:id', requireSuperAdmin, async (req, res) => {
    try {
        const { userName, firstName, lastName, role, isActive, email } = req.body;
        
        const updateData = {};
        if (userName) updateData.userName = userName;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        if (role) updateData.role = role;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (email) updateData.email = email.toLowerCase();
        
        // Prevent user from deactivating themselves
        if (req.params.id === req.user.id.toString() && isActive === false) {
            return res.status(400).json({ error: 'Cannot deactivate your own account' });
        }
        
        // Prevent user from downgrading themselves from superadmin
        if (req.params.id === req.user.id.toString() && role && role !== 'superadmin') {
            return res.status(400).json({ error: 'Cannot change your own superadmin role' });
        }
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        return res.status(200).json({
            message: 'User updated successfully',
            user
        });
    } catch (error) {
        console.error('Update user error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Email already exists' });
        }
        return res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * PUT /users/:id/password
 * Reset user password (superadmin only)
 */
router.put('/:id/password', requireSuperAdmin, async (req, res) => {
    try {
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return res.status(400).json({ error: 'New password is required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }
        
        const user = await User.findById(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Update password (will be hashed by pre-save hook)
        user.password = newPassword;
        await user.save();
        
        return res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        return res.status(500).json({ error: 'Failed to reset password' });
    }
});

/**
 * DELETE /users/:id
 * Delete user (superadmin only)
 */
router.delete('/:id', requireSuperAdmin, async (req, res) => {
    try {
        // Prevent user from deleting themselves
        if (req.params.id === req.user.id.toString()) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        
        const user = await User.findByIdAndDelete(req.params.id);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        return res.status(200).json({
            message: 'User deleted successfully',
            user: {
                id: user._id,
                email: user.email,
                userName: user.userName
            }
        });
    } catch (error) {
        console.error('Delete user error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        return res.status(500).json({ error: 'Failed to delete user' });
    }
});

/**
 * GET /users/stats/summary
 * Get user statistics (superadmin only)
 */
router.get('/stats/summary', requireSuperAdmin, async (req, res) => {
    try {
        const [total, active, admins, superadmins] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ isActive: true }),
            User.countDocuments({ role: 'admin' }),
            User.countDocuments({ role: 'superadmin' })
        ]);
        
        return res.status(200).json({
            total,
            active,
            inactive: total - active,
            admins,
            superadmins
        });
    } catch (error) {
        console.error('Get stats error:', error);
        return res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
