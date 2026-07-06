import { Router, Request, Response } from 'express';
import { Movie } from '../models/movie.model';
import { env } from '../config/environment';

const router = Router();

router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    // 1. Fetch available movies to ground the AI recommendations
    const movies = await Movie.find({});
    const moviesListStr = movies
      .map((m) => `- Title: "${m.title}", Genres: "${m.genres.join(', ')}", Description: "${m.description}", ID: "${m._id}"`)
      .join('\n');

    const systemInstructions = `You are "AgFlix AI Guide", a premium cinematic chatbot assistant for the AgFlix streaming platform.
Your purpose is to recommend movies to the user based on their mood, preferences, or questions.

Here is the EXACT list of movies currently available on AgFlix:
${moviesListStr}

Guidelines:
1. Recommend ONLY movies from the list above. Do not recommend movies that are not on this list.
2. In your recommendations, you MUST provide direct clickable links to watch the movies. Format the links exactly like: [Watch title](/watch/id) (e.g. [Watch Sintel](/watch/65fbc123abc456ef78901234)). Use the ID provided in the movie list.
3. Be friendly, enthusiastic, and concise. Format your responses in markdown (using bold text, lists, and spacing) to look clean.
4. If a user asks a general query or asks about movies not in the catalog, politely guide them back to AgFlix's available collection.`;

    // 2. Call Gemini API if Key is present
    const geminiApiKey = env.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

    if (geminiApiKey) {
      const contents: any[] = [];
      
      // Add history
      if (Array.isArray(history)) {
        for (const turn of history) {
          contents.push({
            role: turn.role === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }
      
      // Add current message
      contents.push({
        role: 'user',
        parts: [{ text: `${systemInstructions}\n\nUser request: ${message}` }]
      });

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (replyText) {
          return res.status(200).json({ success: true, reply: replyText });
        }
      }
      
      const errText = await response.text();
      console.error('Gemini API Error details:', errText);
    }

    // 3. Fallback Smart Rule-Based Recommendations (in case GEMINI_API_KEY is not configured or fails)
    const lowercaseMsg = message.toLowerCase();
    let reply = '';

    if (lowercaseMsg.includes('sci-fi') || lowercaseMsg.includes('future') || lowercaseMsg.includes('robot') || lowercaseMsg.includes('tears')) {
      const tearsOfSteel = movies.find(m => m.title.toLowerCase().includes('tears') || m.genres.some(g => g.toLowerCase().includes('sci-fi')));
      if (tearsOfSteel) {
        reply = `I highly recommend checking out **Tears of Steel**! It's a fantastic sci-fi visual effects project featuring giant robots and futuristic technology in Amsterdam.\n\n👉 [Watch Tears of Steel](/watch/${tearsOfSteel._id})`;
      }
    } else if (lowercaseMsg.includes('action') || lowercaseMsg.includes('chase') || lowercaseMsg.includes('sintel') || lowercaseMsg.includes('fantasy')) {
      const sintel = movies.find(m => m.title.toLowerCase().includes('sintel') || m.genres.some(g => g.toLowerCase().includes('fantasy')) || m.genres.some(g => g.toLowerCase().includes('action')));
      if (sintel) {
        reply = `If you love fantasy or action, you should definitely watch **Sintel**! It's an emotional, beautifully animated tale of a girl searching for her dragon.\n\n👉 [Watch Sintel](/watch/${sintel._id})`;
      }
    }

    if (!reply) {
      reply = `Hello! I am your **AgFlix AI Guide**. How can I help you today?

Here are some great movies currently streaming on AgFlix that you can watch right now:
${movies.map(m => `* **${m.title}** (${m.genres.join(', ')}) - [Watch now](/watch/${m._id})`).join('\n')}

Feel free to ask me to recommend something specific based on your mood!`;
    }

    return res.status(200).json({ success: true, reply });

  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'AI chat failed' });
  }
});

export default router;
