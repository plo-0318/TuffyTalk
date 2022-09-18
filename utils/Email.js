const nodemailer = require('nodemailer');
const fs = require('fs');
const { htmlToText } = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.username = user.username;
    this.from =
      process.env.NODE_ENV === 'production'
        ? process.env.EMAIL_SENDGRID_FROM
        : `Cece <${process.env.EMAIL_MAILTRAP_FROM}>`;
    this.url = url;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      return nodemailer.createTransport({
        service: 'sendGrid',
        auth: {
          user: process.env.EMAIL_SENDGRID_USERNAME,
          pass: process.env.EMAIL_SENDGRID_PASSWORD,
        },
      });
    }

    return nodemailer.createTransport({
      host: process.env.EMAIL_MAILTRAP_HOST,
      port: process.env.EMAIL_MAILTRAP_PORT,
      auth: {
        user: process.env.EMAIL_MAILTRAP_USERNAME,
        pass: process.env.EMAIL_MAILTRAP_PASSWORD,
      },
    });
  }

  async send(template, subject) {
    let html = await fs.promises.readFile(
      `${__dirname}/../views/email/${template}.html`,
      'utf-8'
    );

    html = html.replace(/##URL##/g, this.url);

    const mailOptions = {
      from: this.from,
      to: this.to,
      subject,
      html,
      text: htmlToText(html),
    };

    await this.newTransport().sendMail(mailOptions);
  }

  async sendVerifyEmail() {
    await this.send('verifyEmail', 'Verify your email');
  }

  async sendPasswordReset() {
    await this.send('passwordReset', 'Your password reset link');
  }
};
