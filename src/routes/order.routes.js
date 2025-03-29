import express from 'express';
import * as orderController from '../controllers/order.controller.js';
import auth from '../middleware/auth.js';
import logger from '../utils/logger.js';

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order and cart management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CartItem:
 *       type: object
 *       properties:
 *         product:
 *           type: string
 *           description: Product ID
 *         quantity:
 *           type: number
 *           minimum: 1
 *         price:
 *           type: number
 *     Cart:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         total:
 *           type: number
 *     Order:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         total:
 *           type: number
 *         deliveryAddress:
 *           type: string
 *           description: Address ID
 *         status:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready, delivered, cancelled]
 *         paymentStatus:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 */

const router = express.Router();

/**
 * @swagger
 * /api/orders/cart:
 *   get:
 *     summary: Get user's cart
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: User's cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 */
router.get('/cart', auth, orderController.getCart);

/**
 * @swagger
 * /api/orders/cart/add:
 *   post:
 *     summary: Add item to cart
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *                 minimum: 1
 *     responses:
 *       200:
 *         description: Updated cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 */
router.post('/cart/add', auth, orderController.addToCart);

/**
 * @swagger
 * /api/orders/cart/update:
 *   put:
 *     summary: Update cart item quantity
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - quantity
 *             properties:
 *               productId:
 *                 type: string
 *               quantity:
 *                 type: number
 *                 minimum: 0
 *                 description: Set to 0 to remove item
 *     responses:
 *       200:
 *         description: Updated cart
 */
router.put('/cart/update', auth, orderController.updateCartItem);

/**
 * @swagger
 * /api/orders/cart/remove/{productId}:
 *   delete:
 *     summary: Remove item from cart
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the product to remove from cart
 *     responses:
 *       200:
 *         description: Item removed from cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Cart'
 */
router.delete('/cart/remove/:productId', auth, orderController.removeCartItem);

/**
 * @swagger
 * /api/orders/create:
 *   post:
 *     summary: Create order from cart
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - addressId
 *             properties:
 *               addressId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 */
router.post('/create', auth, orderController.createOrder);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: Get user's orders
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, preparing, ready, delivered, cancelled]
 *         description: Filter orders by status
 *     responses:
 *       200:
 *         description: List of orders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Order'
 */
router.get('/list', auth, orderController.getOrders);

/**
 * @swagger
 * /api/orders/paid:
 *   get:
 *     summary: Get user's paid orders
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of paid orders
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 */
router.get('/paid', auth, orderController.getPaidOrders);

/**
 * @swagger
 * /api/orders/ongoing:
 *   get:
 *     summary: Get user's ongoing orders
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of ongoing orders (pending, confirmed, preparing, ready)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Order'
 */
router.get('/ongoing', auth, orderController.getOngoingOrders);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     tags: [Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Order details
 */
router.get('/:id', auth, (req, res, next) => {
  // Validate ObjectId before processing
  if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
    return res.status(400).json({ 
      status: 'error', 
      message: 'Invalid order ID format' 
    });
  }
  orderController.getOrderById(req, res, next);
});

/**
 * @swagger
 * /api/orders/pay:
 *   post:
 *     summary: Process payment for order
 *     tags: [Orders]
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
 *               - paymentDetails
 *             properties:
 *               orderId:
 *                 type: string
 *               paymentDetails:
 *                 type: object
 *                 required:
 *                   - method
 *                   - transactionId
 *                 properties:
 *                   method:
 *                     type: string
 *                     enum: [credit_card, debit_card, wallet]
 *                   transactionId:
 *                     type: string
 *     responses:
 *       200:
 *         description: Payment processed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 */
router.post('/pay', auth, orderController.processPayment);

export default router;
