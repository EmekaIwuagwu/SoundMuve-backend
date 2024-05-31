const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
//const ip = require("ip");
const nodemailer = require("nodemailer");
const NewsLetterSub = require("../models/NewsLetterSub");


router.post("/send-newsLetter", async (req, res) => {
  try {
    if (
      !req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ") ||
      !req.headers.authorization.split(" ")[1]
    ) {
      return res.status(422).json({ message: "Please Provide Token!" });
    }

    const { subject, html, bcc } = req.body;

    if (!subject || !html || !bcc) {
      return res.status(400).json({ message: "Missing subject, html content, or bcc emails in the request body" });
    }

    let transporter = nodemailer.createTransport({
      host: "mail.qstix.com.ng",
      port: 465,
      secure: true,
      auth: {
        user: "no-reply@qstix.com.ng",
        pass: "EmekaIwuagwu87**"
      },
    })

    let info = await transporter.sendMail({
      from: '"No Reply" <no-reply@qstix.com.ng>', // sender address
      to: 'no-reply@qstix.com.ng', // single recipient for the 'to' field
      subject: subject, // Subject line
      html: html, // html body
      bcc: bcc // list of bcc recipients
    });

    res.status(200).json({ message: "Newsletter sent successfully", info });

  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

router.post("/subscribe-newsletter", async (req, res) => {
  try {
    if (
      !req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ") ||
      !req.headers.authorization.split(" ")[1]
    ) {
      return res.status(422).json({ message: "Please Provide Token!" });
    }

    const subNewsLetter = new NewsLetterSub({
      email: req.body.email
    });

    const saveNewsLetterEmail = await subNewsLetter.save();
    res.send({ message: "Subscribtion Complete!", saveNewsLetterEmail });


  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

router.post("/contact-us", async (req, res) => {
  try {
    const { subject, name, email, msg } = req.body;

    if (!subject || !name || !email || !msg) {
      return res.status(400).json({ message: "Missing subject, name, email, or message in the request body" });
    }

    let transporter = nodemailer.createTransport({
      host: "mail.qstix.com.ng",
      port: 465,
      secure: true,
      auth: {
        user: "no-reply@qstix.com.ng",
        pass: "EmekaIwuagwu87**"
      },
    });

    let info = await transporter.sendMail({
      from: `${name} <${email}>`, // sender address
      to: 'latham01@yopmail.com', // recipient address
      subject: 'New Message from Contact-Us', // Subject line
      html: `<p><strong>Name:</strong> ${name}</p>
             <p><strong>Email:</strong> ${email}</p>
             <p><strong>Message:</strong></p>
             <p>${msg}</p>`, // html body
    });

    res.status(200).json({ message: "Message sent successfully", info });
  } catch (error) {
    res.status(500).json({ message: "An error occurred while sending the message", error: error.message });
  }
});



module.exports = router;