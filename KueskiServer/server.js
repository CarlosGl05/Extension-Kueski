const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();

// Configuraciones iniciales
app.use(cors());
app.use(express.json());

// 1. Configuración de la conexión a la base de datos
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',      
  password: '',      
  database: 'kueskipro',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error al conectar a la base de datos de XAMPP:', err.message);
  } else {
    console.log('🔌 Conectado exitosamente a la base de datos MySQL (kueskipro) en XAMPP.');
    connection.release();
  }
});

// ENDPOINT 1: Validación de Inicio de Sesión
app.post('/api/login', (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res.status(400).json({ error: 'Por favor, ingresa todos los campos.' });
  }

  const query = `
    SELECT u.id_Usuario, u.nombre, u.p_apellido, dc.id_Kueski, dc.credito_disponible 
    FROM Detalles_Cuenta dc
    JOIN Usuario u ON dc.id_Kueski = u.id_Kueski
    WHERE dc.correo = ? AND dc.contrasena = ?
  `;

  db.execute(query, [correo, contrasena], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error interno del servidor.' });
    }

    if (results.length > 0) {
      res.json({ success: true, usuario: results[0] });
    } else {
      res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos.' });
    }
  });
});

// ENDPOINT 2: Obtener datos de la línea de crédito
app.get('/api/credito/:id_Kueski', (req, res) => {
  const { id_Kueski } = req.params;

  const query = `
    SELECT credito_disponible, moroso 
    FROM Detalles_Cuenta 
    WHERE id_Kueski = ?
  `;

  db.execute(query, [id_Kueski], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Error al consultar la información de crédito.' });
    }

    if (results.length === 0) {
      return res.status(404).json({ error: 'Información de cuenta no encontrada.' });
    }

    const { credito_disponible, moroso } = results[0];
    
    const limiteCredito = parseFloat(credito_disponible);
    const deudaActual = parseFloat(moroso);
    const saldoDisponibleCalculado = limiteCredito - deudaActual;

    res.json({
      creditoTotal: limiteCredito,
      saldoDisponible: saldoDisponibleCalculado,
      fechaCorte: "22 de abril de 2026"
    });
  });
});

// ENDPOINT 3: Registrar un nuevo cupón
app.post('/api/cupones', (req, res) => {
  const { codigo } = req.body;

  if (!codigo) {
    return res.status(400).json({ error: 'El código no puede estar vacío.' });
  }

  const codigoNormalizado = codigo.toLowerCase();
  const formatoValido = codigoNormalizado.match(/^cupon(\d+)$/);

  if (!formatoValido) {
    return res.status(400).json({ 
      error: 'Formato inválido. Usa el formato "cupon100", "cupon200", etc.' 
    });
  }

  const descuento = parseInt(formatoValido[1], 10);
  const idBeneficio = 'B' + Math.floor(Math.random() * 10000);

  const query = `
    INSERT INTO Beneficio (id_Beneficio, codigo, cashback, descuento) 
    VALUES (?, ?, 0, ?)
  `;

  db.execute(query, [idBeneficio, codigoNormalizado, descuento], (err, results) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(400).json({ error: 'Este cupón ya está registrado en la base de datos.' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Error interno guardando el cupón.' });
    }

    res.json({
      success: true,
      descuento: descuento
    });
  });
});

// ENDPOINT 4: Simulador de Pagos (Actualizado con múltiples planes)
app.post('/api/simular', (req, res) => {
  const { id_Kueski, articulo } = req.body;

  if (!id_Kueski || !articulo) {
    return res.status(400).json({ error: 'Faltan datos para la simulación.' });
  }

  const queryCredito = `SELECT credito_disponible, moroso FROM Detalles_Cuenta WHERE id_Kueski = ?`;
  
  db.execute(queryCredito, [id_Kueski], (errCredito, resCredito) => {
    if (errCredito || resCredito.length === 0) {
      return res.status(500).json({ error: 'Error obteniendo crédito del usuario.' });
    }

    const disponible = parseFloat(resCredito[0].credito_disponible) - parseFloat(resCredito[0].moroso);

    const queryArticulo = `SELECT precio FROM Kueski_pay_detalles WHERE articulo = ? LIMIT 1`;
    
    db.execute(queryArticulo, [articulo], (errArt, resArt) => {
      if (errArt || resArt.length === 0) {
        return res.status(500).json({ error: 'Artículo no encontrado en la base de datos.' });
      }

      const precio = parseFloat(resArt[0].precio);

      if (disponible < precio) {
        return res.json({
          success: false,
          mensaje: `Tu saldo disponible ($${disponible.toFixed(2)}) es insuficiente para cubrir el costo de $${precio.toFixed(2)}.`
        });
      }

      // Matemáticas para múltiples planes
      const P = precio;
      const r = 0.02; // Tasa de interés quincenal (2%)
      const planesQuincenas = [0, 3, 6, 9, 12, 15]; // 0 representa "De Contado"
      const opcionesSimulacion = [];

      planesQuincenas.forEach(n => {
        if (n === 0) {
          // Pago de contado (sin intereses)
          opcionesSimulacion.push({
            quincenas: 0,
            pagoQuincenal: P,
            totalAPagar: P,
            etiqueta: "De Contado"
          });
        } else {
          // Fórmula de amortización
          const pagoQuincenal = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          const totalAPagar = pagoQuincenal * n;
          opcionesSimulacion.push({
            quincenas: n,
            pagoQuincenal: pagoQuincenal,
            totalAPagar: totalAPagar,
            etiqueta: `${n} Quincenas`
          });
        }
      });

      res.json({
        success: true,
        articulo: articulo,
        precioOriginal: precio,
        opciones: opcionesSimulacion // Devolvemos el arreglo completo
      });
    });
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});