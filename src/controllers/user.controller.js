const User = require('../models/user.model');

exports.updateProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const imageUrl = req.file.location; // S3 returns the URL in location property
    
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { imageUrl: imageUrl },
      { new: true }
    ).select('-password -otp');

    res.json({
      message: 'Profile image updated successfully',
      user
    });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
