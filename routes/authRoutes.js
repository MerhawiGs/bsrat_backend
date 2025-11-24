const express = require('express');
const router = express.Router();
const User = require('../models/user');
const { generateToken, verifyToken } = require('../middleware/auth');

/**
 * POST /auth/login
 * Login user and return JWT token
 */
router.post('/login', async (req, res) => {
    try {
        const { userName, password } = req.body;
        
        // Validate input
        if (!userName || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        // Find user by username (include password for comparison)
        const user = await User.findOne({ userName }).select('+password');
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Check if account is active
        if (!user.isActive) {
            return res.status(401).json({ error: 'Account is deactivated. Please contact administrator.' });
        }
        
        // Verify password
        const isPasswordValid = await user.comparePassword(password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Update last login
        user.lastLogin = new Date();
        await user.save();
        
        // Generate token
        const token = generateToken(user);
        
        // Set cookie (optional, for browser clients)
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
        
        // Return user data (without password) and token
        const userData = {
            id: user._id,
            email: user.email,
            userName: user.userName,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            role: user.role,
            lastLogin: user.lastLogin
        };
        
        return res.status(200).json({
            message: 'Login successful',
            token,
            user: userData
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

/**
 * POST /auth/logout
 * Logout user (clear cookie)
 */
router.post('/logout', (req, res) => {
    res.clearCookie('token');
    return res.status(200).json({ message: 'Logout successful' });
});

/**
 * GET /auth/me
 * Get current user profile
 */
router.get('/me', verifyToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        return res.status(200).json({ user });
    } catch (error) {
        console.error('Get profile error:', error);
        return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
});

/**
 * PUT /auth/profile
 * Update current user profile
 */
router.put('/profile', verifyToken, async (req, res) => {
    try {
        const { userName, firstName, lastName } = req.body;
        
        const updateData = {};
        if (userName) updateData.userName = userName;
        if (firstName !== undefined) updateData.firstName = firstName;
        if (lastName !== undefined) updateData.lastName = lastName;
        
        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        return res.status(200).json({
            message: 'Profile updated successfully',
            user
        });
    } catch (error) {
        console.error('Update profile error:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: 'Failed to update profile' });
    }
});

/**
 * PUT /auth/change-password
 * Change current user password
 */
router.put('/change-password', verifyToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current password and new password are required' });
        }
        
        if (newPassword.length < 6) {
            return res.status(400).json({ error: 'New password must be at least 6 characters' });
        }
        
        // Get user with password
        const user = await User.findById(req.user.id).select('+password');
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        
        // Update password
        user.password = newPassword;
        await user.save();
        
        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        return res.status(500).json({ error: 'Failed to change password' });
    }
});

/**
 * POST /auth/verify
 * Verify if token is valid
 */
router.post('/verify', verifyToken, (req, res) => {
    return res.status(200).json({
        valid: true,
        user: {
            id: req.user._id,
            email: req.user.email,
            userName: req.user.userName,
            role: req.user.role
        }
    });
});

module.exports = router;
