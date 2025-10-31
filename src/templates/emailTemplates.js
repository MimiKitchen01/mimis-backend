// Centralized email layout and templates with a single consistent header/footer

const brandName = "Mimi's Kitchen";
const supportEmail = 'support@mimiskitchenuk.com';
const primaryFrom = process.env.EMAIL_FROM || 'hello@mimiskitchenuk.com';
const frontendUrl = process.env.FRONTEND_URL || 'https://mimiskitchen.com';
const logoUrl = process.env.BRAND_LOGO_URL || '';

const baseStyles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background: #f7fafc; padding: 24px; line-height: 1.6; }
  .email-wrapper { max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 8px 28px rgba(0, 0, 0, 0.08); }
  .header { background: linear-gradient(135deg, #f8a035 0%, #ff8c42 100%); padding: 28px 28px; text-align: center; }
  .brand { display: inline-flex; align-items: center; gap: 10px; }
  .brand-logo { width: 36px; height: 36px; border-radius: 8px; background: rgba(255,255,255,0.2); display: inline-flex; align-items: center; justify-content: center; font-size: 20px; }
  .brand-name { color: #fff; font-size: 20px; font-weight: 700; letter-spacing: 0.3px; }
  .title { color: #fff; font-size: 22px; margin-top: 8px; font-weight: 600; }
  .content { padding: 28px; color: #2d3748; }
  .section { background: #ffffff; border: 1px solid #edf2f7; border-radius: 12px; padding: 20px; margin: 14px 0; }
  .button { display: inline-block; background: linear-gradient(135deg, #f8a035 0%, #ff8c42 100%); color: #fff !important; text-decoration: none; padding: 14px 24px; border-radius: 999px; font-weight: 600; box-shadow: 0 6px 18px rgba(248,160,53,0.35); }
  .muted { color: #4a5568; }
  .code { font-family: 'Courier New', monospace; font-weight: 800; font-size: 28px; letter-spacing: 6px; color: #f8a035; }
  .list { list-style: none; padding: 0; margin: 0; }
  .list li { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #edf2f7; }
  .total { text-align: right; font-weight: 700; margin-top: 10px; }
  .footer { background: #1a202c; color: #cbd5e0; text-align: center; padding: 22px; }
  .footer a { color: #fbd38d; text-decoration: none; }
`;

const layout = ({ heading, subtitle = '', contentHtml = '' }) => `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>${baseStyles}</style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="header">
          <div class="brand">
            ${logoUrl ? `<img class="brand-logo" src="${logoUrl}" alt="${brandName}" />` : `<div class="brand-logo">🍽️</div>`}
            <div class="brand-name">${brandName}</div>
          </div>
          <div class="title">${heading}</div>
          ${subtitle ? `<div class="muted" style="color:#fff;opacity:.9;margin-top:6px;">${subtitle}</div>` : ''}
        </div>
        <div class="content">
          ${contentHtml}
        </div>
        <div class="footer">
          <div>This is an automated message. Need help? <a href="mailto:${supportEmail}">${supportEmail}</a></div>
          <div style="margin-top:6px; opacity:.9;">${brandName} © ${new Date().getFullYear()}</div>
        </div>
      </div>
    </body>
  </html>
`;

export const getOTPTemplate = (otp, fullName) => {
  const content = `
    <div class="section">
      <div style="font-size:18px; font-weight:600; margin-bottom:8px;">Hello ${fullName}! 👋</div>
      <div class="muted" style="margin-bottom:16px;">
        Use the verification code below to complete your signup. This code expires in 10 minutes.
      </div>
      <div class="code" style="text-align:center; margin:14px 0;">${otp}</div>
      <div class="muted" style="font-size:13px;">For your security, never share this code.</div>
    </div>
  `;
  return layout({ heading: 'Email Verification', subtitle: 'Secure your account', contentHtml: content });
};

export const getWelcomeTemplate = (fullName) => {
  const content = `
    <div class="section">
      <div style="font-size:18px; font-weight:600; margin-bottom:8px;">Welcome, ${fullName}! 🎉</div>
      <div class="muted" style="margin-bottom:18px;">We’re thrilled to have you. Here’s what you can do next:</div>
      <ul class="list">
        <li><span>Browse and order delicious meals</span></li>
        <li><span>Save favorites and track orders</span></li>
        <li><span>Get personalized recommendations</span></li>
      </ul>
      <div style="margin-top:18px;">
        <a class="button" href="${frontendUrl}">Explore Menu</a>
      </div>
    </div>
  `;
  return layout({ heading: `Welcome to ${brandName}!`, subtitle: 'Your culinary journey starts here', contentHtml: content });
};

export const getOrderConfirmationTemplate = (order, user) => {
  const items = (order.items || []).map(item => `
    <li class="list-item"><span>${item.quantity}× ${item.product?.name || ''}</span><span>£${(item.price * item.quantity).toFixed(2)}</span></li>
  `).join('');
  const content = `
    <div class="section">
      <div style="margin-bottom:8px;">Hi ${user.fullName}, thanks for your order!</div>
      <div class="muted">Order #${order.orderNumber || order._id}</div>
      <ul class="list" style="margin-top:12px;">${items}</ul>
      <div class="total">Total: £${order.total.toFixed(2)}</div>
      <div style="margin-top:16px;"><a class="button" href="${frontendUrl}/orders/${order._id}">Track your order</a></div>
    </div>
  `;
  return layout({ heading: 'Order Confirmation', contentHtml: content });
};

export const getResetPasswordTemplate = (fullName, resetUrl) => {
  const content = `
    <div class="section">
      <div style="margin-bottom:8px;">Hi ${fullName},</div>
      <div class="muted">You requested a password reset. Click the button below to continue. The link expires in 1 hour.</div>
      <div style="margin-top:16px;"><a class="button" href="${resetUrl}">Reset Password</a></div>
    </div>
  `;
  return layout({ heading: 'Password Reset', contentHtml: content });
};

export const getPasswordResetConfirmationTemplate = (fullName) => {
  const content = `
    <div class="section">
      <div style="margin-bottom:8px;">Hi ${fullName},</div>
      <div class="muted">Your password was changed successfully. If this wasn’t you, contact support immediately.</div>
      <div style="margin-top:16px;"><a class="button" href="${frontendUrl}/login">Login</a></div>
    </div>
  `;
  return layout({ heading: 'Password Changed', contentHtml: content });
};

export const getResetOTPTemplate = (fullName, otp) => {
  const content = `
    <div class="section">
      <div style="margin-bottom:8px;">Hi ${fullName},</div>
      <div class="muted">Use this code to reset your password. It expires in 10 minutes.</div>
      <div class="code" style="text-align:center; margin:14px 0;">${otp}</div>
    </div>
  `;
  return layout({ heading: 'Password Reset Code', contentHtml: content });
};

export const getPaymentInitiatedTemplate = (order, user) => {
  const items = (order.items || []).map(item => `
    <li class="list-item"><span>${item.quantity}× ${item.product?.name || ''}</span><span>£${(item.price * item.quantity).toFixed(2)}</span></li>
  `).join('');
  const content = `
    <div class="section">
      <div>Hi ${user.fullName}, your payment has been initiated.</div>
      <ul class="list" style="margin-top:12px;">${items}</ul>
      <div class="total">Amount: £${order.total.toFixed(2)}</div>
    </div>
  `;
  return layout({ heading: 'Payment Initiated', contentHtml: content });
};

export const getPaymentSuccessTemplate = (order, user) => {
  const items = (order.items || []).map(item => `
    <li class="list-item"><span>${item.quantity}× ${item.product?.name || ''}</span><span>£${(item.price * item.quantity).toFixed(2)}</span></li>
  `).join('');
  const content = `
    <div class="section">
      <div>Thank you, ${user.fullName}! Your payment was successful.</div>
      <ul class="list" style="margin-top:12px;">${items}</ul>
      <div class="total">Total Paid: £${order.total.toFixed(2)}</div>
      <div style="margin-top:16px;"><a class="button" href="${frontendUrl}/orders/${order._id}">Track your order</a></div>
    </div>
  `;
  return layout({ heading: 'Payment Successful', contentHtml: content });
};

export const getPaymentFailedTemplate = (order, user) => {
  const items = (order.items || []).map(item => `
    <li class="list-item"><span>${item.quantity}× ${item.product?.name || ''}</span><span>£${(item.price * item.quantity).toFixed(2)}</span></li>
  `).join('');
  const content = `
    <div class="section">
      <div>Hi ${user.fullName}, unfortunately your payment failed.</div>
      <ul class="list" style="margin-top:12px;">${items}</ul>
      <div class="total">Amount: £${order.total.toFixed(2)}</div>
      <div style="margin-top:16px;"><a class="button" href="${frontendUrl}/orders/${order._id}/payment" style="background:#dc3545;">Try again</a></div>
    </div>
  `;
  return layout({ heading: 'Payment Failed', contentHtml: content });
};
