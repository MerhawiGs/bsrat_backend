const mongoose = require('mongoose');

// Simplified user model for appointments: minimal fields only
const userSchema = new mongoose.Schema(
	{
		userName: { type: String, trim: true },
		password: { type: String, trim: true },
		role: { type: String, enum: ['user', 'staff', 'admin'], default: 'user' },
		isActive: { type: Boolean, default: true },
	},
	{ timestamps: true }
);

userSchema.virtual('fullName').get(function () {
	return `${this.firstName || ''} ${this.lastName || ''}`.trim();
});

userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
module.exports = User;
