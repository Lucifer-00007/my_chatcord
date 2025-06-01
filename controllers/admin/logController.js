const SystemLog = require('../../models/SystemLog');
const AppError = require('../../utils/AppError');
const logger = require('../../logger');

exports.getSystemLogs = async (req, res, next) => {
  try {
    const { level, limit, from, to, page, sort } = req.query; // Validated by Joi

    const query = {};
    if (level && level !== 'all') {
      query.level = level;
    }
    if (from || to) {
      query.timestamp = {};
      if (from) query.timestamp.$gte = new Date(from);
      if (to) query.timestamp.$lte = new Date(to);
    }

    const skip = (page - 1) * limit;

    // Whitelist of allowed sortable fields
    const allowedSortFields = ['timestamp', 'level', 'message', 'source'];
    let sortOption = { timestamp: -1 }; // Default: newest first
    if (typeof sort === 'string') {
      // Support sort like 'timestamp' or '-timestamp'
      let field = sort.replace(/^-/, '');
      let direction = sort.startsWith('-') ? -1 : 1;
      if (allowedSortFields.includes(field)) {
        sortOption = { [field]: direction };
      }
    } else if (typeof sort === 'object' && sort !== null) {
      // If sort is an object (rare, but possible), filter keys
      sortOption = {};
      for (const key of Object.keys(sort)) {
        if (allowedSortFields.includes(key)) {
          sortOption[key] = sort[key];
        }
      }
      if (Object.keys(sortOption).length === 0) {
        sortOption = { timestamp: -1 };
      }
    }

    const logs = await SystemLog.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .lean();

    const totalLogs = await SystemLog.countDocuments(query);
    logger.debug('Fetched system logs (admin)', { query, page, limit, total: totalLogs, userId: req.user?.id, source: 'logController.getSystemLogs', path: req.path });

    return res.json({
      logs,
      currentPage: page,
      totalPages: Math.ceil(totalLogs / limit),
      totalLogs,
    });
  } catch (err) {
    logger.error('Failed to fetch logs (admin)', { error: err.message, stack: err.stack, query: req.query, userId: req.user?.id, source: 'logController.getSystemLogs', path: req.path });
    return next(new AppError('Failed to fetch logs.', 500, 'DB_QUERY_ERROR'));
  }
};

// This function assumes manual creation by an admin, not for internal app logging which should use logger directly.
exports.createSystemLogManually = async (req, res, next) => {
  try {
    const { level, message, source, metadata } = req.body; // Validated by Joi
    const log = new SystemLog({
      level,
      message,
      source: source || 'admin_manual_entry', // Default source for manual entries
      metadata,
    });
    await log.save();
    logger.info('New log entry created via admin API by user', { level, source: log.source, logId: log._id, adminUserId: req.user?.id, sourceController: 'logController.createSystemLogManually', path: req.path });
    return res.status(201).json(log);
  } catch (err) {
    logger.error('Failed to create log entry via admin API', { error: err.message, stack: err.stack, body: req.body, userId: req.user?.id, source: 'logController.createSystemLogManually', path: req.path });
    return next(new AppError('Failed to create log entry.', 500, 'DB_SAVE_ERROR'));
  }
};

exports.clearSystemLogs = async (req, res, next) => {
  try {
    const { before, level } = req.query; // Validated by Joi
    const query = {};

    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }
    if (level) {
      query.level = level;
    }

    const result = await SystemLog.deleteMany(query);
    logger.info(`Logs cleared (admin): ${result.deletedCount} entries removed.`, { query, adminUserId: req.user?.id, source: 'logController.clearSystemLogs', path: req.path });
    return res.json({
      message: 'Logs cleared successfully.',
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    logger.error('Failed to clear logs (admin)', { error: err.message, stack: err.stack, query: req.query, userId: req.user?.id, source: 'logController.clearSystemLogs', path: req.path });
    return next(new AppError('Failed to clear logs.', 500, 'DB_DELETE_ERROR'));
  }
};
