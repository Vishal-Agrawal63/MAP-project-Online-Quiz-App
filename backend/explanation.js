const express = require('express');
const axios = require('axios');
const router = express.Router();

router.post('/api/explanation', async (req, res) => {
    console.log('🔥 /api/explanation hit');
    console.log('Headers:', req.headers);
    console.log('Body:', req.body);
  const { question, answer } = req.body;
  console.log("Received:", { question, answer });
  if (!question || !answer) {
    return res.status(400).json({ error: 'Question and answer are required.' });
  }

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'openai/gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: `Explain why the answer "${answer}" is correct for the question: "${question}".`,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'My Quiz App'
        },
      }
    );

    const explanation = response.data.choices[0].message.content;
    console.log('AI Response:', response.data);
    res.json({ explanation });
  } catch (error) {
    console.error('OpenRouter API Error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch explanation from OpenRouter.' });
  }
});

module.exports = router;
