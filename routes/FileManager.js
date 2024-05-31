const router = require("express").Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
//const ip = require("ip");
const nodemailer = require("nodemailer");
const DashboardFileManager = require("../models/DashboardFileManager");

router.post("/submit-album", async (req, res) => {
  try {
    if (
      !req.headers.authorization ||
      !req.headers.authorization.startsWith("Bearer ") ||
      !req.headers.authorization.split(" ")[1]
    ) {
      return res.status(422).json({ message: "Please Provide Token!" });
    }

    const submitAlbum = new DashboardFileManager({
      email: req.body.email,
      fileName : req.body.fileName,
      fileUrl : req.body.fileUrl
    });

    const submitAlbumOn = await submitAlbum.save();
    res.send({ message: "Subscribtion Complete!", submitAlbumOn });


  } catch (error) {
    res.status(404).json({ message: error.message });
  }
});


module.exports = router;