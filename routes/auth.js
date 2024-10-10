require('dotenv').config()
const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const nodemailer = require("nodemailer");
const OneTimePass = require("../models/OneTimePass"); // Ensure this is the correct path and model name


cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret: process.env.API_SECRET
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'user_logos',
    allowedFormats: ['jpg', 'png', 'jpeg'],
  },
});

const upload = multer({ storage: storage });

const generateOtp = async (email) => {
  const otp = Math.floor(1000 + Math.random() * 9000); // Generate OTP as a number
  const newOtp = new OneTimePass({ email, otp });
  await newOtp.save();
  return otp; // Return the generated OTP
};

const SendOTP = async (email, otp) => {
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
  });

  let info = await transporter.sendMail({
    from: '"Techguard" <no-reply@qstix.com.ng>',
    to: email,
    subject: "Your One Time password",
    html: `<html>
      <head>
        <title></title>
      </head>
      <body>
      <p><span style="font-size:11px;"><span style="font-family:verdana,geneva,sans-serif;">Hi&nbsp;<br />
      <br />
      Your One Time Password is : <strong>${otp}</strong></span></span></p>
      <p><span style="font-size:11px;"><span style="font-family:verdana,geneva,sans-serif;">This One time password Expires every 5 minutes.</span></span></p>
      <p><span style="font-size:11px;"><span style="font-family:verdana,geneva,sans-serif;">Regards,</span></span></p>
      <p><span style="font-size:11px;"><span style="font-family:verdana,geneva,sans-serif;">Techguard</span></span></p>
      <hr />
      </body>
      </html>`
  });

  console.log('OTP sent:', otp);
};

const validateToken = (req, res, next) => {
  const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
  if (!token) {
      return res.status(422).json({ message: "Please Provide Token!" });
  }
  // Token validation logic (e.g., JWT verification) can be added here.
  next();
};

