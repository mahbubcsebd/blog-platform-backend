const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary'); // Adjust the path

// Configuration for single image upload
const singleImageUpload = (folderName, fieledName) => {
    return multer({
        storage: new CloudinaryStorage({
            cloudinary,
            params: {
                folder: folderName, // Dynamic folder name
                format: 'webP', // Optional: Convert images to a specific format
                transformation: { width: 500, height: 500, crop: 'fill' }, // Optional: Resize and crop the image
            },
        }),
    }).single(fieledName); // 'avatar' is the field name for the file
};

// Configuration for multiple image uploads
const multipleImageUpload = (folderName, fieledName, maxCount = 5) => {
    return multer({
        storage: new CloudinaryStorage({
            cloudinary,
            params: {
                folder: folderName, // Dynamic folder name
                format: 'webP', // Optional: Convert images to a specific format
                transformation: { width: 500, height: 500, crop: 'fill' }, // Optional: Resize and crop the image
            },
        }),
    }).array(fieledName, maxCount); // 'images' is the field name for the files, maxCount is the maximum number of files
};

// Configuration for single file upload
const singleFileUpload = (folderName, fieldName, options = {}) => {
    const { transformation = {}, format = 'auto', limits = {} } = options;

    return multer({
        storage: new CloudinaryStorage({
            cloudinary,
            params: {
                folder: folderName, // Dynamic folder name
                format, // Use 'auto' to detect the file format
                transformation: {
                    ...transformation, // Allow custom transformations (optional for non-image files)
                },
            },
        }),
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB file size limit by default
            ...limits, // Allow custom file size limits
        },
        fileFilter: (req, file, cb) => {
            // Allow all file types
            cb(null, true);
        },
    }).single(fieldName); // Dynamic field name for the file
};

// Configuration for multiple file uploads
const multipleFileUpload = (
    folderName,
    fieldName,
    maxCount = 5,
    options = {},
) => {
    const { transformation = {}, format = 'auto', limits = {} } = options;

    return multer({
        storage: new CloudinaryStorage({
            cloudinary,
            params: {
                folder: folderName, // Dynamic folder name
                format, // Use 'auto' to detect the file format
                transformation: {
                    ...transformation, // Allow custom transformations (optional for non-image files)
                },
            },
        }),
        limits: {
            fileSize: 10 * 1024 * 1024, // 10MB file size limit by default
            ...limits, // Allow custom file size limits
        },
        fileFilter: (req, file, cb) => {
            // Allow all file types
            cb(null, true);
        },
    }).array(fieldName, maxCount); // Dynamic field name for the files, maxCount is the maximum number of files
};

module.exports = {
    singleImageUpload,
    multipleImageUpload,
    singleFileUpload,
    multipleFileUpload,
};

// ========================================= Image upload example start =========================================

// How to use singleImageUpload function for single image upload with customization
// router.put(
//     '/update-avatar',
//     authenticateUser, // Ensure the user is authenticated
//     singleImageUpload('avatars', 'avatar', {
//         transformation: { width: 150, height: 150, crop: 'thumb' }, // Custom transformation
//         limits: { fileSize: 2 * 1024 * 1024 }, // 2MB file size limit
//     }),
//     updateProfilePicture
// );

// router.post(
//     '/blogs',
//     authenticateUser,
//     singleImageUpload('blogs', 'coverImage', {
//         transformation: { width: 1200, height: 630, crop: 'fill' }, // Custom transformation
//         format: 'jpg', // Save as JPG instead of WEBP
//     }),
//     createBlog
// );

// How to use multipleImageUpload function for multiple image upload with customization

// router.post(
//     '/products',
//     authenticateUser,
//     authorizeAdmin,
//     multipleImageUpload('products', 'productImages', 5, {
//         transformation: { width: 800, height: 800, crop: 'fill' }, // Custom transformation
//         limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
//     }),
//     createProduct
// );

// Transformation options of image

// crop =>	fill | fit | limit | pad | scale | thumb | crop

// gravity =>	auto | face | faces | custom | north | south | east | west | center

// format =>	auto | webp | jpg | png | gif | svg | pdf

// quality =>	80 | 100 (e.g., 80 for 80% quality)

//  aspect_ratio => '16:9', // Force a 16:9 aspect ratio

// effect =>	grayscale | sepia | blur | pixelate | vignette | oil_paint

// overlay =>	<text> | <image> (e.g., logo.png)

// border => </image>	<width>_<color> (e.g., 5_red)

// angle => <color> <degrees> (e.g., 90 for 90-degree rotation)

// color => <degrees>	<color> (e.g., red, #FF0000)

// radius => <color>	<number> (e.g., 20 for rounded corners)

// shadow => <number>	<x>_<y>_<blur>_<color> (e.g., 10_10_5_black)

// text => <color>	<text> (e.g., Hello World)

// ========================================= Image upload example end =========================================

// ========================================= File upload example start =========================================

// How to use singleFileUpload function for single file upload with customization

// router.post(
//     '/upload-resume',
//     singleFileUpload('resumes', 'resume', {
//         limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
//     }),
//     uploadResume
// );

// How to use multipleFileUpload function for multiple file upload with customization

// router.post(
//     '/upload-documents',
//     multipleFileUpload('documents', 'files', 10, {
//         limits: { fileSize: 15 * 1024 * 1024 }, // 15MB file size limit
//     }),
//     uploadDocuments
// );

// ========================================= File upload example end =========================================
