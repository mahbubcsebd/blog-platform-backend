const nodemailer = require('nodemailer');
const { SMTP_USER_NAME, SMTP_PASSWORD } = require('../config/env');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    PORT: 587,
    secure: false, // Set to true if you're using PORT 465 with SSL
    auth: {
        user: SMTP_USER_NAME,
        pass: SMTP_PASSWORD,
    },
});

const sendEmail = async (emailData) => {
    try {
        const mailOptions = {
            from: SMTP_USER_NAME,
            to: emailData.to,
            subject: emailData.subject,
            html: emailData.html,
        };

        const msgInfo = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully', msgInfo.response);
    } catch (error) {
        console.error('Email sending failed:', error);
    }
};

module.exports = sendEmail;
