const express = require('express');
const router = express.Router();
const User = require('../models/User');


const validateToken = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(" ")[1];
    if (!token) {
        return res.status(422).json({ message: "Please Provide Token!" });
    }
    // Token validation logic (e.g., JWT verification) can be added here.
    next();
};

// Step 1: Submit phone number
router.post('/kyc/submit-phone', validateToken, async (req, res) => {
  const { phoneNumber, email } = req.body;

  if (!phoneNumber || !email) {
    return res.status(400).send({ message: 'Phone number and email are required' });
  }

  try {
    // Check if user exists with the provided email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Update user's phone number
    user.phoneNumber = phoneNumber;
    await user.save();

    res.status(200).send({ message: 'Phone number saved successfully' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Step 2: Select Security Questions
router.post('/kyc/select-questions', validateToken, async (req, res) => {
  const { email, selectedQuestions } = req.body; // Assume selectedQuestions is an array of question strings

  if (!email || !selectedQuestions || selectedQuestions.length !== 3) {
    return res.status(400).send({ message: 'Email and exactly 3 questions are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    // Initialize security questions array
    user.securityQuestions = selectedQuestions.map((question) => ({
      question,
      answer: '',
    }));

    await user.save();
    res.status(200).send({ message: 'Security questions selected successfully' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Step 3: Provide Answers to Security Questions
router.post('/kyc/submit-answers', validateToken, async (req, res) => {
  const { email, answers } = req.body; // Assume answers is an array of answers in the correct order

  if (!email || !answers || answers.length !== 3) {
    return res.status(400).send({ message: 'Email and exactly 3 answers are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    if (!user.securityQuestions || user.securityQuestions.length !== 3) {
      return res.status(400).send({ message: 'Security questions not found or incomplete' });
    }

    // Assign answers to the security questions
    user.securityQuestions.forEach((questionObj, index) => {
      questionObj.answer = answers[index];
    });

    await user.save();
    res.status(200).send({ message: 'Security answers saved successfully' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
