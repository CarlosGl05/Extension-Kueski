const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();

app.use(cors());
app.use(express.json());

// Configuración de la conexión a la base de datos de XAMPP
const db = mysql.createPool({
  host: 'mysql-39b03a90-dabrival03.b.aivencloud.com',
  user: 'avnadmin',
  port: '22746',     
  password: 'AVNS_ontfuibJigjnGFBKgBx',      
  database: 'kueski',
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
  if (!correo || !contrasena) return res.status(400).json({ error: 'Faltan campos.' });

  const query = `
    SELECT u.id_Usuario, u.nombre, u.p_apellido, dc.id_Kueski, dc.credito_disponible, dc.moroso
    FROM detalles_cuenta dc
    JOIN usuario u ON dc.id_Kueski = u.id_Kueski
    WHERE dc.correo = ? AND dc.contrasena = ?
  `;

  db.execute(query, [correo, contrasena], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error interno del servidor.' });
    if (results.length > 0) res.json({ success: true, usuario: results[0] });
    else res.status(401).json({ success: false, error: 'Correo o contraseña incorrectos.' });
  });
});

// ENDPOINT 2: Obtener datos de crédito y fecha de corte dinámica
app.get('/api/credito/:id_Kueski', (req, res) => {
  const { id_Kueski } = req.params;
  
  const query = `
    SELECT credito_disponible, moroso, dia_corte 
    FROM detalles_cuenta 
    WHERE id_Kueski = ?
  `;

  db.execute(query, [id_Kueski], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al consultar crédito.' });
    if (results.length === 0) return res.status(404).json({ error: 'Cuenta no encontrada.' });

    const { credito_disponible, moroso, dia_corte } = results[0];
    const limiteCredito = parseFloat(credito_disponible);
    const deudaActual = parseFloat(moroso);
    const saldoDisponibleCalculado = limiteCredito - deudaActual;

    // Lógica dinámica para la fecha de corte
    const calcularProximoPago = (dia) => {
      const hoy = new Date();
      let mesActual = hoy.getMonth();
      
      // Si el día de hoy ya superó el día de corte, el pago pasa al siguiente mes
      if (hoy.getDate() > dia) {
        mesActual++;
        if (mesActual > 11) mesActual = 0; 
      }
      
      const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      return `${dia} de ${meses[mesActual]}`;
    };

    res.json({ 
      creditoTotal: limiteCredito, 
      saldoDisponible: saldoDisponibleCalculado, 
      fechaCorte: calcularProximoPago(dia_corte || 15) // Fallback al 15 si es null
    });
  });
});

// ENDPOINT 3: Obtener los cupones de un usuario específico
app.get('/api/cupones/:id_Kueski', (req, res) => {
  const { id_Kueski } = req.params;
  const query = `SELECT codigo, descuento FROM beneficio WHERE id_Kueski = ? ORDER BY descuento DESC`;

  db.execute(query, [id_Kueski], (err, results) => {
    if (err) return res.status(500).json({ error: 'Error al consultar cupones.' });
    res.json({ success: true, cupones: results });
  });
});

// ENDPOINT 4: Agregar cupón verificando duplicados por usuario
app.post('/api/cupones', (req, res) => {
  const { codigo, id_Kueski } = req.body;
  if (!codigo || !id_Kueski) return res.status(400).json({ error: 'Faltan datos.' });

  const codigoNormalizado = codigo.toLowerCase();
  const formatoValido = codigoNormalizado.match(/^cupon(\d+)$/);

  if (!formatoValido) return res.status(400).json({ error: 'Formato inválido. Usa "cupon100".' });

  const descuento = parseInt(formatoValido[1], 10);
  const idBeneficio = 'B' + Math.floor(Math.random() * 10000);

  const query = `INSERT INTO beneficio (id_Beneficio, codigo, cashback, descuento, id_Kueski) VALUES (?, ?, 0, ?, ?)`;

  db.execute(query, [idBeneficio, codigoNormalizado, descuento, id_Kueski], (err, results) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ya tienes este cupón guardado en tu cuenta.' });
      if (err.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'Usuario inválido.' });
      return res.status(500).json({ error: 'Error interno guardando el cupón.' });
    }
    res.json({ success: true, descuento: descuento });
  });
});

// ENDPOINT 5: Simulador de Pagos
app.post('/api/simular', (req, res) => {
  const { id_Kueski, articulo, precio_directo } = req.body; 
  if (!id_Kueski) return res.status(400).json({ error: 'Faltan datos.' });

  const queryCredito = `SELECT credito_disponible, moroso FROM detalles_cuenta WHERE id_Kueski = ?`;
  
  db.execute(queryCredito, [id_Kueski], (errCredito, resCredito) => {
    if (errCredito || resCredito.length === 0) return res.status(500).json({ error: 'Error obteniendo crédito.' });

    const disponible = parseFloat(resCredito[0].credito_disponible) - parseFloat(resCredito[0].moroso);

    const procesarSimulacion = (precioFinal, nombreArticulo) => {
      if (disponible < precioFinal) return res.json({ success: false, mensaje: `Saldo insuficiente.` });
      const P = precioFinal;
      const r = 0.02; 
      const opcionesSimulacion = [];
      [0, 3, 6, 9, 12, 15].forEach(n => {
        if (n === 0) opcionesSimulacion.push({ quincenas: 0, pagoQuincenal: P, totalAPagar: P, etiqueta: "De Contado" });
        else {
          const pagoQuincenal = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
          opcionesSimulacion.push({ quincenas: n, pagoQuincenal: pagoQuincenal, totalAPagar: pagoQuincenal * n, etiqueta: `${n} Quincenas` });
        }
      });
      res.json({ success: true, articulo: nombreArticulo, precioOriginal: precioFinal, creditoDisponible: disponible, opciones: opcionesSimulacion });
    };

    if (precio_directo) procesarSimulacion(parseFloat(precio_directo), "Artículo de Amazon");
    else {
      const queryArticulo = `SELECT precio FROM kueski_pay_detalles WHERE articulo = ? LIMIT 1`;
      db.execute(queryArticulo, [articulo || 'ps5'], (errArt, resArt) => {
        if (errArt || resArt.length === 0) return res.status(500).json({ error: 'Artículo no encontrado.' });
        procesarSimulacion(parseFloat(resArt[0].precio), articulo);
      });
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
});