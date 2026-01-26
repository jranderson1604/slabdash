const sgMail = require('@sendgrid/mail');
const db = require('../db');

// Initialize SendGrid if API key is available (DEPRECATED - using emailService.js instead)
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    console.log('✅ SendGrid email service initialized (legacy)');
}
// Note: Email notifications now use emailService.js with nodemailer

/**
 * Send email notification
 */
async function sendEmail({ to, from, subject, html, text, templateId, templateData }) {
    try {
        if (!process.env.SENDGRID_API_KEY) {
            console.log(`📧 [DEV] Would send email to ${to}: ${subject}`);
            return { success: false, error: 'SendGrid not configured' };
        }

        const msg = {
            to,
            from: from || process.env.SENDGRID_FROM_EMAIL || 'noreply@slabdash.app',
            subject,
        };

        // Use dynamic template if provided
        if (templateId) {
            msg.templateId = templateId;
            msg.dynamicTemplateData = templateData || {};
        } else {
            msg.html = html;
            msg.text = text || html.replace(/<[^>]*>/g, ''); // Strip HTML for text version
        }

        const response = await sgMail.send(msg);
        console.log(`📧 Email sent to ${to}: ${subject}`);
        return { success: true, response };
    } catch (error) {
        console.error('❌ Email send error:', error.response?.body || error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send SMS notification (placeholder for Twilio integration)
 */
async function sendSMS({ to, message }) {
    try {
        // TODO: Integrate with Twilio
        // const twilio = require('twilio');
        // const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        // await client.messages.create({
        //     body: message,
        //     to,
        //     from: process.env.TWILIO_PHONE_NUMBER
        // });

        console.log(`📱 [PLACEHOLDER] Would send SMS to ${to}: ${message}`);
        return { success: false, error: 'SMS not configured - install Twilio to enable' };
    } catch (error) {
        console.error('❌ SMS send error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Send push notification (placeholder for Firebase/OneSignal integration)
 */
async function sendPushNotification({ userId, title, body, data }) {
    try {
        // TODO: Integrate with Firebase Cloud Messaging or OneSignal
        // const admin = require('firebase-admin');
        // await admin.messaging().send({
        //     token: userDeviceToken,
        //     notification: { title, body },
        //     data
        // });

        console.log(`🔔 [PLACEHOLDER] Would send push to user ${userId}: ${title} - ${body}`);
        return { success: false, error: 'Push notifications not configured - install Firebase to enable' };
    } catch (error) {
        console.error('❌ Push notification error:', error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Email Templates
 */
const emailTemplates = {
    // Buyback offer email
    buybackOffer: (data) => ({
        subject: `💰 Buyback Offer: ${data.cardDescription}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .offer-box { background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
                    .price { font-size: 48px; font-weight: bold; color: #10b981; margin: 10px 0; }
                    .button { display: inline-block; background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 10px 5px; }
                    .button-decline { background: #6b7280; }
                    .card-details { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
                    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">💰 You Have a Buyback Offer!</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">From ${data.companyName}</p>
                    </div>
                    <div class="content">
                        <p>Hi ${data.customerName},</p>
                        <p>Great news! We'd like to buy back one of your graded cards:</p>

                        <div class="card-details">
                            <strong>${data.cardDescription}</strong><br>
                            ${data.cardGrade ? `Grade: PSA ${data.cardGrade}<br>` : ''}
                            ${data.psaCertNumber ? `Cert #: ${data.psaCertNumber}` : ''}
                        </div>

                        <div class="offer-box">
                            <div style="font-size: 18px; color: #6b7280;">Our Offer</div>
                            <div class="price">$${data.offerPrice}</div>
                            ${data.message ? `<p style="color: #6b7280; font-style: italic; margin: 15px 0;">"${data.message}"</p>` : ''}
                        </div>

                        <p style="text-align: center; margin: 30px 0;">
                            <a href="${data.portalUrl}" class="button">Accept Offer</a>
                            <a href="${data.portalUrl}" class="button button-decline">View Details</a>
                        </p>

                        <p style="color: #6b7280; font-size: 14px; text-align: center;">
                            ⏰ This offer expires in ${data.expiresInHours} hours
                        </p>

                        <div class="footer">
                            <p>Click the link above to accept or decline this offer.</p>
                            <p>Questions? Contact us at ${data.companyEmail || 'your shop'}</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
    }),

    // Submission stage update email
    submissionUpdate: (data) => ({
        subject: `📦 Update: ${data.submissionNumber} - ${data.stageName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #FF8170, #ff6b59); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .progress-bar { background: #e5e7eb; height: 20px; border-radius: 10px; overflow: hidden; margin: 20px 0; }
                    .progress-fill { background: linear-gradient(90deg, #FF8170, #ff6b59); height: 100%; transition: width 0.3s; }
                    .status-box { background: white; border-left: 4px solid #FF8170; padding: 20px; margin: 20px 0; border-radius: 4px; }
                    .button { display: inline-block; background: #FF8170; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px; }
                    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">📦 Submission Update</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.submissionNumber}</p>
                    </div>
                    <div class="content">
                        <p>Hi ${data.customerName},</p>
                        <p>Your submission has been updated:</p>

                        <div class="status-box">
                            <strong style="font-size: 18px; color: #FF8170;">${data.stageName}</strong>
                            <p style="margin: 10px 0 0 0; color: #6b7280;">${data.stageDescription || 'Your cards are being processed by PSA'}</p>
                        </div>

                        <div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span style="font-weight: bold;">Progress</span>
                                <span style="font-weight: bold; color: #FF8170;">${data.progressPercent}%</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${data.progressPercent}%"></div>
                            </div>
                        </div>

                        ${data.estimatedCompletion ? `
                            <p style="color: #6b7280; margin-top: 20px;">
                                📅 Estimated completion: ${data.estimatedCompletion}
                            </p>
                        ` : ''}

                        <p style="text-align: center;">
                            <a href="${data.portalUrl}" class="button">View Full Details</a>
                        </p>

                        <div class="footer">
                            <p>Track your submission anytime at your customer portal.</p>
                            <p>${data.companyName}</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
    }),

    // Grades ready notification
    gradesReady: (data) => ({
        subject: `🎉 Your Grades Are Ready! - ${data.submissionNumber}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .celebration { font-size: 48px; text-align: center; margin: 20px 0; }
                    .button { display: inline-block; background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">🎉 Grades Are Ready!</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.submissionNumber}</p>
                    </div>
                    <div class="content">
                        <div class="celebration">🎊</div>

                        <p>Hi ${data.customerName},</p>
                        <p>Great news! Your PSA grades are ready to view.</p>

                        <p style="background: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                            <strong style="font-size: 20px;">${data.cardCount} cards graded</strong>
                        </p>

                        <p style="text-align: center;">
                            <a href="${data.portalUrl}" class="button">View Your Grades</a>
                        </p>

                        <div class="footer">
                            <p>${data.pickupInstructions || 'Contact us to arrange pickup of your graded cards.'}</p>
                            <p>${data.companyName}</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
    }),

    // Portal access link
    portalAccess: (data) => ({
        subject: `🔗 Access Your Order Tracking - ${data.companyName}`,
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #FF8170, #ff6b59); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; background: #FF8170; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
                    .link-box { background: white; border: 2px dashed #e5e7eb; padding: 20px; border-radius: 8px; margin: 20px 0; word-break: break-all; }
                    .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1 style="margin: 0;">🔗 Track Your Submissions</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.companyName}</p>
                    </div>
                    <div class="content">
                        <p>Hi ${data.customerName},</p>
                        <p>Use the secure link below to track all your PSA submissions in real-time:</p>

                        <p style="text-align: center;">
                            <a href="${data.portalUrl}" class="button">Access Your Portal</a>
                        </p>

                        <div class="link-box">
                            <p style="margin: 0; font-size: 12px; color: #6b7280;">Or copy this link:</p>
                            <p style="margin: 10px 0 0 0; color: #FF8170;">${data.portalUrl}</p>
                        </div>

                        <p style="color: #6b7280; font-size: 14px;">
                            ⏰ This link expires in 7 days
                        </p>

                        <div class="footer">
                            <p>Keep this link safe - it provides access to your submission information.</p>
                            <p>Questions? Contact ${data.companyName}</p>
                        </div>
                    </div>
                </div>
            </body>
            </html>
        `,
    }),
};

/**
 * Send notification with automatic channel selection
 */
async function sendNotification({ customerId, type, data, channels = ['email'] }) {
    try {
        // Get customer contact info and preferences
        const customer = await db.query(
            'SELECT * FROM customers WHERE id = $1',
            [customerId]
        );

        if (customer.rows.length === 0) {
            throw new Error('Customer not found');
        }

        const customerData = customer.rows[0];
        const results = [];

        // Get company info for branding
        const company = await db.query(
            'SELECT name, email FROM companies WHERE id = $1',
            [customerData.company_id]
        );

        const companyData = company.rows[0] || { name: 'Your Card Shop', email: null };

        // Merge customer and company data with notification data
        const fullData = {
            customerName: customerData.name,
            customerEmail: customerData.email,
            companyName: companyData.name,
            companyEmail: companyData.email,
            ...data
        };

        // Send via selected channels
        if (channels.includes('email') && customerData.email) {
            const template = emailTemplates[type];
            if (template) {
                const { subject, html } = template(fullData);
                const result = await sendEmail({
                    to: customerData.email,
                    subject,
                    html
                });
                results.push({ channel: 'email', ...result });
            }
        }

        if (channels.includes('sms') && customerData.phone) {
            // TODO: Send SMS via Twilio
            const result = await sendSMS({
                to: customerData.phone,
                message: data.smsMessage || `Update from ${companyData.name}`
            });
            results.push({ channel: 'sms', ...result });
        }

        if (channels.includes('push')) {
            // TODO: Send push notification
            const result = await sendPushNotification({
                userId: customerId,
                title: data.pushTitle || 'Submission Update',
                body: data.pushBody || 'You have a new update'
            });
            results.push({ channel: 'push', ...result });
        }

        return { success: true, results };
    } catch (error) {
        console.error('❌ Notification error:', error);
        return { success: false, error: error.message };
    }
}

module.exports = {
    sendEmail,
    sendSMS,
    sendPushNotification,
    sendNotification,
    emailTemplates
};
