import Product from '../models/product.model.js';

export const validateImages = (imageUrl, additionalImages) => {
  const totalImages = 1 + (additionalImages?.length || 0);
  if (totalImages < 2) {
    throw new Error('Product must have at least 2 images');
  }
  if (totalImages > 8) {
    throw new Error('Product cannot have more than 8 images');
  }
};

export const createProduct = async (productData) => {
  validateImages(productData.imageUrl, productData.additionalImages);
  const product = new Product(productData);
  await product.save();
  return product;
};

export const getProducts = async (filters = {}) => {
  return Product.find(filters)
    .where('isActive').equals(true)
    .sort('-createdAt');
};

export const getProductById = async (id) => {
  const product = await Product.findById(id);
  if (!product || !product.isActive) {
    throw new Error('Product not found');
  }
  return product;
};

export const updateProduct = async (id, updateData) => {
  if (updateData.imageUrl || updateData.additionalImages) {
    validateImages(
      updateData.imageUrl, 
      updateData.additionalImages
    );
  }

  const product = await Product.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
};

export const deleteProduct = async (id) => {
  const product = await Product.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  if (!product) {
    throw new Error('Product not found');
  }

  return product;
};
