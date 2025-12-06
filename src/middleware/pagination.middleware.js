/**
 * Pagination middleware
 * Adds pagination parameters to request object
 */
export const paginationMiddleware = (req, res, next) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 items per page
    const skip = (page - 1) * limit;

    req.pagination = {
        page,
        limit,
        skip
    };

    next();
};

/**
 * Generic pagination helper for Mongoose queries
 * @param {Model} model - Mongoose model
 * @param {Object} query - Query filter
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Paginated results with metadata
 */
export const paginate = async (model, query = {}, options = {}) => {
    const {
        page = 1,
        limit = 20,
        sort = '-createdAt',
        select = '',
        populate = null
    } = options;

    const skip = (page - 1) * limit;

    // Build the query
    let queryBuilder = model
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(); // Use lean() for better performance

    // Add field selection if provided
    if (select) {
        queryBuilder = queryBuilder.select(select);
    }

    // Add population if provided
    if (populate) {
        if (Array.isArray(populate)) {
            populate.forEach(pop => {
                queryBuilder = queryBuilder.populate(pop);
            });
        } else {
            queryBuilder = queryBuilder.populate(populate);
        }
    }

    // Execute query and count in parallel
    const [data, total] = await Promise.all([
        queryBuilder,
        model.countDocuments(query)
    ]);

    const pages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            pages,
            hasMore: page < pages,
            hasPrev: page > 1
        }
    };
};
