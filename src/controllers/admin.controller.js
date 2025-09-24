import User from '../models/user.model.js';
import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import { Address } from '../models/address.model.js'; // Changed from default to named import
import { ApiError } from '../middleware/error.middleware.js';
import { ORDER_STATUS, PAYMENT_STATUS, ROLES } from '../constants/index.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import * as adminService from '../services/admin.service.js';
import * as orderService from '../services/order.service.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const adminLogin = async (req, res) => {
  try {
    logger.info(chalk.blue('🔑 Admin login attempt:'),
      chalk.cyan(req.body.email)
    );

    const { email, password } = req.body;

    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin || !(await admin.comparePassword(password))) {
      throw new ApiError(401, 'Invalid admin credentials');
    }

    // Generate JWT token with 3 months expiration
    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '90d' }  // Changed to 90 days (3 months)
    );

    logger.info(chalk.green('✅ Admin login successful:'),
      chalk.yellow(admin.email)
    );

    res.json({
      token,
      user: {
        id: admin._id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
        imageUrl: admin.imageUrl
      }
    });
  } catch (error) {
    logger.error(
      chalk.red('❌ Admin login failed:'),
      chalk.yellow(error.message)
    );
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const createAdmin = async (req, res) => {
  try {
    logger.info(chalk.blue('👤 Creating new admin:'),
      chalk.cyan(req.body.email)
    );

    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    const admin = await User.createAdmin({
      email,
      password,
      fullName: email.split('@')[0] // Use email username as fullName
    });

    logger.info(chalk.green('✅ Admin created successfully:'),
      chalk.yellow(admin.email)
    );

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    logger.error(
      chalk.red('❌ Admin creation failed:'),
      chalk.yellow(error.message)
    );
    res.status(400).json({ message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await adminService.getDashboardStats();
    res.json(stats);
  } catch (error) {
    logger.error(chalk.red('❌ Error fetching dashboard stats:'),
      chalk.yellow(error.message)
    );
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Get all users with filtering and pagination
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      role,
      isVerified,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate
    } = req.query;

    const result = await adminService.getAllUsers({
      page: parseInt(page),
      limit: parseInt(limit),
      search,
      role,
      isVerified,
      sortBy,
      sortOrder,
      startDate,
      endDate
    });

    res.json(result);
  } catch (error) {
    logger.error(chalk.red('Get users error:'), error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * @desc    Update user role
 * @route   PATCH /api/admin/users/:userId/role
 * @access  Private/Admin
 */
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const user = await adminService.updateUserRole(userId, role);
    res.json(user);
  } catch (error) {
    logger.error(chalk.red('Update user role error:'), error);
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/admin/users/:userId
 * @access  Private/Admin
 */
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        logger.info(chalk.blue('👤 Admin requesting user deletion:'), {
            adminId: chalk.cyan(req.user.userId),
            targetUserId: chalk.yellow(userId)
        });

        await adminService.deleteUser(userId);

        res.json({
            status: 'success',
            message: 'User and all associated data deleted successfully'
        });
    } catch (error) {
        logger.error(chalk.red('❌ Delete user error:'), {
            error: error.message,
            userId: req.params.userId
        });
        
        res.status(error.statusCode || 500).json({
            status: 'error',
            message: error.message || 'Failed to delete user'
        });
    }
};

// Add other admin controller methods...

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status },
      { new: true }
    ).populate(['items.product', 'user', 'deliveryAddress']);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getAdminOverview = async (req, res) => {
  try {
    const [
      activeOrders,
      totalRevenue,
      totalOrders,
      totalCustomers,
      deliveryTimes,
      popularAreas,
      recentOrders
    ] = await Promise.all([
      // Active Orders (pending, confirmed, preparing)
      Order.countDocuments({
        status: {
          $in: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING]
        }
      }),

      // Total Revenue
      Order.aggregate([
        {
          $match: {
            status: { $ne: ORDER_STATUS.CANCELLED },
            paymentStatus: PAYMENT_STATUS.COMPLETED
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" }
          }
        }
      ]),

      // Total Orders
      Order.countDocuments({}),

      // Total Customers
      User.countDocuments({ role: ROLES.USER }),

      // Average Delivery Time
      Order.aggregate([
        {
          $match: {
            status: ORDER_STATUS.DELIVERED
          }
        },
        {
          $project: {
            deliveryTime: {
              $subtract: [
                "$updatedAt",
                "$createdAt"
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgTime: { $avg: "$deliveryTime" }
          }
        }
      ]),

      // Popular Delivery Areas
      Order.aggregate([
        {
          $lookup: {
            from: 'addresses',
            localField: 'deliveryAddress',
            foreignField: '_id',
            as: 'address'
          }
        },
        { $unwind: "$address" },
        {
          $group: {
            _id: "$address.city",
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // Recent Orders
      Order.find()
        .populate(['items.product', 'user', 'deliveryAddress'])
        .sort('-createdAt')
        .limit(10)
    ]);

    res.json({
      activeOrders,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalOrders,
      totalCustomers,
      averageDeliveryTime: deliveryTimes[0]?.avgTime
        ? Math.round(deliveryTimes[0].avgTime / (1000 * 60)) // Convert to minutes
        : 0,
      popularDeliveryAreas: popularAreas,
      recentOrders: recentOrders.map(order => ({
        id: order._id,
        customerName: order.user.fullName,
        total: order.total,
        status: order.status,
        items: order.items.length,
        createdAt: order.createdAt
      }))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    logger.info(chalk.blue('📦 Admin fetching orders with query:'), 
      chalk.cyan(JSON.stringify(req.query))
    );

    const result = await orderService.getOrdersWithFilters({
      status: req.query.status,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      page: req.query.page || 1,
      limit: req.query.limit || 10,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      searchTerm: req.query.search
    });

    res.json({
      message: 'Orders retrieved successfully',
      ...result
    });
  } catch (error) {
    logger.error(chalk.red('❌ Error fetching orders:'), 
      chalk.yellow(error.message)
    );
    res.status(500).json({ 
      message: error.message || 'Error fetching orders' 
    });
  }
};

export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate([
        { path: 'user', select: '-password -otp' },
        'deliveryAddress',
        'items.product'
      ]);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    res.json(order);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
};

export const updateOrder = async (req, res) => {
  try {
    const allowedUpdates = ['status', 'deliveryAddress', 'items'];
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      throw new ApiError(400, 'Invalid updates');
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    // If updating items, recalculate total
    if (req.body.items) {
      const products = await Product.find({
        _id: { $in: req.body.items.map(item => item.product) }
      });

      order.items = req.body.items.map(item => ({
        ...item,
        price: products.find(p => p._id.toString() === item.product.toString()).price
      }));

      order.total = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    // Update other fields
    updates.forEach(update => {
      if (update !== 'items') {
        order[update] = req.body[update];
      }
    });

    await order.save();

    await order.populate(['user', 'deliveryAddress', 'items.product']);

    res.json({
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.status !== ORDER_STATUS.PENDING) {
      throw new ApiError(400, 'Can only delete pending orders');
    }

    await order.remove();
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const getOrderStats = async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $facet: {
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byPaymentStatus: [
            { $group: { _id: '$paymentStatus', count: { $sum: 1 } } }
          ],
          dailyOrders: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 },
                revenue: { $sum: '$total' }
              }
            },
            { $sort: { _id: -1 } },
            { $limit: 7 }
          ]
        }
      }
    ]);

    res.json(stats[0]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAdminProfile = async (req, res) => {
  try {
    const allowedUpdates = [
      'fullName',
      'phoneNumber',
      'imageUrl'
    ];

    const updates = Object.keys(req.body);
    const isValidOperation = updates.every(update =>
      allowedUpdates.includes(update)
    );

    if (!isValidOperation) {
      throw new ApiError(400, 'Invalid updates. Can only update: ' + allowedUpdates.join(', '));
    }

    if (req.body.email) {
      throw new ApiError(400, 'Email cannot be changed');
    }

    const admin = await User.findOne({
      _id: req.user.userId,
      role: 'admin'
    });

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    updates.forEach(update => {
      admin[update] = req.body[update];
    });

    await admin.save();

    res.json({
      message: 'Admin profile updated successfully',
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        phoneNumber: admin.phoneNumber,
        imageUrl: admin.imageUrl
      }
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const updateAdminProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No image file uploaded');
    }

    const admin = await User.findOne({
      _id: req.user.userId,
      role: 'admin'
    });

    if (!admin) {
      throw new ApiError(404, 'Admin not found');
    }

    admin.imageUrl = req.file.location; // Using single file location
    await admin.save();

    res.json({
      message: 'Admin profile image updated successfully',
      imageUrl: admin.imageUrl
    });
  } catch (error) {
    logger.error('Error in updateAdminProfileImage:', error);
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;

    logger.info(chalk.blue('👀 Admin fetching order details:'), 
      chalk.cyan(orderId)
    );

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      throw new ApiError(400, 'Invalid order ID format');
    }

    const order = await Order.findById(orderId)
      .populate([
        { 
          path: 'user',
          select: 'fullName email phoneNumber'
        },
        {
          path: 'items.product',
          select: 'name price imageUrl category'
        },
        'deliveryAddress'
      ]);

    if (!order) {
      throw new ApiError(404, 'Order not found');
    }

    res.json({
      status: 'success',
      data: {
        order,
        customer: {
          name: order.user.fullName,
          email: order.user.email,
          phone: order.user.phoneNumber
        },
        items: order.items.map(item => ({
          product: {
            id: item.product._id,
            name: item.product.name,
            price: item.product.price,
            image: item.product.imageUrl
          },
          quantity: item.quantity,
          subtotal: item.price * item.quantity
        })),
        delivery: {
          address: order.deliveryAddress,
          estimatedTime: order.estimatedDeliveryTime,
          actualDeliveryTime: order.actualDeliveryTime
        },
        payment: {
          status: order.paymentStatus,
          details: order.paymentDetails
        },
        timeline: order.statusHistory,
        totals: {
          subtotal: order.total,
          deliveryFee: 0, // Add if you have delivery fee
          total: order.total
        }
      }
    });

  } catch (error) {
    logger.error(chalk.red('❌ Error fetching order details:'), {
      error: error.message,
      orderId: req.params.orderId
    });

    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};

export const updateOrderPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentStatus } = req.body;

    if (!['pending', 'completed', 'failed'].includes(paymentStatus)) {
      throw new ApiError(400, 'Invalid payment status');
    }

    const order = await orderService.updatePaymentStatus(
      orderId, 
      paymentStatus, 
      req.user.userId
    );

    res.json({
      status: 'success',
      message: 'Payment status updated successfully',
      data: order
    });
  } catch (error) {
    logger.error('Error updating payment status:', error);
    res.status(error.statusCode || 500).json({
      status: 'error',
      message: error.message
    });
  }
};
