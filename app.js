const { Client, LocalAuth } = require('whatsapp-web.js');
const { GoogleGenerativeAI } = require("@google/generative-ai")
const dotenv = require('dotenv')
const qrcode =  require('qrcode-terminal')
const { google } = require('@ai-sdk/google');
const { generateText }= require ('ai');
const fs = require('fs');
const csv = require('csv-parser');

dotenv.config();

// === CONFIG WHATSAPP === //
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    browser: async () => await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox','--disable-setuid-sandbox']
    })
  }
});

// Charger les contacts depuis le fichier CSV
const contacts = [];
fs.createReadStream('contacts.csv')
  .pipe(csv())
  .on('data', (data) => contacts.push(data))
  .on('end', () => {
    console.log('Contacts chargés depuis le fichier CSV.');
  });

// Affiche QR
client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

// Prêt
client.on("ready", async () => {
  console.log("✅ Bot WhatsApp + Gemini prêt !");

  for (const contact of contacts) {
    let text;
    console.log(`Envoi du message initial à ${contact['Phone Number'].replace(/\s+/g, "").replace("+", "")}...`);
    let success = false;
    for (let i = 0; i < 3; i++) {
      try {
        const result = await generateText({
          model: google('gemini-1.5-flash'),
          prompt: "Génère un message d'accueil pour initier une conversation.",
          system: "tu es jule de la nationalite francaise, et tu as investir dans un plateforme de trading qui te permet de gagner de l'argent, le platerforme s'appelle taskyfinance. Ton objectif est de convaincre les utilisateur de rejoindre la plateforme. Commence la conversation de manière amicale et intrigante pour susciter leur intérêt sans immédiatement tout dévoiler. Parle en langage familier, aussi veuiller ne pas etre bcp plus directe, tu va aller petit a petit, le premier message doit etre un message d'accueil, et tu dois eviter de parler de taskyfinance dans le premier message, tu dois juste dire bonjour, demainde comment il va, et lui dire que tu as une opportunité de gagner de l'argent, et que tu aimerais lui en parler, mais sans trop en dire pour ne pas le brusquer.",
        });
        text = result.text;
        success = true;
        break;
      } catch (e) {
        console.error(`Erreur Gemini (essai ${i + 1}/3) lors de la génération du message initial :`, e);
        if (i === 2) {
          console.error("Échec de la génération du message initial après 3 essais.");
        }
      }
    }

    if (success) {
      const chatId = `${contact['Phone Number'].replace(/\s+/g, "").replace("+", "")}@c.us`;
      await client.sendMessage(chatId, text);
      console.log(`📤 Message initial généré par IA envoyé à ${contact['Phone Number'].replace(/\s+/g, "").replace("+", "")}`);
    }
  }
});

client.on("message", async (msg) => {
  console.log(`📩 ${msg.from} → ${msg.body}`);
  const chat = await client.getChatById(msg.from);
  const allMessages = await chat.fetchMessages({ limit: Infinity });
  console.log(allMessages);

  let text;
  let success = false;
  for (let i = 0; i < 10; i++) {
    try {
      const result = await generateText({
        model: google('gemini-1.5-flash'),
        prompt: `${allMessages.map(m => m.body).join('\n')}`,
        system: "tu es jule de la nationalite francaise, et tu as investir dans un plateforme de trading qui te permet de gagner de l'argent, le platerforme s'appelle taskyfinance, et les plateforme en question permet au membre de resevoir chaque jour les position plus sur que les utilisateur vos utiliser pour prendre de position de tranding gagnant, et il propose les plan de parrainange, votre objectif est de convaincre les utilisateur de rejoindre la plateforme taskyfinance, pourque tu fasse de profit, parce si tu reusi et amener une personne qui va gagner 7% sur sa mise, et si tu amene 10 personnes tu devient un ambasadeur du platephorme, a l'instant tu est sur whatsapp et tu discute avec un utilisateur qui te demande des information sur la plateforme taskyfinance, tu dois lui repondre de facon convaincant et le convaincre de rejoindre la plateforme taskyfinance, veuiller parler le langage famillier, sans bcp de mot, le site tasksyntx.com"
      });
      text = result.text;
      success = true;
      break;
    } catch (e) {
      console.error(`Erreur Gemini (essai ${i + 1}/3) pour la réponse :`, e);
      if (i === 9) {
        console.error("Échec de la génération de la réponse après 3 essais.");
        // msg.reply("Désolé, une erreur est survenue 😢");
      }
    }
  }

  if (success) {
    await msg.reply(text);
    console.log(`✅ Réponse envoyée`);
  }
});

client.initialize();
