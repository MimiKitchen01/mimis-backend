const Address = require('../models/address.model');

exports.addAddress = async (req, res) => {
  try {
    const addressData = {
      ...req.body,
      user: req.user.userId
    };

    if (addressData.isDefault) {
      // Remove default status from other addresses
      await Address.updateMany(
        { user: req.user.userId },
        { isDefault: false }
      );
    }

    const address = new Address(addressData);
    await address.save();

    res.status(201).json({
      message: 'Address added successfully',
      address
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAllAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.userId })
      .sort({ createdAt: -1 });
    
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.json(address);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.updateAddress = async (req, res) => {
  try {
    if (req.body.isDefault) {
      // Remove default status from other addresses
      await Address.updateMany(
        { user: req.user.userId },
        { isDefault: false }
      );
    }

    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      req.body,
      { new: true }
    );

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.json({
      message: 'Address updated successfully',
      address
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // If deleted address was default, make the most recent address default
    if (address.isDefault) {
      const mostRecentAddress = await Address.findOne({ user: req.user.userId })
        .sort({ createdAt: -1 });
      
      if (mostRecentAddress) {
        mostRecentAddress.isDefault = true;
        await mostRecentAddress.save();
      }
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.setDefaultAddress = async (req, res) => {
  try {
    // Remove default status from all addresses
    await Address.updateMany(
      { user: req.user.userId },
      { isDefault: false }
    );

    // Set new default address
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user.userId },
      { isDefault: true },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    res.json({
      message: 'Default address updated successfully',
      address
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
