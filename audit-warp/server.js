// 📁 server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const PDFDocument = require('pdfkit');
const { OpenAI } = require('openai');
const pinataSDK = require('@pinata/sdk');

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: 'uploads/' });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinata = new pinataSDK(process.env.PINATA_API_KEY, process.env.PINATA_SECRET_API_KEY);

// POST /audit route
app.post('/audit', upload.single('file'), async (req, res) => {
  try {
    const inputCode = req.body.code;
    let code = inputCode;

    if (req.file) {
      code = fs.readFileSync(req.file.path, 'utf-8');
      fs.unlinkSync(req.file.path);
    }

    if (!code) return res.status(400).json({ error: 'No code provided.' });

    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: 'You are a smart blockchain security auditor.' },
        { role: 'user', content: `Audit this code:\n\n${code}` },
      ],
      model: 'gpt-4',
    });

    const auditResult = completion.choices[0].message.content;

    // Generate PDF
    const pdfPath = `audit_${Date.now()}.pdf`;
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream(pdfPath));
    doc.fontSize(20).text('Smart Contract Audit Report', { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`AI Result:\n\n${auditResult}`);
    doc.end();

    // Upload to Pinata
    const readableStream = fs.createReadStream(pdfPath);
    const ipfsResult = await pinata.pinFileToIPFS(readableStream);

    fs.unlinkSync(pdfPath);

    res.json({
      ipfsHash: ipfsResult.IpfsHash,
      ipfsUrl: `https://gateway.pinata.cloud/ipfs/${ipfsResult.IpfsHash}`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
