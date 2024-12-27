import express, { response } from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import FormData from 'form-data';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import cors from 'cors';
import firebird from 'node-firebird';

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json());

app.use(cors());
const storage = multer.memoryStorage();
const bddCredenciales = {
  host: '192.168.10.69',
  port: 3050,
  database: 'C:/CASAWIN/CSAAIWIN/Datos/CASA.GDB',
  user: 'Admin',
  password: 'admin',
  pageSize: 4096
};

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

app.post('/data', (req, res) => {
  const numPartSet = new Set();
  
  const { text, cveProveedor } = req.body;

  if(cveProveedor == 'VER106'){
      if (!/^\d+$/.test(text)) {
          return res.status(400).send('El numero de parte no es válido');
      }
  }else if(cveProveedor == 'ZSI'){
      if (!/\b[A-Z0-9]{6,10}\b/.test(text)) {
          return res.status(400).send('El numero de parte no es válido');
      }
  }else if(cveProveedor == 'TON23'){
      if (!/^\d+(-\d+)?$/.test(text) && !/^[A-Z0-9-]{6,25}$/.test(text)) {
          return res.status(400).send('El numero de parte no es válido');
      }
      console.log("TON23 verificado");
  }
  
  firebird.attach(bddCredenciales, (err, db) => {
      if (err) {
          console.log(err);
          return res.status(500).send('No se pudo conectar a la base de datos');
      }

      console.log("Conexion establecida a la base de datos");
      //Consulta para obtener todos los registros donde CVE_PROV sea 'VER106'
      db.query("SELECT fpar.CVE_PROV, fpar.DES_MERC, fpar.NUM_PART, fracc.NUM_FRACC, fracc.CVE_VINC, fracc.IMP_EXPO, fracc.EDO_MERC FROM CTRAC_FRACPAR fpar JOIN CTRAC_FRACC fracc ON fpar.ID_FRACC = fracc.ID_FRACC WHERE fpar.CVE_PROV = ? AND NUM_PART = ?", [cveProveedor, text], (err, result) => {
          if (err) {
              return res.status(500).send('Error al consultar');
          }
          console.log("Resultados obtenidos:", result);
          db.detach();
          
          const filteredResults = result.filter((row) => {
              if (numPartSet.has(row.NUM_PART)) {
                  return false;
              } else {
                  numPartSet.add(row.NUM_PART);
                  return true; 
              }
          });

           //Si hay resultados, los enviamos como JSON
           if (filteredResults.length > 0) {
              res.json(filteredResults); 
          } else {
              res.json([{
                CVE_PROV: cveProveedor || 'No disponible',
                NUM_PART: text || 'No disponible',
                DES_MERC: 'No disponible',
                NUM_FRACC: 'No disponible',
                CVE_VINC: 'No disponible',
                IMP_EXPO: 'No disponible',
                EDO_MERC: 'No disponible'
              }]); 
          }
          
      });
  });
});

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