# Add Email Notification System for PSA Step Updates

## Summary

Implemented a complete email notification system that automatically sends customizable emails to customers when their PSA submissions progress through different steps.

### Backend Changes
- **Email Service** (`backend/src/services/emailService.js`)
  - Nodemailer integration for SMTP email sending
  - Template rendering with variable substitution ({{customer_name}}, {{submission_number}}, {{step_name}}, etc.)
  - Multi-customer support - sends to all linked customers in a submission
  - Error handling and delivery logging

- **Database Migration** (`backend/migrations/011_add_email_notifications.sql`)
  - `email_templates` table for storing customizable templates per PSA step
  - Added SMTP configuration fields to `companies` table
  - `email_logs` table for tracking email delivery status

- **Email Templates API** (`backend/src/routes/email-templates.js`)
  - CRUD endpoints for template management
  - Preview endpoint with sample data
  - Test email configuration endpoint
  - Email logs endpoint

- **PSA Service Integration** (`backend/src/services/psaService.js`)
  - Automatically triggers email notifications when submission step changes
  - Calculates progress percentage
  - Non-blocking - PSA updates succeed even if email fails

- **Companies API Updates** (`backend/src/routes/companies.js`)
  - Added SMTP configuration fields to settings endpoints

### Frontend Changes
- **Email Settings Page** (`frontend/src/pages/EmailSettings.jsx`)
  - SMTP configuration UI with enable/disable toggle
  - Quick setup presets for Gmail, Outlook, SendGrid, Mailgun
  - Test email functionality with success/error feedback
  - Company branding settings (logo URL, from email/name)
  - Link to template management

- **Email Templates Page** (`frontend/src/pages/EmailTemplates.jsx`)
  - Grid view of all templates with status indicators
  - Rich template editor modal with HTML and plain text support
  - Variable helper sidebar with copy-to-clipboard
  - Preview functionality with sample data
  - Shows missing templates for PSA steps
  - Enable/disable per template

- **Navigation Updates**
  - Added "Email" nav item in sidebar (`frontend/src/components/Layout.jsx`)
  - Added routes for `/email-settings` and `/email-templates` (`frontend/src/App.jsx`)
  - Updated API client with emailTemplates methods (`frontend/src/api/client.js`)

### Features
✅ **Automatic Email Notifications**
- Emails sent automatically when PSA step changes (Arrived → Grading → Shipped, etc.)
- All linked customers receive notifications
- Progress percentage included in emails

✅ **Customizable Templates**
- Create templates for each of the 8 PSA steps
- HTML and plain text versions
- Template variables: {{customer_name}}, {{submission_number}}, {{step_name}}, {{progress_percent}}, {{service_level}}, {{company_name}}, {{company_logo_url}}
- Enable/disable per template

✅ **SMTP Configuration**
- Support for any SMTP provider
- Quick presets for popular providers (Gmail, Outlook, SendGrid, Mailgun)
- Test email functionality before going live
- Secure password storage

✅ **Email Tracking**
- Logs all sent emails with status
- Error messages for failed deliveries
- Tracks recipient, subject, step name, timestamp

✅ **Company Branding**
- Custom from email and from name
- Company logo URL for email templates
- Fully customizable email content

### PSA Steps Supported
- Arrived
- Order Prep
- Research & ID
- Grading
- Assembly
- QA Check 1
- QA Check 2
- Shipped

## Test Plan
- [ ] Navigate to Email settings page from sidebar
- [ ] Configure SMTP settings (test with Gmail app password or SendGrid)
- [ ] Click test email button and verify email received
- [ ] Enable email notifications and save settings
- [ ] Navigate to Email Templates page
- [ ] Create template for "Arrived" step with custom message
- [ ] Create template for "Grading" step
- [ ] Enable both templates
- [ ] Create a new submission with linked customer
- [ ] Refresh submission from PSA (or manually set step)
- [ ] Verify customer receives email when step changes
- [ ] Check email logs endpoint for delivery status
- [ ] Test with multiple customers linked to same submission
- [ ] Verify all customers receive emails
- [ ] Test preview functionality in template editor
- [ ] Test variable substitution in emails
- [ ] Verify emails not sent if notifications disabled
- [ ] Verify emails not sent if template disabled
- [ ] Test error handling with invalid SMTP credentials

---

**Branch:** `claude/explore-capabilities-N5xLK`
**Target:** `main` (or your default branch)
