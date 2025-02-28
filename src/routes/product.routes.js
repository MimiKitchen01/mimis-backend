import express from 'express';
import * as productController from '../controllers/product.controller.js';
import auth from '../middleware/auth.js';

/**
 * @swagger
 * tags:
 *   name: Products
 *   description: Product management endpoints
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - name
 *         - description
 *         - category
 *         - price
 *         - ingredients
 *         - imageUrl
 *       properties:
 *         name:
 *           type: string
 *           example: Chicken Burger Promo Pack
 *         description:
 *           type: string
 *           example: Nunc auctor velit laborum exercitation ullamco...
 *         category:
 *           type: string
 *           example: Burgers
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           example: ['Popular', 'Spicy']
 *         rating:
 *           type: object
 *           properties:
 *             average:
 *               type: number
 *               example: 4.8
 *             count:
 *               type: number
 *               example: 250
 *         orderCount:
 *           type: number
 *           example: 1000
 *         price:
 *           type: number
 *           example: 12.99
 *         ingredients:
 *           type: array
 *           items:
 *             type: string
 *           example: ['Chicken', 'Lettuce', 'Special Sauce']
 *         imageUrl:
 *           type: string
 *           description: Main product image URL
 *         additionalImages:
 *           type: array
 *           items:
 *             type: string
 *           description: Additional product image URLs (1-7 additional images)
 *           example: [
 *             "https://example.com/image1.jpg",
 *             "https://example.com/image2.jpg"
 *           ]
 */

const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 */
router.post('/', auth, productController.createProduct);

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *       - in: query
 *         name: isPopular
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/', productController.getAllProducts);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 */
router.get('/:id', productController.getProduct);

router.patch('/:id', auth, productController.updateProduct);
router.delete('/:id', auth, productController.deleteProduct);

export default router;
