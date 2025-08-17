// Multer => file upload => uploadFile.js
const userImageDirectory = 'public/images/users';
const maxFileSize = 2097152; // 2MB
const allowedFileType = ['image/png', 'image/jpeg', 'image/jpg'];

module.exports = {
    userImageDirectory,
    maxFileSize,
    allowedFileType,
};
