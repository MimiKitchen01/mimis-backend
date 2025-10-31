export const getOTPTemplate = (otp, fullName) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
          padding: 40px 20px;
          line-height: 1.6;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #f8a035 0%, #ff8c42 100%);
          padding: 40px 30px;
          text-align: center;
          position: relative;
        }
        .header::before {
          content: '🍳';
          font-size: 48px;
          display: block;
          margin-bottom: 10px;
        }
        .header h1 {
          color: #ffffff;
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .content {
          padding: 40px 30px;
          background: #ffffff;
        }
        .greeting {
          font-size: 22px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 16px;
        }
        .message {
          font-size: 16px;
          color: #4a5568;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .otp-container {
          background: linear-gradient(135deg, #fff5e6 0%, #ffe8cc 100%);
          border: 2px dashed #f8a035;
          border-radius: 12px;
          padding: 30px;
          margin: 30px 0;
          text-align: center;
        }
        .otp-label {
          font-size: 14px;
          color: #718096;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          font-weight: 600;
        }
        .otp-code {
          font-size: 42px;
          font-weight: 800;
          color: #f8a035;
          letter-spacing: 12px;
          font-family: 'Courier New', monospace;
          text-shadow: 0 2px 4px rgba(248, 160, 53, 0.2);
        }
        .expiry-notice {
          background: #fff3cd;
          border-left: 4px solid #ffc107;
          padding: 16px;
          margin: 24px 0;
          border-radius: 4px;
          font-size: 14px;
          color: #856404;
        }
        .security-note {
          font-size: 14px;
          color: #718096;
          padding: 20px;
          background: #f7fafc;
          border-radius: 8px;
          margin-top: 24px;
        }
        .footer {
          background: #2d3748;
          padding: 30px;
          text-align: center;
          color: #cbd5e0;
        }
        .footer-text {
          font-size: 13px;
          margin-bottom: 8px;
        }
        .footer-brand {
          font-size: 14px;
          font-weight: 600;
          color: #f8a035;
          margin-top: 12px;
        }
        @media only screen and (max-width: 600px) {
          .email-wrapper { border-radius: 0; }
          .content, .header { padding: 30px 20px; }
          .otp-code { font-size: 36px; letter-spacing: 8px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>Email Verification</h1>
        </div>
        <div class="content">
          <div class="greeting">Hello ${fullName}! 👋</div>
          <p class="message">
            Thank you for joining <strong>Mimi's Kitchen</strong>! We're excited to have you on board. 
            To complete your registration and start ordering delicious meals, please verify your email address.
          </p>
          
          <div class="otp-container">
            <div class="otp-label">Your Verification Code</div>
            <div class="otp-code">${otp}</div>
          </div>
          
          <div class="expiry-notice">
            ⏱️ <strong>Important:</strong> This code will expire in <strong>10 minutes</strong>.
          </div>
          
          <div class="security-note">
            🔒 <strong>Security Tip:</strong> Never share this code with anyone. Our team will never ask for your verification code.
            If you didn't request this code, please ignore this email or contact our support team.
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">This is an automated message, please do not reply to this email.</p>
          <p class="footer-text">Need help? Contact us at support@mimiskitchenuk.com</p>
          <div class="footer-brand">Mimi's Kitchen © ${new Date().getFullYear()}</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getWelcomeTemplate = (fullName) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
          padding: 40px 20px;
          line-height: 1.6;
        }
        .email-wrapper {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #f8a035 0%, #ff8c42 100%);
          padding: 50px 30px;
          text-align: center;
          position: relative;
        }
        .header::before {
          content: '🎉';
          font-size: 64px;
          display: block;
          margin-bottom: 15px;
        }
        .header h1 {
          color: #ffffff;
          font-size: 32px;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header p {
          color: #fff;
          font-size: 16px;
          margin-top: 10px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
          background: #ffffff;
        }
        .greeting {
          font-size: 24px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          color: #4a5568;
          margin-bottom: 30px;
          line-height: 1.8;
        }
        .features-section {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          padding: 30px;
          border-radius: 12px;
          margin: 30px 0;
        }
        .features-title {
          font-size: 18px;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 20px;
          text-align: center;
        }
        .features {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .features li {
          padding: 15px;
          margin: 10px 0;
          background: #ffffff;
          border-radius: 8px;
          border-left: 4px solid #f8a035;
          font-size: 15px;
          color: #4a5568;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: transform 0.2s;
        }
        .features li::before {
          content: '✓';
          display: inline-block;
          width: 24px;
          height: 24px;
          background: linear-gradient(135deg, #f8a035 0%, #ff8c42 100%);
          color: white;
          border-radius: 50%;
          text-align: center;
          line-height: 24px;
          font-weight: bold;
          flex-shrink: 0;
        }
        .cta-section {
          text-align: center;
          margin: 40px 0;
        }
        .cta-text {
          font-size: 18px;
          color: #2d3748;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .button {
          display: inline-block;
          padding: 16px 40px;
          background: linear-gradient(135deg, #f8a035 0%, #ff8c42 100%);
          color: white !important;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 15px rgba(248, 160, 53, 0.3);
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(248, 160, 53, 0.4);
        }
        .support-box {
          background: #e6fffa;
          border: 2px solid #81e6d9;
          border-radius: 8px;
          padding: 20px;
          margin-top: 30px;
          text-align: center;
          font-size: 14px;
          color: #234e52;
        }
        .footer {
          background: #2d3748;
          padding: 30px;
          text-align: center;
          color: #cbd5e0;
        }
        .footer-text {
          font-size: 13px;
          margin-bottom: 8px;
        }
        .footer-brand {
          font-size: 14px;
          font-weight: 600;
          color: #f8a035;
          margin-top: 12px;
        }
        @media only screen and (max-width: 600px) {
          .email-wrapper { border-radius: 0; }
          .content, .header { padding: 30px 20px; }
          .features-section { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <h1>Welcome to Mimi's Kitchen!</h1>
          <p>Your culinary journey starts here</p>
        </div>
        <div class="content">
          <div class="greeting">Hello ${fullName}! 👋</div>
          <p class="message">
            We're absolutely thrilled to welcome you to the <strong>Mimi's Kitchen</strong> family! 
            Your account is now active and you're all set to explore our delicious offerings.
          </p>
          
          <div class="features-section">
            <div class="features-title">🍽️ What You Can Do Now</div>
            <ul class="features">
              <li>Browse and order from our extensive menu of delicious dishes</li>
              <li>Save your favorite items for quick reordering</li>
              <li>Track your orders in real-time from kitchen to doorstep</li>
              <li>Earn loyalty rewards and exclusive discounts with every order</li>
              <li>Get personalized recommendations based on your preferences</li>
            </ul>
          </div>
          
          <div class="cta-section">
            <p class="cta-text">🚀 Ready to place your first order?</p>
            <a href="${process.env.FRONTEND_URL || 'https://mimiskitchen.com'}" class="button">
              Explore Our Menu
            </a>
          </div>
          
          <div class="support-box">
            💬 <strong>Need Help?</strong><br>
            Our customer support team is here for you 24/7.<br>
            Reach us at <strong>support@mimiskitchenuk.com</strong>
          </div>
        </div>
        <div class="footer">
          <p class="footer-text">Thank you for choosing Mimi's Kitchen!</p>
          <p class="footer-text">This is an automated message, please do not reply to this email.</p>
          <div class="footer-brand">Mimi's Kitchen © ${new Date().getFullYear()}</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getOrderConfirmationTemplate = (order, user) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* ... existing styles ... */
        .order-details {
          margin: 20px 0;
          border: 1px solid #dddddd;
          padding: 15px;
          border-radius: 5px;
        }
        .order-item {
          display: flex;
          justify-content: space-between;
          padding: 10px 0;
          border-bottom: 1px solid #eeeeee;
        }
        .total {
          font-weight: bold;
          margin-top: 15px;
          text-align: right;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Confirmation</h1>
        </div>
        <div class="content">
          <h2>Thank you for your order, ${user.fullName}!</h2>
          <p>Order ID: ${order._id}</p>
          
          <div class="order-details">
            ${order.items.map(item => `
              <div class="order-item">
                <span>${item.quantity}x ${item.product.name}</span>
                <span>£${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            
            <div class="total">
              Total: £${order.total.toFixed(2)}
            </div>
          </div>

          <p>Estimated delivery time: 30-45 minutes</p>
          <p>Delivery Address:</p>
          <p>${order.deliveryAddress.street}<br>
             ${order.deliveryAddress.city}, ${order.deliveryAddress.state}<br>
             ${order.deliveryAddress.zipCode}</p>

          <a href="${process.env.FRONTEND_URL}/orders/${order._id}" class="button">Track Your Order</a>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Mimi's Kitchen. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getResetPasswordTemplate = (fullName, resetUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* ...existing styles... */
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${fullName}!</h2>
          <p>You recently requested to reset your password. Click the button below to reset it:</p>
          
          <a href="${resetUrl}" class="button">Reset Password</a>
          
          <p>This password reset link will expire in 1 hour.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Mimi's Kitchen. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getPasswordResetConfirmationTemplate = (fullName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        /* ...existing styles... */
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Successful</h1>
        </div>
        <div class="content">
          <h2>Hello ${fullName}!</h2>
          <p>Your password has been successfully reset.</p>
          <p>If you did not perform this action, please contact our support team immediately.</p>
          
          <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Mimi's Kitchen. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getResetOTPTemplate = (fullName, otp) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .header {
          background-color: #f8a035;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          background-color: #ffffff;
          border: 1px solid #dddddd;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          color: #f8a035;
          margin: 20px 0;
          letter-spacing: 5px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset</h1>
        </div>
        <div class="content">
          <h2>Hello ${fullName}!</h2>
          <p>You have requested to reset your password. Use the following OTP code to proceed:</p>
          <div class="otp-code">${otp}</div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this reset, please ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Mimi's Kitchen. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getPaymentInitiatedTemplate = (order, user) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
     <style>
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .header {
          background-color: #f8a035;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          background-color: #ffffff;
          border: 1px solid #dddddd;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          color: #f8a035;
          margin: 20px 0;
          letter-spacing: 5px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Initiated</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.fullName}!</h2>
          <p>Your payment for order #${order.orderNumber} has been initiated.</p>
          
          <div class="order-details">
            ${order.items.map(item => `
              <div class="order-item">
                <img src="${item.product.imageUrl}" style="width: 50px; height: 50px; object-fit: cover;">
                <span>${item.quantity}x ${item.product.name}</span>
                <span>£${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            
            <div class="total">
              Total Amount: £${order.total.toFixed(2)}
            </div>
          </div>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getPaymentSuccessTemplate = (order, user) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
     <style>
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .header {
          background-color: #f8a035;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          background-color: #ffffff;
          border: 1px solid #dddddd;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          color: #f8a035;
          margin: 20px 0;
          letter-spacing: 5px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Payment Successful!</h1>
        </div>
        <div class="content">
          <h2>Thank you, ${user.fullName}!</h2>
          <p>Your payment for order #${order.orderNumber} has been successfully processed.</p>
          
          <div class="order-details">
            ${order.items.map(item => `
              <div class="order-item">
                <img src="${item.product.imageUrl}" style="width: 50px; height: 50px; object-fit: cover;">
                <span>${item.quantity}x ${item.product.name}</span>
                <span>£${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            
            <div class="total">
              Total Paid: £${order.total.toFixed(2)}
            </div>
          </div>

          <a href="${process.env.FRONTEND_URL}/orders/${order._id}" class="button">Track Your Order</a>
        </div>
        <div class="footer">
          <p>Thank you for choosing our service!</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const getPaymentFailedTemplate = (order, user) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
     <style>
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          font-family: Arial, sans-serif;
        }
        .header {
          background-color: #f8a035;
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 5px 5px 0 0;
        }
        .content {
          padding: 20px;
          background-color: #ffffff;
          border: 1px solid #dddddd;
        }
        .otp-code {
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          color: #f8a035;
          margin: 20px 0;
          letter-spacing: 5px;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666666;
          font-size: 12px;
        }
      </style>
      <style>
        /* Use existing styles */
        ${getCommonStyles()}
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header" style="background-color: #dc3545;">
          <h1>Payment Failed</h1>
        </div>
        <div class="content">
          <h2>Hello ${user.fullName},</h2>
          <p>Unfortunately, the payment for your order #${order.orderNumber} was unsuccessful.</p>
          
          <div class="order-details">
            ${order.items.map(item => `
              <div class="order-item">
                <img src="${item.product.imageUrl}" style="width: 50px; height: 50px; object-fit: cover;">
                <span>${item.quantity}x ${item.product.name}</span>
                <span>£${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            
            <div class="total">
              Total Amount: £${order.total.toFixed(2)}
            </div>
          </div>

          <p style="color: #dc3545; font-weight: bold;">Please try again with a different payment method.</p>
          
          <a href="${process.env.FRONTEND_URL}/orders/${order._id}/payment" 
             class="button" 
             style="background-color: #dc3545;">
            Try Payment Again
          </a>

          <p>If you continue to experience issues, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>This is an automated message, please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} Mimi's Kitchen. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Helper function for common styles
const getCommonStyles = () => `
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
  }
  .header {
    color: white;
    padding: 20px;
    text-align: center;
    border-radius: 5px 5px 0 0;
  }
  .content {
    padding: 20px;
    background-color: #ffffff;
    border: 1px solid #dddddd;
  }
  .order-details {
    margin: 20px 0;
    border: 1px solid #dddddd;
    padding: 15px;
    border-radius: 5px;
  }
  .order-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #eeeeee;
  }
  .total {
    font-weight: bold;
    margin-top: 15px;
    text-align: right;
  }
  .button {
    display: inline-block;
    padding: 10px 20px;
    color: white;
    text-decoration: none;
    border-radius: 5px;
    margin: 20px 0;
  }
  .footer {
    text-align: center;
    padding: 20px;
    color: #666666;
    font-size: 12px;
  }
`;
