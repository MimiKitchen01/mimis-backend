import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import auth from '../middleware/auth.js';
import { adminAuth } from '../middleware/admin.middleware.js';

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminStats:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: number
 *         totalOrders:
 *           type: number
 *         totalProducts:
 *           type: number
 *         totalRevenue:
 *           type: number
 */

const router = express.Router();

/**
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 */
router.post('/login', adminController.adminLogin);

/**
 * @swagger
 * /api/admin/create:
 *   post:
 *     summary: Create a new admin user (admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Admin created successfully
 */
router.post('/create', auth, adminAuth, adminController.createAdmin);

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get admin dashboard statistics
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdminStats'
 */
router.get('/dashboard', auth, adminAuth, adminController.getDashboardStats);

/**
 * @swagger
 * /api/admin/overview:
 *   get:
 *     summary: Get admin overview dashboard
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Admin overview data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activeOrders:
 *                   type: number
 *                   description: Number of current active orders
 *                 totalRevenue:
 *                   type: number
 *                   description: Total revenue from completed orders
 *                 totalOrders:
 *                   type: number
 *                   description: Total number of orders
 *                 totalCustomers:
 *                   type: number
 *                   description: Total number of customers
 *                 averageDeliveryTime:
 *                   type: number
 *                   description: Average delivery time in minutes
 *                 popularDeliveryAreas:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                         description: City name
 *                       count:
 *                         type: number
 *                         description: Number of orders in this area
 *                 recentOrders:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       customerName:
 *                         type: string
 *                       total:
 *                         type: number
 *                       status:
 *                         type: string
 *                       items:
 *                         type: number
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 */
router.get('/overview', auth, adminAuth, adminController.getAdminOverview);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with filtering, searching and pagination
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, email, or phone
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [user, admin]
 *         description: Filter by user role
 *       - in: query
 *         name: isVerified
 *         schema:
 *           type: boolean
 *         description: Filter by verification status
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, fullName, email]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter users created from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter users created until this date
 *     responses:
 *       200:
 *         description: List of users with pagination and statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       fullName:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phoneNumber:
 *                         type: string
 *                       role:
 *                         type: string
 *                       isVerified:
 *                         type: boolean
 *                       imageUrl:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     pages:
 *                       type: integer
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     byRole:
 *                       type: object
 *                       properties:
 *                         user:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             verified:
 *                               type: integer
 *                             unverified:
 *                               type: integer
 *                         admin:
 *                           type: object
 *                           properties:
 *                             total:
 *                               type: integer
 *                             verified:
 *                               type: integer
 *                             unverified:
 *                               type: integer
 */
router.get('/users', auth, adminAuth, adminController.getAllUsers);

/**
 * @swagger
 * /api/admin/orders/status:
 *   put:
 *     summary: Update order status (admin only)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orderId
 *               - status
 *             properties:
 *               orderId:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, confirmed, preparing, ready, delivered, cancelled]
 *     responses:
 *       200:
 *         description: Order status updated successfully
 */
router.put('/orders/status', auth, adminAuth, adminController.updateOrderStatus);

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     summary: Get all orders with filters and pagination
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by order status
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders until this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 */
router.get('/orders', auth, adminAuth, adminController.getAllOrders);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.get('/orders/:id', auth, adminAuth, adminController.getOrderById);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   put:
 *     summary: Update order
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               deliveryAddress:
 *                 type: string
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: string
 *                     quantity:
 *                       type: number
 */
router.put('/orders/:id', auth, adminAuth, adminController.updateOrder);

/**
 * @swagger
 * /api/admin/orders/{id}:
 *   delete:
 *     summary: Delete order (only pending orders)
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
router.delete('/orders/:id', auth, adminAuth, adminController.deleteOrder);

/**
 * @swagger
 * /api/admin/orders/stats:
 *   get:
 *     summary: Get order statistics
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 */
router.get('/orders/stats', auth, adminAuth, adminController.getOrderStats);

/**
 * @swagger
 * /api/admin/profile:
 *   patch:
 *     summary: Update admin profile
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               imageUrl:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin profile updated successfully
 */
router.patch('/profile', auth, adminAuth, adminController.updateAdminProfile);

/**
 * @swagger
 * /api/admin/profile-image:
 *   post:
 *     summary: Update admin profile image
 *     tags: [Admin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: Image file (max 2MB, JPEG/PNG/WEBP)
 *     responses:
 *       200:
 *         description: Profile image updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 imageUrl:
 *                   type: string
 */
router.post('/profile-image', 
  auth, 
  adminAuth,
  uploadProfileImage.single('image'), 
  adminController.updateAdminProfileImage
);

export default router;
