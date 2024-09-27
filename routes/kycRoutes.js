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
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    user.phoneNumber = phoneNumber;
    await user.save();

    res.status(200).send({ message: 'Phone number saved successfully' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Step 2: Select Security Questions
router.post('/kyc/select-questions', validateToken, async (req, res) => {
  const { email, selectedQuestions } = req.body;

  if (!email || !selectedQuestions || selectedQuestions.length !== 3) {
    return res.status(400).send({ message: 'Email and exactly 3 questions are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

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
  const { email, answers } = req.body;

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

    user.securityQuestions.forEach((questionObj, index) => {
      questionObj.answer = answers[index];
    });

    await user.save();
    res.status(200).send({ message: 'Security answers saved successfully' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

// Step 4: Edit Security Questions
router.put('/kyc/edit-questions', validateToken, async (req, res) => {
  const { email, newQuestions } = req.body;

  if (!email || !newQuestions || newQuestions.length !== 3) {
    return res.status(400).send({ message: 'Email and exactly 3 new questions are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: 'User not found' });
    }

    if (!user.securityQuestions || user.securityQuestions.length !== 3) {
      return res.status(400).send({ message: 'Security questions not set or incomplete' });
    }

    user.securityQuestions = newQuestions.map((question) => ({
      question,
      answer: '',
    }));

    await user.save();
    res.status(200).send({ message: 'Security questions updated successfully and answers reset' });
  } catch (error) {
    res.status(500).send({ message: error.message });
  }
});

module.exports = router;
