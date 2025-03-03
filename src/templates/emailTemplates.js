export const getOTPTemplate = (otp, fullName) => {
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
          <h1>Email Verification</h1>
        </div>
        <div class="content">
          <h2>Hello ${fullName}!</h2>
          <p>Thank you for registering with Mimi's Kitchen. To complete your registration, please use the following OTP code:</p>
          <div class="otp-code">${otp}</div>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
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

export const getWelcomeTemplate = (fullName) => {
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
        .button {
          display: inline-block;
          padding: 10px 20px;
          background-color: #f8a035;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
        }
        .features {
          margin: 20px 0;
          padding: 0;
          list-style: none;
        }
        .features li {
          margin: 10px 0;
          padding-left: 20px;
          position: relative;
        }
        .features li:before {
          content: "•";
          color: #f8a035;
          position: absolute;
          left: 0;
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
          <h1>Welcome to Mimi's Kitchen!</h1>
        </div>
        <div class="content">
          <h2>Dear ${fullName},</h2>
          <p>Thank you for joining Mimi's Kitchen! We're excited to have you as part of our family.</p>
          
          <p>Here's what you can do with your account:</p>
          <ul class="features">
            <li>Order delicious food from our menu</li>
            <li>Save your favorite dishes</li>
            <li>Track your orders in real-time</li>
            <li>Earn rewards with every order</li>
          </ul>

          <p>Ready to start ordering?</p>
          <a href="${process.env.FRONTEND_URL}" class="button">Browse Our Menu</a>

          <p>If you have any questions or need assistance, our customer service team is here to help.</p>
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
                <span>$${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
            
            <div class="total">
              Total: $${order.total.toFixed(2)}
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
