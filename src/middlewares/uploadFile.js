require('dotenv').config();
const multer = require('multer');
// const path = require('node:path');
const createHttpError = require('http-errors');
// const { uploadDirectory } = require('../config/env');
const {
    // userImageDirectory,
    maxFileSize,
    allowedFileType,
} = require('../config');

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (!allowedFileType.includes(file.mimetype)) {
        return cb(createHttpError(400, 'File type not allowed'), false);
    }

    if (file.size > maxFileSize) {
        return cb(createHttpError(400, 'File size too large'), false);
    }

    if (!allowedFileType.includes(file.mimetype)) {
        return cb(createHttpError(400, 'File extension not allowed'), false);
    }

    return cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
});

module.exports = upload;
