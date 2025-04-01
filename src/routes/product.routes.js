import express from 'express';
import * as productController from '../controllers/product.controller.js';
import { uploadProductImages } from '../middleware/upload.middleware.js'; // Changed from uploadToS3
import auth from '../middleware/auth.js';
import { adminAuth } from '../middleware/admin.middleware.js';

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
 *     summary: Create a new product (Admin only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - price
 *               - preparationTime
 *               - calories
 *               - ingredients
 *               - category
 *               - images
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               preparationTime:
 *                 type: integer
 *                 description: Preparation time in minutes
 *               calories:
 *                 type: integer
 *               protein:
 *                 type: number
 *               carbohydrates:
 *                 type: number
 *               fats:
 *                 type: number
 *               fiber:
 *                 type: number
 *               ingredients:
 *                 type: string
 *                 format: json
 *                 example: '["Chicken", "Rice", "Vegetables"]'
 *               spicyLevel:
 *                 type: string
 *                 enum: [Not Spicy, Mild, Medium, Hot, Extra Hot]
 *               allergens:
 *                 type: string
 *                 format: json
 *                 example: '["Milk", "Eggs"]'
 *               dietaryInfo:
 *                 type: string
 *                 format: json
 *                 example: '["Vegetarian", "Gluten-Free"]'
 *               category:
 *                 type: string
 *                 enum: [Appetizers, Main Course, Desserts, Beverages, Sides, Salads, Soups, Breakfast, Lunch, Dinner]
 *               isAvailable:
 *                 type: boolean
 *               isPopular:
 *                 type: boolean
 *               isSpecial:
 *                 type: boolean
 *               customizationOptions:
 *                 type: string
 *                 format: json
 *                 example: '[{"name":"Size","options":[{"name":"Large","price":2}]}]'
 *               images:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Minimum 2, Maximum 8 images. First image will be the main image.
 *     responses:
 *       201:
 *         description: Product created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Not authenticated
 *       403:
 *         description: Not authorized as admin
 */
router.post('/', 
  auth, 
  adminAuth, 
  uploadProductImages, // Changed from uploadToS3.array('images', 8)
  productController.createProduct
);

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
 * /api/products/admin:
 *   get:
 *     summary: Get all products (Admin only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter products by category
 *       - in: query
 *         name: isAvailable
 *         schema:
 *           type: boolean
 *         description: Filter products by availability
 *       - in: query
 *         name: isPopular
 *         schema:
 *           type: boolean
 *         description: Filter products by popularity
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search products by name or description
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of products per page
 *     responses:
 *       200:
 *         description: List of products
 */
router.get('/admin', auth, adminAuth, productController.getAllProductsForAdmin);

/**
 * @swagger
 * /api/products/random:
 *   get:
 *     summary: Get 6 random products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of 6 random products
 */
router.get('/random', productController.getRandomProducts);

/**
 * @swagger
 * /api/products/most-ordered:
 *   get:
 *     summary: Get most ordered products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 6
 *         description: Number of products to return
 *     responses:
 *       200:
 *         description: List of most ordered products
 */
router.get('/most-ordered', productController.getMostOrderedProducts);

/**
 * @swagger
 * /api/products/{id}/toggle-availability:
 *   patch:
 *     summary: Toggle product availability (Admin only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product availability toggled successfully
 */
router.patch('/:id/toggle-availability', auth, adminAuth, productController.toggleProductAvailability);

/**
 * @swagger
 * /api/products/{id}/mark-popular:
 *   patch:
 *     summary: Mark product as popular (Admin only)
 *     tags: [Products]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Product ID
 *     responses:
 *       200:
 *         description: Product marked as popular successfully
 */
router.patch('/:id/mark-popular', auth, adminAuth, productController.markProductAsPopular);

router.patch('/:id', auth, productController.updateProduct);
router.delete('/:id', auth, productController.deleteProduct);

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

export default router;
