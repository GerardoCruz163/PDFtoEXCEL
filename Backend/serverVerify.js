import express, { response } from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());

// Asegurarse de que el directorio uploads exista
const uploadsDir = path.join(__dirname, "uploads");
const jsonDir = path.join(__dirname, "ResponseJSON");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(jsonDir)) {
  fs.mkdirSync(jsonDir);
}

// Configuración de multer para cargar archivos
const upload = multer({ dest: uploadsDir });

// Función para cargar el archivo PDF a Veryfi
async function uploadToVeryfi(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);

    const formData = new FormData();
    formData.append('file', fileBuffer, 'ACT_PDF.pdf');

    const headers = {
      ...formData.getHeaders(),
      'CLIENT-ID': 'vrfWwde0xa8Ed8OhmJMaFa0jbpty3XHkZ7fzMJv',
      AUTHORIZATION: `apikey sistemas21:9e0c5d7cafee3fca84bee70bf41e79b8`,
      Accept: 'application/json',
    };

    // Realizar la solicitud POST a la API de Veryfi
    const response = await axios.post(
      'https://api.veryfi.com/api/v8/partner/documents/',
      formData,
      { headers }
    );

    console.log('Respuesta de Veryfi:', response.data);
    return response.data;
  } catch (error) {
    console.error(
      'Error al subir el archivo a Veryfi:',
      error.response?.data || error.message
    );
    throw error;
  }
}

// Función para guardar el token en un archivo JSON
function saveTokenToFile(tokenData) {
  fs.writeFileSync(tokenFilePath, JSON.stringify(tokenData, null, 2));
}

// Manejar la carga de archivos
app.post('/upload', upload.single('file'), async (req, res) => {
  const fixedFilePath = path.join(uploadsDir, 'ACT_PDF.pdf');
  const jsonFilePath = path.join(jsonDir,'/PDF_EXPORT.json');

  try {
    if (!req.file) {
      return res.status(400).send('No se subió ningún archivo.');
    }

    // Renombrar el archivo subido a ACT_PDF.pdf
    fs.renameSync(req.file.path, fixedFilePath);
    console.log('Archivo cargado exitosamente:', fixedFilePath);

    // Subir el archivo a Veryfi
    const veryfiResponse = await uploadToVeryfi(fixedFilePath);

    // Guardar la respuesta en un archivo JSON
    fs.writeFileSync(jsonFilePath, JSON.stringify(veryfiResponse, null, 2));
    console.log('Respuesta guardada en:', jsonFilePath);

    res.status(200).json({
      message: 'Archivo procesado exitosamente.',
      data: veryfiResponse,
    });
  } catch (error) {
    console.error('Error en la ruta /upload:', error.message);

    // Eliminar el archivo en caso de error
    if (fs.existsSync(fixedFilePath)) {
      fs.unlinkSync(fixedFilePath);
    }

    res.status(500).json({ error: error.message });
  }
});

// Inicia el servidor
const PORT = 8081;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en ${PORT}`);
});