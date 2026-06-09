# 🟦 KueskiPro — Extensión de Chrome para Kueski Pay

> Extensión funcional de Google Chrome que integra **Kueski Pay** directamente en Amazon, permitiendo a los usuarios consultar su línea de crédito, simular planes de pago, gestionar cupones y activar cashback sin salir de la tienda.

---

## 📋 Tabla de Contenidos

- [Descripción General](#-descripción-general)
- [Características](#-características)
- [Arquitectura del Proyecto](#-arquitectura-del-proyecto)
- [Tecnologías Utilizadas](#-tecnologías-utilizadas)
- [Base de Datos](#-base-de-datos)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Uso de la Extensión](#-uso-de-la-extensión)
- [API Endpoints](#-api-endpoints)
- [Estructura de Archivos](#-estructura-de-archivos)
- [Integrantes del Proyecto](#-integrantes-del-proyecto)

---

## 📖 Descripción General

**KueskiPro** es una extensión de Chrome (Manifest V3) que actúa como puente entre el ecosistema de **Kueski Pay** y las compras en línea en Amazon. Al detectar la visita a una página de producto en Amazon (.com o .com.mx), la extensión:

1. Muestra una notificación flotante con el pago estimado por quincena.
2. Permite al usuario iniciar sesión con sus credenciales de Kueski.
3. Consulta en tiempo real su saldo disponible, deuda y fecha de próximo pago.
4. Ofrece una simulación de financiamiento con múltiples planes de pago.
5. Gestiona cupones de descuento y cashback vinculados a la cuenta.

La extensión se comunica con un **servidor backend local** (Node.js + Express) que se conecta a una base de datos **MySQL** (compatible con XAMPP/MariaDB).

---

## ✨ Características

### 🔐 Autenticación
- Inicio de sesión con correo y contraseña validados contra la base de datos.
- Opción de registro redirigiendo al portal oficial de Kueski.
- Cierre de sesión con limpieza completa del estado.

### 💳 Dashboard de Crédito
- Visualización del **crédito total** y **saldo disponible** con barra de progreso.
- Fecha dinámica del próximo pago calculada en tiempo real según el día de corte del usuario.
- Indicadores visuales de estado: "Al corriente" o "Adeudo pendiente".
- Toggle para mostrar/ocultar el saldo (ícono de ojo).

### 🛒 Simulador de Pagos
- Detección automática del precio del artículo en la página de Amazon.
- Planes de financiamiento: **Contado, 3, 6, 9, 12 y 15 quincenas**.
- Tasa de interés del **2% quincenal** calculada con la fórmula de amortización estándar.
- Validación de crédito insuficiente para el plan seleccionado.

### 🎁 Beneficios y Cupones
- Activación de **1% de cashback** en compras de Amazon.
- Listado de cupones guardados en la cuenta del usuario.
- Agregar nuevos cupones con formato `cupon{monto}` (ej: `cupon100`).
- Validación de duplicados por usuario.

### 📲 Inyección en Amazon
- **FAB (Floating Action Button)**: botón circular persistente en la esquina superior derecha de Amazon.
- **Toast/Widget flotante**: notificación animada con el precio quincenal estimado del artículo actual o el beneficio de cashback si no hay producto detectado.
- Apertura de la extensión como **iframe en página** sin necesidad de abrir el popup del navegador.
- Auto-ocultamiento del toast tras 10 segundos.

### 👤 Perfil de Usuario
- Visualización del nombre, ID de Kueski y avatar con iniciales.
- Resumen de adeudo total y próxima fecha de pago.

---

## 🏗️ Arquitectura del Proyecto

```
Extension-Kueski/
│
├── KueskiPro/              # Extensión de Chrome (Frontend)
│   ├── manifest.json       # Configuración de la extensión (Manifest V3)
│   ├── popup.html          # Interfaz principal (Login, Dashboard, Pago)
│   ├── script.js           # Lógica de la UI y llamadas al backend
│   ├── content.js          # Script inyectado en Amazon (FAB + Toast)
│   ├── style.css           # Estilos del popup
│   ├── content.css         # Estilos del FAB y Toast en Amazon
│   └── logo.png            # Ícono de la extensión
│
├── KueskiServer/           # Backend (Node.js + Express)
│   ├── server.js           # Servidor con todos los endpoints REST
│   ├── package.json        # Dependencias del servidor
│   └── package-lock.json
│
├── kueskipro.sql           # Script SQL completo de la base de datos
└── .gitignore
```

La extensión sigue una arquitectura **cliente-servidor de tres capas**:

```
[Amazon.com]  ←→  [KueskiPro Extension]  ←→  [KueskiServer (localhost:3000)]  ←→  [MySQL / XAMPP]
   Browser            Manifest V3               Node.js + Express                   MariaDB
```

---

## 🛠️ Tecnologías Utilizadas

### Frontend — Extensión Chrome
| Tecnología | Versión | Uso |
|---|---|---|
| Chrome Extensions API | Manifest V3 | Plataforma base de la extensión |
| JavaScript (ES6+) | Vanilla | Lógica de UI y peticiones fetch |
| HTML5 / CSS3 | — | Interfaz del popup |
| Chrome Storage API | — | Almacenamiento local del precio de Amazon |

### Backend — Servidor Local
| Tecnología | Versión | Uso |
|---|---|---|
| Node.js | — | Entorno de ejecución |
| Express | ^5.2.1 | Framework HTTP y enrutamiento |
| mysql2 | ^3.22.4 | Conector con MySQL/MariaDB |
| cors | ^2.8.6 | Manejo de CORS para la extensión |

### Base de Datos
| Tecnología | Versión | Uso |
|---|---|---|
| MySQL / MariaDB | 10.4.32 | Base de datos relacional |
| XAMPP | — | Entorno de servidor local |
| phpMyAdmin | 5.2.1 | Administración de la BD |

---

## 🗄️ Base de Datos

La base de datos se llama **`kueskipro`** y contiene las siguientes tablas:

### `usuario`
Almacena la información personal de cada usuario.
| Campo | Tipo | Descripción |
|---|---|---|
| `id_Usuario` | varchar(10) PK | Identificador único |
| `nombre` | varchar(50) | Nombre del usuario |
| `p_apellido` | varchar(50) | Primer apellido |
| `s_apellido` | varchar(50) | Segundo apellido |
| `id_Kueski` | varchar(10) FK | Referencia a `detalles_cuenta` |

### `detalles_cuenta`
Contiene las credenciales y datos financieros del usuario.
| Campo | Tipo | Descripción |
|---|---|---|
| `id_Kueski` | varchar(10) PK | ID Kueski del usuario |
| `credito_disponible` | decimal(10,2) | Límite de crédito total |
| `moroso` | decimal(10,2) | Deuda actual pendiente |
| `correo` | varchar(100) UNIQUE | Correo para iniciar sesión |
| `contrasena` | varchar(255) | Contraseña del usuario |
| `dia_corte` | int(11) | Día del mes para el corte de pago |

### `beneficio`
Registra los cupones y beneficios asociados a cada cuenta.
| Campo | Tipo | Descripción |
|---|---|---|
| `id_Beneficio` | varchar(10) PK | Identificador del beneficio |
| `codigo` | varchar(50) | Código del cupón |
| `cashback` | int(11) | Porcentaje de cashback |
| `descuento` | decimal(5,2) | Monto de descuento en pesos |
| `id_Kueski` | varchar(10) FK | Usuario al que pertenece |

> 🔑 **Restricción única**: `(codigo, id_Kueski)` — Un usuario no puede agregar el mismo cupón dos veces.

### `kueski_pay_detalles`
Catálogo de artículos disponibles para simulación de pago.
| Campo | Tipo | Descripción |
|---|---|---|
| `id_Kpay` | varchar(10) PK | Identificador del artículo |
| `articulo` | varchar(100) | Nombre del artículo |
| `tienda` | varchar(50) | Tienda de origen |
| `precio` | decimal(10,2) | Precio del artículo |
| `fecha` | date | Fecha de registro |

### `transaccion`
Historial de transacciones realizadas.
| Campo | Tipo | Descripción |
|---|---|---|
| `id_Trans` | varchar(10) PK | Identificador de la transacción |
| `id_Usuario` | varchar(10) FK | Usuario que realizó la compra |
| `id_Kpay` | varchar(10) FK | Artículo adquirido |
| `id_Beneficio` | varchar(10) FK | Beneficio aplicado (opcional) |

---

## ⚙️ Instalación y Configuración

### Requisitos Previos
- **Google Chrome** (versión reciente)
- **Node.js** y **npm** instalados
- **XAMPP** (o cualquier servidor MySQL local) en ejecución

---

### 1. Configurar la Base de Datos

1. Inicia **XAMPP** y arranca los servicios de **Apache** y **MySQL**.
2. Abre **phpMyAdmin** en `http://localhost/phpmyadmin`.
3. Crea una base de datos llamada `kueskipro`.
4. Importa el archivo `kueskipro.sql` ubicado en la raíz del proyecto.

```sql
-- La base de datos se crea automáticamente con el script SQL
-- Solo debes importar el archivo kueskipro.sql en phpMyAdmin
```

> ⚠️ El servidor está configurado por defecto con usuario `root` y contraseña vacía. Si tu configuración de MySQL es diferente, edita las credenciales en `KueskiServer/server.js`.

---

### 2. Iniciar el Servidor Backend

```bash
# Navegar a la carpeta del servidor
cd KueskiServer

# Instalar dependencias
npm install

# Iniciar el servidor
node server.js
```

El servidor correrá en: **`http://localhost:3000`**

Deberías ver en la consola:
```
🔌 Conectado exitosamente a la base de datos MySQL (kueskipro) en XAMPP.
🚀 Servidor backend corriendo en http://localhost:3000
```

---

### 3. Instalar la Extensión en Chrome

1. Abre Google Chrome y navega a `chrome://extensions/`.
2. Activa el **Modo de desarrollador** (toggle en la esquina superior derecha).
3. Haz clic en **"Cargar descomprimida"**.
4. Selecciona la carpeta **`KueskiPro/`** del proyecto.
5. La extensión **KueskiPro** aparecerá en tu barra de extensiones.

---

## 🚀 Uso de la Extensión

### Flujo Principal

1. **Visitar Amazon**: Navega a `amazon.com` o `amazon.com.mx`.
2. **Toast de bienvenida**: Aparecerá una notificación animada con información de Kueski Pay.
   - En páginas de producto: mostrará el pago quincenal estimado.
   - En otras páginas: mostrará el beneficio de cashback disponible.
3. **Abrir la extensión**: Haz clic en el toast o en el **botón circular azul** (FAB) en la esquina superior derecha.
4. **Iniciar sesión**: Ingresa tu correo y contraseña de Kueski.

### Credenciales de Prueba (datos de ejemplo)

| Usuario | Correo | Contraseña | Crédito |
|---|---|---|---|
| Carlos Gloria | `carlosgloria@gmail.com` | `contrasena3` | $25,000 MXN |
| Angel Landin | `landin_ang@hotmail.com` | `contrasena2` | $10,000 MXN |
| David Bribiesca | `david_bri@gmail.com` | `contrasena1` | $500 MXN |

### Navegación del Dashboard

| Pestaña | Funcionalidad |
|---|---|
| **Inicio** | Consultar línea de crédito y acceder al simulador de pagos |
| **Beneficios** | Activar cashback y gestionar cupones de descuento |
| **Mi Perfil** | Ver datos de cuenta, adeudo y fecha de próximo pago |

---

## 🔌 API Endpoints

El servidor expone los siguientes endpoints en `http://localhost:3000`:

### `POST /api/login`
Autenticación del usuario.
```json
// Request
{ "correo": "carlosgloria@gmail.com", "contrasena": "contrasena3" }

// Response (200 OK)
{ "success": true, "usuario": { "nombre": "Carlos", "id_Kueski": "K003", "moroso": 0 } }
```

---

### `GET /api/credito/:id_Kueski`
Consulta el saldo y fecha de próximo pago del usuario.
```json
// Response (200 OK)
{
  "creditoTotal": 25000.00,
  "saldoDisponible": 25000.00,
  "fechaCorte": "22 de junio"
}
```

---

### `GET /api/cupones/:id_Kueski`
Obtiene todos los cupones asociados a la cuenta del usuario.
```json
// Response (200 OK)
{ "success": true, "cupones": [{ "codigo": "cupon100", "descuento": 100 }] }
```

---

### `POST /api/cupones`
Agrega un nuevo cupón a la cuenta del usuario.
```json
// Request
{ "codigo": "cupon50", "id_Kueski": "K003" }

// Response (200 OK)
{ "success": true, "descuento": 50 }
```
> El formato válido de cupón es `cupon{número}`, por ejemplo: `cupon100`, `cupon30`, `cupon500`.

---

### `POST /api/simular`
Calcula las opciones de financiamiento para un artículo.
```json
// Request
{ "id_Kueski": "K003", "precio_directo": 8988.00 }

// Response (200 OK)
{
  "success": true,
  "articulo": "Artículo de Amazon",
  "precioOriginal": 8988.00,
  "creditoDisponible": 25000.00,
  "opciones": [
    { "quincenas": 0,  "pagoQuincenal": 8988.00, "totalAPagar": 8988.00,   "etiqueta": "De Contado" },
    { "quincenas": 6,  "pagoQuincenal": 1673.52, "totalAPagar": 10041.12,  "etiqueta": "6 Quincenas" },
    { "quincenas": 12, "pagoQuincenal": 957.83,  "totalAPagar": 11493.96,  "etiqueta": "12 Quincenas" }
  ]
}
```

> **Fórmula de amortización utilizada:**
> ```
> Pago = P × (r × (1+r)^n) / ((1+r)^n - 1)
> Donde: P = precio, r = 0.02 (tasa quincenal), n = número de quincenas
> ```

---

## 📁 Estructura de Archivos

```
Extension-Kueski/
│
├── 📁 KueskiPro/
│   ├── 📄 manifest.json       # Configuración de permisos y scripts de la extensión
│   ├── 📄 popup.html          # Estructura HTML de las 3 pantallas (Login, Dashboard, Pago)
│   ├── 📄 script.js           # Controlador principal: login, crédito, cupones, simulación
│   ├── 📄 content.js          # Inyección en Amazon: FAB + Toast + iframe de la app
│   ├── 📄 style.css           # Estilos del popup (variables CSS, componentes, pantallas)
│   ├── 📄 content.css         # Estilos del FAB y widget flotante en Amazon
│   ├── 📄 logo.png            # Logo de Kueski (ícono de la extensión)
│   └── 📁 .vscode/
│       └── 📄 tasks.json      # Configuración de tareas de build para VS Code
│
├── 📁 KueskiServer/
│   ├── 📄 server.js           # Servidor Express con 5 endpoints REST
│   ├── 📄 package.json        # Metadatos y dependencias del proyecto Node.js
│   └── 📄 package-lock.json   # Versiones exactas de dependencias instaladas
│
├── 📄 kueskipro.sql           # Dump completo de la BD (estructura + datos de prueba)
├── 📄 .gitignore              # Exclusión de node_modules
└── 📄 README.md               # Documentación del proyecto
```

---

## 👥 Integrantes del Proyecto

| Nombre | Rol |
|---|---|
| Angel Landín López| Desarrollador |
| Carlos Andrés Gloria Cortez| Front-end |
| David Bribiesca Valtierra | Bases de datos |
| Francisco Alarcón | Backlog Manager |

---

## 📄 Licencia

Este proyecto fue desarrollado con fines académicos y de demostración. El uso del nombre, logo y marca **Kueski** es únicamente para propósitos educativos y no implica ninguna afiliación oficial con Kueski SAPI de CV.

---

<div align="center">
  <strong>KueskiPro</strong> — Extensión de Chrome · Kueski Pay Integration<br>
</div>