const SendLoginNotification = async (email) => {
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
  });

  let info = await transporter.sendMail({
    from: '"Techguard" <no-reply@qstix.com.ng>',
    to: email,
    subject: "Login Notification",
    html: `<div align="center">
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
                not Initiated by you, send us an email at <b>hello@qstix.com.ng</b></font><br>
                <br>
                </font>
                <span style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none">
                <font size="2">Regards,</font></span><font size="2"><br>
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
};

const SendsignUpNotification = async (email) => {
  let transporter = nodemailer.createTransport({
    host: process.env.SMTP_SERVER,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
  });

  let info = await transporter.sendMail({
    from: '"Techguard" <no-reply@qstix.com.ng>',
    to: email,
    subject: "Registration complete!",
    html: `<html>
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
                  successfully. You can Now login to use the application.</span></font></span><font size="2"><br>
                  <br>
                  </font>
                  <span style="color: rgb(0, 0, 0); font-family: Verdana; font-style: normal; font-variant-ligatures: normal; font-variant-caps: normal; font-weight: 400; letter-spacing: normal; orphans: 2; text-align: start; text-indent: 0px; text-transform: none; white-space: normal; widows: 2; word-spacing: 0px; -webkit-text-stroke-width: 0px; text-decoration-thickness: initial; text-decoration-style: initial; text-decoration-color: initial; display: inline !important; float: none">
                  <font size="2">Regards,</font></span><font size="2"><br>
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
            <td><font face="Arial" size="1" color="#808080">Techguard Â© 2023 
            All rights Reserved</font></td>
          </tr>
        </table>
      </div>
      <p>&nbsp;</p>
      </body>
      </html>`
  });
};

router.post("/sign-up", async (req, res) => {
  try {
    // Check if the required fields are provided
    const { email, password, firstName, lastName } = req.body;
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).send({ message: "All fields are required" });
    }

    // Check if email already exists
    const emailExist = await User.findOne({ email });
    if (emailExist) {
      return res.status(400).send({ message: "Email already exists" });
    }

    // Generate salt and hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      balance: "0.00",
      teamType: null,
      ArtistName: null,
      phoneNumber: null,
      country: null,
      gender: null,
      recordLabelName: null
    });

    // Save user and send notification
    const savedUser = await user.save();
    SendsignUpNotification(email);

    // Send success response
    res.send({ message: "Registration successful", savedUser });
  } catch (err) {
    res.status(500).send({ message: "Server error", error: err.message });
  }
});

router.post("/sign-in", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) return res.status(400).send({ message: "User does not Exist" });

    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) return res.status(400).send({ message: "Wrong Password" });

    // Generate access token
    const accessToken = jwt.sign({ email: req.body.email }, process.env.JWT_SECRET, { expiresIn: "1h" });

    // Generate refresh token
    const refreshToken = jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

    SendLoginNotification(req.body.email);

    // Return tokens to client
    res.send({ message: "Login Successful", user, token: accessToken, refreshToken: refreshToken });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
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

function generateAccessToken(user) {
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '15m' }); // Access token expires in 15 minutes
}

// Generate a new refresh token
function generateRefreshToken(user) {
  return jwt.sign({ id: user._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: '7d' }); // Refresh token expires in 7 days
}

// Endpoint to maintain persistence
router.get("/maintainPersistence", async (req, res) => {
  try {
    const accessToken = req.headers.authorization?.split(" ")[1];
    const refreshToken = req.headers.refresh?.split(" ")[1];

    if (!accessToken) {
      return res.status(403).json({ message: "Please Provide Access Token!" });
    }

    // Verify the access token
    jwt.verify(accessToken, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        // If access token is invalid or expired, check refresh token
        if (!refreshToken) {
          return res.status(403).json({ message: "Please Provide Refresh Token!" });
        }

        try {
          // Verify the refresh token
          const decodedRefreshToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
          const dbUser = await User.findById(decodedRefreshToken.id);

          if (!dbUser) {
            return res.status(404).json({ message: "User not found!" });
          }

          // Generate new access token and refresh token
          const newAccessToken = jwt.sign({ email: dbUser.email }, process.env.JWT_SECRET, { expiresIn: "1h" });
          const newRefreshToken = jwt.sign({ id: dbUser._id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "7d" });

          return res.status(200).json({
            message: "Token Refreshed",
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
          });
        } catch (refreshTokenError) {
          return res.status(403).json({ message: "Invalid Refresh Token!" });
        }
      } else {
        // Token is valid, user is logged in
        return res.status(200).json({ message: "User is logged in" });
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
});


router.get("/checkProfileInformation/:email", async (req, res) => {
  try {
    // Get the email from URL parameters
    const userEmail = req.params.email;

    // Find the user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }

    // Check if any required fields are missing
    const requiredFields = ['firstName', 'lastName', 'email', 'password'];
    const missingFields = requiredFields.filter(field => !user[field]);

    if (missingFields.length > 0) {
      return res.status(200).json({ message: "Some Missing information on your Profile", missingFields });
    }

    return res.status(200).json({ message: "All information updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Internal server error" });
  }
});

router.patch("/updateTeam-details", upload.single('logo'), async (req, res) => {
  try {
    const email = req.body.email;
    const teamType = req.body.teamType;
    const ArtistName = req.body.ArtistName;
    const phoneNumber = req.body.phoneNumber;
    const country = req.body.country;
    const gender = req.body.gender;
    const recordLabelName = req.body.recordLabelName;

    if (teamType == "Artist") {
      const user = await User.findOneAndUpdate({ email: email }, { $set: { ArtistName: ArtistName, teamType: teamType, phoneNumber: phoneNumber, country: country, gender: gender, recordLabelName: null } }, { new: true });
      return res.send({ error: false, message: "Artist Details Updated Successfully", user });
    } else {
      const result = await cloudinary.uploader.upload(req.file.path);

      const user = await User.findOneAndUpdate({ email: email }, { $set: { ArtistName: null, teamType: teamType, phoneNumber: phoneNumber, country: country, gender: null, recordLabelName: recordLabelName, logoUrl: result.secure_url } }, { new: true });
      return res.send({ error: false, message: "Record Label Details Updated Successfully", user });
    }
  } catch (error) {
    res.status(404).json({ error: true, message: error.message });
  }
});


router.post("/sendotp-email", async (req, res) => {
  try {
    const { email } = req.body;
    const otp = await generateOtp(email); // Generate OTP
    await SendOTP(email, otp); // Send OTP to email

    return res.status(200).json({
      message: "OTP sent to your email address",
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while sending the OTP",
      error: error.message,
    });
  }
});


router.post("/verifyotp-email", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const otpEntry = await OneTimePass.findOne({ email, otp });

    if (!otpEntry) {
      return res.status(401).json({
        message: "Invalid OTP or email",
      });
    }

    await OneTimePass.deleteOne({ email, otp });

    return res.status(200).json({
      message: "Authorization Successful",
    });
  } catch (error) {
    return res.status(500).json({
      message: "An error occurred while verifying the OTP",
      error: error.message,
    });
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
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }
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
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "User not found!" });
    }
    const password = req.body.password;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await User.findOneAndUpdate({email : email}, {$set: {password : hashedPassword}});

    return res.send({ error: false, message: "Password Changed" });

  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});

router.get('/check-kyc/:email', validateToken, async (req, res) => {
  try {
    const { email } = req.params;
    
    // Find user by email
    const user = await User.findOne({ email });

    // If no user is found
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check KYC submission status
    if (user.isKycSubmitted) {
      return res.status(200).json({ 
        message: 'KYC submitted', 
        email: user.email,
        kycStatus: true 
      });
    } else {
      return res.status(200).json({ 
        message: 'KYC not submitted', 
        email: user.email,
        kycStatus: false 
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
