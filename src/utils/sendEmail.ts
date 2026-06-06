import nodemailer from 'nodemailer';
import config from '../config/config';


const sendEmail = async ({ to, subject, html }: { to: string, subject: string, html: string }) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: config.email.emailAddress,
        pass: config.email.emailPass,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: config.email.emailAddress,
      to,
      subject,
      html,
    };

    await transporter.sendMail(mailOptions);
    console.log("Email sent successfully");
    return { success: true };
  } catch (error:any) {
    console.error("Email send error:", error.message);
    return { success: false, error: error.message };
  }
};

export default sendEmail;
