const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
//const ip = require("ip");
const nodemailer = require("nodemailer");


const SendLoginNotification = async (email) =>{
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
    from : '"Techguard" <no-reply@qstix.com.ng>',
    to : email,
    subject : "Login Notification",
    html :
      `<div align="center">
      <table border="0" width="80%">
        <tr>
          <td>&nbsp;</td>
        </tr>
        <tr>
          <td style="border: 1px solid #03CA29; border-radius:7px; padding-left: 4px; padding-right: 4px; padding-top: 1px; padding-bottom: 1px">
          <div align="center">
            <table border="0" width="100%">
              <tr>
                <td>
              </tr>
              <tr>
                <td>&nbsp;</td>
              </tr>
              <tr>
                <td><font face="Calibri" size="5" color="#03CA29">You 
                Logged in!</font></td>
              </tr>
              <tr>
                <td>
                <font size="2">
                <span style="font-family: Verdana; letter-spacing: normal">
                A new Login has been detected by you.</span></font><p>
                <font size="2"><font face="Verdana">If This Login was 
                not Initiated by you, send us an email at <b>hello@qstix.com.ng</b></font><br style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 700; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial">
                <br style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial">
                </font>
                <span style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none">
                <font size="2">Regards,</font></span><font size="2"><br style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial">
                </font>
                <span style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none">
                <font size="2">TechGuard</font></span></p>
                <p>&nbsp;</td>
              </tr>
            </table>
          </div>
          </td>
        </tr>
        <tr>
          <td><hr></td>
        </tr>
        <tr>
          <td><font face="Arial" size="1" color="#808080">Techguard Â© 2023 All 
          rights Reserved</font></td>
        </tr>
      </table>
    </div>
    <p>&nbsp;</p>`
  });
}

const SendsignUpNotification = async (email) =>{

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
    from : '"Techguard" <no-reply@qstix.com.ng>',
    to : email,
    subject : "Registration complete!",
    html :
      `<html>

      <head>
      <meta http-equiv="Content-Language" content="en-us">
      <meta http-equiv="Content-Type" content="text/html; charset=windows-1252">
      <title>New Page 1</title>
      </head>
      
      <body>
      
      <div align="center">
        <table border="0" width="55%">
          <tr>
            <td>&nbsp;</td>
          </tr>
          <tr>
            <td style="border: 1px solid #03CA29; border-radius:7px; padding-left: 4px; padding-right: 4px; padding-top: 1px; padding-bottom: 1px">
            <div align="center">
              <table border="0" width="100%">
                <tr>
                  <td>
                </tr>
                <tr>
                  <td>&nbsp;</td>
                </tr>
                <tr>
                  <td><font face="Calibri" size="5" color="#03CA29">
                  Welcome!</font></td>
                </tr>
                <tr>
                  <td>
                  <span style="letter-spacing: normal"><font size="2">
                  <span style="font-family: Verdana">You registered 
                  successfully. You can Now login to use the application.</span></font></span><font size="2"><br style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 700; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial">
                  <br style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial">
                  </font>
                  <span style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none">
                  <font size="2">Regards,</font></span><font size="2"><br style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial">
                  </font>
                  <span style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none">
                  <font size="2">Techguard</font></span><p>&nbsp;</td>
                </tr>
              </table>
            </div>
            </td>
          </tr>
          <tr>
            <td><hr></td>
          </tr>
          <tr>
            <td><font face="Arial" size="1" color="#808080">Techguard © 2023 All 
            rights Reserved</font></td>
          </tr>
        </table>
      </div>
      <p>&nbsp;</p>
      
      </body>
      
      </html>`
  });
  
}

router.post("/sign-up", async (req, res) => {
  const emailExist = await User.findOne({ email: req.body.email });
  if (emailExist) return res.status(400).send({message: "Email Exists"});

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(req.body.password, salt);

  const user = new User({
    email: req.body.email,
    password: hashedPassword,
    phone: req.body.phone,
    balance: "0.00",
    fullname: req.body.fullname,
  });
  try {
    const savedUser = await user.save();
    SendsignUpNotification(req.body.email);
    res.send({ message: "Registration Successful", savedUser });
  } catch (err) {
    res.status(400).send({message : err});
  }
});

router.post("/sign-in", async (req, res) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) return res.status(400).send({message : "User does not Exist"});
  const validPass = await bcrypt.compare(req.body.password, user.password);
  if (!validPass) return res.status(400).send({message: "Wrong Password"});

  const token = jwt.sign({ email: req.body.email }, "migospay", {
    expiresIn: "1h",
  });

  SendLoginNotification(req.body.email);
  res.send({ message: "Login Successful", user ,token: token });
});

router.get("/get-info/:email", async (req, res) => {
  try {
    if (
      !req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ") ||
      !req.headers.authorization.split(" ")[1]
    ) {
      return res.status(422).json({ message: "Please Provide Token!" });
    }
    const user = await User.find({ email: req.params.email });
    res.status(200).json(user);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});


router.post("/reset-password", async (req, res) => {
  try {
    if (
      !req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ") ||
      !req.headers.authorization.split(" ")[1]
    ) {
      return res.status(422).json({ message: "Please Provide Token!" });
    }

    const email = req.body.email;
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await User.findOneAndUpdate({email : email}, {$set: {password : hashedPassword}});

    return res.send({ error: false, message: "Password Changed" });

  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    
    const email = req.body.email;
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await User.findOneAndUpdate({email : email}, {$set: {password : hashedPassword}});

    return res.send({ error: false, message: "Password Changed" });

  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

module.exports = router;