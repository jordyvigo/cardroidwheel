require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors()); // Ajusta esto para limitar accesos según el dominio de tu frontend
app.use(express.json());

// Conexión a MongoDB (MongoDB Atlas)
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Conectado a MongoDB Atlas"))
  .catch((err) => console.error("Error al conectar a MongoDB Atlas:", err));

// Esquema de ejemplo para giros y premios
const userSchema = new mongoose.Schema({
  plate: { type: String, required: true },
  spinsAvailable: { type: Number, default: 1 },
  prizes: [
    {
      text: String,
      expiry: Date,
      claimed: { type: Boolean, default: false },
    },
  ],
});

const User = mongoose.model("User", userSchema);

// Rutas
app.post("/api/register", async (req, res) => {
  const { plate } = req.body;
  try {
    const existingUser = await User.findOne({ plate });
    if (existingUser) {
      return res.status(400).json({ message: "Usuario ya registrado." });
    }
    const newUser = new User({ plate });
    await newUser.save();
    res.status(201).json({ message: "Usuario registrado exitosamente.", user: newUser });
  } catch (err) {
    res.status(500).json({ message: "Error al registrar el usuario.", error: err.message });
  }
});

app.post("/api/share", async (req, res) => {
  const { plate } = req.body;
  try {
    const user = await User.findOne({ plate });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    if (user.spinsAvailable > 0) {
      return res.status(400).json({ message: "Ya tienes giros disponibles." });
    }
    user.spinsAvailable += 1;
    await user.save();
    res.status(200).json({ message: "Giro añadido por compartir.", spinsAvailable: user.spinsAvailable });
  } catch (err) {
    res.status(500).json({ message: "Error al procesar el giro.", error: err.message });
  }
});

app.get("/api/user/:plate", async (req, res) => {
  const { plate } = req.params;
  try {
    const user = await User.findOne({ plate });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    res.status(200).json(user);
  } catch (err) {
    res.status(500).json({ message: "Error al obtener datos del usuario.", error: err.message });
  }
});

app.post("/api/redeem", async (req, res) => {
  const { plate, prizeText } = req.body;
  try {
    const user = await User.findOne({ plate });
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado." });
    }
    const prize = user.prizes.find((p) => p.text === prizeText && !p.claimed);
    if (!prize) {
      return res.status(404).json({ message: "Premio no encontrado o ya canjeado." });
    }
    prize.claimed = true;
    await user.save();
    res.status(200).json({ message: "Premio canjeado exitosamente." });
  } catch (err) {
    res.status(500).json({ message: "Error al canjear el premio.", error: err.message });
  }
});

// Exporta la aplicación para Vercel
module.exports = app;
