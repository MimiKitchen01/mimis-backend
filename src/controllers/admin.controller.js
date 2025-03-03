import User from '../models/user.model.js';
import Order from '../models/order.model.js';
import Product from '../models/product.model.js';
import { Address } from '../models/address.model.js'; // Changed from default to named import
import { ApiError } from '../middleware/error.middleware.js';
import { ORDER_STATUS, PAYMENT_STATUS, ROLES } from '../constants/index.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin || !(await admin.comparePassword(password))) {
      throw new ApiError(401, 'Invalid admin credentials');
    }

    const token = jwt.sign(
      { userId: admin._id, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ token });
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    const admin = await User.createAdmin({ 
      email, 
      password,
      fullName: email.split('@')[0] // Use email username as fullName
    });

    res.status(201).json({
      message: 'Admin created successfully',
      admin: {
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Order.countDocuments(),
      Product.countDocuments(),
      Order.aggregate([
        { $group: { _id: null, totalRevenue: { $sum: "$total" } } }
      ])
    ]);

    res.json({
      totalUsers: stats[0],
      totalOrders: stats[1],
      totalProducts: stats[2],
      totalRevenue: stats[3][0]?.totalRevenue || 0
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      role,
      isVerified,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = {};
    
    // Search in multiple fields
    if (search) {
      query.$or = [
        { fullName: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { phoneNumber: new RegExp(search, 'i') }
      ];
    }

    // Filter by role if specified
    if (role) {
      query.role = role;
    }

    // Filter by verification status
    if (isVerified !== undefined) {
      query.isVerified = isVerified === 'true';
    }

    // Date range filter
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Pagination options
    const options = {
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      skip: (page - 1) * limit,
      limit: parseInt(limit),
      select: '-password -otp' // Exclude sensitive fields
    };

    // Execute query with pagination
    const [users, total] = await Promise.all([
      User.find(query)
        .select(options.select)
        .sort(options.sort)
        .skip(options.skip)
        .limit(options.limit),
      User.countDocuments(query)
    ]);

    // Get additional statistics
    const stats = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          verified: {
            $sum: { $cond: ['$isVerified', 1, 0] }
          },
          unverified: {
            $sum: { $cond: ['$isVerified', 0, 1] }
          }
        }
      }
    ]);

    // Format response
    res.json({
      users: users.map(user => ({
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        isVerified: user.isVerified,
        imageUrl: user.imageUrl,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      })),
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      },
      stats: {
        total,
        byRole: stats.reduce((acc, stat) => ({
          ...acc,
          [stat._id]: {
            total: stat.count,
            verified: stat.verified,
            unverified: stat.unverified
          }
        }), {})
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
    const { 
      status, 
      startDate, 
      endDate, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (status) query.status = status;
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const options = {
      sort: { [sortBy]: sortOrder === 'desc' ? -1 : 1 },
      skip: (page - 1) * limit,
      limit: parseInt(limit)
    };

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate(['user', 'deliveryAddress', 'items.product'])
        .select('-__v')
        .setOptions(options),
      Order.countDocuments(query)
    ]);

    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    admin.imageUrl = req.file.location; // AWS S3 file URL
    await admin.save();

    res.json({
      message: 'Admin profile image updated successfully',
      imageUrl: admin.imageUrl
    });
  } catch (error) {
    res.status(error.statusCode || 400).json({ message: error.message });
  }
};
