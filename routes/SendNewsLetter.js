const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
//const ip = require("ip");
const nodemailer = require("nodemailer");


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
            host : "mail.qstix.com.ng",
            port : 465,
            secure : true,
            auth :{
              user : "no-reply@qstix.com.ng",
              pass : "EmekaIwuagwu87**"
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


module.exports = router;