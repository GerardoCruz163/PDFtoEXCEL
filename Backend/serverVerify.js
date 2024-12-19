import express, { response } from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { FormData } from 'node-fetch';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());

//conf de multer para cargar archivos
const upload = multer({ dest: path.join(__dirname, "uploads") });

//subir archivo PDF a Veryfi 
async function uploadToVeryfi(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    const formData = new FormData();
    formData.append("file", fileBuffer, path.basename(filePath));

    const headers = {
      ...formData.getHeaders(),
      "CLIENT-ID": "vrfWwde0xa8Ed8OhmJMaFa0jbpty3XHkZ7fzMJv",
      AUTHORIZATION: "apikey sistemas21:9e0c5d7cafee3fca84bee70bf41e79b8",
      Accept: "application/json",
    };

    // Realizar la solicitud POST a la API de Veryfi
    const response = await axios.post(
      "https://api.veryfi.com/api/v8/partner/documents/",
      formData,
      { headers }
    );

    console.log("Respuesta de Veryfi:", response.data);
    return response.data;
  } catch (error) {
    console.error(
      "Error al subir el archivo a Veryfi:",
      error.response?.data || error.message
    );
    throw error;
  }
}

//manejar la carga de archivos
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).send("No se subió ningún archivo.");
    }

    const filePath = path.join(__dirname, "uploads", req.file.filename);

    console.log("Archivo cargado exitosamente:", filePath);

    // Subir el archivo a Veryfi
    const veryfiResponse = await uploadToVeryfi(filePath);

    // Elimina el archivo temporal después de procesarlo
    fs.unlinkSync(filePath);

    res.status(200).json({
      message: "Archivo procesado exitosamente.",
      data: veryfiResponse,
    });
  } catch (error) {
    console.error("Error en la ruta /upload:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Inicia el servidor
const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en ${PORT}`);
});
