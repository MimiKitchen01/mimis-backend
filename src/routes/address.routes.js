import express from 'express';
import auth from '../middleware/auth.js';
import { Address } from '../models/address.model.js';
import { ApiError } from '../middleware/error.middleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/addresses:
 *   post:
 *     summary: Create a new address
 *     tags: [Addresses]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - street
 *               - city
 *               - state
 *               - zipCode
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [Home, Work, Other]
 *               street:
 *                 type: string
 *               city:
 *                 type: string
 *               state:
 *                 type: string
 *               zipCode:
 *                 type: string
 *               isDefault:
 *                 type: boolean
 *               additionalInfo:
 *                 type: string
 */
router.post('/', auth, async (req, res) => {
  try {
    const address = new Address({
      ...req.body,
      user: req.user.userId
    });
    await address.save();
    res.status(201).json(address);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/addresses:
 *   get:
 *     summary: Get all addresses for the authenticated user
 *     tags: [Addresses]
 *     security:
 *       - BearerAuth: []
 */
router.get('/', auth, async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user.userId });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/addresses/{id}:
 *   patch:
 *     summary: Update an address
 *     tags: [Addresses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.patch('/:id', auth, async (req, res) => {
  try {
    const address = await Address.findOne({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    const allowedUpdates = ['type', 'street', 'city', 'state', 'zipCode', 'isDefault', 'additionalInfo'];
    const updates = Object.keys(req.body);
    
    updates.forEach(update => {
      if (allowedUpdates.includes(update)) {
        address[update] = req.body[update];
      }
    });

    await address.save();
    res.json(address);
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/addresses/{id}:
 *   delete:
 *     summary: Delete an address
 *     tags: [Addresses]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId
    });

    if (!address) {
      throw new ApiError(404, 'Address not found');
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    res.status(error.statusCode || 404).json({ message: error.message });
  }
});

export { router as addressRouter };
