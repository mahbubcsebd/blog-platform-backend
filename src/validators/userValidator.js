const { body } = require('express-validator');
const validator = require('validator');

const userValidationRules = [
    body('firstName')
        .trim()
        .notEmpty()
        .withMessage('First name is required')
        .isAlpha()
        .withMessage('First name must contain only letters'),

    body('lastName')
        .trim()
        .notEmpty()
        .withMessage('Last name is required')
        .isAlpha()
        .withMessage('Last name must contain only letters'),

    body('email')
        .trim()
        .notEmpty()
        .withMessage('Email is required')
        .isEmail()
        .withMessage('Invalid email format')
        .custom((value) => {
            if (!validator.isEmail(value)) {
                throw new Error('Invalid email format');
            }
            return true;
        }),

    body('password')
        .trim()
        .notEmpty()
        .withMessage('Password is required')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),

    body('phone')
        .trim()
        .notEmpty()
        .withMessage('Phone number is required')
        .isMobilePhone()
        .withMessage('Invalid phone number'),

    body('role')
        .trim()
        .notEmpty()
        .withMessage('Role is required')
        .isIn(['admin', 'user', 'moderator'])
        .withMessage('Role must be either "admin" or "user" or "moderator"'),
];

const validateUserUpdate = [
    body('firstName')
        .optional()
        .isLength({ min: 2 })
        .withMessage('First name must be at least 2 characters long'),
    body('lastName')
        .optional()
        .isLength({ min: 2 })
        .withMessage('Last name must be at least 2 characters long'),
    body('email')
        .not()
        .exists()
        .withMessage('Email cannot be updated through this endpoint'),
    body('role')
        .not()
        .exists()
        .withMessage('Role cannot be updated through this endpoint'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Invalid phone number'),
    body('password')
        .not()
        .exists()
        .withMessage('Role cannot be updated through this endpoint'),
];

const validateUpdatePassword = [
    // Validate current password
    body('currentPassword')
        .trim()
        .notEmpty()
        .withMessage('Current password is required'),

    // Validate new password
    body('newPassword')
        .trim()
        .notEmpty()
        .withMessage('New password is required')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters long')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z0-9]).{8,}$/)
        .withMessage(
            'New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        ),
];

module.exports = {
    userValidationRules,
    validateUserUpdate,
    validateUpdatePassword,
};
