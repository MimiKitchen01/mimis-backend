import User from '../models/user.model.js';
import Order from '../models/order.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import { ORDER_STATUS, PAYMENT_STATUS } from '../constants/index.js';
import logger from '../utils/logger.js';
import chalk from 'chalk';

export const getAllUsers = async (options) => {
    logger.info(chalk.blue('📊 Fetching users with options:'),
        chalk.cyan(JSON.stringify(options, null, 2))
    );

    const {
        page,
        limit,
        search,
        role,
        isVerified,
        sortBy,
        sortOrder,
        startDate,
        endDate
    } = options;

    const query = {};

    // Add filters
    if (search) {
        query.$or = [
            { fullName: new RegExp(search, 'i') },
            { email: new RegExp(search, 'i') },
            { phoneNumber: new RegExp(search, 'i') }
        ];
    }

    if (role) query.role = role;
    if (typeof isVerified === 'boolean') query.isVerified = isVerified;
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;
    const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute queries
    const [users, total, stats] = await Promise.all([
        User.find(query)
            .select('-password -otp -resetOTP')
            .sort(sortOptions)
            .skip(skip)
            .limit(limit),
        User.countDocuments(query),
        User.aggregate([
            {
                $group: {
                    _id: '$role',
                    total: { $sum: 1 },
                    verified: {
                        $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
                    },
                    unverified: {
                        $sum: { $cond: [{ $eq: ['$isVerified', false] }, 1, 0] }
                    }
                }
            }
        ])
    ]);

    logger.info(chalk.green('✅ Successfully retrieved'),
        chalk.yellow(users.length),
        chalk.green('users')
    );

    return {
        users,
        pagination: {
            total,
            page,
            pages: Math.ceil(total / limit)
        },
        stats: {
            byRole: stats.reduce((acc, curr) => {
                acc[curr._id] = {
                    total: curr.total,
                    verified: curr.verified,
                    unverified: curr.unverified
                };
                return acc;
            }, {})
        }
    };
};

export const getDashboardStats = async () => {
    logger.info(chalk.blue('📊 Fetching dashboard statistics'));

    const [users, orders, revenue] = await Promise.all([
        User.aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 },
                    verified: {
                        $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] }
                    }
                }
            }
        ]),
        Order.aggregate([
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 },
                    revenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$paymentStatus', PAYMENT_STATUS.COMPLETED] },
                                '$total',
                                0
                            ]
                        }
                    }
                }
            }
        ]),
        Order.aggregate([
            {
                $match: {
                    paymentStatus: PAYMENT_STATUS.COMPLETED
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$createdAt'
                        }
                    },
                    dailyRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { '_id': -1 } },
            { $limit: 7 }
        ])
    ]);

    return {
        users: transformUserStats(users),
        orders: transformOrderStats(orders),
        revenueData: revenue
    };
};

export const updateUserRole = async (userId, newRole) => {
    logger.info(chalk.blue('👤 Updating user role:'),
        chalk.cyan(`${userId} to ${newRole}`)
    );

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    user.role = newRole;
    await user.save();

    return user;
};

export const deleteUser = async (userId) => {
    logger.info(chalk.blue('🗑️ Deleting user:'), chalk.cyan(userId));

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, 'User not found');
    }

    // Add cleanup logic for user-related data
    await Promise.all([
        Order.deleteMany({ user: userId }),
        // Add other cleanup operations
    ]);

    await user.remove();
    return true;
};

const transformUserStats = (stats) => {
    return stats.reduce((acc, stat) => {
        acc[stat._id] = {
            total: stat.count,
            verified: stat.verified,
            unverified: stat.count - stat.verified
        };
        return acc;
    }, {});
};

const transformOrderStats = (stats) => {
    return stats.reduce((acc, stat) => {
        acc[stat._id] = {
            count: stat.count,
            revenue: stat.revenue
        };
        return acc;
    }, {});
};
